import IWorkerContext = monaco.worker.IWorkerContext;

import * as kustoService from './languageService/kustoLanguageService';
import { LanguageSettings } from './languageService/settings';
import { Schema, showSchema, ScalarParameter, Database } from './languageService/schema';
import * as ls from 'vscode-languageserver-types';
import { ColorizationRange } from './languageService/kustoLanguageService';
import { RenderInfo } from './languageService/renderInfo';
import { FoldingRange } from 'vscode-languageserver-types';

export class KustoWorker {
    // --- model sync -----------------------

    private _ctx: IWorkerContext;
    private _languageService: kustoService.LanguageService;
    private _languageId: string;
    private _languageSettings: LanguageSettings;

    constructor(ctx: IWorkerContext, createData: ICreateData) {
        this._ctx = ctx;
        this._languageSettings = createData.languageSettings;
        this._languageService = kustoService.getKustoLanguageService();
        this._languageService.configure(this._languageSettings);
    }

    // --- language service host ---------------

    setSchema(schema: Schema) {
        return this._languageService.setSchema(schema);
    }

    addClusterToSchema(uri: string, clusterName: string, databasesNames: string[]): Promise<void> {
        const document = this._getTextDocument(uri);
        if (!document) {
            console.error(`addClusterToSchema: document is ${document}. uri is ${uri}`);
            return null;
        }
        return this._languageService.addClusterToSchema(document, clusterName, databasesNames);
    }

    addDatabaseToSchema(uri: string, clusterName: string, databaseSchema: Database): Promise<void> {
        const document = this._getTextDocument(uri);
        if (!document) {
            console.error(`addDatabaseToSchema: document is ${document}. uri is ${uri}`);
            return null;
        }
        return this._languageService.addDatabaseToSchema(document, clusterName, databaseSchema);
    }

    setSchemaFromShowSchema(schema: any, clusterConnectionString: string, databaseInContextName: string) {
        return this._languageService.setSchemaFromShowSchema(schema, clusterConnectionString, databaseInContextName);
    }

    normalizeSchema(schema: showSchema.Result, clusterConnectionString: string, databaseInContextName: string) {
        return this._languageService.normalizeSchema(schema, clusterConnectionString, databaseInContextName);
    }

    getSchema(): Promise<Schema> {
        return this._languageService.getSchema();
    }

    getCommandInContext(uri: string, cursorOffset: number): Promise<string | null> {
        const document = this._getTextDocument(uri);
        if (!document) {
            console.error(`getCommandInContext: document is ${document}. uri is ${uri}`);
            return null;
        }

        const commandInContext = this._languageService.getCommandInContext(document, cursorOffset);
        if (commandInContext === undefined) {
            return null;
        }

        return commandInContext;
    }

    getQueryParams(uri: string, cursorOffset: number): Promise<{ name: string; type: string }[]> {
        const document = this._getTextDocument(uri);
        if (!document) {
            console.error(`getQueryParams: document is ${document}. uri is ${uri}`);
            return null;
        }

        const queryParams = this._languageService.getQueryParams(document, cursorOffset);
        if (queryParams === undefined) {
            return null;
        }

        return queryParams;
    }

    getGlobalParams(uri: string): Promise<{ name: string; type: string }[]> {
        const document = this._getTextDocument(uri);
        if (!document) {
            console.error(`getGLobalParams: document is ${document}. uri is ${uri}`);
            return null;
        }

        const globalParams = this._languageService.getGlobalParams(document);
        if (globalParams === undefined) {
            return null;
        }

        return globalParams;
    }

    getReferencedGlobalParams(uri: string, cursorOffest: number): Promise<{ name: string; type: string }[]> {
        const document = this._getTextDocument(uri);
        if (!document) {
            console.error(`getReferencedGlobalParams: document is ${document}. uri is ${uri}`);
            return null;
        }

        const referencedParams = this._languageService.getReferencedGlobalParams(document, cursorOffest);
        if (referencedParams === undefined) {
            return null;
        }

        return referencedParams;
    }

    getRenderInfo(uri: string, cursorOffset: number): Promise<RenderInfo | null> {
        const document = this._getTextDocument(uri);
        if (!document) {
            console.error(`getRenderInfo: document is ${document}. uri is ${uri}`);
        }

        return this._languageService.getRenderInfo(document, cursorOffset).then((result) => {
            if (!result) {
                return null;
            }

            return result;
        });
    }

    /**
     * Get command in context and the command range.
     * This method will basically convert generate microsoft language service interface to monaco interface.
     * @param uri document URI
     * @param cursorOffset offset from start of document to cursor
     */
    getCommandAndLocationInContext(
        uri: string,
        cursorOffset: number
    ): Promise<{ text: string; range: monaco.IRange } | null> {
        const document = this._getTextDocument(uri);
        if (!document) {
            console.error(`getCommandAndLocationInContext: document is ${document}. uri is ${uri}`);
            return Promise.resolve(null);
        }

        return this._languageService.getCommandAndLocationInContext(document, cursorOffset).then((result) => {
            if (!result) {
                return null;
            }

            // convert to monaco object.
            const {
                text,
                location: {
                    range: { start, end },
                },
            } = result;
            const range = new monaco.Range(start.line + 1, start.character + 1, end.line + 1, end.character + 1);
            return {
                range,
                text,
            };
        });
    }

    getCommandsInDocument(uri: string): Promise<{ absoluteStart: number; absoluteEnd: number; text: string }[]> {
        const document = this._getTextDocument(uri);
        if (!document) {
            console.error(`getCommandInDocument: document is ${document}. uri is ${uri}`);
            return null;
        }

        return this._languageService.getCommandsInDocument(document);
    }

    doComplete(uri: string, position: ls.Position): Promise<ls.CompletionList> {
        let document = this._getTextDocument(uri);
        if (!document) {
            return null;
        }

        let completions = this._languageService.doComplete(document, position);
        return completions;
    }

    doValidation(uri: string, intervals: { start: number; end: number }[]): Promise<ls.Diagnostic[]> {
        const document = this._getTextDocument(uri);
        const diagnostics = this._languageService.doValidation(document, intervals);
        return diagnostics;
    }

    doRangeFormat(uri: string, range: ls.Range): Promise<ls.TextEdit[]> {
        const document = this._getTextDocument(uri);
        const formatted = this._languageService.doRangeFormat(document, range);
        return formatted;
    }

    doFolding(uri: string): Promise<FoldingRange[]> {
        const document = this._getTextDocument(uri);
        const folding = this._languageService.doFolding(document);
        return folding;
    }

    doDocumentFormat(uri: string): Promise<ls.TextEdit[]> {
        const document = this._getTextDocument(uri);
        const formatted = this._languageService.doDocumentFormat(document);
        return formatted;
    }

    doCurrentCommandFormat(uri: string, caretPosition: ls.Position): Promise<ls.TextEdit[]> {
        const document = this._getTextDocument(uri);
        const formatted = this._languageService.doCurrentCommandFormat(document, caretPosition);
        return formatted;
    }

    // Colorize document. if offsets provided, will only colorize commands at these offsets. otherwise - will color the entire document.
    doColorization(uri: string, colorizationIntervals: { start: number; end: number }[]): Promise<ColorizationRange[]> {
        const document = this._getTextDocument(uri);
        const colorizationInfo: Promise<ColorizationRange[]> = this._languageService.doColorization(
            document,
            colorizationIntervals
        );
        return colorizationInfo;
    }

    getClientDirective(text: string): Promise<{ isClientDirective: boolean; directiveWithoutLeadingComments: string }> {
        return this._languageService.getClientDirective(text);
    }

    getAdminCommand(text: string): Promise<{ isAdminCommand: boolean; adminCommandWithoutLeadingComments: string }> {
        return this._languageService.getAdminCommand(text);
    }

    findDefinition(uri: string, position: ls.Position) {
        const document = this._getTextDocument(uri);
        const definition = this._languageService.findDefinition(document, position);
        return definition;
    }

    findReferences(uri: string, position: ls.Position) {
        let document = this._getTextDocument(uri);
        const references = this._languageService.findReferences(document, position);
        return references;
    }

    doRename(uri: string, position: ls.Position, newName: string) {
        const document = this._getTextDocument(uri);
        const workspaceEdit = this._languageService.doRename(document, position, newName);
        return workspaceEdit;
    }

    doHover(uri: string, position: ls.Position) {
        let document = this._getTextDocument(uri);
        let hover = this._languageService.doHover(document, position);
        return hover;
    }

    setParameters(parameters: ScalarParameter[]) {
        return this._languageService.setParameters(parameters);
    }

    getClusterReferences(uri: string, cursorOffset: number): Promise<kustoService.ClusterReference[]> {
        let document = this._getTextDocument(uri);
        return this._languageService.getClusterReferences(document, cursorOffset);
    }

    getDatabaseReferences(uri: string, cursorOffset: number): Promise<kustoService.DatabaseReference[]> {
        let document = this._getTextDocument(uri);
        return this._languageService.getDatabaseReferences(document, cursorOffset);
    }

    private _getTextDocument(uri: string): ls.TextDocument {
        let models = this._ctx.getMirrorModels();
        for (let model of models) {
            if (model.uri.toString() === uri) {
                return ls.TextDocument.create(uri, this._languageId, model.version, model.getValue());
            }
        }
        return null;
    }
}

export interface ICreateData {
    languageId: string;
    languageSettings: LanguageSettings;
}

export function create(ctx: IWorkerContext, createData: ICreateData): KustoWorker {
    return new KustoWorker(ctx, createData);
}
