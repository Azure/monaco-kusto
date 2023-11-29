import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import type * as ls from 'vscode-languageserver-types';
import type {
    Schema,
    ScalarParameter,
    TabularParameter,
    EngineSchema,
    Database,
    showSchema,
} from './languageService/schema';
import type { RenderInfo } from './languageService/renderInfo';
import type { LanguageSettings } from './languageService/settings';

export interface LanguageServiceDefaults {
    readonly onDidChange: monaco.IEvent<LanguageServiceDefaults>;
    readonly languageSettings: LanguageSettings;
    /**
     * Configure language service settings.
     */
    setLanguageSettings(options: LanguageSettings): void;

    /**
     * Configure when the worker shuts down. By default that is 2mins.
     *
     * @param value The maximum idle time in milliseconds. Values less than one
     * mean never shut down.
     */
    setMaximumWorkerIdleTime(value: number): void;
    getWorkerMaxIdleTime(): number;
}

export interface KustoWorker {
    setSchema(schema: Schema): Promise<void>;
    setSchemaFromShowSchema(
        schema: any,
        clusterConnectionString: string,
        databaseInContextName: string,
        globalScalarParameters?: ScalarParameter[],
        globalTabularParameters?: TabularParameter[]
    ): Promise<void>;
    normalizeSchema(
        schema: showSchema.Result,
        clusterConnectionString: string,
        databaseInContextName: string
    ): Promise<EngineSchema>;
    getCommandInContext(uri: string, cursorOffset: number): Promise<string | null>;
    getCommandAndLocationInContext(uri: string, offset: number): Promise<{ text: string; range: monaco.IRange } | null>;
    getCommandsInDocument(uri: string): Promise<{ absoluteStart: number; absoluteEnd: number; text: string }[]>;
    getClientDirective(text: string): Promise<{ isClientDirective: boolean; directiveWithoutLeadingComments: string }>;
    getAdminCommand(text: string): Promise<{ isAdminCommand: boolean; adminCommandWithoutLeadingComments: string }>;

    /**
     * Get all declared query parameters declared in current block if any.
     */
    getQueryParams(uri: string, cursorOffset: number): Promise<{ name: string; type: string }[]>;

    /**
     * Get all the ambient parameters defined in global scope.
     * Ambient parameters are parameters that are not defined in the syntax such as in a query parameter declaration.
     * These are parameters that are injected from outside, usually by a UX application that would like to offer
     * the user intellisense for a symbol, without forcing them to write a query declaration statement.
     * Usually  the same application injects the query declaration statement and the parameter values when
     * executing the query (so it will execute correctly)
     */
    getGlobalParams(uri: string): Promise<{ name: string; type: string }[]>;
    /**
     * Get the global parameters that are actually being referenced in query.
     * This is different from getQueryParams that will return the parameters using a query declaration
     * statement.
     * It is also different from getGlobalParams that will return all global parameters whether used or not.
     */
    getReferencedGlobalParams(uri: string, cursorOffset?: number): Promise<{ name: string; type: string }[]>;

    getReferencedSymbols(uri: string, cursorOffset?: number): Promise<{ name: string; kind: string }[]>;
    /**
     * Get visualization options in render command if present (null otherwise).
     */
    getRenderInfo(uri: string, cursorOffset: number): Promise<RenderInfo | null>;
    doDocumentFormat(uri: string): Promise<ls.TextEdit[]>;
    doRangeFormat(uri: string, range: ls.Range): Promise<ls.TextEdit[]>;
    doCurrentCommandFormat(uri: string, caretPosition: ls.Position): Promise<ls.TextEdit[]>;
    doValidation(
        uri: string,
        intervals: { start: number; end: number }[],
        includeWarnings?: boolean,
        includeSuggestions?: boolean
    ): Promise<ls.Diagnostic[]>;
    setParameters(
        scalarParameters: readonly ScalarParameter[],
        tabularParameters: readonly TabularParameter[]
    ): Promise<void>;
    /**
     * Get all the database references from the current command.
     * If database's schema is already cached in previous calls to setSchema or addDatabaseToSchema it will not be returned.
     * This method should be used to get all the cross-databases in a command, then schema for the database should be fetched and added with addDatabaseToSchema.
     * @example
     * If the current command includes: cluster('help').database('Samples')
     * getDatabaseReferences will return [{ clusterName: 'help', databaseName 'Samples' }]
     */
    getDatabaseReferences(uri: string, cursorOffset: number): Promise<DatabaseReference[]>;
    /**
     * Get all the cluster references from the current command.
     * If cluster's schema is already cached it will not be returned.
     * This method should be used to get all the cross-clusters in a command, then schema for the cluster should be fetched and added with addClusterToSchema.
     * cluster name is returned exactly as written in the KQL `cluster(<cluster name>)` function.
     * @example
     * If the current command includes: cluster('help')
     * it returns [{ clusterName: 'help' }]
     * @example
     * If the current command includes: cluster('https://demo11.westus.kusto.windows.net')
     * getClusterReferences will return [{ clusterName: 'https://demo11.westus.kusto.windows.net' }]
     */
    getClusterReferences(uri: string, cursorOffset: number): Promise<ClusterReference[]>;
    /**
     * Adds a database's scheme. Useful with getDatabaseReferences to load schema for cross-cluster commands.
     * @param clusterName the name of the cluster as returned from getDatabaseReferences/getClusterReferences.
     * @example
     * - User enters cluster('help').database('Samples')
     * - hosting app calls getDatabaseReferences which returns [{ clusterName: 'help', databaseName: 'Samples' }].
     * - hosting app fetches the database Schema from https://help.kusto.windows.net
     * - hosting app calls 'addDatabaseToSchema' with the database's schema.
     * - now, when user types cluster('help').database('Samples') then the auto complete list will show all the tables.
     */
    addDatabaseToSchema(uri: string, clusterName: string, databaseSchema: Database): Promise<void>;
    /**
     * Adds a cluster's databases to the schema. Useful when used with getClusterReferences in cross-cluster commands.
     * @param clusterName the name of the cluster as returned in getClusterReferences.
     * @example
     * - User enters cluster('help')
     * - hosting app calls getClusterReferences which returns [{ clusterName: 'help' }].
     * - hosting app fetches the list of databases from https://help.kusto.windows.net
     * - hosting app calls addClusterToSchema with the list of databases.
     * - now, when user type `cluster('help').database(` then the auto complete list will show all the databases.
     */
    addClusterToSchema(
        uri: string,
        clusterName: string,
        databases: readonly { name: string; alternativeName?: string }[]
    ): Promise<void>;
}

/**
 * A function that get a model Uri and returns a kusto worker that knows how to work
 * with that document.
 */
export interface WorkerAccessor {
    (first: monaco.Uri, ...more: monaco.Uri[]): Promise<KustoWorker>;
}

export interface DatabaseReference {
    databaseName: string;
    clusterName: string;
}

export interface ClusterReference {
    clusterName: string;
}

export type OnDidProvideCompletionItems = (list: ls.CompletionList) => Promise<ls.CompletionList>;
