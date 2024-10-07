import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import { WorkerManager } from './workerManager';
import type { KustoWorker, LanguageServiceDefaults } from './monaco.contribution';
import * as languageFeatures from './languageFeatures';
import type { Schema } from './languageServiceManager/schema';
import type { IKustoWorkerImpl } from './kustoWorker';
import { kustoLanguageDefinition } from './syntaxHighlighting/kustoMonarchLanguageDefinition';
import { LANGUAGE_ID } from './globals';
import { semanticTokensProviderRegistrarCreator } from './syntaxHighlighting/semanticTokensProviderRegistrar';
import type { IDisposable } from 'monaco-editor';

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
export function setupMode(defaults: LanguageServiceDefaults, monacoInstance: typeof globalThis.monaco) {
    const onSchemaChange = new monaco.Emitter<Schema>();
    const semanticTokensProviderRegistrar = semanticTokensProviderRegistrarCreator();

    const client = new WorkerManager(monacoInstance, defaults);

    const workerAccessor: AugmentedWorkerAccessor = (first, ...more) => {
        const augmentedSetSchema = async (schema: Schema, worker: KustoWorker) => {
            const workerPromise = worker.setSchema(schema);

            await workerPromise.then(() => {
                onSchemaChange.fire(schema);
            });
            semanticTokensProviderRegistrar(monacoInstance, workerAccessor);
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

    monacoInstance.languages.registerCompletionItemProvider(
        LANGUAGE_ID,
        new languageFeatures.CompletionAdapter(workerAccessor, defaults.languageSettings)
    );

    monacoInstance.languages.setMonarchTokensProvider(LANGUAGE_ID, kustoLanguageDefinition);

    new languageFeatures.DiagnosticsAdapter(
        monacoInstance,
        LANGUAGE_ID,
        workerAccessor,
        defaults,
        onSchemaChange.event
    );

    monacoInstance.languages.registerDocumentRangeFormattingEditProvider(
        LANGUAGE_ID,
        new languageFeatures.FormatAdapter(workerAccessor)
    );

    monacoInstance.languages.registerFoldingRangeProvider(
        LANGUAGE_ID,
        new languageFeatures.FoldingAdapter(workerAccessor)
    );

    monacoInstance.languages.registerDefinitionProvider(
        LANGUAGE_ID,
        new languageFeatures.DefinitionAdapter(workerAccessor)
    );

    monacoInstance.languages.registerRenameProvider(LANGUAGE_ID, new languageFeatures.RenameAdapter(workerAccessor));

    monacoInstance.languages.registerReferenceProvider(
        LANGUAGE_ID,
        new languageFeatures.ReferenceAdapter(workerAccessor)
    );

    if (defaults.languageSettings.enableHover) {
        monacoInstance.languages.registerHoverProvider(LANGUAGE_ID, new languageFeatures.HoverAdapter(workerAccessor));
    }

    monacoInstance.languages.registerDocumentFormattingEditProvider(
        LANGUAGE_ID,
        new languageFeatures.DocumentFormatAdapter(workerAccessor)
    );
    kustoWorker = workerAccessor;
    resolveWorker(workerAccessor);

    monacoInstance.languages.setLanguageConfiguration(LANGUAGE_ID, kanguageConfiguration);
}

export function getKustoWorker(): Promise<AugmentedWorkerAccessor> {
    return workerPromise.then(() => kustoWorker);
}

const kanguageConfiguration = {
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
};
