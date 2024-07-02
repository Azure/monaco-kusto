import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

export enum ThemeNames {
    light = 'kusto-light',
    dark = 'kusto-dark',
    dark2 = 'kusto-dark2',
}
interface Theme {
    name: ThemeNames;
    data: monaco.editor.IStandaloneThemeData;
}

const light: monaco.editor.IStandaloneThemeData = {
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
        { token: 'column', background: 'C71585' },
        { token: 'table', foreground: 'C71585' },
    ],
    colors: {},
};

const dark: monaco.editor.IStandaloneThemeData = {
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
        { token: 'column', background: '4ec9b0' },
        { token: 'table', background: 'c586c0' },
    ],
    colors: {
        // see: https://code.visualstudio.com/api/references/theme-color#editor-widget-colors
    },
};

const dark2: monaco.editor.IStandaloneThemeData = {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
        'editor.background': '#1B1A19', // gray 200
        'editorSuggestWidget.selectedBackground': '#004E8C',
    },
};

export const themes: Theme[] = [
    { name: ThemeNames.light, data: light },
    { name: ThemeNames.dark, data: dark },
    { name: ThemeNames.dark2, data: dark2 },
];
