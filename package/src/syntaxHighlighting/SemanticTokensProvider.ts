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
            return semanticTokenMaker(classification, previousClassification, model);
        });

        return {
            data: new Uint32Array(semanticTokens.flat(2)),
            resultId: model.getVersionId().toString(),
        };
    }

    releaseDocumentSemanticTokens() {}
}

const emptyClassification = { line: 0, character: 0, length: 0, kind: 0 };

function semanticTokenMaker(
    classification: ClassificationRange,
    previous: ClassificationRange = emptyClassification,
    model: editor.ITextModel
): DocumentSemanticToken | DocumentSemanticToken[] {
    const { line, character, length, kind } = classification;

    const prevLine = shouldWrapLine(previous, model) ? previous.line + 1 : previous.line;
    const deltaLine = line - prevLine;
    const deltaChar = deltaLine ? character : character - previous.character;

    if (shouldWrapLine(classification, model)) {
        return splitTokenAcrossLines(deltaLine, deltaChar, character, length, kind, model, line);
    }

    return [deltaLine, deltaChar, length, kind, 0];
}

function shouldWrapLine(classification: ClassificationRange, model: editor.ITextModel): boolean {
    const { line, character, length } = classification;
    const lineLength = model.getLineLength(line + 1);
    return character + length > lineLength;
}

function splitTokenAcrossLines(
    deltaLine: number,
    deltaChar: number,
    character: number,
    length: number,
    kind: number,
    model: editor.ITextModel,
    line: number
): DocumentSemanticToken[] {
    const lineLength = model.getLineLength(line + 1);
    const firstPartLength = lineLength - character + 1;
    const secondPartLength = length - firstPartLength;

    return [
        [deltaLine, deltaChar, firstPartLength, kind, 0],
        [deltaLine + 1, 0, secondPartLength, kind, 0],
    ];
}
