import monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { test, describe, expect } from '@jest/globals';
import {
    executeSemanticTokensProviderRegistrationForTests,
    setMonarchTokensProvider,
} from './syntaxHighlightingRegistrar';
import { LANGUAGE_ID } from '../globals';
import { kustoLanguageDefinition } from './kustoMonarchLanguageDefinition';
import { SemanticTokensProvider } from './SemanticTokensProvider';

describe('executeSyntaxHighlightingRegistration', () => {
    let semanticTokensProvider: SemanticTokensProvider;
    let monacoInstance: typeof monaco;

    beforeEach(() => {
        monacoInstance = {
            languages: {
                setMonarchTokensProvider: jest.fn(),
                registerDocumentSemanticTokensProvider: jest.fn(),
            },
        } as unknown as typeof monaco;
        semanticTokensProvider = jest.fn() as unknown as SemanticTokensProvider;
    });

    test('sets monarch tokens provider', () => {
        setMonarchTokensProvider(monacoInstance);
        expect(monacoInstance.languages.setMonarchTokensProvider).toBeCalledWith(LANGUAGE_ID, kustoLanguageDefinition);
    });

    test('registers document semantic tokens provider', () => {
        executeSemanticTokensProviderRegistrationForTests(monacoInstance, semanticTokensProvider);
        expect(monacoInstance.languages.registerDocumentSemanticTokensProvider).toBeCalledWith(
            LANGUAGE_ID,
            semanticTokensProvider
        );
    });
});
