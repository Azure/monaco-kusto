export type ClassificationKind = Kusto.Language.Editor.ClassificationKind;

export enum Tokens {
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
    Tokens.PlainText,
    Tokens.Comment,
    Tokens.Punctuation,
    Tokens.Directive,
    Tokens.Literal,
    Tokens.StringLiteral,
    Tokens.Type,
    Tokens.Column,
    Tokens.Table,
    Tokens.Database,
    Tokens.Function,
    Tokens.Parameter,
    Tokens.Variable,
    Tokens.Identifier,
    Tokens.ClientParameter,
    Tokens.QueryParameter,
    Tokens.ScalarParameter,
    Tokens.MathOperator,
    Tokens.QueryOperator,
    Tokens.Command,
    Tokens.Keyword,
    Tokens.MaterializedView,
    Tokens.SchemaMember,
    Tokens.SignatureParameter,
    Tokens.Option,
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
