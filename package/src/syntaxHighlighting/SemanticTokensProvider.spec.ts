import monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { test, describe, expect, jest } from '@jest/globals';
import { SemanticTokensProvider } from './SemanticTokensProvider';
import { ClassificationRange } from './types';

describe('SemanticTokensProvider', () => {
    function makeModel(uri: monaco.Uri): monaco.editor.ITextModel {
        return {
            uri,
            getVersionId: () => 1,
            getLineCount: () => 0,
            getLineLength: () => 0,
        } as unknown as monaco.editor.ITextModel;
    }

    const uri = { toString: () => 'file:///a.kql' } as unknown as monaco.Uri;

    test('invokes onTokensProvided with the model resource after producing tokens', async () => {
        const onTokensProvided = jest.fn();
        const classifications: ClassificationRange[] = [];
        const provider = new SemanticTokensProvider(async () => classifications, onTokensProvided);

        await provider.provideDocumentSemanticTokens(makeModel(uri));

        // add before
        expect(onTokensProvided).toHaveBeenCalledTimes(1);
        expect(onTokensProvided).toHaveBeenCalledWith(uri);
    });

    test('does not throw when no onTokensProvided callback is supplied', async () => {
        const provider = new SemanticTokensProvider(async () => []);

        await expect(
            provider.provideDocumentSemanticTokens(makeModel(uri))
        ).resolves.toEqual(
            expect.objectContaining({
                data: expect.any(Uint32Array),
                resultId: '1',
            })
        );
    });

    test('returns the expected tokens shape', async () => {
        const provider = new SemanticTokensProvider(async () => []);

        const result = await provider.provideDocumentSemanticTokens(
            makeModel(uri)
        );

        expect(result.data).toBeInstanceOf(Uint32Array);
        expect(result.data.length).toBe(0);
        expect(result.resultId).toBe('1');
    });
});
