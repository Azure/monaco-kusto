import Emitter = monaco.Emitter;
import IEvent = monaco.IEvent;
import IDisposable = monaco.IDisposable;

import * as mode from './kustoMode';
import KustoCommandHighlighter from './commandHighlighter';
import KustoCommandFormatter from './commandFormatter';
import { extend } from './extendedEditor';

declare var require: <T>(moduleId: [string], callback: (module: T) => void) => void;

// --- Kusto configuration and defaults ---------

export class LanguageServiceDefaultsImpl implements monaco.languages.kusto.LanguageServiceDefaults {
    private _onDidChange = new Emitter<monaco.languages.kusto.LanguageServiceDefaults>();
    private _languageSettings: monaco.languages.kusto.LanguageSettings;
    // in milliseconds. For example - this is 2 minutes 2 * 60 * 1000
    private _workerMaxIdleTime: number;

    constructor(languageSettings: monaco.languages.kusto.LanguageSettings) {
        this.setLanguageSettings(languageSettings);
        // default to never kill worker when idle.
        // reason: when killing worker - schema gets lost. We transmit the schema back to main process when killing
        // the worker, but in some extreme cases web worker runs out of memory while stringifying the schema.
        // This stems from the fact that web workers have much more limited memory that the main process.
        // An alternative solution (not currently implemented) is to just save the schema in the main process whenever calling
        // setSchema. That way we don't need to stringify the schema on the worker side when killing the web worker.
        this._workerMaxIdleTime = 0;
    }

    get onDidChange(): IEvent<monaco.languages.kusto.LanguageServiceDefaults> {
        return this._onDidChange.event;
    }

    get languageSettings(): monaco.languages.kusto.LanguageSettings {
        return this._languageSettings;
    }

    get allAnalyzerDiagnostics() {
        const analyzers: Kusto.Language.Editor.KustoAnalyzer[] = (Bridge as any).toArray(Kusto.Language.Editor.KustoAnalyzers.All);
        return analyzers.reduce<monaco.languages.kusto.KustoAnalyzerDiagnostic[]>((allDiagnostics, analyzer) => {
            const diagnostics: monaco.languages.kusto.KustoAnalyzerDiagnostic[] = (Bridge as any).toArray(analyzer.Diagnostics);
            return allDiagnostics.concat(diagnostics)
        }, [])
    }

    setLanguageSettings(options: monaco.languages.kusto.LanguageSettings): void {
        this._languageSettings = options || Object.create(null);
        this._onDidChange.fire(this);
    }

    setMaximumWorkerIdleTime(value: number): void {
        // doesn't fire an event since no
        // worker restart is required here
        this._workerMaxIdleTime = value;
    }

    getWorkerMaxIdleTime() {
        return this._workerMaxIdleTime;
    }
}

const defaultLanguageSettings: monaco.languages.kusto.LanguageSettings = {
    includeControlCommands: true,
    newlineAfterPipe: true,
    openSuggestionDialogAfterPreviousSuggestionAccepted: true,
    useIntellisenseV2: true,
    useSemanticColorization: true,
    useTokenColorization: true,
    enableHover: true,
    formatter: {
        indentationSize: 4,
        pipeOperatorStyle: 'Smart',
    },
    syntaxErrorAsMarkDown: {
        enableSyntaxErrorAsMarkDown: false,
    },
    enableQueryWarnings: false,
    enableQuerySuggestions: false,
    disabledDiagnoticCodes: [],
};

function getKustoWorker(): Promise<any> {
    return new Promise((resolve, reject) => {
        withMode((mode) => {
            mode.getKustoWorker().then(resolve, reject);
        });
    });
}

function withMode(callback: (module: typeof mode) => void): void {
    require<typeof mode>(['vs/language/kusto/kustoMode'], callback);
}

export function setupMonacoKusto(monacoInstance: typeof monaco) {
    const kustoDefaults = new LanguageServiceDefaultsImpl(defaultLanguageSettings);
    function createAPI(): typeof monaco.languages.kusto {
        return {
            kustoDefaults,
            getKustoWorker,
        };
    }

    monacoInstance.languages.kusto = createAPI();

    monacoInstance.languages.onLanguage('kusto', () => {
        withMode((mode) => mode.setupMode(kustoDefaults, monacoInstance));
    });

    monacoInstance.languages.register({
        id: 'kusto',
        extensions: ['.csl', '.kql'],
    });

    // TODO: asked if there's a cleaner way to register an editor contribution. looks like monaco has an internal contribution regstrar but it's no exposed in the API.
    // https://stackoverflow.com/questions/46700245/how-to-add-an-ieditorcontribution-to-monaco-editor
    let commandHighlighter: KustoCommandHighlighter;
    let commandFormatter: KustoCommandFormatter;

    monacoInstance.editor.defineTheme('kusto-light', {
        base: 'vs',
        inherit: true,
        rules: [
            { token: 'comment', foreground: '008000' }, // CommentToken Green
            { token: 'variable.predefined', foreground: '800080' }, // CalculatedColumnToken Purple
            { token: 'function', foreground: '0000FF' }, // FunctionNameToken Blue
            { token: 'operator.sql', foreground: 'CC3700' }, // _WAS_ OperatorToken OrangeRed, but wasn't accessible.
            { token: 'string', foreground: 'B22222' }, // StringLiteralToken Firebrick
            { token: 'operator.scss', foreground: '0000FF' }, // SubOperatorToken Blue
            { token: 'variable', foreground: 'C71585' }, // TableColumnToken MediumVioletRed
            { token: 'variable.parameter', foreground: '9932CC' }, // TableToken DarkOrchid
            { token: '', foreground: '000000' }, // UnknownToken, PlainTextToken  Black
            { token: 'type', foreground: '0000FF' }, // DataTypeToken Blue
            { token: 'tag', foreground: '0000FF' }, // ControlCommandToken Blue
            { token: 'annotation', foreground: '2B91AF' }, // QueryParametersToken FF2B91AF
            { token: 'keyword', foreground: '0000FF' }, // CslCommandToken, PluginToken Blue
            { token: 'number', foreground: '191970' }, // LetVariablesToken MidnightBlue
            { token: 'annotation', foreground: '9400D3' }, // ClientDirectiveToken DarkViolet
            { token: 'invalid', background: 'cd3131' },
        ],
        colors: {},
    });

    monacoInstance.editor.defineTheme('kusto-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'comment', foreground: '608B4E' }, // CommentToken Green
            { token: 'variable.predefined', foreground: '4ec9b0' }, // CalculatedColumnToken Purple
            { token: 'function', foreground: 'dcdcaa' }, // FunctionNameToken Blue
            { token: 'operator.sql', foreground: '9cdcfe' }, // OperatorToken OrangeRed
            { token: 'string', foreground: 'ce9178' }, // StringLiteralToken Firebrick
            { token: 'operator.scss', foreground: '569cd6' }, // SubOperatorToken Blue
            { token: 'variable', foreground: '4ec9b0' }, // TableColumnToken MediumVioletRed
            { token: 'variable.parameter', foreground: 'c586c0' }, // TableToken DarkOrchid
            { token: '', foreground: 'd4d4d4' }, // UnknownToken, PlainTextToken  Black
            { token: 'type', foreground: '569cd6' }, // DataTypeToken Blue
            { token: 'tag', foreground: '569cd6' }, // ControlCommandToken Blue
            { token: 'annotation', foreground: '9cdcfe' }, // QueryParametersToken FF2B91AF
            { token: 'keyword', foreground: '569cd6' }, // CslCommandToken, PluginToken Blue
            { token: 'number', foreground: 'd7ba7d' }, // LetVariablesToken MidnightBlue
            { token: 'annotation', foreground: 'b5cea8' }, // ClientDirectiveToken DarkViolet
            { token: 'invalid', background: 'cd3131' },
        ],
        colors: {
            // see: https://code.visualstudio.com/api/references/theme-color#editor-widget-colors
        },
    });

    monacoInstance.editor.defineTheme('kusto-dark2', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
            // see: https://code.visualstudio.com/api/references/theme-color#editor-widget-colors
            'editor.background': '#1B1A19', // gray 200
            'editorSuggestWidget.selectedBackground': '#004E8C',
        },
    });

    // Initialize kusto specific language features that don't currently have a natural way to extend using existing apis.
    // Most other language features are initialized in kustoMode.ts
    monacoInstance.editor.onDidCreateEditor((editor) => {
        // hook up extension methods to editor.
        extend(editor);

        commandHighlighter = new KustoCommandHighlighter(editor);

        if (isStandaloneCodeEditor(editor)) {
            commandFormatter = new KustoCommandFormatter(editor);
        }

        triggerSuggestDialogWhenCompletionItemSelected(editor);
    });

    function triggerSuggestDialogWhenCompletionItemSelected(editor: monaco.editor.ICodeEditor) {
        editor.onDidChangeCursorSelection((event: monaco.editor.ICursorSelectionChangedEvent) => {
            // checking the condition inside the event makes sure we will stay up to date whne kusto configuration changes at runtime.
            if (
                kustoDefaults &&
                kustoDefaults.languageSettings &&
                kustoDefaults.languageSettings.openSuggestionDialogAfterPreviousSuggestionAccepted
            ) {
                var didAcceptSuggestion =
                    event.source === 'snippet' && event.reason === monaco.editor.CursorChangeReason.NotSet;
                if (!didAcceptSuggestion) {
                    return;
                }
                event.selection;
                // OK so now we in a situation where we know a suggestion was selected and we want to trigger another one.
                // the only problem is that the suggestion widget itself listens to this same event in order to know it needs to close.
                // The only problem is that we're ahead in line, so we're triggering a suggest operation that will be shut down once
                // the next callback is called. This is why we're waiting here - to let all the callbacks run synchronously and be
                // the 'last' subscriber to run. Granted this is hacky, but until monaco provides a specific event for suggestions,
                // this is the best we have.
                setTimeout(() => editor.trigger('monaco-kusto', 'editor.action.triggerSuggest', {}), 10);
            }
        });
    }
}

function isStandaloneCodeEditor(editor: monaco.editor.ICodeEditor): editor is monaco.editor.IStandaloneCodeEditor {
    return (editor as monaco.editor.IStandaloneCodeEditor).addAction !== undefined;
}

// --- Registration to monaco editor ---
if (monaco.editor) {
    setupMonacoKusto(monaco);
}
