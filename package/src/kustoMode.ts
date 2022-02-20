import { WorkerManager } from './workerManager';
import { KustoWorker } from './kustoWorker';
import { LanguageServiceDefaultsImpl } from './monaco.contribution';
import { KustoLanguageDefinition } from './languageService/kustoMonarchLanguageDefinition';
import * as languageFeatures from './languageFeatures';

import Uri = monaco.Uri;
import IDisposable = monaco.IDisposable;
import { WorkerAccessor } from './languageFeatures';
import { EngineSchema, Schema, InputParameter, ScalarParameter } from './languageService/schema';

let kustoWorkerTokenParsing: WorkerAccessor;
let kustoWorker: WorkerAccessor;
let resolveWorkerTokenParsing: (value: languageFeatures.WorkerAccessor | PromiseLike<languageFeatures.WorkerAccessor>) => void;
let resolveWorker: (value: languageFeatures.WorkerAccessor | PromiseLike<languageFeatures.WorkerAccessor>) => void;
let rejectWorkerTokenParsing: (err: any) => void;
let rejectWorker: (err: any) => void;
let workerPromiseTokenParsing: Promise<WorkerAccessor> = new Promise((resolve, reject) => {
    resolveWorkerTokenParsing = resolve;
    rejectWorkerTokenParsing = reject;
});
let workerPromise: Promise<WorkerAccessor> = new Promise((resolve, reject) => {
    resolveWorker = resolve;
    rejectWorker = reject;
});

/**
 * Called when Kusto language is first needed (a model has the language set)
 * @param defaults
 */
export function setupMode(defaults: LanguageServiceDefaultsImpl, monacoInstance): WorkerAccessor {
    let onSchemaChange = new monaco.Emitter<Schema>();
    // TODO: when should we dispose of these? seems like monaco-css and monaco-typescript don't dispose of these.
    let disposables: IDisposable[] = [];
    let monarchTokensProvider: IDisposable;

    const clientTokenParsing = new WorkerManager(monacoInstance, defaults);
    const client = new WorkerManager(monacoInstance, defaults);
    disposables.push(clientTokenParsing);
    disposables.push(client);

    const workerTokenParsingAccessor = (first: Uri, ...more: Uri[]): Promise<KustoWorker> => {
        const worker = clientTokenParsing.getLanguageServiceWorker(...[first].concat(more));
        return worker;
    };

    const workerAccessor = (first: Uri, ...more: Uri[]): Promise<KustoWorker> => {
        const augmentedSetSchema = (schema: Schema, worker: KustoWorker, globalParameters?: ScalarParameter[]) => {
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
                    setSchema: (schema) => {
                        getKustoWorkerTokenParsing().then(worker => worker(first, ...more).then(wor => augmentedSetSchema(schema, wor)));
                        augmentedSetSchema(schema, worker)
                    },
                    setSchemaFromShowSchema: (schema, connection, database, globalParameters?: ScalarParameter[]) => {
                        getKustoWorkerTokenParsing().then(worker => worker(first, ...more).then(wor => wor.normalizeSchema(schema, connection, database)
                        .then((schema) => (globalParameters ? { ...schema, globalParameters } : schema))
                        .then((normalized) => augmentedSetSchema(normalized, wor))))
                        worker
                            .normalizeSchema(schema, connection, database)
                            .then((schema) => (globalParameters ? { ...schema, globalParameters } : schema))
                            .then((normalized) => augmentedSetSchema(normalized, worker));
                    },
                } as KustoWorker)
        );
    };

    const language = 'kusto';
    disposables.push(
        monacoInstance.languages.registerCompletionItemProvider(
            language,
            new languageFeatures.CompletionAdapter(workerTokenParsingAccessor, defaults.languageSettings)
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
            monarchTokensProvider = monacoInstance.languages.setMonarchTokensProvider(language, KustoLanguageDefinition);
        }
    });

    disposables.push(new languageFeatures.DiagnosticsAdapter(monacoInstance, language, workerTokenParsingAccessor, defaults, onSchemaChange.event));

    disposables.push(
        new languageFeatures.ColorizationAdapter(monacoInstance, language, workerTokenParsingAccessor, defaults, onSchemaChange.event)
    );

    disposables.push(
        monacoInstance.languages.registerDocumentRangeFormattingEditProvider(
            language,
            new languageFeatures.FormatAdapter(workerTokenParsingAccessor)
        )
    );

    disposables.push(
        monacoInstance.languages.registerFoldingRangeProvider(language, new languageFeatures.FoldingAdapter(workerTokenParsingAccessor))
    );

    disposables.push(
        monacoInstance.languages.registerDefinitionProvider(language, new languageFeatures.DefinitionAdapter(workerTokenParsingAccessor))
    );

    disposables.push(
        monacoInstance.languages.registerRenameProvider(language, new languageFeatures.RenameAdapter(workerTokenParsingAccessor))
    );

    disposables.push(
        monacoInstance.languages.registerReferenceProvider(language, new languageFeatures.ReferenceAdapter(workerTokenParsingAccessor))
    );

    if (defaults.languageSettings.enableHover) {
        disposables.push(
            monacoInstance.languages.registerHoverProvider(language, new languageFeatures.HoverAdapter(workerTokenParsingAccessor))
        );
    }

    monacoInstance.languages.registerDocumentFormattingEditProvider(
        language,
        new languageFeatures.DocumentFormatAdapter(workerTokenParsingAccessor)
    );
    kustoWorkerTokenParsing = workerTokenParsingAccessor;
    kustoWorker = workerAccessor;
    resolveWorkerTokenParsing(workerTokenParsingAccessor);
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

export function getKustoWorkerTokenParsing(): Promise<WorkerAccessor> {
    return workerPromiseTokenParsing.then(() => kustoWorkerTokenParsing);
}
