import monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { AugmentedWorkerAccessor } from '../kustoMode';
import { LANGUAGE_ID } from '../globals';
import { kustoLanguageDefinition } from './kustoMonarchLanguageDefinition';
import { SemanticTokensProvider } from './SemanticTokensProvider';
import { IKustoWorkerImpl } from '../kustoWorker';

// Sets the Monarch token provider,
// enabling fast syntax highlighting before the language service is called for semantic coloring.
export function setMonarchTokensProvider(monacoInstance: typeof monaco) {
    return monacoInstance.languages.setMonarchTokensProvider(LANGUAGE_ID, kustoLanguageDefinition);
}

// Registers semantic token provider that utilizes the language service
// for more context-relevant syntax highlighting.
export function registerDocumentSemanticTokensProvider(worker: IKustoWorkerImpl, monacoInstance: typeof monaco) {
    const semanticTokensProvider = semanticTokensProviderMaker(worker);
    return executeSemanticTokensProviderRegistrationForTests(monacoInstance, semanticTokensProvider);
}

export function executeSemanticTokensProviderRegistrationForTests(
    monacoInstance: typeof monaco,
    semanticTokensProvider: SemanticTokensProvider
) {
    return monacoInstance.languages.registerDocumentSemanticTokensProvider(LANGUAGE_ID, semanticTokensProvider);
}

function semanticTokensProviderMaker(worker: IKustoWorkerImpl): SemanticTokensProvider {
    return new SemanticTokensProvider(worker.getClassifications);
}
