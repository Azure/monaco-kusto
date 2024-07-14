import type * as monaco from 'monaco-editor';
import { editor } from 'monaco-editor';
import { ClassificationRange, DocumentSemanticToken, tokenTypes } from './types';

type ClassificationsGetter = (resource: monaco.Uri) => Promise<ClassificationRange[]>;

export class SemanticTokensProvider implements monaco.languages.DocumentSemanticTokensProvider {
    private readonly classificationsGetter: ClassificationsGetter;

    constructor(classificationsGetter: ClassificationsGetter) {
        this.classificationsGetter = classificationsGetter;
    }

    getLegend() {
        return { tokenTypes: tokenTypes, tokenModifiers: [] };
    }

    async provideDocumentSemanticTokens(model: editor.ITextModel) {
        const resource = model.uri;
        const classifications = await this.classificationsGetter(resource);
        const semanticTokens = classifications.map((classification, index) => {
            const last = classifications[index - 1];
            return semanticTokenMaker(classification, last);
        });

        return {
            data: new Uint32Array(semanticTokens.flat()),
            resultId: model.getVersionId().toString(),
        };
    }

    releaseDocumentSemanticTokens() {}
}

const emptyClassification = { line: 0, character: 0, length: 0, kind: 0 };
function semanticTokenMaker(
    classification: ClassificationRange,
    lastClassification: ClassificationRange = emptyClassification
): DocumentSemanticToken {
    const { line, character, length, kind } = classification;
    const deltaLine = line - lastClassification.line;
    const deltaStart = deltaLine ? character : character - lastClassification.character;

    return [deltaLine, deltaStart, length, kind, 0];
}
