import monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { LANGUAGE_ID } from '../globals';
import { SemanticTokensProvider } from './SemanticTokensProvider';
import { IKustoWorkerImpl } from '../kustoWorker';

export type SemanticTokensProviderRegistrar = (
    monacoInstance: typeof monaco,
    semanticTokensProvider: SemanticTokensProvider
) => void;

// Registers semantic token provider that utilizes the language service
// for more context-relevant syntax highlighting.
export function semanticTokensProviderRegistrarCreator() {
    const semanticTokensProviderRegistrar = semanticTokensProviderRegistrarCreatorForTest();

    return (monacoInstance: typeof monaco, worker: IKustoWorkerImpl) => {
        const semanticTokensProvider = semanticTokensProviderMaker(worker);
        semanticTokensProviderRegistrar(monacoInstance, semanticTokensProvider);
    };
}

export function semanticTokensProviderRegistrarCreatorForTest() {
    let semanticTokensDisposable: monaco.IDisposable;

    return (monacoInstance: typeof monaco, semanticTokensProvider: SemanticTokensProvider) => {
        if (semanticTokensDisposable) {
            semanticTokensDisposable.dispose();
        }
        semanticTokensDisposable = monacoInstance.languages.registerDocumentSemanticTokensProvider(
            LANGUAGE_ID,
            semanticTokensProvider
        );
    };
}

function semanticTokensProviderMaker(worker: IKustoWorkerImpl): SemanticTokensProvider {
    return new SemanticTokensProvider(worker.getClassifications);
}
