import XRegExp from 'xregexp';

import * as ls from 'vscode-languageserver-types';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { FoldingRange } from 'vscode-languageserver-types';

import * as s from './schema';
import type { FormatterPlacementStyle, LanguageSettings } from './settings';

// Replaced with @kusto/language-server imports at build time
import 'language-service';

import k = Kusto.Data.IntelliSense;
import parsing = Kusto.Language.Parsing;
import k2 = Kusto.Language.Editor;
import sym = Kusto.Language.Symbols;
import GlobalState = Kusto.Language.GlobalState;

import { Database, EntityGroup, getCslTypeNameFromClrType, getEntityDataTypeFromCslType } from './schema';
import type { RenderOptions, VisualizationType, RenderOptionKeys, RenderInfo } from './renderInfo';
import type { ClusterReference, DatabaseReference } from '../types';
import { Mutable } from '../util';
import { ClassificationRange } from '../syntaxHighlighting/types';

let List = System.Collections.Generic.List$1;

function assertNever(x: never): never {
    throw new Error('Unexpected object: ' + x);
}

class ParseProperties {
    constructor(
        private version: number,
        private uri: string,
        private rulesProvider?: k.IntelliSenseRulesProviderBase,
        private parseMode?: k.ParseMode
    ) {}

    isParseNeeded(document: TextDocument, rulesProvider?: k.IntelliSenseRulesProviderBase, parseMode?: k.ParseMode) {
        if (
            document.uri === this.uri &&
            (!rulesProvider || rulesProvider === this.rulesProvider) &&
            document.version <= this.version &&
            parseMode &&
            parseMode <= this.parseMode
        ) {
            return false;
        }

        return true;
    }
}

export enum TokenKind {
    TableToken = 2,
    TableColumnToken = 4,
    OperatorToken = 8, // where, project, ...
    SubOperatorToken = 16, // has, contains, ...
    CalculatedColumnToken = 32,
    StringLiteralToken = 64,
    FunctionNameToken = 128,
    UnknownToken = 256,
    CommentToken = 512,
    PlainTextToken = 1024,
    DataTypeToken = 2048,
    ControlCommandToken = 4096,
    CommandPartToken = 8192,
    QueryParametersToken = 16384,
    CslCommandToken = 32768,
    LetVariablesToken = 65536,
    PluginToken = 131072,
    BracketRangeToken = 262144,
    ClientDirectiveToken = 524288,
}

/**
 * A plain old javascript object that is roughly equivalent to the @kusto/language-service-next object, but without
 * all the Bridge.Net properties and methods. this object is being sent from web worker to main thread and turns out
 * that when posting the message we lose all properties (and functions), thus we use a POJO instead.
 * This issue started happening once upgrading to 0.20.0 from 0.15.5.
 */
export interface ClassifiedRange {
    kind: k2.ClassificationKind;
    start: number;
    length: number;
    end: number;
}

/**
 * colorization data for specific line range.
 */
export interface ColorizationRange {
    classifications: ClassifiedRange[];
    absoluteStart: number;
    absoluteEnd: number;
}

const symbolKindToName = {
    [sym.SymbolKind.Cluster]: 'Cluster',
    [sym.SymbolKind.Column]: 'Column',
    [sym.SymbolKind.Command]: 'Command',
    [sym.SymbolKind.Database]: 'Database',
    [sym.SymbolKind.EntityGroup]: 'EntityGroup',
    [sym.SymbolKind.EntityGroupElement]: 'EntityGroupElement',
    [sym.SymbolKind.Error]: 'Error',
    [sym.SymbolKind.Function]: 'Function',
    [sym.SymbolKind.Graph]: 'Graph',
    [sym.SymbolKind.Group]: 'Group',
    [sym.SymbolKind.MaterializedView]: 'MaterializedView',
    [sym.SymbolKind.None]: 'None',
    [sym.SymbolKind.Operator]: 'Operator',
    [sym.SymbolKind.Option]: 'Option',
    [sym.SymbolKind.Parameter]: 'Parameter',
    [sym.SymbolKind.Pattern]: 'Pattern',
    [sym.SymbolKind.QueryOperatorParameter]: 'QueryOperatorParameter',
    [sym.SymbolKind.Primitive]: 'Primitive',
    [sym.SymbolKind.Table]: 'Table',
    [sym.SymbolKind.Tuple]: 'Tuple',
    [sym.SymbolKind.Variable]: 'Variable',
    [sym.SymbolKind.Void]: 'Void',
};

export interface ResultAction {
    title: string;
    changes: { start: number; deleteLength: number; insertText: string | null }[];
    kind: string;
}

export interface LanguageService {
    doComplete(document: TextDocument, position: ls.Position): Promise<ls.CompletionList>;
    doRangeFormat(document: TextDocument, range: ls.Range): Promise<ls.TextEdit[]>;
    doDocumentFormat(document: TextDocument): Promise<ls.TextEdit[]>;
    doCurrentCommandFormat(document: TextDocument, caretPosition: ls.Position): Promise<ls.TextEdit[]>;
    doFolding(document: TextDocument): Promise<FoldingRange[]>;
    doValidation(
        document: TextDocument,
        intervals: { start: number; end: number }[],
        includeWarnings?: boolean,
        includeSuggestions?: boolean
    ): Promise<ls.Diagnostic[]>;
    getResultActions(document: TextDocument, start: number, end: number): Promise<ResultAction[]>;
    getClassifications(document: TextDocument): Promise<ClassificationRange[]>;
    doRename(document: TextDocument, position: ls.Position, newName: string): Promise<ls.WorkspaceEdit | undefined>;
    doHover(document: TextDocument, position: ls.Position): Promise<ls.Hover | undefined>;
    setParameters(
        scalarParameters: readonly s.ScalarParameter[],
        tabularParameters: readonly s.TabularParameter[]
    ): Promise<void>;
    setSchema(schema: s.Schema): Promise<void>;
    setSchemaFromShowSchema(
        schema: s.showSchema.Result,
        clusterConnectionString: string,
        databaseInContextName: string,
        globalScalarParameters?: s.ScalarParameter[],
        globalTabularParameters?: s.TabularParameter[],
        databaseInContextAlternateName?: string
    ): Promise<void>;
    normalizeSchema(
        schema: s.showSchema.Result,
        clusterConnectionString: string,
        databaseInContextName: string,
        databaseInContextAlternateName?: string
    ): Promise<s.EngineSchema>;
    getSchema(): Promise<s.Schema>;
    getCommandInContext(document: TextDocument, cursorOffset: number): Promise<string>;
    getCommandAndLocationInContext(
        document: TextDocument,
        cursorOffset: number
    ): Promise<{ text: string; location: ls.Location } | null>;
    getCommandsInDocument(
        document: TextDocument
    ): Promise<{ absoluteStart: number; absoluteEnd: number; text: string }[]>;
    configure(languageSettings: LanguageSettings): void;
    getClientDirective(text: string): Promise<{ isClientDirective: boolean; directiveWithoutLeadingComments: string }>;
    getAdminCommand(text: string): Promise<{ isAdminCommand: boolean; adminCommandWithoutLeadingComments: string }>;
    findDefinition(document: TextDocument, position: ls.Position): Promise<ls.Location[]>;
    findReferences(document: TextDocument, position: ls.Position): Promise<ls.Location[]>;
    getQueryParams(document: TextDocument, cursorOffset: number): Promise<{ name: string; type: string }[]>;
    getGlobalParams(document: TextDocument): Promise<{ name: string; type: string }[]>;
    getReferencedSymbols(
        document: TextDocument,
        offset?: number
    ): Promise<{ name: string; kind: string; display: string }[]>;
    getReferencedGlobalParams(document: TextDocument, offset?: number): Promise<{ name: string; type: string }[]>;
    getRenderInfo(document: TextDocument, cursorOffset: number): Promise<RenderInfo | undefined>;
    getDatabaseReferences(document: TextDocument, cursorOffset: number): Promise<DatabaseReference[]>;
    getClusterReferences(document: TextDocument, cursorOffset: number): Promise<ClusterReference[]>;
    addDatabaseToSchema(document: TextDocument, clusterName: string, databaseSchema: Database): Promise<void>;
    addClusterToSchema(
        document: TextDocument,
        clusterName: string,
        databases: readonly { name: string; alternativeName?: string }[]
    ): Promise<void>;
}

export type CmSchema = {
    accounts: k.KustoIntelliSenseAccountEntity[];
    services: k.KustoIntelliSenseServiceEntity[];
    connectionString: string;
};

/**
 * Kusto Language service translates the kusto object model (transpiled from C# by Bridge.Net)
 * to the vscode language server types, which are used by vscode language extensions.
 * This should make things easier in the future to provide a vscode extension based on this translation layer.
 *
 * Further translations, if needed, to support specific editors (Atom, sublime, Etc)
 * should be done on top of this API, since it is (at least meant to be) a standard that is supported by multiple editors.
 *
 * Note1:  Currently monaco isn't using this object model so further translation will be necessary on calling modules.
 *
 * Note2: This file is responsible for interacting with the kusto object model and exposing Microsoft language service types.
 * An exception to that rule is tokenization (and syntax highlighting which depends on it) -
 * since it's not currently part of the Microsoft language service protocol. Thus tokenize() _does_ 'leak' kusto types to the callers.
 */
class KustoLanguageService implements LanguageService {
    private _kustoJsSchema: k.KustoIntelliSenseQuerySchema | CmSchema | undefined;
    private __kustoJsSchemaV2: GlobalState;
    private _clustersSetInGlobalState: Set<string>;
    private _nonEmptyDatabaseSetInGlobalState: Set<string>;
    private _languageSettings: LanguageSettings;
    private _completionOptions: Kusto.Language.Editor.CompletionOptions;
    private _schema: Mutable<s.Schema>;
    private _schemaCache: {
        [cluster: string]: {
            [dbName: string]: { database: s.Database; symbol: sym.DatabaseSymbol; includesFunctions: boolean };
        };
    };
    private _parser: k.CslCommandParser;
    private _script: k2.CodeScript;
    private _parsePropertiesV1: ParseProperties;
    private _parsePropertiesV2: ParseProperties;
    private _rulesProvider:
        | k.CslIntelliSenseRulesProvider
        | k.CslQueryIntelliSenseRulesProvider
        | k.DataManagerIntelliSenseRulesProvider
        | k.ClusterManagerIntelliSenseRulesProvider;
    private _newlineAppendPipePolicy: Kusto.Data.IntelliSense.ApplyPolicy;
    /**
     * Taken from:
     * https://msazure.visualstudio.com/One/_git/Azure-Kusto-Service?path=/Src/Tools/Kusto.Explorer.Control/QueryEditors/KustoScriptEditor/KustoScriptEditorControl2.xaml.cs&version=GBdev&line=2075&lineEnd=2075&lineStartColumn=9&lineEndColumn=77&lineStyle=plain&_a=contents
     */
    private _toOptionKind: { [completionKind in k2.CompletionKind]: k.OptionKind } = {
        [k2.CompletionKind.AggregateFunction]: k.OptionKind.FunctionAggregation,
        [k2.CompletionKind.BuiltInFunction]: k.OptionKind.FunctionScalar,
        [k2.CompletionKind.Cluster]: k.OptionKind.Database,
        [k2.CompletionKind.Column]: k.OptionKind.Column,
        [k2.CompletionKind.CommandPrefix]: k.OptionKind.Command,
        [k2.CompletionKind.Database]: k.OptionKind.Database,
        [k2.CompletionKind.DatabaseFunction]: k.OptionKind.FunctionServerSide,
        [k2.CompletionKind.Example]: k.OptionKind.Literal,
        [k2.CompletionKind.Identifier]: k.OptionKind.None,
        [k2.CompletionKind.Keyword]: k.OptionKind.Option,
        [k2.CompletionKind.LocalFunction]: k.OptionKind.FunctionLocal,
        [k2.CompletionKind.MaterialiedView]: k.OptionKind.MaterializedView,
        [k2.CompletionKind.Parameter]: k.OptionKind.Parameter,
        [k2.CompletionKind.Punctuation]: k.OptionKind.None,
        [k2.CompletionKind.QueryPrefix]: k.OptionKind.Operator,
        [k2.CompletionKind.RenderChart]: k.OptionKind.OptionRender,
        [k2.CompletionKind.ScalarInfix]: k.OptionKind.None,
        [k2.CompletionKind.ScalarPrefix]: k.OptionKind.Literal,
        [k2.CompletionKind.ScalarType]: k.OptionKind.DataType,
        [k2.CompletionKind.Syntax]: k.OptionKind.None,
        [k2.CompletionKind.Table]: k.OptionKind.Table,
        [k2.CompletionKind.TabularPrefix]: k.OptionKind.None,
        [k2.CompletionKind.TabularSuffix]: k.OptionKind.None,
        [k2.CompletionKind.Unknown]: k.OptionKind.None,
        [k2.CompletionKind.Variable]: k.OptionKind.Parameter,
        [k2.CompletionKind.Option]: k.OptionKind.Option,
        [k2.CompletionKind.Graph]: k.OptionKind.Graph,
        [k2.CompletionKind.EntityGroup]: k.OptionKind.EntityGroup,
    };

    constructor(schema: s.EngineSchema, languageSettings: LanguageSettings) {
        this._schemaCache = {};
        this._kustoJsSchema = KustoLanguageService.convertToKustoJsSchema(schema);
        this.__kustoJsSchemaV2 = this.convertToKustoJsSchemaV2(schema);
        this._schema = schema;
        this._clustersSetInGlobalState = new Set();
        this._nonEmptyDatabaseSetInGlobalState = new Set(); // used to remove clusters that are already in the global state

        this.configure(languageSettings);
        this._newlineAppendPipePolicy = new Kusto.Data.IntelliSense.ApplyPolicy();
        this._newlineAppendPipePolicy.Text = '\n| ';
    }

    private createDatabaseUniqueName(clusterName: string, databaseName: string): string {
        return `${clusterName}_${databaseName}`;
    }

    /**
     * A setter for _kustoJsSchemaV2. After a schema (global state) is set, create 2 sets of cluster and database names.
     */
    private set _kustoJsSchemaV2(globalState: GlobalState) {
        this.__kustoJsSchemaV2 = globalState;
        this._clustersSetInGlobalState.clear();
        this._nonEmptyDatabaseSetInGlobalState.clear();

        // create 2 Sets with cluster names and database names based on the updated Global State.
        for (let i = 0; i < globalState.Clusters.Count; i++) {
            const clusterSymbol = this._kustoJsSchemaV2.Clusters.getItem(i);
            this._clustersSetInGlobalState.add(clusterSymbol.Name);

            for (let i2 = 0; i2 < clusterSymbol.Databases.Count; i2++) {
                const databaseSymbol = clusterSymbol.Databases.getItem(i2);

                if (databaseSymbol.Tables.Count > 0) {
                    // only include database with tables
                    this._nonEmptyDatabaseSetInGlobalState.add(
                        this.createDatabaseUniqueName(clusterSymbol.Name, databaseSymbol.Name)
                    );
                }
            }
        }
    }

    /**
     * A getter for __kustoJsSchemaV2
     */
    private get _kustoJsSchemaV2(): GlobalState {
        return this.__kustoJsSchemaV2;
    }

    configure(languageSettings: LanguageSettings) {
        this._languageSettings = languageSettings;

        const { includeExtendedSyntax } = this._languageSettings.completionOptions;
        this._completionOptions =
            Kusto.Language.Editor.CompletionOptions.Default.WithIncludeExtendedSyntax(
                includeExtendedSyntax
            ).WithIncludePunctuationOnlySyntax(false);

        // Since we're still reverting to V1 intellisense for control commands, we need to update the rules provider
        // (which is a notion of V1 intellisense).
        this.createRulesProvider(this._kustoJsSchema, this._schema.clusterType);
    }

    doComplete(document: TextDocument, position: ls.Position): Promise<ls.CompletionList> {
        return this.doCompleteV2(document, position);
    }

    private disabledCompletionItemsV2: { [value: string]: k2.CompletionKind } = {
        // render charts
        ladderchart: k2.CompletionKind.RenderChart,
        pivotchart: k2.CompletionKind.RenderChart,
        timeline: k2.CompletionKind.RenderChart,
        timepivot: k2.CompletionKind.RenderChart,
        '3Dchart': k2.CompletionKind.RenderChart,
        list: k2.CompletionKind.RenderChart,
    };

    /**
     * important: Only use during development to test Global State.
     * Prints clusters, databases and tables that are currently in the GlobalState.
     */
    private debugGlobalState(globals: GlobalState) {
        // iterate over clusters
        console.log(`globals.Clusters.Count: ${globals.Clusters.Count}`);
        for (let i = 0; i < globals.Clusters.Count; i++) {
            const cluster = globals.Clusters.getItem(i);
            console.log(`cluster: ${cluster.Name}`);

            // iterate over databases
            console.log(`cluster.Databases.Count: ${cluster.Databases.Count}`);
            for (let i2 = 0; i2 < cluster.Databases.Count; i2++) {
                const database = cluster.Databases.getItem(i2);
                console.log(`cluster.database: [${cluster.Name}].[${database.Name}]`);

                // iterate over tables
                console.log(`cluster.Databases.Tables.Count: ${database.Tables.Count}`);
                for (let i3 = 0; i3 < database.Tables.Count; i3++) {
                    const table = database.Tables.getItem(i3);
                    console.log(`cluster.database.table: [${cluster.Name}].[${database.Name}].[${table.Name}]`);
                }
            }
        }
    }

    /**
     * Prepending the doc of the actual topic at the top
     */
    private formatHelpTopic(helpTopic: k.CslTopicDocumentation) {
        return `**${helpTopic.Name} [(view online)](${helpTopic.Url})**\n\n${helpTopic.LongDescription}`;
    }

    doCompleteV2(document: TextDocument, position: ls.Position): Promise<ls.CompletionList> {
        if (!document) {
            return Promise.resolve(ls.CompletionList.create([]));
        }

        const script = this.parseDocumentV2(document);

        // print cluster/database/tables from CodeScript.Globals
        // this.debugGlobalState(script.Globals);

        // get current command
        const cursorOffset = document.offsetAt(position);
        let currentCommand = script.GetBlockAtPosition(cursorOffset);

        const completionItems = currentCommand.Service.GetCompletionItems(cursorOffset, this._completionOptions);

        let disabledItems = this.disabledCompletionItemsV2;
        if (this._languageSettings.disabledCompletionItems) {
            this._languageSettings.disabledCompletionItems.map((item) => {
                // logic will treat unknown as a '*' wildcard, meaning that if the key is in the object
                // the completion item will be suppressed.
                disabledItems[item] = k2.CompletionKind.Unknown;
            });
        }
        const itemsAsArray = this.toArray<k2.CompletionItem>(completionItems.Items);
        let items: ls.CompletionItem[] = itemsAsArray
            .filter(
                (item) =>
                    !(
                        item &&
                        item.MatchText &&
                        disabledItems[item.MatchText] !== undefined &&
                        (disabledItems[item.MatchText] === k2.CompletionKind.Unknown ||
                            disabledItems[item.MatchText] === item.Kind)
                    )
            )
            .map((kItem, index) => {
                const v1CompletionOption: k.CompletionOption = new k.CompletionOption(
                    this._toOptionKind[kItem.Kind] || k.OptionKind.None,
                    kItem.DisplayText
                );
                const helpTopic: k.CslTopicDocumentation = this.getTopic(v1CompletionOption);
                // If we have AfterText it means that the cursor should not be placed at end of suggested text.
                // In that case we switch to snippet format and represent the point where the cursor should be as
                // as '\$0'
                const { textToInsert, format } =
                    kItem.AfterText && kItem.AfterText.length > 0
                        ? {
                              // Need to escape dollar sign since it is used as a placeholder in snippet.
                              // Usually dollar sign is not a valid character in a function name, but grafana uses macros that start with dollars.
                              textToInsert: `${kItem.EditText.replace('$', '\\$')}$0${kItem.AfterText}`,
                              format: ls.InsertTextFormat.Snippet,
                          }
                        : {
                              textToInsert: kItem.EditText,
                              format: ls.InsertTextFormat.PlainText,
                          };
                const lsItem = ls.CompletionItem.create(kItem.DisplayText);

                const startPosition = document.positionAt(completionItems.EditStart);
                const endPosition = document.positionAt(completionItems.EditStart + completionItems.EditLength);
                lsItem.textEdit = ls.TextEdit.replace(ls.Range.create(startPosition, endPosition), textToInsert);
                // Changing the first letter to be lower case, to ignore case-sensitive matching
                lsItem.filterText = kItem.MatchText.charAt(0).toLowerCase() + kItem.MatchText.slice(1);
                lsItem.kind = this.kustoKindToLsKindV2(kItem.Kind);
                lsItem.sortText = kItem.OrderText;
                lsItem.insertTextFormat = format;
                lsItem.detail = helpTopic ? helpTopic.ShortDescription : undefined;
                lsItem.documentation = helpTopic
                    ? { value: this.formatHelpTopic(helpTopic), kind: ls.MarkupKind.Markdown }
                    : undefined;
                return lsItem;
            });

        return Promise.resolve(ls.CompletionList.create(items));
    }

    /**
     * when trying to get a topic we need the function name (abs, toLower, ETC).
     * The problem is that the 'Value' string also contains the  arguments (e.g abs(number)), which means that we are
     * not able to correlate the option with its documentation.
     * This piece of code tries to strip this hwne getting topic.
     * @param completionOption the Completion option
     */
    private getTopic(completionOption: k.CompletionOption): k.CslTopicDocumentation {
        if (
            completionOption.Kind == k.OptionKind.FunctionScalar ||
            completionOption.Kind == k.OptionKind.FunctionAggregation
        ) {
            // from a value like 'abs(number)' remove the '(number)' so that only 'abs' will remain
            const indexOfParen = completionOption.Value.indexOf('(');
            if (indexOfParen >= 0) {
                completionOption = new k.CompletionOption(
                    completionOption.Kind,
                    completionOption.Value.substring(0, indexOfParen)
                );
            }
        }

        return k.CslDocumentation.Instance.GetTopic(completionOption);
    }

    doRangeFormat(document: TextDocument, range: ls.Range): Promise<ls.TextEdit[]> {
        if (!document) {
            return Promise.resolve([]);
        }
        const rangeStartOffset: number = document.offsetAt(range.start);
        const rangeEndOffset: number = document.offsetAt(range.end);
        const commands = this.getFormattedCommandsInDocumentV2(document, rangeStartOffset, rangeEndOffset);

        if (!commands.originalRange || commands.formattedCommands.length === 0) {
            return Promise.resolve([]);
        }

        return Promise.resolve([ls.TextEdit.replace(commands.originalRange, commands.formattedCommands.join(''))]);
    }

    doDocumentFormat(document: TextDocument): Promise<ls.TextEdit[]> {
        if (!document) {
            return Promise.resolve([]);
        }
        const startPos = document.positionAt(0);
        const endPos = document.positionAt(document.getText().length);
        const fullDocRange = ls.Range.create(startPos, endPos);

        const formattedDoc = this.getFormattedCommandsInDocumentV2(document).formattedCommands.join('');

        return Promise.resolve([ls.TextEdit.replace(fullDocRange, formattedDoc)]);
    }

    // Method is not triggered, instead doRangeFormat is invoked with the range of the caret's line.
    doCurrentCommandFormat(document: TextDocument, caretPosition: ls.Position): Promise<ls.TextEdit[]> {
        const offset = document.offsetAt(caretPosition);
        const range = this.createRange(document, offset - 1, offset + 1);
        return this.doRangeFormat(document, range);
    }

    doFolding(document: TextDocument): Promise<FoldingRange[]> {
        if (!document) {
            return Promise.resolve([]);
        }

        return this.getCommandsInDocument(document).then((commands) => {
            return commands.map((command): FoldingRange => {
                // don't count the last empty line as part of the folded range (consider linux, mac, pc newlines)
                if (command.text.endsWith('\r\n')) {
                    command.absoluteEnd -= 2;
                } else if (command.text.endsWith('\r') || command.text.endsWith('\n')) {
                    --command.absoluteEnd;
                }

                const startPosition = document.positionAt(command.absoluteStart);

                const endPosition = document.positionAt(command.absoluteEnd);
                return {
                    startLine: startPosition.line,
                    startCharacter: startPosition.character,
                    endLine: endPosition.line,
                    endCharacter: endPosition.character,
                };
            });
        });
    }

    getClusterReferences(document: TextDocument, cursorOffset?: number): Promise<ClusterReference[]> {
        const script = this.parseDocumentV2(document);
        const currentBlock = this.getCurrentCommandV2(script, cursorOffset);

        let clusterReferences = currentBlock?.Service?.GetClusterReferences();
        if (!clusterReferences) {
            return Promise.resolve([]);
        }

        const newClustersReferencesSet = new Set<string>(); // used to remove duplicates
        // Keep only unique clusters that aren't already exist in the Global State
        for (let i = 0; i < clusterReferences.Count; i++) {
            const clusterReference: k2.ClusterReference = clusterReferences.getItem(i);
            // not using Kusto.Language.KustoFacts.KustoWindowsNet because the engine client adds suffix anyway
            const clusterName = Kusto.Language.KustoFacts.GetFullHostName(clusterReference.Cluster, null);
            // ignore references that are already in the GlobalState.
            if (!this._clustersSetInGlobalState.has(clusterName)) {
                newClustersReferencesSet.add(clusterName);
            }
        }

        return Promise.resolve(Array.from(newClustersReferencesSet).map((clusterName) => ({ clusterName })));
    }

    getDatabaseReferences(document: TextDocument, cursorOffset?: number): Promise<DatabaseReference[]> {
        const script = this.parseDocumentV2(document);
        const currentBlock = this.getCurrentCommandV2(script, cursorOffset);

        let databasesReferences = currentBlock?.Service?.GetDatabaseReferences();
        if (!databasesReferences) {
            return Promise.resolve([]);
        }
        let newDatabasesReferences: DatabaseReference[] = [];
        let newDatabasesReferencesSet = new Set();
        for (let i1 = 0; i1 < databasesReferences.Count; i1++) {
            const databaseReference: k2.DatabaseReference = databasesReferences.getItem(i1);
            const clusterHostName = Kusto.Language.KustoFacts.GetHostName(databaseReference.Cluster);

            // ignore duplicates
            const databaseReferenceUniqueId = this.createDatabaseUniqueName(
                clusterHostName,
                databaseReference.Database
            );
            if (newDatabasesReferencesSet.has(databaseReferenceUniqueId)) {
                continue;
            }
            newDatabasesReferencesSet.add(databaseReferenceUniqueId);

            // ignore references that are already in the GlobalState.
            let foundInGlobalState = this._nonEmptyDatabaseSetInGlobalState.has(databaseReferenceUniqueId);
            if (!foundInGlobalState) {
                newDatabasesReferences.push({
                    databaseName: databaseReference.Database,
                    clusterName: databaseReference.Cluster,
                });
            }
        }

        return Promise.resolve(newDatabasesReferences);
    }

    doValidation(
        document: TextDocument,
        changeIntervals: { start: number; end: number }[],
        includeWarnings?: boolean,
        includeSuggestions?: boolean
    ): Promise<ls.Diagnostic[]> {
        // didn't implement validation for v1.
        if (!document) {
            return Promise.resolve([]);
        }
        const script = this.parseDocumentV2(document);
        let blocks = this.toArray<k2.CodeBlock>(script.Blocks);
        if (changeIntervals.length > 0) {
            blocks = this.getAffectedBlocks(blocks, changeIntervals);
        }

        const diagnostics = blocks
            .map((block) => {
                // GetDiagnostics returns the errors in the block
                let diagnostics = this.toArray<Kusto.Language.Diagnostic>(block.Service.GetDiagnostics());
                const enableWarnings = includeWarnings ?? this._languageSettings.enableQueryWarnings;
                const enableSuggestions = includeSuggestions ?? this._languageSettings.enableQuerySuggestions;
                if (enableWarnings || enableSuggestions) {
                    // Concat Warnings and suggestions to the diagnostics
                    const warningAndSuggestionDiagnostics = block.Service.GetAnalyzerDiagnostics(true);
                    const filterredDiagnostics = this.toArray<Kusto.Language.Diagnostic>(
                        warningAndSuggestionDiagnostics
                    ).filter((d) => {
                        const allowSeverity =
                            (enableWarnings && d.Severity === 'Warning') ||
                            (enableSuggestions && d.Severity === 'Suggestion');
                        const allowCode = !this._languageSettings.disabledDiagnosticCodes?.includes(d.Code);
                        return allowSeverity && allowCode;
                    });
                    diagnostics = diagnostics.concat(filterredDiagnostics);
                }

                return diagnostics;
            })
            .reduce((prev, curr) => prev.concat(curr), []);

        const lsDiagnostics = this.toLsDiagnostics(diagnostics, document);

        return Promise.resolve(lsDiagnostics);
    }

    private getApplyCodeActions(document: TextDocument, start: number, end: number): k2.ApplyAction[] {
        const script = this.parseDocumentV2(document);
        let block = this.getAffectedBlocks(this.toArray<k2.CodeBlock>(script.Blocks), [{ start, end }])[0];

        const codeActionInfo = block.Service.GetCodeActions(
            start,
            start,
            0,
            null,
            true,
            null,
            new Kusto.Language.Utils.CancellationToken()
        );
        const codeActions = this.toArray(codeActionInfo.Actions);
        // Some code actions are of type "MenuAction". We want to flat them out, to show them seperately.
        let flatCodeActions: k2.ApplyAction[] = [];
        for (let i = 0; i < codeActions.length; i++) {
            flatCodeActions.push(...this.flattenCodeActions(codeActions[i], null));
        }
        return flatCodeActions;
    }

    getResultActions(document: TextDocument, start: number, end: number): Promise<ResultAction[]> {
        const script = this.parseDocumentV2(document);
        let block = this.getAffectedBlocks(this.toArray<k2.CodeBlock>(script.Blocks), [{ start, end }])[0];
        const applyCodeActions = this.getApplyCodeActions(document, start, end);
        const resultActionsMap: ResultAction[] = applyCodeActions
            .map((applyCodeAction) => {
                let changes = [];
                const codeActionResults = this.toArray(block.Service.ApplyCodeAction(applyCodeAction, start).Actions);
                const changeTextAction = codeActionResults.find(
                    (c) => c instanceof Kusto.Language.Editor.ChangeTextAction
                );
                if (changeTextAction) {
                    changes = this.toArray((changeTextAction as Kusto.Language.Editor.ChangeTextAction).Changes).map(
                        (change) => ({
                            start: change.Start + block.Start,
                            deleteLength: change.DeleteLength,
                            insertText: change.InsertText,
                        })
                    );
                }
                return { title: applyCodeAction.Title, changes, kind: applyCodeAction.Kind };
            })
            .filter((resultAction) => resultAction.changes.length);

        return Promise.resolve(resultActionsMap);
    }

    private transformCodeActionTitle(currentActionTitle: string, parentActionTitle: string | null) {
        let title = currentActionTitle;
        switch (title) {
            case 'Apply':
                title = 'Apply once';
                break;
            case 'Fix All':
                title = 'Apply to all';
                break;
            case 'Extract Value':
                title = 'Extract value';
                break;
        }
        if (parentActionTitle) {
            // We want to lower case the first character since it's going to be in brackets
            const parentActionTitleLowerCased = parentActionTitle.charAt(0).toUpperCase() + parentActionTitle.slice(1);
            title = `${title} (${parentActionTitleLowerCased})`;
        }
        return title;
    }

    private flattenCodeActions(codeAction: k2.CodeAction, parentTitle: string | null): k2.ApplyAction[] {
        const applyActions: k2.ApplyAction[] = [];
        if (codeAction instanceof k2.ApplyAction) {
            codeAction.Title = this.transformCodeActionTitle(codeAction.Title, parentTitle);
            applyActions.push(codeAction);
        } else if (codeAction instanceof k2.MenuAction) {
            const nestedCodeActions = this.toArray(codeAction.Actions);
            for (let i = 0; i < nestedCodeActions.length; i++) {
                applyActions.push(...this.flattenCodeActions(nestedCodeActions[i], codeAction.Title));
            }
        }
        return applyActions;
    }

    private toLsDiagnostics(diagnostics: Kusto.Language.Diagnostic[], document: TextDocument) {
        return diagnostics
            .filter((diag) => diag.HasLocation)
            .map((diag): ls.Diagnostic => {
                const start = document.positionAt(diag.Start);
                const end = document.positionAt(diag.Start + diag.Length);
                const range = ls.Range.create(start, end);
                let severity: ls.DiagnosticSeverity;
                switch (diag.Severity) {
                    case 'Suggestion':
                        severity = ls.DiagnosticSeverity.Information;
                        break;
                    case 'Warning':
                        severity = ls.DiagnosticSeverity.Warning;
                        break;
                    default:
                        severity = ls.DiagnosticSeverity.Error;
                }
                return ls.Diagnostic.create(range, diag.Message, severity, diag.Code);
            });
    }

    async getClassifications(document: TextDocument): Promise<ClassificationRange[]> {
        const codeScript = this.parseDocumentV2(document);
        const codeBlocks = this.toArray<k2.CodeBlock>(codeScript.Blocks);
        const classificationRanges = codeBlocks.map((block) => {
            const { Classifications } = block.Service.GetClassifications(block.Start, block.Length);
            return this.toArray<k2.ClassifiedRange>(Classifications);
        });

        return classificationRanges.flatMap((ranges) => {
            return ranges.map((range) => {
                const { line, character } = document.positionAt(range.Start);
                const length = range.Length;
                const kind = range.Kind;

                return { line, character, length, kind };
            });
        });
    }

    private getAffectedBlocks(blocks: k2.CodeBlock[], changeIntervals: { start: number; end: number }[]) {
        return blocks.filter((block) =>
            // a command is affected if it intersects at least on of changed ranges.
            block // command can be null. we're filtering all nulls in the array.
                ? changeIntervals.some(
                      ({ start: changeStart, end: changeEnd }) =>
                          // both intervals intersect if either the start or the end of interval A is inside interval B.
                          (block.Start >= changeStart && block.Start <= changeEnd) ||
                          (changeStart >= block.Start && changeStart <= block.End + 1)
                  )
                : false
        );
    }

    addClusterToSchema(
        document: TextDocument,
        clusterName: string,
        databases: { name: string; alternativeName?: string }[]
    ): Promise<void> {
        let clusterNameOnly = Kusto.Language.KustoFacts.GetHostName(clusterName);
        let cluster: sym.ClusterSymbol = this._kustoJsSchemaV2.GetCluster$1(clusterNameOnly);
        if (cluster) {
            // add databases that are not already in the cluster.
            databases
                .filter(({ name }) => !cluster.GetDatabase(name))
                .forEach(({ name, alternativeName }) => {
                    const symbol = new sym.DatabaseSymbol.$ctor3(name, alternativeName || null, undefined, false);
                    cluster = cluster.AddDatabase(symbol);
                });
        }
        if (!cluster) {
            const databaseSymbols = databases.map(({ name, alternativeName }) => {
                return new sym.DatabaseSymbol.$ctor3(name, alternativeName || null, undefined, false);
            });
            const databaseSymbolsList = new (List<sym.DatabaseSymbol>(sym.DatabaseSymbol).$ctor1)(databaseSymbols);
            cluster = new sym.ClusterSymbol.$ctor1(clusterNameOnly, databaseSymbolsList, false);
        }

        this._kustoJsSchemaV2 = this._kustoJsSchemaV2.AddOrReplaceCluster(cluster);
        this._script = k2.CodeScript.From$1(document.getText(), this._kustoJsSchemaV2);
        return Promise.resolve();
    }

    addDatabaseToSchema(document: TextDocument, clusterName: string, databaseSchema: s.Database): Promise<void> {
        let clusterHostName = Kusto.Language.KustoFacts.GetHostName(clusterName);
        let cluster: sym.ClusterSymbol = this._kustoJsSchemaV2.GetCluster$1(clusterHostName);
        if (!cluster) {
            cluster = new sym.ClusterSymbol.$ctor1(clusterHostName, null, false);
        }

        const databaseSymbol = KustoLanguageService.convertToDatabaseSymbol(databaseSchema);
        cluster = cluster.AddOrUpdateDatabase(databaseSymbol);
        this._kustoJsSchemaV2 = this._kustoJsSchemaV2.AddOrReplaceCluster(cluster);
        this._script = k2.CodeScript.From$1(document.getText(), this._kustoJsSchemaV2);
        return Promise.resolve();
    }

    setSchema(schema: s.Schema): Promise<void> {
        this._schema = schema;
        // We support intellisenseV2 only if the clusterType is "Engine", even if the setting is enabled
        if (schema && schema.clusterType === 'Engine') {
            let kustoJsSchemaV2: GlobalState = this.convertToKustoJsSchemaV2(schema);

            this._kustoJsSchemaV2 = kustoJsSchemaV2;
            this._script = undefined;
            this._parsePropertiesV2 = undefined;
        }

        // since V2 doesn't support control commands, we're initializing V1 intellisense for both cases and we'll going to use V1 intellisense for control commands.

        const kustoJsSchema = schema ? KustoLanguageService.convertToKustoJsSchema(schema) : undefined;
        this._kustoJsSchema = kustoJsSchema;
        this.createRulesProvider(kustoJsSchema, schema.clusterType);
        return Promise.resolve();
    }

    setParameters(scalarParameters: s.ScalarParameter[], tabularParameters: s.TabularParameter[]): Promise<void> {
        if (this._schema.clusterType !== 'Engine') {
            throw new Error('setParameters requires intellisense V2 and Engine cluster');
        }
        this._schema.globalScalarParameters = scalarParameters;
        this._schema.globalTabularParameters = tabularParameters;
        const scalarSymbols = scalarParameters.map((param) => KustoLanguageService.createParameterSymbol(param));
        const tabularSymbols = tabularParameters.map((param) =>
            KustoLanguageService.createTabularParameterSymbol(param)
        );
        this._kustoJsSchemaV2 = this._kustoJsSchemaV2.WithParameters(
            KustoLanguageService.toBridgeList([...scalarSymbols, ...tabularSymbols])
        );
        this._script = this._script?.WithGlobals(this._kustoJsSchemaV2);

        // Set parameters is only working with the below code. It didn't used to need this, why does it now?!?
        // Copy+pasted from setSchema
        const kustoJsSchema = KustoLanguageService.convertToKustoJsSchema(this._schema);
        this._kustoJsSchema = kustoJsSchema;
        this.createRulesProvider(kustoJsSchema, this._schema.clusterType);

        return Promise.resolve(undefined);
    }

    /**
     * A combination of normalizeSchema and setSchema
     * @param schema schema json as received from .show schema as json
     * @param clusterConnectionString cluster connection string
     * @param databaseInContextName name of database in context
     * @param globalScalarParameters
     * @param globalTabularParameters
     * @param databaseInContextAlternateName alternate name of database in context
     */
    setSchemaFromShowSchema(
        schema: s.showSchema.Result,
        clusterConnectionString: string,
        databaseInContextName: string,
        globalScalarParameters: s.ScalarParameter[],
        globalTabularParameters: s.TabularParameter[],
        databaseInContextAlternateName: string
    ): Promise<void> {
        const normalized = this._normalizeSchema(
            schema,
            clusterConnectionString,
            databaseInContextName,
            databaseInContextAlternateName
        );

        return this.setSchema({ ...normalized, globalScalarParameters, globalTabularParameters });
    }

    /**
     * Converts the result of .show schema as json to a normalized schema used by kusto language service.
     * @param schema result of show schema
     * @param clusterConnectionString cluster connection string`
     * @param databaseInContextName database in context name
     * @param databaseInContextAlternateName database in context alternate name
     */
    _normalizeSchema(
        schema: s.showSchema.Result,
        clusterConnectionString: string,
        databaseInContextName: string,
        databaseInContextAlternateName?: string
    ): s.EngineSchema {
        const databases: s.EngineSchema['cluster']['databases'] = Object.keys(schema.Databases)
            .map((key) => schema.Databases[key])
            .map(
                ({
                    Name,
                    Tables,
                    ExternalTables,
                    MaterializedViews,
                    Functions,
                    EntityGroups = {},
                    MinorVersion,
                    MajorVersion,
                }: s.showSchema.Database) => ({
                    name: Name,
                    alternateName: databaseInContextAlternateName,
                    minorVersion: MinorVersion,
                    majorVersion: MajorVersion,
                    entityGroups: Object.entries(EntityGroups).map(([name, members]) => ({
                        name,
                        members,
                    })),
                    tables: [].concat(
                        ...(
                            [
                                [Tables, 'Table'],
                                [MaterializedViews, 'MaterializedView'],
                                [ExternalTables, 'ExternalTable'],
                            ] as [s.showSchema.Tables, s.TableEntityType][]
                        )
                            .filter(([tableContainer]) => tableContainer)
                            .map(([tableContainer, tableEntity]) =>
                                Object.values(tableContainer).map(
                                    ({ Name, OrderedColumns, DocString }: s.showSchema.Table) => ({
                                        name: Name,
                                        docstring: DocString,
                                        entityType: tableEntity,
                                        columns: OrderedColumns.map(
                                            ({ Name, Type, DocString, CslType, Examples }: s.showSchema.Column) => ({
                                                name: Name,
                                                type: CslType,
                                                docstring: DocString,
                                                examples: Examples,
                                            })
                                        ),
                                    })
                                )
                            )
                    ),
                    functions: Object.keys(Functions)
                        .map((key) => Functions[key])
                        .map(({ Name, Body, DocString, InputParameters }) => ({
                            name: Name,
                            body: Body,
                            docstring: DocString,
                            inputParameters: InputParameters.map((inputParam) => ({
                                name: inputParam.Name,
                                type: inputParam.Type,
                                cslType: inputParam.CslType,
                                cslDefaultValue: inputParam.CslDefaultValue,
                                columns: inputParam.Columns
                                    ? inputParam.Columns.map((col) => ({
                                          name: col.Name,
                                          type: col.Type,
                                          cslType: col.CslType,
                                      }))
                                    : (inputParam.Columns as undefined | null | []),
                            })),
                        })),
                })
            );

        return {
            clusterType: 'Engine',
            cluster: {
                connectionString: clusterConnectionString,
                databases: databases,
            },
            database: databases.filter((db) => db.name === databaseInContextName)[0],
        };
    }

    /**
     * Converts the result of .show schema as json to a normalized schema used by kusto language service.
     * @param schema result of show schema
     * @param clusterConnectionString cluster connection string`
     * @param databaseInContextName database in context name
     * @param databaseInContextAlternateName database in context alternate name
     */
    normalizeSchema(
        schema: s.showSchema.Result,
        clusterConnectionString: string,
        databaseInContextName: string,
        databaseInContextAlternateName?: string
    ): Promise<s.EngineSchema> {
        return Promise.resolve(
            this._normalizeSchema(
                schema,
                clusterConnectionString,
                databaseInContextName,
                databaseInContextAlternateName
            )
        );
    }

    getSchema() {
        return Promise.resolve(this._schema);
    }

    getCommandInContext(document: TextDocument, cursorOffset: number): Promise<string | null> {
        return this.getCommandInContextV2(document, cursorOffset);
    }

    getCommandAndLocationInContext(
        document: TextDocument,
        cursorOffset: number
    ): Promise<{ text: string; location: ls.Location }> {
        // We are going to remove v1 intellisense. no use to keep parity.
        if (!document) {
            return Promise.resolve(null);
        }

        const script = this.parseDocumentV2(document);
        const block = this.getCurrentCommandV2(script, cursorOffset);
        if (!block) {
            return Promise.resolve(null);
        }

        const start = document.positionAt(block.Start);
        const end = document.positionAt(block.End);
        const location = ls.Location.create(document.uri, ls.Range.create(start, end));
        const text = block.Text;
        return Promise.resolve({
            text,
            location,
        });
    }

    getCommandInContextV2(document: TextDocument, cursorOffset: number): Promise<string | null> {
        if (!document) {
            return Promise.resolve(null);
        }

        const script = this.parseDocumentV2(document);
        const block = this.getCurrentCommandV2(script, cursorOffset);
        if (!block) {
            return Promise.resolve(null);
        }

        // TODO: do we need to do tricks like V1 is doing in this.getCurrentCommand?
        return Promise.resolve(block.Text);
    }

    /**
     * Return an array of commands in document. each command contains the range and text.
     */
    getCommandsInDocument(
        document: TextDocument
    ): Promise<{ absoluteStart: number; absoluteEnd: number; text: string }[]> {
        if (!document) {
            return Promise.resolve([]);
        }

        return this.getCommandsInDocumentV2(document);
    }

    getCommandsInDocumentV1(
        document: TextDocument
    ): Promise<{ absoluteStart: number; absoluteEnd: number; text: string }[]> {
        this.parseDocumentV1(document, k.ParseMode.CommandTokensOnly);
        let commands = this.toArray(this._parser.Results);
        return Promise.resolve(
            commands.map(({ AbsoluteStart, AbsoluteEnd, Text }) => ({
                absoluteStart: AbsoluteStart,
                absoluteEnd: AbsoluteEnd,
                text: Text,
            }))
        );
    }

    toPlacementStyle(formatterPlacementStyle?: FormatterPlacementStyle): k2.PlacementStyle | undefined {
        if (!formatterPlacementStyle) {
            return undefined;
        }

        switch (formatterPlacementStyle) {
            case 'None':
                return k2.PlacementStyle.None;
            case 'NewLine':
                return k2.PlacementStyle.NewLine;
            case 'Smart':
                return k2.PlacementStyle.Smart;
            default:
                throw new Error('Unknown PlacementStyle');
        }
    }

    getFormattedCommandsInDocumentV2(
        document: TextDocument,
        rangeStart?: number,
        rangeEnd?: number
    ): {
        formattedCommands: string[];
        originalRange?: ls.Range;
    } {
        const script = this.parseDocumentV2(document);

        const commands = this.toArray<k2.CodeBlock>(script.Blocks).filter((command) => {
            if (!command.Text || command.Text.trim() == '') return false;
            if (rangeStart == null || rangeEnd == null) return true;

            // calculate command end position without \r\n.
            let commandEnd = command.End;
            const commandText = command.Text;
            for (let i = commandText.length - 1; i >= 0; i--) {
                if (commandText[i] != '\r' && commandText[i] != '\n') {
                    break;
                } else {
                    commandEnd--;
                }
            }

            if (command.Start > rangeStart && command.Start < rangeEnd) return true;
            if (commandEnd > rangeStart && commandEnd < rangeEnd) return true;
            if (command.Start <= rangeStart && commandEnd >= rangeEnd) return true;
        });

        if (commands.length === 0) {
            return { formattedCommands: [] };
        }

        const formattedCommands = commands.map((command) => {
            const formatterOptions = this._languageSettings.formatter;
            const formatter = Kusto.Language.Editor.FormattingOptions.Default.WithIndentationSize(
                formatterOptions?.indentationSize ?? 4
            )
                .WithInsertMissingTokens(false)
                .WithPipeOperatorStyle(
                    this.toPlacementStyle(formatterOptions?.pipeOperatorStyle) ?? k2.PlacementStyle.Smart
                )
                .WithSemicolonStyle(Kusto.Language.Editor.PlacementStyle.None)
                .WithBrackettingStyle(k2.BrackettingStyle.Diagonal);

            if (rangeStart == null || rangeEnd == null || (rangeStart === command.Start && rangeEnd === command.End)) {
                const result = command.Service.GetFormattedText(formatter);
                return result.Text;
            }
            return command.Service.GetFormattedText(formatter).Text;
        });

        const originalRange = this.createRange(document, commands[0].Start, commands[commands.length - 1].End);
        return { formattedCommands, originalRange };
    }

    getCommandsInDocumentV2(
        document: TextDocument
    ): Promise<{ absoluteStart: number; absoluteEnd: number; text: string }[]> {
        const script = this.parseDocumentV2(document);
        let commands = this.toArray<k2.CodeBlock>(script.Blocks).filter((command) => command.Text.trim() != '');
        return Promise.resolve(
            commands.map(({ Start, End, Text }) => ({ absoluteStart: Start, absoluteEnd: End, text: Text }))
        );
    }

    getClientDirective(text: string): Promise<{ isClientDirective: boolean; directiveWithoutLeadingComments: string }> {
        let outParam: { v: string | null } = { v: null };
        const isClientDirective = k.CslCommandParser.IsClientDirective(text, outParam);
        return Promise.resolve({
            isClientDirective,
            directiveWithoutLeadingComments: outParam.v,
        });
    }

    getAdminCommand(text: string): Promise<{ isAdminCommand: boolean; adminCommandWithoutLeadingComments: string }> {
        let outParam: { v: string | null } = { v: null };
        const isAdminCommand = k.CslCommandParser.IsAdminCommand$1(text, outParam);
        return Promise.resolve({
            isAdminCommand,
            adminCommandWithoutLeadingComments: outParam.v,
        });
    }

    findDefinition(document: TextDocument, position: ls.Position): Promise<ls.Location[]> {
        if (!document) {
            return Promise.resolve([]);
        }

        const script = this.parseDocumentV2(document);
        const cursorOffset = document.offsetAt(position);
        let currentBlock = this.getCurrentCommandV2(script, cursorOffset);

        if (!currentBlock) {
            return Promise.resolve([]);
        }

        const relatedInfo = currentBlock.Service.GetRelatedElements(document.offsetAt(position));
        const relatedElements = this.toArray<k2.RelatedElement>(relatedInfo.Elements);

        const definition = relatedElements[0];

        if (!definition) {
            return Promise.resolve([]);
        }

        const start = document.positionAt(definition.Start);
        const end = document.positionAt(definition.End);
        const range = ls.Range.create(start, end);
        const location = ls.Location.create(document.uri, range);
        return Promise.resolve([location]);
    }

    findReferences(document: TextDocument, position: ls.Position): Promise<ls.Location[]> {
        if (!document) {
            return Promise.resolve([]);
        }

        const script = this.parseDocumentV2(document);
        const cursorOffset = document.offsetAt(position);
        let currentBlock = this.getCurrentCommandV2(script, cursorOffset);

        if (!currentBlock) {
            return Promise.resolve([]);
        }

        const relatedInfo = currentBlock.Service.GetRelatedElements(document.offsetAt(position));
        const relatedElements = this.toArray<k2.RelatedElement>(relatedInfo.Elements);

        if (!relatedElements || relatedElements.length == 0) {
            return Promise.resolve([]);
        }

        const references = relatedElements.map((relatedElement) => {
            const start = document.positionAt(relatedElement.Start);
            const end = document.positionAt(relatedElement.End);
            const range = ls.Range.create(start, end);
            const location = ls.Location.create(document.uri, range);
            return location;
        });

        return Promise.resolve(references);
    }

    getQueryParams(document: TextDocument, cursorOffset: number): Promise<{ name: string; type: string }[]> {
        if (!document) {
            return Promise.resolve([]);
        }

        const parsedAndAnalyzed = this.parseAndAnalyze(document, cursorOffset);

        const queryParamStatements = this.toArray(
            parsedAndAnalyzed.Syntax.GetDescendants(Kusto.Language.Syntax.QueryParametersStatement)
        );
        if (!queryParamStatements || queryParamStatements.length == 0) {
            return Promise.resolve([]);
        }

        const queryParams = [];
        queryParamStatements.forEach((paramStatement: Kusto.Language.Syntax.QueryParametersStatement) => {
            paramStatement.WalkElements((el: any) =>
                el.ReferencedSymbol && el.ReferencedSymbol.Type
                    ? queryParams.push({ name: el.ReferencedSymbol.Name, type: el.ReferencedSymbol.Type.Name })
                    : undefined
            );
        });

        return Promise.resolve(queryParams);
    }

    getRenderInfo(document: TextDocument, cursorOffset: number): Promise<RenderInfo | undefined> {
        const parsedAndAnalyzed = this.parseAndAnalyze(document, cursorOffset);
        if (!parsedAndAnalyzed) {
            return Promise.resolve(undefined);
        }

        const renderStatements = this.toArray(
            parsedAndAnalyzed.Syntax.GetDescendants(Kusto.Language.Syntax.RenderOperator)
        );

        if (!renderStatements || renderStatements.length === 0) {
            return Promise.resolve(undefined);
        }

        // assuming a single render statement
        const renderStatement = renderStatements[0] as Kusto.Language.Syntax.RenderOperator;

        // Start and end relative to block start.
        const startOffset = renderStatement.TextStart;
        const endOffset = renderStatement.End;

        const visualization: VisualizationType = renderStatement.ChartType.ValueText as VisualizationType;

        const withClause = renderStatement.WithClause;

        if (!withClause) {
            const info: RenderInfo = {
                options: {
                    visualization,
                },
                location: { startOffset, endOffset },
            };

            return Promise.resolve(info);
        }

        const properties = this.toArray(withClause.Properties);

        const props = properties.reduce<RenderOptions>(
            (
                prev: RenderOptions,
                property: Kusto.Language.Syntax.SeparatedElement$1<Kusto.Language.Syntax.NamedParameter>
            ) => {
                const name = property.Element$1.Name.SimpleName as RenderOptionKeys;

                switch (name) {
                    case 'xcolumn':
                        const value = property.Element$1.Expression.ReferencedSymbol.Name;
                        prev[name] = value;
                        break;
                    case 'ycolumns':
                    case 'anomalycolumns':
                        const nameNodes = this.toArray((property.Element$1.Expression as any).Names);

                        const values = nameNodes.map(
                            (
                                nameNode: Kusto.Language.Syntax.SeparatedElement$1<Kusto.Language.Syntax.NameDeclaration>
                            ) => nameNode.Element$1.SimpleName
                        );
                        prev[name] = values;
                        break;
                    case 'ymin':
                    case 'ymax':
                        const numericVal = parseFloat(property.Element$1.Expression.ConstantValue);
                        prev[name] = numericVal;
                        break;
                    case 'title':
                    case 'xtitle':
                    case 'ytitle':
                    case 'visualization':
                    case 'series':
                        const strVal = property.Element$1.Expression.ConstantValue;
                        prev[name] = strVal;
                        break;
                    case 'xaxis':
                    case 'yaxis':
                        const scale = property.Element$1.Expression.ConstantValue;
                        prev[name] = scale;
                        break;
                    case 'legend':
                        const legend = property.Element$1.Expression.ConstantValue;
                        prev[name] = legend;
                        break;
                    case 'ysplit':
                        const split = property.Element$1.Expression.ConstantValue;
                        prev[name] = split;
                        break;
                    case 'accumulate':
                        const accumulate = property.Element$1.Expression.ConstantValue;
                        prev[name] = accumulate;
                        break;
                    case 'kind':
                        const val = property.Element$1.Expression.ConstantValue;
                        prev[name] = val;
                        break;
                    default:
                        assertNever(name);
                }

                return prev;
            },
            {}
        );

        const renderOptions: RenderOptions = { visualization, ...props };
        const renderInfo: RenderInfo = {
            options: renderOptions,
            location: { startOffset, endOffset },
        };
        return Promise.resolve(renderInfo);
    }

    getReferencedSymbols(
        document: TextDocument,
        offset?: number
    ): Promise<{ name: string; kind: string; display: string }[]> {
        const parsedAndAnalyzed = this.parseAndAnalyze(document, offset);

        if (!parsedAndAnalyzed) {
            Promise.resolve([]);
        }

        // We take all referenced symbols in the query
        const referencedSymbols = this.toArray<Kusto.Language.Syntax.SyntaxNode>(
            parsedAndAnalyzed.Syntax.GetDescendants(Kusto.Language.Syntax.Expression)
        )
            .filter((expression) => expression.ReferencedSymbol !== null)
            .map((x) => x.ReferencedSymbol);

        const result = referencedSymbols.map((sym) => ({
            name: sym.Name,
            kind: symbolKindToName[sym.Kind] ?? `${sym.Kind}`,
            display: `${sym.Name} (${sym.AlternateName})`,
        }));

        return Promise.resolve(result);
    }

    getReferencedGlobalParams(
        document: TextDocument,
        cursorOffset?: number
    ): Promise<{ name: string; type: string }[]> {
        const parsedAndAnalyzed = this.parseAndAnalyze(document, cursorOffset);

        if (!parsedAndAnalyzed) {
            Promise.resolve([]);
        }

        // We take the ambient parameters
        const ambientParameters = this.toArray<sym.ParameterSymbol>(this._kustoJsSchemaV2.Parameters);

        // We take all referenced symbols in the query
        const referencedSymbols = this.toArray<Kusto.Language.Syntax.SyntaxNode>(
            parsedAndAnalyzed.Syntax.GetDescendants(Kusto.Language.Syntax.Expression)
        )
            .filter((expression) => expression.ReferencedSymbol !== null)
            .map((x) => x.ReferencedSymbol) as sym.ParameterSymbol[];

        // The Intersection between them is the ambient parameters that are used in the query.
        // Note: Ideally we would use Set here (or at least array.Include), but were' compiling down to es2015.
        const intersection = referencedSymbols.filter(
            (referencedSymbol) =>
                ambientParameters.filter((ambientParameter) => ambientParameter === referencedSymbol).length > 0
        );

        const result = intersection.map((param) => ({ name: param.Name, type: param.Type.Name }));
        return Promise.resolve(result);
    }

    getGlobalParams(document: TextDocument): Promise<{ name: string; type: string }[]> {
        const params = this.toArray<sym.ParameterSymbol>(this._kustoJsSchemaV2.Parameters);
        const result = params.map((param) => ({ name: param.Name, type: param.Type.Name }));
        return Promise.resolve(result);
    }

    doRename(document: TextDocument, position: ls.Position, newName: string): Promise<ls.WorkspaceEdit | undefined> {
        if (!document) {
            return Promise.resolve(undefined);
        }

        const script = this.parseDocumentV2(document);
        const cursorOffset = document.offsetAt(position);
        let currentBLock = this.getCurrentCommandV2(script, cursorOffset);

        if (!currentBLock) {
            return Promise.resolve(undefined);
        }

        const relatedInfo = currentBLock.Service.GetRelatedElements(document.offsetAt(position));

        const relatedElements = this.toArray<k2.RelatedElement>(relatedInfo.Elements);
        const declarations = relatedElements.filter((e) => e.Kind == k2.RelatedElementKind.Declaration);

        // A declaration must be one of the elements
        if (!declarations || declarations.length == 0) {
            return Promise.resolve(undefined);
        }

        const edits = relatedElements.map((edit) => {
            const start = document.positionAt(edit.Start);
            const end = document.positionAt(edit.End);
            const range = ls.Range.create(start, end);
            return ls.TextEdit.replace(range, newName);
        });

        // create a workspace edit
        const workspaceEdit: ls.WorkspaceEdit = { changes: { [document.uri]: edits } };
        return Promise.resolve(workspaceEdit);
    }

    doHover(document: TextDocument, position: ls.Position): Promise<ls.Hover | undefined> {
        if (!document) {
            return Promise.resolve(undefined);
        }

        const script = this.parseDocumentV2(document);
        const cursorOffset = document.offsetAt(position);
        let currentBLock = this.getCurrentCommandV2(script, cursorOffset);

        if (!currentBLock) {
            return Promise.resolve(undefined);
        }

        const isSupported = currentBLock.Service.IsFeatureSupported(k2.CodeServiceFeatures.QuickInfo, cursorOffset);

        if (!isSupported) {
            return Promise.resolve(undefined);
        }

        const quickInfo = currentBLock.Service.GetQuickInfo(cursorOffset);

        if (!quickInfo || !quickInfo.Items) {
            return Promise.resolve(undefined);
        }

        let items = this.toArray(quickInfo.Items);

        if (!items) {
            return Promise.resolve(undefined);
        }

        // Errors, Warnings and Suggestions are already shown in getDiagnostics. we don't want them in doHover.
        items = items.filter(
            (item) =>
                item.Kind !== k2.QuickInfoKind.Error &&
                item.Kind !== k2.QuickInfoKind.Suggestion &&
                item.Kind !== k2.QuickInfoKind.Warning
        );
        const itemsText = items.map((item) => item.Text.replace('\n\n', '\n* * *\n'));
        // separate items by horizontal line.
        const text = itemsText.join('\n* * *\n');
        // Instead of just an empty line between the first line (the signature) and the second line (the description)
        // add an horizontal line (* * * in markdown) between them.
        return Promise.resolve({ contents: text });
    }

    //#region dummy schema for manual testing
    static get dummySchema() {
        const languageServiceSchema: s.EngineSchema = {
            clusterType: 'Engine',
            cluster: {
                connectionString: '',
                databases: [],
            },
            database: undefined,
        };

        return languageServiceSchema;
    }
    //#endregion

    private static convertToEntityDataType(kustoType: string) {}
    /**
     * We do not want to expose Bridge.Net generated schema, so we expose a cleaner javascript schema.
     * Here it gets converted to the bridge.Net schema
     * @param schema Language Service schema
     */
    private static convertToKustoJsSchema(schema: s.Schema): k.KustoIntelliSenseQuerySchema | CmSchema | undefined {
        switch (schema.clusterType) {
            case 'Engine':
                const currentDatabaseName = schema.database ? schema.database.name : undefined;
                const kCluster = new k.KustoIntelliSenseClusterEntity();
                let kDatabaseInContext: k.KustoIntelliSenseDatabaseEntity = undefined;

                kCluster.ConnectionString = schema.cluster.connectionString;
                const databases = [];
                schema.cluster.databases.forEach((database) => {
                    const kDatabase = new k.KustoIntelliSenseDatabaseEntity();
                    kDatabase.Name = database.name;
                    const tables = [];
                    database.tables.forEach((table) => {
                        const kTable = new k.KustoIntelliSenseTableEntity();
                        kTable.Name = table.name;
                        const cols = [];
                        table.columns.forEach((column) => {
                            const kColumn = new k.KustoIntelliSenseColumnEntity();
                            kColumn.Name = column.name;
                            kColumn.TypeCode = k.EntityDataType[getEntityDataTypeFromCslType(column.type)];
                            cols.push(kColumn);
                        });
                        kTable.Columns = new Bridge.ArrayEnumerable(cols);
                        tables.push(kTable);
                    });
                    const functions = [];
                    database.functions.forEach((fn) => {
                        const kFunction = new k.KustoIntelliSenseFunctionEntity();
                        (kFunction.Name = fn.name),
                            (kFunction.CallName = s.getCallName(fn)),
                            (kFunction.Expression = s.getExpression(fn)),
                            functions.push(kFunction);
                    });

                    kDatabase.Tables = new Bridge.ArrayEnumerable(tables);
                    kDatabase.Functions = new Bridge.ArrayEnumerable(functions);
                    databases.push(kDatabase);

                    if (database.name == currentDatabaseName) {
                        kDatabaseInContext = kDatabase;
                    }
                });
                kCluster.Databases = new Bridge.ArrayEnumerable(databases);
                const kSchema = new k.KustoIntelliSenseQuerySchema(kCluster, kDatabaseInContext);
                return kSchema;
            case 'ClusterManager':
                const accounts = schema.accounts.map((account) => {
                    const kAccount = new k.KustoIntelliSenseAccountEntity();
                    kAccount.Name = account;
                    return kAccount;
                });

                const services = schema.services.map((service) => {
                    const kService = new k.KustoIntelliSenseServiceEntity();
                    kService.Name = service;
                    return kService;
                });

                const connectionString = schema.connectionString;

                const result: CmSchema = {
                    accounts,
                    services,
                    connectionString,
                };
                return result;
            case 'DataManagement':
                return undefined;
            default:
                return assertNever(schema);
        }
    }

    /**
     * Returns something like '(x: string, y: datetime)'
     * @param params scalar parameters
     */
    private static scalarParametersToSignature(params: s.ScalarParameter[]) {
        const signatureWithoutParens = params.map((param) => `${param.name}: ${param.cslType}`).join(', ');
        return `(${signatureWithoutParens})`;
    }

    /**
     * Returns something like '(x: string, T: (y: int))'
     * @param params input parameters (tabular or scalar)
     */
    private static inputParameterToSignature(params: readonly s.InputParameter[]) {
        const signatureWithoutParens = params
            .map((param) => {
                if (param.columns) {
                    const tableSignature = this.scalarParametersToSignature(param.columns);
                    return `${param.name}: ${tableSignature}`;
                } else {
                    return `${param.name}: ${param.cslType}`;
                }
            })
            .join(', ');
        return `(${signatureWithoutParens})`;
    }

    /**
     * converts a function definition to a let statement.
     * @param fn function
     */
    private static toLetStatement(fn: s.Function): string {
        const signature = this.inputParameterToSignature(fn.inputParameters);
        return `let ${fn.name} = ${signature} ${fn.body}`;
    }

    private static createColumnSymbol(col: s.ScalarParameter): sym.ColumnSymbol {
        return new sym.ColumnSymbol(
            col.name,
            sym.ScalarTypes.GetSymbol(getCslTypeNameFromClrType(col.type)),
            col.docstring,
            null,
            null,
            col.examples ? KustoLanguageService.toBridgeList(col.examples) : null
        );
    }

    private static createParameterSymbol(param: s.ScalarParameter): sym.ParameterSymbol {
        const paramSymbol: sym.ScalarSymbol = Kusto.Language.Symbols.ScalarTypes.GetSymbol(
            getCslTypeNameFromClrType(param.type)
        );
        return new sym.ParameterSymbol(param.name, paramSymbol, param.docstring ?? null);
    }

    private static createTabularParameterSymbol(param: s.TabularParameter): sym.ParameterSymbol {
        const columnSymbols = param.columns.map((col) => KustoLanguageService.createColumnSymbol(col));
        const para = new Kusto.Language.Symbols.TableSymbol.$ctor4(param.name, columnSymbols);
        return new sym.ParameterSymbol(param.name, para, param.docstring);
    }

    private static createParameter(param: s.InputParameter): sym.Parameter {
        if (!param.columns) {
            const paramSymbol: sym.ScalarSymbol = Kusto.Language.Symbols.ScalarTypes.GetSymbol(
                getCslTypeNameFromClrType(param.type)
            );

            const expression =
                param.cslDefaultValue && typeof param.cslDefaultValue === 'string'
                    ? parsing.QueryParser.ParseLiteral$1(param.cslDefaultValue)
                    : undefined;

            return new sym.Parameter.$ctor3(
                param.name,
                paramSymbol,
                null,
                null,
                param.examples ? KustoLanguageService.toBridgeList(param.examples) : null,
                false,
                null,
                1,
                1,
                expression,
                param.docstring ?? null
            );
        }

        if (param.columns.length == 0) {
            return new sym.Parameter.ctor(
                param.name,
                sym.ParameterTypeKind.Tabular,
                sym.ArgumentKind.Expression,
                null,
                null,
                false,
                null,
                1,
                1,
                null,
                null
            );
        }

        const argumentType = new sym.TableSymbol.ctor(
            param.columns.map((col) => KustoLanguageService.createColumnSymbol(col))
        );
        return new sym.Parameter.$ctor2(param.name, argumentType);
    }

    private static convertToDatabaseSymbol(db: s.Database): sym.DatabaseSymbol {
        const tableSymbols: sym.Symbol[] = (db.tables || []).map(this.createTableSymbol);
        const functionSymbols = (db.functions || []).map(this.createFunctionSymbol);
        const entityGroupsSymbols = (db.entityGroups || []).map(this.createEntityGroupSymbol);
        const databaseSymbol = new sym.DatabaseSymbol.$ctor2(
            db.name,
            db.alternateName || null,
            tableSymbols.concat(functionSymbols).concat(entityGroupsSymbols)
        );

        return databaseSymbol;
    }

    private convertToKustoJsSchemaV2(schema: s.EngineSchema): GlobalState {
        let cached = this._schemaCache[schema.cluster.connectionString];

        // create a cache entry for the cluster if non yet exists.
        if (!cached) {
            this._schemaCache[schema.cluster.connectionString] = {};
            cached = this._schemaCache[schema.cluster.connectionString];
        }

        // Remove deleted databases from cache
        const schemaDbLookup: { [dbName: string]: s.Database } = schema.cluster.databases.reduce(
            (prev, curr) => (prev[curr.name] = curr),
            {}
        );
        Object.keys(cached).map((dbName) => {
            if (!schemaDbLookup[dbName]) {
                delete cached.dbName;
            }
        });

        let globalState = GlobalState.Default;
        const currentDatabaseName = schema.database ? schema.database.name : undefined;

        let databaseInContext: sym.DatabaseSymbol | undefined = undefined;

        // Update out-of-data databases to cache
        const databases = schema.cluster.databases.map((db) => {
            const shouldIncludeFunctions = db.name === currentDatabaseName;

            const cachedDb = cached[db.name];
            // This is an older version than we have, or we need to parse functions.
            if (
                !cachedDb ||
                cachedDb.database.majorVersion < db.majorVersion ||
                (shouldIncludeFunctions && !cachedDb.includesFunctions)
            ) {
                // only add functions for the database in context (it's very time consuming)

                const databaseSymbol = KustoLanguageService.convertToDatabaseSymbol(db);
                cached[db.name] = { database: db, symbol: databaseSymbol, includesFunctions: shouldIncludeFunctions };
            }

            const databaseSymbol = cached[db.name].symbol;
            if (db.name === currentDatabaseName) {
                databaseInContext = databaseSymbol;
            }

            return databaseSymbol;
        });

        // Replace new URL due to polyfill issue in IE
        // const hostname = new URL(schema.cluster.connectionString.split(';')[0]).hostname;
        const hostname = schema.cluster.connectionString.match(/(.*\/\/)?([^\/;]*)/)[2];
        // safranke.eastus.kusto.windows.net --> safranke.eastus;
        const clusterName = hostname.split(hostname.includes('.kusto') ? '.kusto' : '.')[0];
        const clusterSymbol = new sym.ClusterSymbol.ctor(clusterName, databases);

        globalState = globalState.WithCluster(clusterSymbol);

        if (databaseInContext) {
            globalState = globalState.WithDatabase(databaseInContext);
        }

        // Inject global scalar parameters to global scope.
        const scalarParameters = (schema.globalScalarParameters ?? []).map((param) =>
            KustoLanguageService.createParameterSymbol(param)
        );

        // Inject global tabular parameters to global scope.
        let tabularParameters = (schema.globalTabularParameters ?? []).map((param) =>
            KustoLanguageService.createTabularParameterSymbol(param)
        );

        if (tabularParameters.length || scalarParameters.length) {
            globalState = globalState.WithParameters(
                KustoLanguageService.toBridgeList([...scalarParameters, ...tabularParameters])
            );
        }

        return globalState;
    }

    private getClassificationsFromParseResult(offset: number = 0): k2.ClassifiedRange[] {
        const classifications = this.toArray(this._parser.Results)
            .map((command) => this.toArray(command.Tokens))
            .reduce((prev, curr) => prev.concat(curr), [])
            .map((cslCommandToken): k2.ClassifiedRange => {
                const range = new k2.ClassifiedRange(
                    this.tokenKindToClassificationKind(cslCommandToken.TokenKind),
                    cslCommandToken.AbsoluteStart + offset,
                    cslCommandToken.Length
                );

                return range;
            });

        return classifications;
    }

    /**
     * trim trailing newlines from range
     */
    private static trimTrailingNewlineFromRange(
        textInRange: string,
        rangeStartOffset: number,
        document: TextDocument,
        range: ls.Range
    ) {
        let currentIndex = textInRange.length - 1;
        while (textInRange[currentIndex] === '\r' || textInRange[currentIndex] === '\n') {
            --currentIndex;
        }
        const newEndOffset = rangeStartOffset + currentIndex + 1;
        const newEndPosition = document.positionAt(newEndOffset);
        const newRange = ls.Range.create(range.start, newEndPosition);
        return newRange;
    }

    /**
     * ParseTextV1 parses the given text with the given parse mode.
     * Additionally - it will make sure not to provide rules provider for non-engine clusters
     * since the only rules provider parse can handle is the engine's. It will try to look for function
     * definitions to colorize and will throw since they're not there.
     * @param text
     * @param parseMode
     */
    private parseTextV1(text: string, parseMode: k.ParseMode) {
        this._parser.Parse(
            this._schema.clusterType === 'Engine' ? (this._rulesProvider as any) : null,
            text,
            parseMode
        );
    }

    private parseDocumentV1(document: TextDocument, parseMode: k.ParseMode) {
        // already parsed a later version, or better parse mode for this uri
        if (
            this._parsePropertiesV1 &&
            !this._parsePropertiesV1.isParseNeeded(document, this._rulesProvider, parseMode)
        ) {
            return;
        }

        this.parseTextV1(document.getText(), parseMode);

        this._parsePropertiesV1 = new ParseProperties(document.version, document.uri, this._rulesProvider, parseMode);
    }

    private parseDocumentV2(document: TextDocument) {
        if (this._parsePropertiesV2 && !this._parsePropertiesV2.isParseNeeded(document, this._rulesProvider)) {
            return this._script;
        }

        if (!this._script) {
            this._script = k2.CodeScript.From$1(document.getText(), this._kustoJsSchemaV2);
        } else {
            this._script = this._script.WithText(document.getText());
        }

        this._parsePropertiesV2 = new ParseProperties(document.version, document.uri);

        return this._script;
    }

    /**
     * Return the CslCommand that wraps the caret location, or undefined if caret is outside any command
     * @param document the document to extract the current command from
     * @param caretAbsolutePosition absolute caret position
     */
    private getCurrentCommand(document: TextDocument, caretAbsolutePosition: number): k.CslCommand | undefined {
        let commands = this.toArray(this._parser.Results);

        let command = commands.filter(
            (command) => command.AbsoluteStart <= caretAbsolutePosition && command.AbsoluteEnd >= caretAbsolutePosition
        )[0];

        // There is an edge case when cursor appears at the end of the command
        // which is not yet considered to be part of the parsed command (therefore: +1 for the AbsoluteEdit property)
        if (!command) {
            command = commands.filter(
                (command) =>
                    command.AbsoluteStart <= caretAbsolutePosition && command.AbsoluteEnd + 1 >= caretAbsolutePosition
            )[0];

            // If we have 2 newlines in the end of the text the cursor is _probably_ at the end of the text
            // which this means that we're not actually standing on any command. Thus return null.
            if (!command || command.Text.endsWith('\r\n\r\n')) {
                return null;
            }
        }

        return command;
    }

    private getCurrentCommandV2(script: k2.CodeScript, offset: number) {
        return script.GetBlockAtPosition(offset);
    }

    private getTextToInsert(
        rule: k.IntelliSenseRule,
        option: k.CompletionOption
    ): { insertText: string; insertTextFormat: ls.InsertTextFormat } {
        const beforeApplyInfo = rule.GetBeforeApplyInfo(option.Value);
        const afterApplyInfo = rule.GetAfterApplyInfo(option.Value);

        // this is the basic text to be inserted,
        // but we still need to figure out where the cursor will end up after completion is applied.
        let insertText = beforeApplyInfo.Text || '' + option.Value + afterApplyInfo.Text || '';
        let insertTextFormat: ls.InsertTextFormat = ls.InsertTextFormat.PlainText;

        const snippetFinalTabStop = '$0';
        if (afterApplyInfo.OffsetToken && afterApplyInfo.OffsetPosition) {
            const tokenOffset = insertText.indexOf(afterApplyInfo.OffsetToken);
            if (tokenOffset >= 0) {
                insertText = this.insertToString(
                    insertText,
                    snippetFinalTabStop,
                    tokenOffset - insertText.length + afterApplyInfo.OffsetPosition
                );
                insertTextFormat = ls.InsertTextFormat.Snippet;
            }
        } else if (afterApplyInfo.OffsetPosition) {
            // We only handle negative offsets
            insertText = this.insertToString(insertText, snippetFinalTabStop, afterApplyInfo.OffsetPosition);
            insertTextFormat = ls.InsertTextFormat.Snippet;
        }

        return { insertText, insertTextFormat };
    }

    /**
     * create a new string with stringToInsert inserted at offsetFromEnd in originalString.
     * @param originalString string to insert to
     * @param stringToInsert string to insert
     * @param offsetFromEnd a negative number that will represent offset to the left. 0 means simple concat
     */
    private insertToString(originalString: string, stringToInsert: string, offsetFromEnd: number): string {
        let index = originalString.length + offsetFromEnd;

        if (offsetFromEnd >= 0 || index < 0) {
            return originalString; // Cannot insert before or after the string
        }

        let before = originalString.substring(0, index);
        let after = originalString.substring(index);

        return before + stringToInsert + after;
    }

    private getCommandWithoutLastWord(text: string): string {
        const lastWordRegex = XRegExp('[\\w_]*$', 's');
        return text.replace(lastWordRegex, '');
    }

    private createRulesProvider(
        schema: k.KustoIntelliSenseQuerySchema | CmSchema | undefined,
        clusterType: s.ClusterType
    ) {
        let queryParameters: any = new (List(String))();
        let availableClusters: any = new (List(String))();
        this._parser = new k.CslCommandParser();

        if (clusterType == 'Engine') {
            const engineSchema = schema as k.KustoIntelliSenseQuerySchema;
            this._rulesProvider =
                this._languageSettings && this._languageSettings.includeControlCommands
                    ? new k.CslIntelliSenseRulesProvider.$ctor1(
                          engineSchema.Cluster,
                          engineSchema,
                          queryParameters,
                          availableClusters,
                          null,
                          true,
                          true
                      )
                    : new k.CslQueryIntelliSenseRulesProvider.$ctor1(
                          engineSchema.Cluster,
                          engineSchema,
                          queryParameters,
                          availableClusters,
                          null,
                          null,
                          null
                      );
            return;
        }

        if (clusterType === 'DataManagement') {
            this._rulesProvider = new k.DataManagerIntelliSenseRulesProvider(null);
            return;
        }

        // This is a cluster manger
        const { accounts, services, connectionString } = schema as CmSchema;
        new k.KustoIntelliSenseAccountEntity();
        new k.KustoIntelliSenseServiceEntity();
        this._rulesProvider = new k.ClusterManagerIntelliSenseRulesProvider.$ctor1(
            new Bridge.ArrayEnumerable(accounts),
            new Bridge.ArrayEnumerable(services),
            connectionString
        );
    }

    private _kustoKindtolsKind = {
        [k.OptionKind.None]: ls.CompletionItemKind.Interface,
        [k.OptionKind.Operator]: ls.CompletionItemKind.Method,
        [k.OptionKind.Command]: ls.CompletionItemKind.Method,
        [k.OptionKind.Service]: ls.CompletionItemKind.Class,
        [k.OptionKind.Policy]: ls.CompletionItemKind.Reference,
        [k.OptionKind.Database]: ls.CompletionItemKind.Class,
        [k.OptionKind.Table]: ls.CompletionItemKind.Class,
        [k.OptionKind.DataType]: ls.CompletionItemKind.Class,
        [k.OptionKind.Literal]: ls.CompletionItemKind.Property,
        [k.OptionKind.Parameter]: ls.CompletionItemKind.Variable,
        [k.OptionKind.IngestionMapping]: ls.CompletionItemKind.Variable,
        [k.OptionKind.ExpressionFunction]: ls.CompletionItemKind.Variable,
        [k.OptionKind.Option]: ls.CompletionItemKind.Interface,
        [k.OptionKind.OptionKind]: ls.CompletionItemKind.Interface,
        [k.OptionKind.OptionRender]: ls.CompletionItemKind.Interface,
        [k.OptionKind.Column]: ls.CompletionItemKind.Function,
        [k.OptionKind.ColumnString]: ls.CompletionItemKind.Field,
        [k.OptionKind.ColumnNumeric]: ls.CompletionItemKind.Field,
        [k.OptionKind.ColumnDateTime]: ls.CompletionItemKind.Field,
        [k.OptionKind.ColumnTimespan]: ls.CompletionItemKind.Field,
        [k.OptionKind.FunctionServerSide]: ls.CompletionItemKind.Field,
        [k.OptionKind.FunctionAggregation]: ls.CompletionItemKind.Field,
        [k.OptionKind.FunctionFilter]: ls.CompletionItemKind.Field,
        [k.OptionKind.FunctionScalar]: ls.CompletionItemKind.Field,
        [k.OptionKind.ClientDirective]: ls.CompletionItemKind.Enum,
    };

    private _kustoKindToLsKindV2: { [k in k2.CompletionKind]: ls.CompletionItemKind } = {
        [k2.CompletionKind.AggregateFunction]: ls.CompletionItemKind.Field,
        [k2.CompletionKind.BuiltInFunction]: ls.CompletionItemKind.Field,
        [k2.CompletionKind.Cluster]: ls.CompletionItemKind.Class,
        [k2.CompletionKind.Column]: ls.CompletionItemKind.Function,
        [k2.CompletionKind.CommandPrefix]: ls.CompletionItemKind.Field,
        [k2.CompletionKind.Database]: ls.CompletionItemKind.Class,
        [k2.CompletionKind.DatabaseFunction]: ls.CompletionItemKind.Field,
        [k2.CompletionKind.Example]: ls.CompletionItemKind.Text,
        [k2.CompletionKind.Identifier]: ls.CompletionItemKind.Method,
        [k2.CompletionKind.Keyword]: ls.CompletionItemKind.Method,
        [k2.CompletionKind.LocalFunction]: ls.CompletionItemKind.Field,
        [k2.CompletionKind.MaterialiedView]: ls.CompletionItemKind.Class,
        [k2.CompletionKind.Parameter]: ls.CompletionItemKind.Variable,
        [k2.CompletionKind.Punctuation]: ls.CompletionItemKind.Interface,
        [k2.CompletionKind.QueryPrefix]: ls.CompletionItemKind.Function,
        [k2.CompletionKind.RenderChart]: ls.CompletionItemKind.Method,
        [k2.CompletionKind.ScalarInfix]: ls.CompletionItemKind.Field,
        [k2.CompletionKind.ScalarPrefix]: ls.CompletionItemKind.Field,
        [k2.CompletionKind.ScalarType]: ls.CompletionItemKind.TypeParameter,
        [k2.CompletionKind.Syntax]: ls.CompletionItemKind.Method,
        [k2.CompletionKind.Table]: ls.CompletionItemKind.Class,
        [k2.CompletionKind.TabularPrefix]: ls.CompletionItemKind.Field,
        // datatable, externaldata
        [k2.CompletionKind.TabularSuffix]: ls.CompletionItemKind.Field,
        [k2.CompletionKind.Unknown]: ls.CompletionItemKind.Interface,
        [k2.CompletionKind.Variable]: ls.CompletionItemKind.Variable,
        [k2.CompletionKind.Option]: ls.CompletionItemKind.Text,
        [k2.CompletionKind.Graph]: ls.CompletionItemKind.Class,
        [k2.CompletionKind.EntityGroup]: ls.CompletionItemKind.Class,
    };

    private kustoKindToLsKind(kustoKind: k.OptionKind): ls.CompletionItemKind {
        let res = this._kustoKindtolsKind[kustoKind];
        return res ? res : ls.CompletionItemKind.Variable;
    }

    private kustoKindToLsKindV2(kustoKind: k2.CompletionKind): ls.CompletionItemKind {
        let res = this._kustoKindToLsKindV2[kustoKind];
        return res ? res : ls.CompletionItemKind.Variable;
    }

    private createRange(document: TextDocument, start: number, end: number): ls.Range {
        return ls.Range.create(document.positionAt(start), document.positionAt(end));
    }

    private toArray<T>(bridgeList: System.Collections.Generic.IEnumerable$1<T>): T[] {
        return (Bridge as any).toArray(bridgeList);
    }

    private static toBridgeList(array): any {
        // copied from bridge.js from the implementation of Enumerable.prototype.toList
        return new (System.Collections.Generic.List$1(System.Object).$ctor1)(array);
    }

    private _tokenKindToClassificationKind: { [k in TokenKind]: k2.ClassificationKind } = {
        [TokenKind.TableToken]: k2.ClassificationKind.Table,
        [TokenKind.TableColumnToken]: k2.ClassificationKind.Column,
        [TokenKind.OperatorToken]: k2.ClassificationKind.QueryOperator,
        [TokenKind.SubOperatorToken]: k2.ClassificationKind.Function,
        [TokenKind.CalculatedColumnToken]: k2.ClassificationKind.Column,
        [TokenKind.StringLiteralToken]: k2.ClassificationKind.Literal,
        [TokenKind.FunctionNameToken]: k2.ClassificationKind.Function,
        [TokenKind.UnknownToken]: k2.ClassificationKind.PlainText,
        [TokenKind.CommentToken]: k2.ClassificationKind.Comment,
        [TokenKind.PlainTextToken]: k2.ClassificationKind.PlainText,
        [TokenKind.DataTypeToken]: k2.ClassificationKind.Type,
        [TokenKind.ControlCommandToken]: k2.ClassificationKind.PlainText, // TODO ?
        [TokenKind.CommandPartToken]: k2.ClassificationKind.PlainText, // TODO ?
        [TokenKind.QueryParametersToken]: k2.ClassificationKind.QueryParameter,
        [TokenKind.CslCommandToken]: k2.ClassificationKind.Keyword, // TODO ?
        [TokenKind.LetVariablesToken]: k2.ClassificationKind.Identifier, // TODO ?
        [TokenKind.PluginToken]: k2.ClassificationKind.Function,
        [TokenKind.BracketRangeToken]: k2.ClassificationKind.Keyword, // TODO ?
        [TokenKind.ClientDirectiveToken]: k2.ClassificationKind.Keyword, // TODO ?
    };
    private tokenKindToClassificationKind(token: TokenKind): k2.ClassificationKind {
        const conversion = this._tokenKindToClassificationKind[token];
        return conversion || k2.ClassificationKind.PlainText;
    }

    private parseAndAnalyze(document: TextDocument, cursorOffset?: number): Kusto.Language.KustoCode | undefined {
        if (!document) {
            return undefined;
        }

        const script = this.parseDocumentV2(document);
        let text = script.Text;
        if (cursorOffset !== undefined) {
            let currentBlock = this.getCurrentCommandV2(script, cursorOffset);

            if (!currentBlock) {
                return undefined;
            }

            text = currentBlock.Text;
        }

        const parsedAndAnalyzed = Kusto.Language.KustoCode.ParseAndAnalyze(text, this._kustoJsSchemaV2);

        return parsedAndAnalyzed;
    }

    private static createFunctionSymbol(fn: s.Function): sym.FunctionSymbol {
        const parameters: sym.Parameter[] = fn.inputParameters.map((param) =>
            KustoLanguageService.createParameter(param)
        );

        // TODO: handle outputColumns (right now it doesn't seem to be implemented for any function).
        return new sym.FunctionSymbol.$ctor14(
            fn.name,
            fn.body,
            KustoLanguageService.toBridgeList(parameters),
            fn.docstring
        );
    }

    private static createTableSymbol({
        name,
        columns,
        entityType,
        docstring,
        ...tbl
    }: s.Table): sym.TableSymbol | sym.MaterializedViewSymbol {
        const columnSymbols = new Bridge.ArrayEnumerable(
            columns.map((col) => KustoLanguageService.createColumnSymbol(col))
        );
        switch (entityType) {
            case 'MaterializedViewTable':
                const mvQuery = (tbl as s.MaterializedViewTable).mvQuery ?? null;
                return new sym.MaterializedViewSymbol.$ctor2(name, columnSymbols, mvQuery, docstring);
            case 'ExternalTable':
                return new sym.ExternalTableSymbol.$ctor3(name, columnSymbols, docstring);
            default:
                return new sym.TableSymbol.$ctor6(name, columnSymbols, docstring);
        }
    }

    private static createEntityGroupSymbol(entityGroup: s.EntityGroup): sym.EntityGroupSymbol {
        return new sym.EntityGroupSymbol.$ctor3(entityGroup.name, entityGroup.members.join(), null);
    }
}

let languageService = new KustoLanguageService(KustoLanguageService.dummySchema, {
    includeControlCommands: true,
    completionOptions: { includeExtendedSyntax: false },
});

/**
 * Obtain an instance of the kusto language service.
 */
export function getKustoLanguageService(): LanguageService {
    return languageService;
}
