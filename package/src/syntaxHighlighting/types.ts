export type ClassificationKind = Kusto.Language.Editor.ClassificationKind;

export enum Token {
    PlainText = 'plainText',
    Comment = 'comment',
    Punctuation = 'punctuation',
    Directive = 'directive',
    Literal = 'literal',
    StringLiteral = 'stringLiteral',
    Type = 'type',
    Column = 'column',
    Table = 'table',
    Database = 'database',
    Function = 'function',
    Parameter = 'parameter',
    Variable = 'variable',
    Identifier = 'identifier',
    ClientParameter = 'clientParameter',
    QueryParameter = 'queryParameter',
    ScalarParameter = 'scalarParameter',
    MathOperator = 'mathOperator',
    QueryOperator = 'queryOperator',
    Command = 'command',
    Keyword = 'keyword',
    MaterializedView = 'materializedView',
    SchemaMember = 'schemaMember',
    SignatureParameter = 'signatureParameter',
    Option = 'option',
}

export const tokenTypes = [
    Token.PlainText,
    Token.Comment,
    Token.Punctuation,
    Token.Directive,
    Token.Literal,
    Token.StringLiteral,
    Token.Type,
    Token.Column,
    Token.Table,
    Token.Database,
    Token.Function,
    Token.Parameter,
    Token.Variable,
    Token.Identifier,
    Token.ClientParameter,
    Token.QueryParameter,
    Token.ScalarParameter,
    Token.MathOperator,
    Token.QueryOperator,
    Token.Command,
    Token.Keyword,
    Token.MaterializedView,
    Token.SchemaMember,
    Token.SignatureParameter,
    Token.Option,
];

export interface ClassificationRange {
    line: number;
    character: number;
    length: number;
    kind: ClassificationKind;
}

type DeltaLine = number;
type DeltaStart = number;
type Length = number;

export type DocumentSemanticToken = [DeltaLine, DeltaStart, Length, Kusto.Language.Editor.ClassificationKind, 0];
