import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { AugmentedWorkerAccessor } from '../kustoMode';
import type { LanguageServiceDefaults } from '../types';
import type { Schema } from '../languageServiceManager/schema';
import type { ClassifiedRange } from '../languageServiceManager/kustoLanguageService';
import debounce from 'lodash-es/debounce';

export class ColorizationAdapter {
    private _disposables: monaco.IDisposable[] = [];
    private _contentListener: { [uri: string]: monaco.IDisposable } = Object.create(null);
    private _configurationListener: { [uri: string]: monaco.IDisposable } = Object.create(null);
    private _schemaListener: { [uri: string]: monaco.IDisposable } = Object.create(null);
    private decorations: string[] = [];

    constructor(
        private _monacoInstance: typeof globalThis.monaco,
        private _languageId: string,
        private _worker: AugmentedWorkerAccessor,
        defaults: LanguageServiceDefaults,
        onSchemaChange: monaco.IEvent<Schema>
    ) {
        injectCss();

        const onModelAdd = (model: monaco.editor.IModel): void => {
            let languageId = model.getLanguageId();
            if (languageId !== this._languageId) {
                return;
            }

            const debouncedColorization = debounce(
                (intervals?: { start: number; end: number }[]) => this._doColorization(model, languageId, intervals),
                500
            );

            let handle: number;
            this._contentListener[model.uri.toString()] = model.onDidChangeContent((e) => {
                // Changes are represented as a range in doc before change, plus the text that it was replaced with.
                // We are interested in the range _after_ the change (since that's what we need to colorize).
                // following logic calculates that.
                const intervalsToColorize = changeEventToIntervals(e);
                debouncedColorization(intervalsToColorize);
            });

            this._configurationListener[model.uri.toString()] = defaults.onDidChange(() => {
                self.setTimeout(() => this._doColorization(model, languageId, []), 0);
            });

            this._schemaListener[model.uri.toString()] = onSchemaChange(() => {
                self.setTimeout(() => this._doColorization(model, languageId, []), 0);
            });
        };

        const onModelRemoved = (model: monaco.editor.IModel): void => {
            model.deltaDecorations(this.decorations, []);

            let uriStr = model.uri.toString();

            let contentListener = this._contentListener[uriStr];
            if (contentListener) {
                contentListener.dispose();
                delete this._contentListener[uriStr];
            }

            let configurationListener = this._configurationListener[uriStr];
            if (configurationListener) {
                configurationListener.dispose();
                delete this._configurationListener[uriStr];
            }

            let schemaListener = this._configurationListener[uriStr];
            if (schemaListener) {
                schemaListener.dispose();
                delete this._schemaListener[uriStr];
            }
        };

        this._disposables.push(this._monacoInstance.editor.onDidCreateModel(onModelAdd));
        this._disposables.push(this._monacoInstance.editor.onWillDisposeModel(onModelRemoved));
        this._disposables.push(
            this._monacoInstance.editor.onDidChangeModelLanguage((event) => {
                onModelRemoved(event.model);
                onModelAdd(event.model);
            })
        );

        this._disposables.push({
            dispose: () => {
                for (let key in this._contentListener) {
                    this._contentListener[key].dispose();
                }
            },
        });

        this._monacoInstance.editor.getModels().forEach(onModelAdd);
    }

    public dispose(): void {
        this._disposables.forEach((d) => d && d.dispose());
        this._disposables = [];
    }

    private _doColorization(
        model: monaco.editor.IModel,
        languageId: string,
        intervals: { start: number; end: number }[]
    ): void {
        if (model.isDisposed()) {
            return;
        }
        const resource = model.uri;
        const versionNumberBeforeColorization = model.getVersionId();
        this._worker(resource)
            .then((worker) => {
                if (model.isDisposed()) {
                    return;
                }
                return worker.doColorization(resource.toString(), intervals);
            })
            .then((colorizationRanges) => {
                if (model.isDisposed()) {
                    return;
                }
                const newModel = this._monacoInstance.editor.getModel(model.uri);
                const versionId = newModel.getVersionId();

                // don't colorize an older version of the document.
                if (versionId !== versionNumberBeforeColorization) {
                    return;
                }

                const decorationRanges = colorizationRanges.map((colorizationRange) => {
                    const decorations = colorizationRange.classifications
                        .map((classification) => toDecoration(model, classification))
                        // The following line will prevent things that aren't going to be colorized anyway to get a CSS class.
                        // This will prevent the case where the non-semantic colorizer already figured out that a keyword needs
                        // to be colorized, but the outdated semantic colorizer still thinks it's a plain text and wants it colored
                        // in black.
                        .filter(
                            (d) =>
                                d.options.inlineClassName !== 'PlainText' && d.options.inlineClassName != 'Identifier'
                        );
                    const firstImpactedLine = model.getPositionAt(colorizationRange.absoluteStart).lineNumber;
                    const endPosition = model.getPositionAt(colorizationRange.absoluteEnd);

                    // A token that ends in the first column of the next line is not considered to be part of that line.
                    const lastImpactedLine =
                        endPosition.column == 1 && endPosition.lineNumber > 1
                            ? endPosition.lineNumber - 1
                            : endPosition.lineNumber;

                    return { decorations, firstImpactedLine, lastImpactedLine };
                });

                // Compute the previous decorations we want to replace with the new ones.
                const oldDecorations = decorationRanges
                    .map((range) =>
                        model
                            .getLinesDecorations(range.firstImpactedLine, range.lastImpactedLine)
                            .filter((d) => classificationToColorLight[d.options.inlineClassName]) // Don't delete any other decorations
                            .map((d) => d.id)
                    )
                    .reduce((prev, curr) => prev.concat(curr), []);

                // Flatten decoration groups to an array of decorations
                const newDecorations = decorationRanges.reduce(
                    (prev: monaco.editor.IModelDeltaDecoration[], next) => prev.concat(next.decorations),
                    []
                );

                if (model && model.getLanguageId() === languageId) {
                    this.decorations = model.deltaDecorations(oldDecorations, newDecorations);
                }
            })
            .catch((err) => {
                // Hack to avoid crashing calling code, while still logging the
                // error. Might be better to just let the error propagate
                // normally, but that would require more investigation.
                setTimeout(() => {
                    throw err;
                }, 0);
            });
    }
}

/**
 * Generates a mapping between ClassificationKind and color.
 */
function getClassificationColorTriplets(): { classification: string; colorLight: string; colorDark: string }[] {
    const result = Object.keys(ClassificationKind).map((key) => ({
        classification: key,
        colorLight: classificationToColorLight[key],
        colorDark: classificationToColorDark[key],
    }));
    return result;
}

/**
 * Returns a string which is a css describing all tokens and their colors.
 * looks a little bit something like this:
 *
 * .vs .Literal {color: '#000000';} .vs-dark .Literal {color: '#FFFFFF';}
 * .vs .Comment {color: '#111111';} .vs-dark .Comment {color: '#EEEEEE';}
 */
function getCssForClassification(): string {
    const classificationColorTriplets = getClassificationColorTriplets();
    const cssInnerHtml = classificationColorTriplets
        .map(
            (pair) =>
                `.vs .${pair.classification} {color: #${pair.colorLight};} .vs-dark .${pair.classification} {color: #${pair.colorDark};}`
        )
        .join('\n');
    return cssInnerHtml;
}

/**
 * Inject a CSS sheet to the head of document, coloring kusto elements by classification.
 * TODO: make idempotent
 */
function injectCss(): any {
    const container = document.getElementsByTagName('head')[0];
    var style = document.createElement('style');
    style.type = 'text/css';
    style.media = 'screen';
    container.appendChild(style);
    ClassificationKind;
    style.innerHTML = getCssForClassification();
}

function toDecoration(
    model: monaco.editor.ITextModel,
    classification: ClassifiedRange
): monaco.editor.IModelDeltaDecoration {
    const start = model.getPositionAt(classification.start);
    const end = model.getPositionAt(classification.start + classification.length);
    const range = new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column);
    const inlineClassName = ClassificationKindNames[classification.kind];
    return {
        range,
        options: {
            inlineClassName,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
    };
}

function changeEventToIntervals(e: monaco.editor.IModelContentChangedEvent) {
    return e.changes.map((change) => ({
        start: change.rangeOffset,
        end: change.rangeOffset + change.text.length,
    }));
}

type kinds = keyof typeof Kusto.Language.Editor.ClassificationKind;

/**
 * Copy of Kusto.Language.Editor.ClassificationKind we don't have to depend on it in this file
 */
const ClassificationKind: typeof Kusto.Language.Editor.ClassificationKind = {
    PlainText: 0,
    Comment: 1,
    Punctuation: 2,
    Directive: 3,
    Literal: 4,
    StringLiteral: 5,
    Type: 6,
    Column: 7,
    Table: 8,
    Database: 9,
    Function: 10,
    Parameter: 11,
    Variable: 12,
    Identifier: 13,
    ClientParameter: 14,
    QueryParameter: 15,
    ScalarOperator: 16,
    MathOperator: 17,
    QueryOperator: 18,
    Command: 19,
    Keyword: 20,
    MaterializedView: 21,
    SchemaMember: 22,
    SignatureParameter: 23,
    Option: 24,
};

const ClassificationKindNames: Record<number, keyof typeof ClassificationKind> = {};

for (const [key, value] of Object.entries(ClassificationKind)) {
    ClassificationKindNames[value] = key;
}

// commented here is the color definitions are were defined by v1 intellisense terminology:
// { token: 'comment', foreground: '008000' }, // CommentToken Green
// { token: 'variable.predefined', foreground: '800080' }, // CalculatedColumnToken Purple
// { token: 'function', foreground: '0000FF' }, // FunctionNameToken Blue
// { token: 'operator.sql', foreground: 'FF4500' }, // OperatorToken OrangeRed (now changed to darker color CC3700 because wasn't accessible)
// { token: 'string', foreground: 'B22222' }, // StringLiteralToken Firebrick
// { token: 'operator.scss', foreground: '0000FF' }, // SubOperatorToken Blue
// { token: 'variable', foreground: 'C71585' }, // TableColumnToken MediumVioletRed
// { token: 'variable.parameter', foreground: '9932CC' }, // TableToken DarkOrchid
// { token: '', foreground: '000000' }, // UnknownToken, PlainTextToken  Black
// { token: 'type', foreground: '0000FF' }, // DataTypeToken Blue
// { token: 'tag', foreground: '0000FF' }, // ControlCommandToken Blue
// { token: 'annotation', foreground: '2B91AF' }, // QueryParametersToken FF2B91AF
// { token: 'keyword', foreground: '0000FF' }, // CslCommandToken, PluginToken Blue
// { token: 'number', foreground: '191970' }, // LetVariablesToken MidnightBlue
// { token: 'annotation', foreground: '9400D3' }, // ClientDirectiveToken DarkViolet
// { token: 'invalid', background: 'cd3131' },
const classificationToColorLight: { [K in kinds]: string } = {
    Column: 'C71585',
    Comment: '008000',
    Database: 'C71585',
    Function: '0000FF',
    Identifier: '000000',
    Keyword: '0000FF',
    Literal: 'B22222',
    ScalarOperator: '0000FF',
    MaterializedView: 'C71585',
    MathOperator: '000000',
    Command: '0000FF',
    Parameter: '2B91AF',
    PlainText: '000000',
    Punctuation: '000000',
    QueryOperator: 'CC3700',
    QueryParameter: 'CC3700',
    StringLiteral: 'B22222',
    Table: 'C71585',
    Type: '0000FF',
    Variable: '191970',
    Directive: '9400D3',
    ClientParameter: 'b5cea8',
    SchemaMember: 'C71585',
    SignatureParameter: '2B91AF',
    Option: '000000',
};

const classificationToColorDark: { [K in kinds]: string } = {
    Column: '4ec9b0',
    Comment: '6A9B34',
    Database: 'c586c0',
    Function: 'dcdcaa',
    Identifier: 'd4d4d4',
    Keyword: '569cd6',
    Literal: 'ce9178',
    ScalarOperator: '569cd6',
    MaterializedView: 'c586c0',
    MathOperator: 'd4d4d4',
    Command: 'd4d4d4',
    Parameter: '2B91AF',
    PlainText: 'd4d4d4',
    Punctuation: 'd4d4d4',
    QueryOperator: '9cdcfe',
    QueryParameter: '9cdcfe',
    StringLiteral: 'ce9178',
    Table: 'c586c0',
    Type: '569cd6',
    Variable: 'd7ba7d',
    Directive: 'b5cea8',
    ClientParameter: 'b5cea8',
    SchemaMember: '4ec9b0',
    SignatureParameter: '2B91AF',
    Option: 'd4d4d4',
};
