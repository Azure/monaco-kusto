import { WorkerManager } from './workerManager';
import { KustoWorker } from './kustoWorker';
import { LanguageServiceDefaultsImpl } from './monaco.contribution';
import { KustoLanguageDefinition } from './languageService/kustoMonarchLanguageDefinition';
import * as languageFeatures from './languageFeatures';

import Promise = monaco.Promise;
import Uri = monaco.Uri;
import IDisposable = monaco.IDisposable;
import { WorkerAccessor } from './languageFeatures';
import { EngineSchema, Schema, InputParameter, ScalarParameter } from './languageService/schema';

let kustoWorker: WorkerAccessor;
let resolveWorker: (value: languageFeatures.WorkerAccessor | PromiseLike<languageFeatures.WorkerAccessor>) => void;
let rejectWorer: (err: any) => void;
let workerPromise: Promise<WorkerAccessor> = new Promise((resolve, reject) => {
    resolveWorker = resolve;
    rejectWorer = reject;
});

/**
 * Called when Kusto language is first needed (a model has the language set)
 * @param defaults
 */
export function setupMode(defaults: LanguageServiceDefaultsImpl): WorkerAccessor {
    let onSchemaChange = new monaco.Emitter<Schema>();
    // TODO: when should we dispose of these? seems like monaco-css and monaco-typescript don't dispose of these.
    let disposables: IDisposable[] = [];
    let monarchTokensProvider: IDisposable;

    const client = new WorkerManager(defaults);
    disposables.push(client);

    const workerAccessor = (first: Uri, ...more: Uri[]): Promise<KustoWorker> => {
        const augmentedSetSchema = (schema: Schema, worker: KustoWorker, globalParameters?: ScalarParameter[]) => {
            const workerPromise = worker.setSchema(schema);

            workerPromise.then(() => {
                onSchemaChange.fire(schema);
            });
        };
        const worker = client.getLanguageServiceWorker(...[first].concat(more));
        return worker.then(
            worker =>
                ({
                    ...worker,
                    setSchema: schema => augmentedSetSchema(schema, worker),
                    setSchemaFromShowSchema: (schema, connection, database, globalParameters?: ScalarParameter[]) => {
                        worker
                            .normalizeSchema(schema, connection, database)
                            .then(schema => (globalParameters ? { ...schema, globalParameters } : schema))
                            .then(normalized => augmentedSetSchema(normalized, worker));
                    }
                } as KustoWorker)
        );
    };

    const language = 'kusto';
    disposables.push(
        monaco.languages.registerCompletionItemProvider(
            language,
            new languageFeatures.CompletionAdapter(workerAccessor, defaults.languageSettings)
        )
    );

    // Monaco tokenization runs in main thread so we're using a quick schema-unaware tokenization.
    // a web worker will run semantic colorization in the background (ColorizationAdapter).
    if (defaults.languageSettings.useTokenColorization) {
        monarchTokensProvider = monaco.languages.setMonarchTokensProvider(language, KustoLanguageDefinition);
    }

    // listen to configuration changes and if we're switching from semantic to monarch colorizaiton, do the switch.
    defaults.onDidChange(e => {
        if (!e.languageSettings.useTokenColorization && monarchTokensProvider !== undefined) {
            monarchTokensProvider.dispose();
            monarchTokensProvider = undefined;
        }

        if (e.languageSettings.useTokenColorization && monarchTokensProvider == undefined) {
            monarchTokensProvider = monaco.languages.setMonarchTokensProvider(language, KustoLanguageDefinition);
        }
    });

    disposables.push(new languageFeatures.DiagnosticsAdapter(language, workerAccessor, defaults, onSchemaChange.event));

    disposables.push(
        new languageFeatures.ColorizationAdapter(language, workerAccessor, defaults, onSchemaChange.event)
    );

    disposables.push(
        monaco.languages.registerDocumentRangeFormattingEditProvider(
            language,
            new languageFeatures.FormatAdapter(workerAccessor)
        )
    );

    disposables.push(
        monaco.languages.registerFoldingRangeProvider(language, new languageFeatures.FoldingAdapter(workerAccessor))
    );

    disposables.push(
        monaco.languages.registerDefinitionProvider(language, new languageFeatures.DefinitionAdapter(workerAccessor))
    );

    disposables.push(
        monaco.languages.registerRenameProvider(language, new languageFeatures.RenameAdapter(workerAccessor))
    );

    disposables.push(
        monaco.languages.registerReferenceProvider(language, new languageFeatures.ReferenceAdapter(workerAccessor))
    );

    if (defaults.languageSettings.enableHover) {
        disposables.push(
            monaco.languages.registerHoverProvider(language, new languageFeatures.HoverAdapter(workerAccessor))
        );
    }

    monaco.languages.registerDocumentFormattingEditProvider(
        language,
        new languageFeatures.DocumentFormatAdapter(workerAccessor)
    );
    kustoWorker = workerAccessor;
    resolveWorker(workerAccessor);

    monaco.languages.setLanguageConfiguration(language, {
        folding: {
            offSide: false,
            markers: { start: /^\s*[\r\n]/gm, end: /^\s*[\r\n]/gm }
        },
        comments: {
            lineComment: '//',
            blockComment: null
        }
    });

    return kustoWorker;
}

export function getKustoWorker(): Promise<WorkerAccessor> {
    return workerPromise.then(() => kustoWorker);
}
