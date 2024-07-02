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
        { token: 'comment', foreground: '#008000' },
        { token: 'variable.predefined', foreground: '#800080' },
        { token: 'function', foreground: '#0000FF' },
        { token: 'operator.sql', foreground: '#CC3700' },
        { token: 'string', foreground: '#B22222' },
        { token: 'operator.scss', foreground: '#0000FF' },
        { token: 'variable', foreground: '#C71585' },
        { token: 'variable.parameter', foreground: '#9932CC' },
        { token: '', foreground: '#000000' },
        { token: 'type', foreground: '#0000FF' },
        { token: 'tag', foreground: '#0000FF' },
        { token: 'annotation', foreground: '#2B91AF' },
        { token: 'keyword', foreground: '#0000FF' },
        { token: 'number', foreground: '#191970' },
        { token: 'annotation', foreground: '#9400D3' },
        { token: 'invalid', background: '#cd3131' },
        { token: 'column', background: '#C71585' },
        { token: 'table', foreground: '#C71585' },
    ],
    colors: {},
};

const dark: monaco.editor.IStandaloneThemeData = {
    base: 'vs-dark',
    inherit: true,
    rules: [
        { token: 'comment', foreground: '#608B4E' },
        { token: 'variable.predefined', foreground: '#4ec9b0' },
        { token: 'function', foreground: '#dcdcaa' },
        { token: 'operator.sql', foreground: '#9cdcfe' },
        { token: 'string', foreground: '#ce9178' },
        { token: 'operator.scss', foreground: '#569cd6' },
        { token: 'variable', foreground: '#4ec9b0' },
        { token: 'variable.parameter', foreground: '#c586c0' },
        { token: '', foreground: '#d4d4d4' },
        { token: 'type', foreground: '#569cd6' },
        { token: 'tag', foreground: '#569cd6' },
        { token: 'annotation', foreground: '#9cdcfe' },
        { token: 'keyword', foreground: '#569cd6' },
        { token: 'number', foreground: '#d7ba7d' },
        { token: 'annotation', foreground: '#b5cea8' },
        { token: 'invalid', background: '#cd3131' },
        { token: 'column', background: '#4ec9b0' },
        { token: 'table', background: '#c586c0' },
    ],
    colors: {},
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
