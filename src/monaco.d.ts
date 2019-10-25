// This file gets bundled as is with monaco-kusto.
// Everything that needs to be exposed to consumers should be typed here.
// This means that all declarations here are duplicated from the actual definitions around the code.
// TODO: think about turning this around - have all other code depnedent on this file thus not needing the duplication.
// this was done like this becuase that's the standard way all other monaco extentions work for some reason.

declare module monaco.editor {
    export interface ICodeEditor  {
        getCurrentCommandRange(cursorPosition: monaco.Position): monaco.Range;
    }
}

declare module monaco.languages.kusto {
	export interface LanguageSettings {
		includeControlCommands?: boolean;
		newlineAfterPipe?: boolean;
		openSuggestionDialogAfterPreviousSuggestionAccepted?: boolean;
		useIntellisenseV2?: boolean;
		useSemanticColorization?: boolean;
		useTokenColorization?: boolean;
		disabledCompletionItems?: string[];
	}

	export interface LanguageServiceDefaults {
		readonly onDidChange: IEvent<LanguageServiceDefaults>;
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
	}

	export var kustoDefaults: LanguageServiceDefaults;

	export interface KustoWorker {
		setSchema(schema: Schema): Promise<void>;
		setSchemaFromShowSchema(schema: any, clusterConnectionString: string, databaseInContextName: string): Promise<void>;
		normalizeSchema(schema: any, clusterConnectionString: string, databaseInContextName: string): Promise<EngineSchema>;
		getCommandInContext(uri: string, cursorOffest: number): Promise<string | null>;
		getCommandAndLocationInContext(uri: string, cursorOffset: number): Promise<{text: string, range: monaco.Range} | null>
		getCommandsInDocument(uri: string): Promise<{absoluteStart: number, absoluteEnd: number, text: string}[]>;
		getClientDirective(text: string): Promise<{isClientDirective: boolean, directiveWithoutLeadingComments: string}>;
		getAdminCommand(text: string): Promise<{isAdminCommand: boolean, adminCommandWithoutLeadingComments: string}>;
		getQueryParams(uri: string, cursorOffest: number): Promise<{name: string, type: string}[];
	}

	/**
	 * A function that get a model Uri and returns a kusto worker that knows how to work
	 * with that document.
	 */
	export interface WorkerAccessor {
		(first: Uri, ...more: Uri[]): Promise<KustoWorker>
	}

	export interface Column {
		name: string,
		type: string
	}
	export interface Table {
		name: string,
		columns: Column[]
	}
	export interface ScalarParameter {
		name: string,
		type?: string,
		cslType?: string
	}

	// an input parameter either be a scalar in which case it has a name, type and cslType, or it can be columnar, in which case
	// it will have a name, and a list of scalar types which are the column types.
	export type InputParameter = ScalarParameter & {columns?: ScalarParameter[]};

	export interface Function {
		name: string,
		body: string,
		inputParameters: InputParameter[]
	}
	export interface Database {
		name: string,
		tables: Table[],
		functions: Function[],
		majorVersion: number,
		minorVersion: number
	}

	export interface EngineSchema {
		clusterType: 'Engine'
		cluster: {
			connectionString: string,
			databases: Database[]
		},
		database: Database | undefined // a reference to the database that's in current context.
	}

	export interface ClusterMangerSchema {
		clusterType: 'ClusterManager'
		accounts: string[],
		services: string[],
		connectionString: string
	}

	export interface DataManagementSchema {
		clusterType: 'DataManagement'
	}

	export type Schema = EngineSchema | ClusterMangerSchema | DataManagementSchema;


	export var getKustoWorker: () => monaco.Promise<WorkerAccessor>;

}