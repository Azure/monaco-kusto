import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Tokens } from './types';

export enum ThemeNames {
    light = 'kusto-light',
    dark = 'kusto-dark',
}
interface Theme {
    name: ThemeNames;
    data: monaco.editor.IStandaloneThemeData;
}

const colors = {
    white: '#DCDCDC',
    lightGoldenrodYellow: '#FAFAD2',
    softGold: '#D7BA7D',
    paleChestnut: '#D69D85',
    paleVioletRed: '#DB7093',
    firebrick: '#B22222',
    orangeRed: '#FF4500',
    mediumVioletRed: '#C71585',
    magenta: '#FF00FF', // for debugging
    darkOrchid: '#9932CC',
    darkViolet: '#9400D3',
    midnightBlue: '#191970',
    blue: '#0000FF',
    blueSapphire: '#004E8C',
    tealBlue: '#2B91AF',
    skyBlue: '#569CD6',
    lightSkyBlue: '#92CAF4',
    mediumTurquoise: '#4EC9B0',
    oliveDrab: '#608B4E',
    green: '#008000',
    jetBlack: '#1B1A19',
    black: '#000000',
};

const light: monaco.editor.IStandaloneThemeData = {
    base: 'vs',
    inherit: true,
    rules: [
        { token: '', foreground: colors.black },
        { token: Tokens.PlainText, foreground: colors.black },
        { token: Tokens.Comment, foreground: colors.green },
        { token: Tokens.Punctuation, foreground: colors.black },
        { token: Tokens.Directive, foreground: colors.darkViolet },
        { token: Tokens.Literal, foreground: colors.black },
        { token: Tokens.StringLiteral, foreground: colors.firebrick },
        { token: Tokens.Type, foreground: colors.blue },
        { token: Tokens.Column, foreground: colors.mediumVioletRed },
        { token: Tokens.Table, foreground: colors.darkOrchid },
        { token: Tokens.Database, foreground: colors.darkOrchid },
        { token: Tokens.Function, foreground: colors.blue },
        { token: Tokens.Parameter, foreground: colors.midnightBlue },
        { token: Tokens.Variable, foreground: colors.midnightBlue },
        { token: Tokens.Identifier, foreground: colors.black },
        { token: Tokens.ClientParameter, foreground: colors.tealBlue },
        { token: Tokens.QueryParameter, foreground: colors.tealBlue },
        { token: Tokens.ScalarParameter, foreground: colors.blue },
        { token: Tokens.MathOperator, foreground: colors.black },
        { token: Tokens.QueryOperator, foreground: colors.orangeRed },
        { token: Tokens.Command, foreground: colors.blue },
        { token: Tokens.Keyword, foreground: colors.blue },
        { token: Tokens.MaterializedView, foreground: colors.darkOrchid },
        { token: Tokens.SchemaMember, foreground: colors.black }, // check this one
        { token: Tokens.SignatureParameter, foreground: colors.black }, // check this one
        { token: Tokens.Option, foreground: colors.black }, // check this one
    ],
    colors: {},
};

const dark: monaco.editor.IStandaloneThemeData = {
    base: 'vs-dark',
    inherit: true,
    rules: [
        { token: '', foreground: colors.white },
        { token: Tokens.PlainText, foreground: colors.white },
        { token: Tokens.Comment, foreground: colors.oliveDrab },
        { token: Tokens.Punctuation, foreground: colors.white },
        { token: Tokens.Directive, foreground: colors.lightGoldenrodYellow },
        { token: Tokens.Literal, foreground: colors.white },
        { token: Tokens.StringLiteral, foreground: colors.paleChestnut },
        { token: Tokens.Type, foreground: colors.skyBlue },
        { token: Tokens.Column, foreground: colors.paleVioletRed },
        { token: Tokens.Table, foreground: colors.softGold },
        { token: Tokens.Database, foreground: colors.softGold },
        { token: Tokens.Function, foreground: colors.skyBlue },
        { token: Tokens.Parameter, foreground: colors.lightSkyBlue },
        { token: Tokens.Variable, foreground: colors.lightSkyBlue },
        { token: Tokens.Identifier, foreground: colors.white },
        { token: Tokens.ClientParameter, foreground: colors.tealBlue },
        { token: Tokens.QueryParameter, foreground: colors.tealBlue },
        { token: Tokens.ScalarParameter, foreground: colors.skyBlue },
        { token: Tokens.MathOperator, foreground: colors.white },
        { token: Tokens.QueryOperator, foreground: colors.mediumTurquoise },
        { token: Tokens.Command, foreground: colors.skyBlue },
        { token: Tokens.Keyword, foreground: colors.skyBlue },
        { token: Tokens.MaterializedView, foreground: colors.softGold },
        { token: Tokens.SchemaMember, foreground: colors.black }, // check this one
        { token: Tokens.SignatureParameter, foreground: colors.black }, // check this one
        { token: Tokens.Option, foreground: colors.black }, // check this one
    ],
    colors: {
        'editor.background': colors.jetBlack,
        'editorSuggestWidget.selectedBackground': colors.blueSapphire,
    },
};

export const themes: Theme[] = [
    { name: ThemeNames.light, data: light },
    { name: ThemeNames.dark, data: dark },
];
