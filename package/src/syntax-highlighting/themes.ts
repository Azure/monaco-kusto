import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Token } from './types';

export enum ThemeName {
    light = 'kusto-light',
    dark = 'kusto-dark',
}
interface Theme {
    name: ThemeName;
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
        { token: Token.PlainText, foreground: colors.black },
        { token: Token.Comment, foreground: colors.green },
        { token: Token.Punctuation, foreground: colors.black },
        { token: Token.Directive, foreground: colors.darkViolet },
        { token: Token.Literal, foreground: colors.black },
        { token: Token.StringLiteral, foreground: colors.firebrick },
        { token: Token.Type, foreground: colors.blue },
        { token: Token.Column, foreground: colors.mediumVioletRed },
        { token: Token.Table, foreground: colors.darkOrchid },
        { token: Token.Database, foreground: colors.darkOrchid },
        { token: Token.Function, foreground: colors.blue },
        { token: Token.Parameter, foreground: colors.midnightBlue },
        { token: Token.Variable, foreground: colors.midnightBlue },
        { token: Token.Identifier, foreground: colors.black },
        { token: Token.ClientParameter, foreground: colors.tealBlue },
        { token: Token.QueryParameter, foreground: colors.tealBlue },
        { token: Token.ScalarParameter, foreground: colors.blue },
        { token: Token.MathOperator, foreground: colors.black },
        { token: Token.QueryOperator, foreground: colors.orangeRed },
        { token: Token.Command, foreground: colors.blue },
        { token: Token.Keyword, foreground: colors.blue },
        { token: Token.MaterializedView, foreground: colors.darkOrchid },
        { token: Token.SchemaMember, foreground: colors.black }, // check this one
        { token: Token.SignatureParameter, foreground: colors.black }, // check this one
        { token: Token.Option, foreground: colors.black }, // check this one
    ],
    colors: {},
};

const dark: monaco.editor.IStandaloneThemeData = {
    base: 'vs-dark',
    inherit: true,
    rules: [
        { token: '', foreground: colors.white },
        { token: Token.PlainText, foreground: colors.white },
        { token: Token.Comment, foreground: colors.oliveDrab },
        { token: Token.Punctuation, foreground: colors.white },
        { token: Token.Directive, foreground: colors.lightGoldenrodYellow },
        { token: Token.Literal, foreground: colors.white },
        { token: Token.StringLiteral, foreground: colors.paleChestnut },
        { token: Token.Type, foreground: colors.skyBlue },
        { token: Token.Column, foreground: colors.paleVioletRed },
        { token: Token.Table, foreground: colors.softGold },
        { token: Token.Database, foreground: colors.softGold },
        { token: Token.Function, foreground: colors.skyBlue },
        { token: Token.Parameter, foreground: colors.lightSkyBlue },
        { token: Token.Variable, foreground: colors.lightSkyBlue },
        { token: Token.Identifier, foreground: colors.white },
        { token: Token.ClientParameter, foreground: colors.tealBlue },
        { token: Token.QueryParameter, foreground: colors.tealBlue },
        { token: Token.ScalarParameter, foreground: colors.skyBlue },
        { token: Token.MathOperator, foreground: colors.white },
        { token: Token.QueryOperator, foreground: colors.mediumTurquoise },
        { token: Token.Command, foreground: colors.skyBlue },
        { token: Token.Keyword, foreground: colors.skyBlue },
        { token: Token.MaterializedView, foreground: colors.softGold },
        { token: Token.SchemaMember, foreground: colors.black }, // check this one
        { token: Token.SignatureParameter, foreground: colors.black }, // check this one
        { token: Token.Option, foreground: colors.black }, // check this one
    ],
    colors: {
        'editor.background': colors.jetBlack,
        'editorSuggestWidget.selectedBackground': colors.blueSapphire,
    },
};

export const themes: Theme[] = [
    { name: ThemeName.light, data: light },
    { name: ThemeName.dark, data: dark },
];
