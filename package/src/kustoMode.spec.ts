import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { test, describe, expect, jest, beforeEach } from '@jest/globals';
import type { Schema } from './languageServiceManager/schema';
import { setupMode, getKustoWorker } from './kustoMode';

// Capture the onTokensProvided callback passed to semanticTokensProviderRegistrarCreator.
let capturedOnTokensProvided: ((uri: monaco.Uri) => void) | undefined;

jest.mock('./syntaxHighlighting/semanticTokensProviderRegistrar', () => ({
    semanticTokensProviderRegistrarCreator: (onTokensProvided?: (uri: monaco.Uri) => void) => {
        capturedOnTokensProvided = onTokensProvided;
        return () => {
            /* noop registrar */
        };
    },
}));

const setSchemaMock = jest.fn(async (_schema: Schema) => undefined);

jest.mock('./workerManager', () => ({
    WorkerManager: jest.fn().mockImplementation(() => ({
        getLanguageServiceWorker: jest.fn(async () => ({
            setSchema: setSchemaMock,
            normalizeSchema: jest.fn(),
            getClassifications: jest.fn(async () => []),
        })),
    })),
}));

jest.mock('./languageFeatures', () => {
    const noop = jest.fn();
    return {
        DiagnosticsAdapter: noop,
        CompletionAdapter: noop,
        DefinitionAdapter: noop,
        ReferenceAdapter: noop,
        RenameAdapter: noop,
        DocumentFormatAdapter: noop,
        FormatAdapter: noop,
        FoldingAdapter: noop,
        HoverAdapter: noop,
    };
});


function makeMonacoInstance(): any {
    return {
        languages: {
            registerCompletionItemProvider: jest.fn(),
            setMonarchTokensProvider: jest.fn(),
            registerDocumentRangeFormattingEditProvider: jest.fn(),
            registerFoldingRangeProvider: jest.fn(),
            registerDefinitionProvider: jest.fn(),
            registerRenameProvider: jest.fn(),
            registerReferenceProvider: jest.fn(),
            registerHoverProvider: jest.fn(),
            registerDocumentFormattingEditProvider: jest.fn(),
            registerDocumentSemanticTokensProvider: jest.fn(() => ({ dispose: jest.fn() })),
            setLanguageConfiguration: jest.fn(),
        },
    } as unknown as any;
}

function makeDefaults(): any {
    return {
        languageSettings: { enableHover: true },
        onDidChange: jest.fn(),
    };
}

describe('setupMode onSchemaUpdateComplete wiring', () => {
    beforeEach(() => {
        capturedOnTokensProvided = undefined;
        setSchemaMock.mockClear();
    });
    const stubUri = { toString: () => 'file:///stub.kql' } as unknown as monaco.Uri;
    
    test('does not fire the emitter on setSchema alone (waits for semantic tokens)', async () => {
        const emitter = new monaco.Emitter<{ uri: monaco.Uri }>();
        const listener = jest.fn();
        emitter.event(listener);

        setupMode(makeDefaults(), makeMonacoInstance(), emitter);

        const accessor = await getKustoWorker();
        const worker = await accessor({} as monaco.Uri);
        await worker.setSchema({ foo: 'bar' } as unknown as Schema);

        expect(setSchemaMock).toHaveBeenCalled();
        expect(listener).not.toHaveBeenCalled();
    });

    test('fires the emitter when semantic tokens are produced', async () => {
        const emitter = new monaco.Emitter<{ uri: monaco.Uri }>();
        const listener = jest.fn();
        emitter.event(listener);

        setupMode(makeDefaults(), makeMonacoInstance(), emitter);
        
        const accessor = await getKustoWorker();
        const worker = await accessor({} as monaco.Uri);

        expect(listener).not.toHaveBeenCalled();
        
        await worker.setSchema({ table: 't' } as unknown as Schema);
        
        expect(capturedOnTokensProvided).toBeDefined();
        capturedOnTokensProvided!(stubUri);

        expect(listener).toHaveBeenCalledWith({ uri: stubUri });
    });

    test('does not throw when no emitter is supplied', async () => {
        expect(() => setupMode(makeDefaults(), makeMonacoInstance())).not.toThrow();

        const accessor = await getKustoWorker();
        const worker = await accessor({} as monaco.Uri);
        await expect(worker.setSchema({} as Schema)).resolves.toBeUndefined();

        expect(capturedOnTokensProvided).toBeDefined();
        expect(() => capturedOnTokensProvided!(stubUri)).not.toThrow();
    });
});
