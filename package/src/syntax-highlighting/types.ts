import 'language-service';

export type ClassificationKind = Kusto.Language.Editor.ClassificationKind;

export enum tokens {
    whatever = 'whatever',
    comment = 'comment',
    string = 'string',
}

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
