import monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { LANGUAGE_ID } from '../globals';
import { SemanticTokensProvider } from './SemanticTokensProvider';
import { AugmentedWorkerAccessor } from '../kustoMode';

export type SemanticTokensProviderRegistrar = (
    monacoInstance: typeof monaco,
    semanticTokensProvider: SemanticTokensProvider
) => void;

// Registers semantic token provider that utilizes the language service
// for more context-relevant syntax highlighting.
export function semanticTokensProviderRegistrarCreator() {
    const semanticTokensProviderRegistrar = semanticTokensProviderRegistrarCreatorForTest();

    return (monacoInstance: typeof monaco, workerAccessor: AugmentedWorkerAccessor) => {
        const semanticTokensProvider = semanticTokensProviderMaker(workerAccessor);
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

function semanticTokensProviderMaker(workerAccessor: AugmentedWorkerAccessor): SemanticTokensProvider {
    const classificationsGetter = async (resource: monaco.Uri) => {
        const worker = await workerAccessor(resource);
        return worker.getClassifications(resource.toString());
    };
    return new SemanticTokensProvider(classificationsGetter);
}
