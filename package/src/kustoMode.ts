import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import { WorkerManager } from './workerManager';
import { KustoWorker, LanguageServiceDefaults, showSchema } from './monaco.contribution';
import * as languageFeatures from './languageFeatures';
import { Schema, ScalarParameter, TabularParameter } from './languageServiceManager/schema';
import { IKustoWorkerImpl } from './kustoWorker';
import { SemanticTokensProvider } from './syntaxHighlighting/SemanticTokensProvider';
import { kustoLanguageDefinition } from './syntaxHighlighting/kustoMonarchLanguageDefinition';
import { LANGUAGE_ID } from './globals';

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
    console.log('setupMode');
    let onSchemaChange = new monaco.Emitter<Schema>();
    const client = new WorkerManager(monacoInstance, defaults);
    let semanticTokensDisposable: monaco.IDisposable;

    workerAccessor = async (uri) => {
        const worker = await client.getLanguageServiceWorker(uri);

        const augmentedSetSchema = async (schema: Schema) => {
            await worker.setSchema(schema);
            onSchemaChange.fire(schema);
            if (semanticTokensDisposable) {
                semanticTokensDisposable.dispose();
            }
            semanticTokensDisposable = registerDocumentSemanticTokensProvider(worker, monacoInstance);
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

    setMonarchTokensProvider(monacoInstance);

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

// This function sets the Monarch token provider,
// enabling fast syntax highlighting before the language service is called for semantic coloring.
export function setMonarchTokensProvider(monacoInstance: typeof monaco) {
    monacoInstance.languages.setMonarchTokensProvider(LANGUAGE_ID, kustoLanguageDefinition);
}

// This function registers a semantic token provider that utilizes the language service
// for more context-relevant syntax highlighting.
export function registerDocumentSemanticTokensProvider(worker: IKustoWorkerImpl, monacoInstance: typeof monaco) {
    const semanticTokenProvider = new SemanticTokensProvider(worker.getClassifications);
    return monacoInstance.languages.registerDocumentSemanticTokensProvider(LANGUAGE_ID, semanticTokenProvider);
}
