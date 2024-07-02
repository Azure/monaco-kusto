import { SemanticTokensProvider } from './SemanticTokensProvider';

describe('SemanticTokensProvider', () => {
    let semanticTokensProvider: SemanticTokensProvider;

    beforeEach(() => {
        const dummyWorker = (semanticTokensProvider = new SemanticTokensProvider());
    });

    test('getLegend returns relevant tokes', async () => {
        const legend = semanticTokensProvider.getLegend();
        expect(legend).toStrictEqual({
            tokenTypes: ['whatever', 'comment', 'string'],
            tokenModifiers: [],
        });
    });
});
