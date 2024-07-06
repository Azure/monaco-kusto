import type * as monaco from 'monaco-editor';
import { editor } from 'monaco-editor';
import { ClassificationRange, DocumentSemanticToken, tokenTypes } from './types';

type ClassificationsGetter = (resource: monaco.Uri) => Promise<ClassificationRange[]>;

export class SemanticTokensProvider implements monaco.languages.DocumentSemanticTokensProvider {
    private readonly classificationsGetter: ClassificationsGetter;
    private dataCache: Uint32Array;
    private lastVersionId: string;

    constructor(classificationsGetter: ClassificationsGetter) {
        this.classificationsGetter = classificationsGetter;
    }

    getLegend() {
        return { tokenTypes: tokenTypes, tokenModifiers: [] };
    }

    async provideDocumentSemanticTokens(model: editor.ITextModel) {
        const currentVersionId = model.getVersionId().toString();
        if (this.lastVersionId === currentVersionId) {
            // theme changed, but the document didn't
            return { data: this.dataCache, resultId: currentVersionId };
        }

        const resource = model.uri;
        const classifications = await this.classificationsGetter(resource);
        const semanticTokens = classifications.map((classification, index) => {
            const last = classifications[index - 1];
            return semanticTokenMaker(classification, last);
        });

        this.dataCache = new Uint32Array(semanticTokens.flat());
        this.lastVersionId = currentVersionId;

        return {
            data: this.dataCache,
            resultId: this.lastVersionId,
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
