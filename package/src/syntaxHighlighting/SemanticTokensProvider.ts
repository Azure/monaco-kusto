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

        const tokens: DocumentSemanticToken[] = [];
        let prevLine = 0;
        let prevChar = 0;

        for (const classification of classifications) {
            const parts = toSemanticTokens(classification, model);

            for (const part of parts) {
                const [absLine, absChar, length, kind, modifiers] = part;

                const deltaLine = absLine - prevLine;
                const deltaChar = deltaLine === 0 ? absChar - prevChar : absChar;

                tokens.push([deltaLine, deltaChar, length, kind, modifiers]);

                prevLine = absLine;
                prevChar = absChar;
            }
        }

        return {
            data: new Uint32Array(tokens.flat(2)),
            resultId: model.getVersionId().toString(),
        };
    }

    releaseDocumentSemanticTokens() {}
}

function toSemanticTokens(classification: ClassificationRange, model: editor.ITextModel): DocumentSemanticToken[] {
    const { line, character, length, kind } = classification;
    const tokens: DocumentSemanticToken[] = [];

    let remainingLength = length;
    let currentLine = line;
    let currentChar = character;

    while (remainingLength > 0 && currentLine < model.getLineCount()) {
        const lineLength = model.getLineLength(currentLine + 1);
        const available = lineLength - currentChar + 1;
        const tokenLength = Math.min(remainingLength, available);

        tokens.push([currentLine, currentChar, tokenLength, kind, 0]);

        remainingLength -= tokenLength;
        currentLine++;
        currentChar = 0; // reset for next line
    }

    return tokens;
}
