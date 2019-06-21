import IWorkerContext = monaco.worker.IWorkerContext;

import * as kustoService from './languageService/kustoLanguageService';
import { Schema, showSchema } from './languageService/schema';
import * as ls from 'vscode-languageserver-types';
import { ColorizationRange } from './languageService/kustoLanguageService';

export class KustoWorker {

	// --- model sync -----------------------

	private _ctx:IWorkerContext;
	private _languageService: kustoService.LanguageService;
	private _languageId: string;
	private _languageSettings: kustoService.LanguageSettings;

	constructor(ctx:IWorkerContext, createData: ICreateData) {
		this._ctx = ctx;
		this._languageSettings = createData.languageSettings;
		this._languageService = kustoService.getKustoLanguageService();
		this._languageService.configure(this._languageSettings);
	}

	// --- language service host ---------------

	setSchema(schema: Schema) {
		return this._languageService.setSchema(schema);
	}

    setSchemaFromShowSchema(schema: any, clusterConnectionString: string, databaseInContextName: string) {
		return this._languageService.setSchemaFromShowSchema(schema, clusterConnectionString, databaseInContextName);
	};

	normalizeSchema(schema: showSchema.Result, clusterConnectionString: string, databaseInContextName: string) {
		return this._languageService.normalizeSchema(schema, clusterConnectionString, databaseInContextName);
	}

	getSchema(): Promise<Schema> {
		return this._languageService.getSchema();
	}

	getCommandInContext(uri: string, cursorOffest: number): Promise<string | null> {
		const document = this._getTextDocument(uri);
		if (!document) {
			console.error(`getCommandInContext: document is ${document}. uri is ${uri}`);
			return null;
		}

		const commandInContext = this._languageService.getCommandInContext(document, cursorOffest);
		if (commandInContext === undefined) {
			return null;
		}

		return commandInContext;
	}

	getCommandsInDocument(uri: string): Promise<{absoluteStart: number, absoluteEnd: number, text: string}[]> {
		const document = this._getTextDocument(uri);
		if (!document) {
			console.error(`getCommandInDocument: document is ${document}. uri is ${uri}`);
			return null;
		}

		return this._languageService.getCommandsInDocument(document);
	}

    doComplete(uri: string, position: ls.Position): Promise<ls.CompletionList> {
		let document = this._getTextDocument(uri);
		let completions = this._languageService.doComplete(document, position);
		return completions;
	}

	doValidation(uri: string, intervals: {start: number, end: number}[]): Promise<ls.Diagnostic[]> {
		const document = this._getTextDocument(uri);
		const diagnostics = this._languageService.doValidation(document, intervals);
		return diagnostics;
	}

	doRangeFormat(uri: string, range: ls.Range): Promise<ls.TextEdit[]> {
		const document = this._getTextDocument(uri);
		const formatted = this._languageService.doRangeFormat(document, range);
		return formatted;
	}

	doFolding(uri: string): Promise<ls.FoldingRange[]> {
		const document = this._getTextDocument(uri);
		const folding = this._languageService.doFolding(document);
		return folding;
	}

	doDocumentFormat(uri: string): Promise<ls.TextEdit[]> {
		const document = this._getTextDocument(uri);
		const formatted = this._languageService.doDocumentformat(document);
		return formatted;
	}

	doCurrentCommandFormat(uri: string, caretPosition: ls.Position): Promise<ls.TextEdit[]> {
		const document = this._getTextDocument(uri);
		const formatted = this._languageService.doCurrentCommandFormat(document, caretPosition)
		return formatted;
	}

	// Colorize document. if offsets provided, will only colorize commands at these offsets. otherwise - will color the entire document.
	doColorization(
		uri: string,
		colorizationIntervals: {start: number, end: number}[]):
			Promise<ColorizationRange[]> {
		const document = this._getTextDocument(uri);
		const colorizationInfo: Promise<ColorizationRange[]> = this._languageService.doColorization(document, colorizationIntervals);
		return colorizationInfo;
	}

	getClientDirective(text: string): Promise<{isClientDirective: boolean, directiveWithoutLeadingComments: string}> {
		return this._languageService.getClientDirective(text);
	}

	getAdminCommand(text: string): Promise<{isAdminCommand: boolean, adminCommandWithoutLeadingComments: string}> {
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
	languageSettings: kustoService.LanguageSettings;
}

export function create(ctx:IWorkerContext, createData: ICreateData): KustoWorker {
	return new KustoWorker(ctx, createData);
}
