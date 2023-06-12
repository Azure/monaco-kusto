import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import { WorkerManager } from './workerManager';
import type { KustoWorker, LanguageServiceDefaults } from './monaco.contribution';
import { KustoLanguageDefinition } from './languageService/kustoMonarchLanguageDefinition';
import * as languageFeatures from './languageFeatures';
import type { Schema } from './languageService/schema';
import type { IKustoWorkerImpl } from './kustoWorker';

export interface AugmentedWorker
    extends KustoWorker,
        Omit<IKustoWorkerImpl, 'setSchemaFromShowSchema' | 'getReferencedSymbols'> {}

export interface AugmentedWorkerAccessor {
    (first: monaco.Uri, ...more: monaco.Uri[]): Promise<AugmentedWorker>;
}

let kustoWorker: AugmentedWorkerAccessor;
let resolveWorker: (value: AugmentedWorkerAccessor | PromiseLike<AugmentedWorkerAccessor>) => void;
let rejectWorker: (err: any) => void;
let workerPromise: Promise<AugmentedWorkerAccessor> = new Promise((resolve, reject) => {
    resolveWorker = resolve;
    rejectWorker = reject;
});

/**
 * Called when Kusto language is first needed (a model has the language set)
 * @param defaults
 */
export function setupMode(
    defaults: LanguageServiceDefaults,
    monacoInstance: typeof globalThis.monaco
): AugmentedWorkerAccessor {
    let onSchemaChange = new monaco.Emitter<Schema>();
    // TODO: when should we dispose of these? seems like monaco-css and monaco-typescript don't dispose of these.
    let disposables: monaco.IDisposable[] = [];
    let monarchTokensProvider: monaco.IDisposable;

    const client = new WorkerManager(monacoInstance, defaults);
    disposables.push(client);

    const workerAccessor: AugmentedWorkerAccessor = (first, ...more) => {
        const augmentedSetSchema = async (schema: Schema, worker: KustoWorker) => {
            const workerPromise = worker.setSchema(schema);

            await workerPromise.then(() => {
                onSchemaChange.fire(schema);
            });
        };
        const worker = client.getLanguageServiceWorker(...[first].concat(more));
        return worker.then(
            (worker): AugmentedWorker => ({
                ...worker,
                setSchema: (schema) => augmentedSetSchema(schema, worker),
                async setSchemaFromShowSchema(
                    schema,
                    connection,
                    database,
                    globalScalarParameters,
                    globalTabularParameters
                ) {
                    await worker.normalizeSchema(schema, connection, database).then((schema) => {
                        if (globalScalarParameters || globalTabularParameters) {
                            schema = { ...schema, globalScalarParameters, globalTabularParameters };
                        }
                        augmentedSetSchema(schema, worker);
                    });
                },
            })
        );
    };

    const language = 'kusto';
    disposables.push(
        monacoInstance.languages.registerCompletionItemProvider(
            language,
            new languageFeatures.CompletionAdapter(workerAccessor, defaults.languageSettings)
        )
    );

    // Monaco tokenization runs in main thread so we're using a quick schema-unaware tokenization.
    // a web worker will run semantic colorization in the background (ColorizationAdapter).
    if (defaults.languageSettings.useTokenColorization) {
        monarchTokensProvider = monacoInstance.languages.setMonarchTokensProvider(language, KustoLanguageDefinition);
    }

    // listen to configuration changes and if we're switching from semantic to monarch colorization, do the switch.
    defaults.onDidChange((e) => {
        if (!e.languageSettings.useTokenColorization && monarchTokensProvider !== undefined) {
            monarchTokensProvider.dispose();
            monarchTokensProvider = undefined;
        }

        if (e.languageSettings.useTokenColorization && monarchTokensProvider == undefined) {
            monarchTokensProvider = monacoInstance.languages.setMonarchTokensProvider(
                language,
                KustoLanguageDefinition
            );
        }
    });

    disposables.push(
        new languageFeatures.DiagnosticsAdapter(
            monacoInstance,
            language,
            workerAccessor,
            defaults,
            onSchemaChange.event
        )
    );

    disposables.push(
        new languageFeatures.ColorizationAdapter(
            monacoInstance,
            language,
            workerAccessor,
            defaults,
            onSchemaChange.event
        )
    );

    disposables.push(
        monacoInstance.languages.registerDocumentRangeFormattingEditProvider(
            language,
            new languageFeatures.FormatAdapter(workerAccessor)
        )
    );

    disposables.push(
        monacoInstance.languages.registerFoldingRangeProvider(
            language,
            new languageFeatures.FoldingAdapter(workerAccessor)
        )
    );

    disposables.push(
        monacoInstance.languages.registerDefinitionProvider(
            language,
            new languageFeatures.DefinitionAdapter(workerAccessor)
        )
    );

    disposables.push(
        monacoInstance.languages.registerRenameProvider(language, new languageFeatures.RenameAdapter(workerAccessor))
    );

    disposables.push(
        monacoInstance.languages.registerReferenceProvider(
            language,
            new languageFeatures.ReferenceAdapter(workerAccessor)
        )
    );

    if (defaults.languageSettings.enableHover) {
        disposables.push(
            monacoInstance.languages.registerHoverProvider(language, new languageFeatures.HoverAdapter(workerAccessor))
        );
    }

    monacoInstance.languages.registerDocumentFormattingEditProvider(
        language,
        new languageFeatures.DocumentFormatAdapter(workerAccessor)
    );
    kustoWorker = workerAccessor;
    resolveWorker(workerAccessor);

    monacoInstance.languages.setLanguageConfiguration(language, {
        folding: {
            offSide: false,
            markers: { start: /^\s*[\r\n]/gm, end: /^\s*[\r\n]/gm },
        },
        comments: {
            lineComment: '//',
            blockComment: null,
        },
    });

    return kustoWorker;
}

export function getKustoWorker(): Promise<AugmentedWorkerAccessor> {
    return workerPromise.then(() => kustoWorker);
}
