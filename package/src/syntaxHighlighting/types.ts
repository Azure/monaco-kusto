export type ClassificationKind = Kusto.Language.Editor.ClassificationKind;

export enum Token {
    PlainText = 'plainText', // 0
    Comment = 'comment', // 1
    Punctuation = 'punctuation', // 2
    Directive = 'directive', // 3
    Literal = 'literal', // 4
    StringLiteral = 'stringLiteral', // 5
    Type = 'type', // 6
    Column = 'column', // 7
    Table = 'table', // 8
    Database = 'database', // 9
    Function = 'function', // 10
    Parameter = 'parameter', // 11
    Variable = 'variable', // 12
    Identifier = 'identifier', // 13
    ClientParameter = 'clientParameter', // 14
    QueryParameter = 'queryParameter', // 15
    ScalarParameter = 'scalarParameter', // 16
    MathOperator = 'mathOperator', // 17
    QueryOperator = 'queryOperator', // 18
    Command = 'command', // 19
    Keyword = 'keyword', // 20
    MaterializedView = 'materializedView', // 21
    SchemaMember = 'schemaMember', // 22
    SignatureParameter = 'signatureParameter', // 23
    Option = 'option', // 24
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
