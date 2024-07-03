import type * as monaco from 'monaco-editor';
import { editor } from 'monaco-editor';
import { ClassificationRange, DocumentSemanticToken, tokenTypes } from './types';

type ClassificationsGetter = (resource: monaco.Uri) => Promise<ClassificationRange[]>;

export class SemanticTokensProvider implements monaco.languages.DocumentSemanticTokensProvider {
    private readonly classificationsGetter: ClassificationsGetter;
    private semanticTokens: DocumentSemanticToken[];

    constructor(classificationsGetter: ClassificationsGetter) {
        this.classificationsGetter = classificationsGetter;
    }

    getLegend() {
        return { tokenTypes: tokenTypes, tokenModifiers: [] };
    }

    async provideDocumentSemanticTokens(model: editor.ITextModel) {
        const currentVersionId = model.getVersionId();
        const resource = model.uri;
        const classifications = await this.classificationsGetter(resource);
        const semanticTokens = this.classificationsToDocumentSemanticTokens(classifications);
        const data = new Uint32Array(semanticTokens.flatMap((el) => el));

        return {
            data,
            resultId: model.getVersionId().toString(),
        };
    }

    releaseDocumentSemanticTokens() {}

    private classificationsToDocumentSemanticTokens(classifications: ClassificationRange[]): DocumentSemanticToken[] {
        const emptyClassification = { line: 0, character: 0, length: 0, kind: 0 };
        return classifications.map((classification, index) => {
            const last = classifications[index - 1] ?? emptyClassification;
            const { line, character, length, kind } = classification;

            const deltaLine = line - last.line;
            const deltaStart = deltaLine ? character : character - last.character;

            return [deltaLine, deltaStart, length, kind, 0];
        });
    }
}
