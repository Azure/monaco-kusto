import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import { WorkerManager } from './workerManager';
import type { KustoWorker, LanguageServiceDefaults } from './monaco.contribution';
import * as languageFeatures from './languageFeatures';
import type { Schema } from './languageServiceManager/schema';
import type { IKustoWorkerImpl } from './kustoWorker';
import { SemanticTokensProvider } from './syntax-highlighting/SemanticTokensProvider';
import { kustoLanguageDefinition } from './syntax-highlighting/kustoMonarchLanguageDefinition';
import { LANGUAGE_ID } from './globals';

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

    const monarchTokensProvider = monacoInstance.languages.setMonarchTokensProvider(
        LANGUAGE_ID,
        kustoLanguageDefinition
    );
    disposables.push(monarchTokensProvider);

    disposables.push(
        monacoInstance.languages.registerCompletionItemProvider(
            LANGUAGE_ID,
            new languageFeatures.CompletionAdapter(workerAccessor, defaults.languageSettings)
        )
    );

    const semanticTokenProvider = new SemanticTokensProvider(workerAccessor, monacoInstance);
    monacoInstance.languages.registerDocumentSemanticTokensProvider(LANGUAGE_ID, semanticTokenProvider);

    disposables.push(
        new languageFeatures.DiagnosticsAdapter(
            monacoInstance,
            LANGUAGE_ID,
            workerAccessor,
            defaults,
            onSchemaChange.event
        )
    );

    disposables.push(
        monacoInstance.languages.registerDocumentRangeFormattingEditProvider(
            LANGUAGE_ID,
            new languageFeatures.FormatAdapter(workerAccessor)
        )
    );

    disposables.push(
        monacoInstance.languages.registerFoldingRangeProvider(
            LANGUAGE_ID,
            new languageFeatures.FoldingAdapter(workerAccessor)
        )
    );

    disposables.push(
        monacoInstance.languages.registerDefinitionProvider(
            LANGUAGE_ID,
            new languageFeatures.DefinitionAdapter(workerAccessor)
        )
    );

    disposables.push(
        monacoInstance.languages.registerRenameProvider(LANGUAGE_ID, new languageFeatures.RenameAdapter(workerAccessor))
    );

    disposables.push(
        monacoInstance.languages.registerReferenceProvider(
            LANGUAGE_ID,
            new languageFeatures.ReferenceAdapter(workerAccessor)
        )
    );

    if (defaults.languageSettings.enableHover) {
        disposables.push(
            monacoInstance.languages.registerHoverProvider(
                LANGUAGE_ID,
                new languageFeatures.HoverAdapter(workerAccessor)
            )
        );
    }

    monacoInstance.languages.registerDocumentFormattingEditProvider(
        LANGUAGE_ID,
        new languageFeatures.DocumentFormatAdapter(workerAccessor)
    );
    kustoWorker = workerAccessor;
    resolveWorker(workerAccessor);

    monacoInstance.languages.setLanguageConfiguration(LANGUAGE_ID, {
        folding: {
            offSide: false,
            markers: { start: /^\s*[\r\n]/gm, end: /^\s*[\r\n]/gm },
        },
        comments: {
            lineComment: '//',
            blockComment: null,
        },
        autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: "'", close: "'", notIn: ['string', 'comment'] },
            { open: '"', close: '"', notIn: ['string', 'comment'] },
        ],
    });

    return kustoWorker;
}

export function getKustoWorker(): Promise<AugmentedWorkerAccessor> {
    return workerPromise.then(() => kustoWorker);
}
