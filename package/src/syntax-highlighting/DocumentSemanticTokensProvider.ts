import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { AugmentedWorkerAccessor } from '../kustoMode';

export class SemanticTokensProvider implements monaco.languages.DocumentSemanticTokensProvider {
    private workerAccessor: AugmentedWorkerAccessor;

    constructor(workerAccessor: AugmentedWorkerAccessor) {
        this.workerAccessor = workerAccessor;
    }

    getLegend() {
        const tokenTypesLegend = [
            'table', // 0
            'column', // 1
        ];
        const modifiersLegend = ['somemod'];

        return { tokenTypes: tokenTypesLegend, tokenModifiers: [] };
    }

    async provideDocumentSemanticTokens(model, lastResultId, token) {
        console.log('provideDocumentSemanticTokens');
        const result = {
            data: new Uint32Array([0, 0, 11, 0, 0]),
            resultId: undefined,
        };
        return result;
    }
    releaseDocumentSemanticTokens(resultId) {
        console.log('releaseDocumentSemanticTokens', resultId);
    }
}
