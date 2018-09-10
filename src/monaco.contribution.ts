import Emitter = monaco.Emitter;
import IEvent = monaco.IEvent;
import IDisposable = monaco.IDisposable;
import Promise = monaco.Promise;

import * as mode from './kustoMode';
import KustoCommandHighlighter from './commandHighlighter';
import KustoCommandFormatter from './commandFormatter';
import { extend } from './extendedEditor';


declare var require: <T>(moduleId: [string], callback: (module: T) => void) => void;

// --- Kusto configuration and defaults ---------

export class LanguageServiceDefaultsImpl implements monaco.languages.kusto.LanguageServiceDefaults {

	private _onDidChange = new Emitter<monaco.languages.kusto.LanguageServiceDefaults>();
	private _languageSettings: monaco.languages.kusto.LanguageSettings;

	constructor(
		languageSettings: monaco.languages.kusto.LanguageSettings) {
		this.setLanguageSettings(languageSettings);
	}

	get onDidChange(): IEvent<monaco.languages.kusto.LanguageServiceDefaults> {
		return this._onDidChange.event;
	}

	get languageSettings(): monaco.languages.kusto.LanguageSettings {
		return this._languageSettings;
	}

	setLanguageSettings(options: monaco.languages.kusto.LanguageSettings): void {
		this._languageSettings = options || Object.create(null);
		this._onDidChange.fire(this);
	}
}

const defaultLanguageSettings: monaco.languages.kusto.LanguageSettings = {
	includeControlCommands: true,
	newlineAfterPipe: true,
	openSuggestionDialogAfterPreviousSuggestionAccepted: true,
	useIntellisenseV2: false,
	useSemanticColorization: true,
	useTokenColorization: true

}

const kustoDefaults = new LanguageServiceDefaultsImpl(defaultLanguageSettings);

function getKustoWorker(): monaco.Promise<any> {
	return new monaco.Promise((resolve, reject) => {
		withMode((mode) => {
			mode.getKustoWorker()
				.then(resolve, reject);
		});
	});
}

// Export API
function createAPI(): typeof monaco.languages.kusto {
	return {
		kustoDefaults,
		getKustoWorker
	}
}
monaco.languages.kusto = createAPI();

// --- Registration to monaco editor ---

function withMode(callback: (module: typeof mode) => void): void {
	require<typeof mode>(['vs/language/kusto/kustoMode'], callback);
}

monaco.languages.onLanguage('kusto', () => {
	withMode(mode => mode.setupMode(kustoDefaults));
});

monaco.languages.register({
	id: 'kusto',
	extensions: ['.csl', '.kql']
})

// TODO: asked if there's a cleaner way to register an editor contribution. looks like monaco has an internal contribution regstrar but it's no exposed in the API.
// https://stackoverflow.com/questions/46700245/how-to-add-an-ieditorcontribution-to-monaco-editor
let commandHighlighter: KustoCommandHighlighter;
let commandFormatter: KustoCommandFormatter;

monaco.editor.defineTheme('kusto-light', {
	base: 'vs',
	inherit: true,
	rules: [
		{ token: 'comment', foreground: '008000' }, // CommentToken Green
		{ token: 'variable.predefined', foreground: '800080' }, // CalculatedColumnToken Purple
		{ token: 'function', foreground: '0000FF' }, // FunctionNameToken Blue
		{ token: 'operator.sql', foreground: 'FF4500' }, // OperatorToken OrangeRed
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
	colors: {}
})

// Initialize kusto specific language features that don't currently have a natural way to extend using existing apis.
// Most other language features are initialized in kustoMode.ts
monaco.editor.onDidCreateEditor(editor => {
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
		if (kustoDefaults
			&& kustoDefaults.languageSettings
			&& kustoDefaults.languageSettings.openSuggestionDialogAfterPreviousSuggestionAccepted) {

			var didAcceptSuggestion =
				event.source === 'modelChange'
				&& event.reason === monaco.editor.CursorChangeReason.RecoverFromMarkers;
			if (!didAcceptSuggestion) {
				return;
			}
			event.selection
			const completionText = editor.getModel().getValueInRange(event.selection);
			if (completionText[completionText.length - 1] === ' ') {
				// OK so now we in a situation where we know a suggestion was selected and we want to trigger another one.
				// the only problem is that the suggestion widget itself listens to this same event in order to know it needs to close.
				// The only problem is that we're ahead in line, so we're triggering a suggest operation that will be shut down once
				// the next callback is called. This is why we're waiting here - to let all the callbacks run synchronously and be
				// the 'last' subscriber to run. Granted this is hacky, but until monaco provides a specific event for suggestions,
				// this is the best we have.
				setTimeout(() => editor.trigger('monaco-kusto', 'editor.action.triggerSuggest', {}), 10);
			}
		}
	})
}

function isStandaloneCodeEditor(editor: monaco.editor.ICodeEditor): editor is monaco.editor.IStandaloneCodeEditor {
    return (editor as monaco.editor.IStandaloneCodeEditor).addAction !== undefined;
}
