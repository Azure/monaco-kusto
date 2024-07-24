import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import { WorkerManager } from './workerManager';
import { KustoWorker, LanguageServiceDefaults, showSchema } from './monaco.contribution';
import * as languageFeatures from './languageFeatures';
import { Schema, ScalarParameter, TabularParameter } from './languageServiceManager/schema';
import { IKustoWorkerImpl } from './kustoWorker';
import { LANGUAGE_ID } from './globals';
import { semanticTokensProviderRegistrarCreator } from './syntaxHighlighting/semanticTokensProviderRegistrar';
import { kustoLanguageDefinition } from './syntaxHighlighting/kustoMonarchLanguageDefinition';

export interface AugmentedWorker
    extends KustoWorker,
        Omit<IKustoWorkerImpl, 'setSchemaFromShowSchema' | 'getReferencedSymbols'> {}

export interface AugmentedWorkerAccessor {
    (first: monaco.Uri): Promise<AugmentedWorker>;
}

let workerAccessor: AugmentedWorkerAccessor;

export async function setupMode(
    defaults: LanguageServiceDefaults,
    monacoInstance: typeof monaco
): Promise<AugmentedWorkerAccessor> {
    let onSchemaChange = new monaco.Emitter<Schema>();
    const client = new WorkerManager(monacoInstance, defaults);
    const semanticTokensProviderRegistrar = semanticTokensProviderRegistrarCreator();

    workerAccessor = async (uri) => {
        const worker = await client.getLanguageServiceWorker(uri);

        const augmentedSetSchema = async (schema: Schema) => {
            await worker.setSchema(schema);
            onSchemaChange.fire(schema);
            semanticTokensProviderRegistrar(monacoInstance, worker);
        };
        const setSchemaFromShowSchema = async (
            schema: showSchema.Result,
            clusterConnectionString: string,
            databaseInContextName: string,
            globalScalarParameters: ScalarParameter[],
            globalTabularParameters: TabularParameter[]
        ) => {
            const normalizedSchema = await worker.normalizeSchema(
                schema,
                clusterConnectionString,
                databaseInContextName
            );
            normalizedSchema.globalScalarParameters = globalScalarParameters;
            normalizedSchema.globalTabularParameters = globalTabularParameters;
            await augmentedSetSchema(normalizedSchema);
        };

        return {
            ...worker,
            setSchema: augmentedSetSchema,
            setSchemaFromShowSchema,
        };
    };

    monacoInstance.languages.setMonarchTokensProvider(LANGUAGE_ID, kustoLanguageDefinition);

    const completionAdapter = new languageFeatures.CompletionAdapter(workerAccessor, defaults.languageSettings);
    monacoInstance.languages.registerCompletionItemProvider(LANGUAGE_ID, completionAdapter);

    // this constructor has side effects and therefore doesn't need to be passed anywhere
    new languageFeatures.DiagnosticsAdapter(
        monacoInstance,
        LANGUAGE_ID,
        workerAccessor,
        defaults,
        onSchemaChange.event
    );

    const documentRangeFormattingAdapter = new languageFeatures.FormatAdapter(workerAccessor);
    monacoInstance.languages.registerDocumentRangeFormattingEditProvider(LANGUAGE_ID, documentRangeFormattingAdapter);

    const foldingRangeAdapter = new languageFeatures.FoldingAdapter(workerAccessor);
    monacoInstance.languages.registerFoldingRangeProvider(LANGUAGE_ID, foldingRangeAdapter);

    const definitionProvider = new languageFeatures.DefinitionAdapter(workerAccessor);
    monacoInstance.languages.registerDefinitionProvider(LANGUAGE_ID, definitionProvider);

    monacoInstance.languages.registerRenameProvider(LANGUAGE_ID, new languageFeatures.RenameAdapter(workerAccessor));

    const referenceProvider = new languageFeatures.ReferenceAdapter(workerAccessor);
    monacoInstance.languages.registerReferenceProvider(LANGUAGE_ID, referenceProvider);

    if (defaults.languageSettings.enableHover) {
        const hoverAdapter = new languageFeatures.HoverAdapter(workerAccessor);
        monacoInstance.languages.registerHoverProvider(LANGUAGE_ID, hoverAdapter);
    }

    const documentFormattingAdapter = new languageFeatures.DocumentFormatAdapter(workerAccessor);
    monacoInstance.languages.registerDocumentFormattingEditProvider(LANGUAGE_ID, documentFormattingAdapter);

    const languageConfiguration = {
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
    monacoInstance.languages.setLanguageConfiguration(LANGUAGE_ID, languageConfiguration);

    return workerAccessor;
}

export async function getKustoWorker(): Promise<AugmentedWorkerAccessor> {
    return workerAccessor;
}
