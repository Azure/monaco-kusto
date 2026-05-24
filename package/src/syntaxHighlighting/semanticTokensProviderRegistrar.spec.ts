import type monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { test, describe, expect } from '@jest/globals';
import {
    SemanticTokensProviderRegistrar,
    semanticTokensProviderRegistrarCreator,
    semanticTokensProviderRegistrarCreatorForTest,
} from './semanticTokensProviderRegistrar';
import { SemanticTokensProvider } from './SemanticTokensProvider';
import type { AugmentedWorkerAccessor } from '../kustoMode';

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

    test('forwards onTokensProvided callback to the created SemanticTokensProvider', async () => {
        const onTokensProvided = jest.fn();
        const registrar = semanticTokensProviderRegistrarCreator(onTokensProvided);
        const wrapper = new MonacoInstanceMockWrapper();
        const workerAccessor = (() =>
            Promise.resolve({
                getClassifications: async () => [],
            })) as unknown as AugmentedWorkerAccessor;

        registrar(wrapper.getMonacoInstance(), workerAccessor);

        const provider = wrapper.getLastRegisteredProvider();

        const resource = { toString: () => 'file:///x.kql' } as unknown as monaco.Uri;
        const model = {
            uri: resource,
            getVersionId: () => 1,
            getLineCount: () => 0,
            getLineLength: () => 0,
        } as unknown as monaco.editor.ITextModel;

        expect(onTokensProvided).not.toHaveBeenCalled();

        await provider!.provideDocumentSemanticTokens(model);

        expect(onTokensProvided).toHaveBeenCalledTimes(1);
        expect(onTokensProvided).toHaveBeenCalledWith(resource);
    });
});

class MonacoInstanceMockWrapper {
    private registeredProvidersCount: number;
    private lastRegisteredProvider: SemanticTokensProvider | undefined;
    private readonly monacoInstance: typeof monaco;

    constructor() {
        this.registeredProvidersCount = 0;
        this.monacoInstance = {
            languages: {
                registerDocumentSemanticTokensProvider: jest.fn().mockImplementation((_languageId, provider) => {
                    this.registeredProvidersCount += 1;
                    this.lastRegisteredProvider = provider;
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

    public getLastRegisteredProvider() {
        return this.lastRegisteredProvider;
    }

    public getMonacoInstance() {
        return this.monacoInstance;
    }
}
