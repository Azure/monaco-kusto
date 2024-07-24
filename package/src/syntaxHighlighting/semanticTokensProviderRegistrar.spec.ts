import monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { test, describe, expect } from '@jest/globals';
import {
    SemanticTokensProviderRegistrar,
    semanticTokensProviderRegistrarCreatorForTest,
} from './semanticTokensProviderRegistrar';
import { SemanticTokensProvider } from './SemanticTokensProvider';

describe('semanticTokensProviderRegistrar', () => {
    let semanticTokensProviderRegistrar: SemanticTokensProviderRegistrar;
    let monacoInstanceMockWrapper: MonacoInstanceMockWrapper;
    let semanticTokensProviderMock: SemanticTokensProvider;

    beforeEach(() => {
        semanticTokensProviderRegistrar = semanticTokensProviderRegistrarCreatorForTest();
        monacoInstanceMockWrapper = new MonacoInstanceMockWrapper();
        semanticTokensProviderMock = jest.fn() as unknown as SemanticTokensProvider;
    });

    test('registers document semantic tokens provider', () => {
        semanticTokensProviderRegistrar(monacoInstanceMockWrapper.getMonacoInstance(), semanticTokensProviderMock);
        expect(monacoInstanceMockWrapper.getRegisteredProvidersCount()).toBe(1);
    });

    test('dispose of the previous document semantic tokens provider when registering a new one.', () => {
        semanticTokensProviderRegistrar(monacoInstanceMockWrapper.getMonacoInstance(), semanticTokensProviderMock);
        semanticTokensProviderRegistrar(monacoInstanceMockWrapper.getMonacoInstance(), semanticTokensProviderMock);
        expect(monacoInstanceMockWrapper.getRegisteredProvidersCount()).toBe(1);
    });
});

class MonacoInstanceMockWrapper {
    private registeredProvidersCount: number;
    private readonly monacoInstance: typeof monaco;

    constructor() {
        this.registeredProvidersCount = 0;
        this.monacoInstance = {
            languages: {
                registerDocumentSemanticTokensProvider: jest.fn().mockImplementation((languageId) => {
                    this.registeredProvidersCount += 1;
                    return {
                        dispose: jest.fn().mockImplementation(() => {
                            this.registeredProvidersCount -= 1;
                        }),
                    };
                }),
            },
        } as unknown as typeof monaco;
    }

    public getRegisteredProvidersCount() {
        return this.registeredProvidersCount;
    }

    public getMonacoInstance() {
        return this.monacoInstance;
    }
}
