import { SemanticTokensProvider } from './SemanticTokensProvider';
import { Uri, editor } from 'monaco-editor';

describe('SemanticTokensProvider', () => {
    let classificationsGetterMock: jest.Mock;
    let semanticTokensProvider: SemanticTokensProvider;

    beforeEach(() => {
        classificationsGetterMock = jest.fn();
        semanticTokensProvider = new SemanticTokensProvider(classificationsGetterMock);
    });

    test('getLegend returns relevant tokes', async () => {
        semanticTokensProvider = new SemanticTokensProvider(classificationsGetterMock);
        const legend = semanticTokensProvider.getLegend();
        expect(legend).toStrictEqual({
            tokenTypes: ['whatever', 'comment', 'string'],
            tokenModifiers: [],
        });
    });

    describe('provideDocumentSemanticTokes', () => {
        let dummyModel: editor.ITextModel;

        beforeEach(() => {
            dummyModel = {
                uri: Uri.parse('inmemory://model/1'),
                id: 'test-model-id',
                getVersionId: jest.fn().mockReturnValue(1),
            } as unknown as editor.ITextModel;
        });

        it('returns empty array for empty document', () => {
            classificationsGetterMock = jest.fn().mockResolvedValue([]);
            semanticTokensProvider = new SemanticTokensProvider(classificationsGetterMock);

            const semanticTokens = semanticTokensProvider.provideDocumentSemanticTokens(dummyModel);

            expect(semanticTokens).resolves.toStrictEqual({ data: [], resultId: '1' });
        });
    });
});
