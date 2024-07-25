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
        return { tokenTypes, tokenModifiers: [] };
    }

    async provideDocumentSemanticTokens(model: editor.ITextModel) {
        const resource = model.uri;
        const classifications = await this.classificationsGetter(resource);
        const semanticTokens = classifications.map((classification, index) => {
            const previousClassification = classifications[index - 1];
            return semanticTokenMaker(classification, previousClassification);
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
    previousClassification: ClassificationRange = emptyClassification
): DocumentSemanticToken {
    const { line, character, length, kind } = classification;
    const deltaLine = line - previousClassification.line;
    const deltaStart = deltaLine ? character : character - previousClassification.character;

    return [deltaLine, deltaStart, length, kind, 0];
}
