import type * as monaco from 'monaco-editor';
import { ClassificationRange, DocumentSemanticToken, tokens } from './types';
import { editor } from 'monaco-editor';

type ClassificationsGetter = (resource: monaco.Uri) => Promise<ClassificationRange[]>;

export class SemanticTokensProvider implements monaco.languages.DocumentSemanticTokensProvider {
    private readonly classificationsGetter: ClassificationsGetter;
    private semanticTokens: DocumentSemanticToken[];

    constructor(classificationsGetter: ClassificationsGetter) {
        this.classificationsGetter = classificationsGetter;
    }

    getLegend() {
        const tokenTypes: tokens[] = [tokens.whatever, tokens.comment, tokens.string];
        return { tokenTypes, tokenModifiers: [] };
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

    releaseDocumentSemanticTokens(resultId) {}

    private classificationsToDocumentSemanticTokens(classifications: ClassificationRange[]): DocumentSemanticToken[] {
        const emptyClassification = { line: 0, character: 0, length: 0, kind: 0 };
        return classifications.map((classification, index) => {
            const last = classifications[index - 1] ?? emptyClassification;
            const { line, character, length, kind } = classification;

            const deltaLine = line - last.line;
            const deltaStart = deltaLine ? 0 : character - last.character;

            return [deltaLine, deltaStart, length, kind, 0];
        });
    }
}
