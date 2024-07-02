import type * as monaco from 'monaco-editor';
import { AugmentedWorkerAccessor } from '../kustoMode';
import { ClassificationRange, DocumentSemanticToken, tokens } from './types';

export class SemanticTokensProvider implements monaco.languages.DocumentSemanticTokensProvider {
    private readonly worker: AugmentedWorkerAccessor;
    private readonly monacoInstance: typeof monaco;
    private lastVersionId: number;

    constructor(worker: AugmentedWorkerAccessor, monacoInstance: typeof monaco) {
        this.worker = worker;
        this.monacoInstance = monacoInstance;

        this.registerOnChangeEvent();
    }

    getLegend() {
        const tokenTypes: tokens[] = [tokens.whatever, tokens.comment, tokens.string];
        return { tokenTypes, tokenModifiers: [] };
    }

    async provideDocumentSemanticTokens(model, lastResultId, token) {
        const currentVersionId = model.getVersionId();

        const resource = model.uri;
        const worker = await this.worker(resource);
        const classifications = await worker.getClassifications(resource.toString());
        const semanticTokens = this.classificationToDocumentSemanticToken(classifications);
        const data = new Uint32Array(semanticTokens.flatMap((el) => el));

        return {
            data,
            resultId: undefined,
        };
    }
    releaseDocumentSemanticTokens(resultId) {
        this.lastVersionId = resultId;
    }

    private registerOnChangeEvent() {
        const models = this.monacoInstance.editor.getModels();
        models.forEach((model: monaco.editor.IModel) => {
            model.onDidChangeContent((e) => {
                console.log('onDidChangeContent', e);
            });
        });
    }

    private classificationToDocumentSemanticToken(classifications: ClassificationRange[]): DocumentSemanticToken[] {
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
