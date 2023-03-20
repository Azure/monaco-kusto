import { WorkerManager } from './workerManager';
import type { KustoWorker } from './kustoWorker';
import type { LanguageServiceDefaultsImpl } from './monaco.contribution';
import { KustoLanguageDefinition } from './languageService/kustoMonarchLanguageDefinition';
import * as languageFeatures from './languageFeatures';

import Uri = monaco.Uri;
import IDisposable = monaco.IDisposable;
import { WorkerAccessor } from './languageFeatures';
import type { Schema, ScalarParameter, TabularParameter } from './languageService/schema';

let kustoWorker: WorkerAccessor;
let resolveWorker: (value: languageFeatures.WorkerAccessor | PromiseLike<languageFeatures.WorkerAccessor>) => void;
let rejectWorker: (err: any) => void;
let workerPromise: Promise<WorkerAccessor> = new Promise((resolve, reject) => {
    resolveWorker = resolve;
    rejectWorker = reject;
});

/**
 * Called when Kusto language is first needed (a model has the language set)
 * @param defaults
 */
export function setupMode(defaults: LanguageServiceDefaultsImpl, monacoInstance: typeof monaco): WorkerAccessor {
    let onSchemaChange = new monaco.Emitter<Schema>();
    // TODO: when should we dispose of these? seems like monaco-css and monaco-typescript don't dispose of these.
    let disposables: IDisposable[] = [];
    let monarchTokensProvider: IDisposable;

    const client = new WorkerManager(monacoInstance, defaults);
    disposables.push(client);

    const workerAccessor = (first: Uri, ...more: Uri[]): Promise<KustoWorker> => {
        const augmentedSetSchema = (
            schema: Schema,
            worker: KustoWorker,
            globalScalarParameters?: ScalarParameter[],
            globalTabularParameters?: TabularParameter[]
        ) => {
            const workerPromise = worker.setSchema(schema);

            workerPromise.then(() => {
                onSchemaChange.fire(schema);
            });
        };
        const worker = client.getLanguageServiceWorker(...[first].concat(more));
        return worker.then(
            (worker) =>
                ({
                    ...worker,
                    setSchema: (schema) => augmentedSetSchema(schema, worker),
                    setSchemaFromShowSchema: (
                        schema,
                        connection,
                        database,
                        globalScalarParameters?: ScalarParameter[],
                        globalTabularParameters?: TabularParameter[]
                    ) => {
                        worker
                            .normalizeSchema(schema, connection, database)
                            .then((schema) =>
                                globalScalarParameters
                                    ? { ...schema, globalScalarParameters, globalTabularParameters }
                                    : schema
                            )
                            .then((normalized) => augmentedSetSchema(normalized, worker));
                    },
                } as KustoWorker)
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

export function getKustoWorker(): Promise<WorkerAccessor> {
    return workerPromise.then(() => kustoWorker);
}
