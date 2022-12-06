import { LanguageServiceDefaultsImpl } from './monaco.contribution';
import { KustoWorker } from './kustoWorker';

import * as ls from 'vscode-languageserver-types';
import * as _ from 'lodash';

import Uri = monaco.Uri;
import Position = monaco.Position;
import Range = monaco.Range;
import Thenable = monaco.Thenable;
import CancellationToken = monaco.CancellationToken;
import IDisposable = monaco.IDisposable;
import ClassificationKind = Kusto.Language.Editor.ClassificationKind;
import { Schema } from './languageService/schema';
import { FoldingRange } from 'vscode-languageserver-types';
import { ClassifiedRange } from './languageService/kustoLanguageService';

export interface WorkerAccessor {
    (first: Uri, ...more: Uri[]): Promise<KustoWorker>;
}

// --- diagnostics ---



export class DiagnosticsAdapter {
    private _disposables: IDisposable[] = [];
    private _contentListener: { [uri: string]: IDisposable } = Object.create(null);
    private _configurationListener: { [uri: string]: IDisposable } = Object.create(null);
    private _schemaListener: { [uri: string]: IDisposable } = Object.create(null);
    private _cursorListener: { [editorId: string]: IDisposable } = Object.create(null);
    private _debouncedValidations: { [uri: string]: ((intervals?: { start: number; end: number;}[]) => void) } = Object.create(null);

    constructor(
        private _monacoInstance: typeof monaco,
        private _languageId: string,
        private _worker: WorkerAccessor,
        private defaults: LanguageServiceDefaultsImpl,
        onSchemaChange: monaco.IEvent<Schema>
    ) {

        const onModelAdd = (model: monaco.editor.IModel): void => {
            let languageId = model.getLanguageId();
            const modelUri = model.uri.toString();
            if (languageId !== this._languageId) {
                return;
            }
            
            if (!this._debouncedValidations[modelUri]) {
                this._debouncedValidations[modelUri] = this.getDebouncedValidation(model, languageId);
            }

            this._contentListener[modelUri] = model.onDidChangeContent((e) => {
                const intervalsToValidate = changeEventToIntervals(e);
                this._debouncedValidations[modelUri](intervalsToValidate);
            });

            this._configurationListener[modelUri] = this.defaults.onDidChange(() => {
                self.setTimeout(() => this._doValidate(model, languageId, []), 0);
            });

            this._schemaListener[modelUri] = onSchemaChange(() => {
                self.setTimeout(() => this._doValidate(model, languageId, []), 0);
            });
        };

        const onEditorAdd = (editor: monaco.editor.ICodeEditor) => {
            const editorId = editor.getId();

            if (!this._cursorListener[editorId]) {
                editor.onDidDispose(() => {
                    this._cursorListener[editorId]?.dispose();
                    delete this._cursorListener[editorId];
                })
                this._cursorListener[editorId] = editor.onDidChangeCursorSelection((e) => {
                    const model = editor.getModel();
                    const modelUri = model.uri.toString();
                    const languageId = model.getLanguageId();
                    if (languageId !== this._languageId) {
                        return;
                    }
                    const cursorOffset = model.getOffsetAt(e.selection.getPosition());
                    if (!this._debouncedValidations[modelUri]) {
                        this._debouncedValidations[modelUri] = this.getDebouncedValidation(model, languageId)
                    }
                    this._debouncedValidations[modelUri]([{start: cursorOffset, end: cursorOffset}]);

                })
            }
        }


        const onModelRemoved = (model: monaco.editor.IModel): void => {
            this._monacoInstance.editor.setModelMarkers(model, this._languageId, []);

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

            let schemaListener = this._schemaListener[uriStr];
            if (schemaListener) {
                schemaListener.dispose();
                delete this._schemaListener[uriStr];
            }
        };

        this._disposables.push(this._monacoInstance.editor.onDidCreateEditor(onEditorAdd));

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
                for (let key in this._cursorListener) {
                    this._cursorListener[key].dispose();
                }
            },
        });

        this._monacoInstance.editor.getModels().forEach(onModelAdd);
        this._monacoInstance.editor.getEditors().forEach(onEditorAdd)
    }

    private getDebouncedValidation(model: monaco.editor.ITextModel, languageId: string) {
        return _.debounce(
            (intervals?: { start: number; end: number }[]) => this._doValidate(model, languageId, intervals),
            500
        );
    }

    public dispose(): void {
        this._disposables.forEach((d) => d && d.dispose());
        this._disposables = [];
    }

    private _doValidate(
        model: monaco.editor.IModel,
        languageId: string,
        intervals: { start: number; end: number }[]
    ): void {
        if (model.isDisposed()) {
            return;
        }
        const resource = model.uri;
        const versionNumberBefore = model.getVersionId();
        this._worker(resource)
            .then((worker) => {
                return worker.doValidation(resource.toString(), intervals);
            })
            .then((diagnostics) => {
                const newModel = this._monacoInstance.editor.getModel(resource);
                const versionId = newModel.getVersionId();
                if (versionId !== versionNumberBefore) {
                    return;
                }
                const markers = diagnostics.map((d) => toDiagnostics(resource, d));
                let model = this._monacoInstance.editor.getModel(resource);
                let oldDecorations = model
                    .getAllDecorations()
                    .filter((decoration) => decoration.options.className == 'squiggly-error')
                    .map((decoration) => decoration.id);

                if (model && model.getLanguageId() === languageId) {
                    const syntaxErrorAsMarkDown = this.defaults.languageSettings.syntaxErrorAsMarkDown;

                    if (!syntaxErrorAsMarkDown || !syntaxErrorAsMarkDown.enableSyntaxErrorAsMarkDown) {
                        // Remove previous syntax error decorations and set the new markers (for example, when disabling syntaxErrorAsMarkDown after it was enabled)
                        model.deltaDecorations(oldDecorations, []);
                        this._monacoInstance.editor.setModelMarkers(model, languageId, markers);
                    } else {
                        // Add custom popup for syntax error: icon, header and message as markdown
                        const header = syntaxErrorAsMarkDown.header ? `**${syntaxErrorAsMarkDown.header}** \n\n` : '';
                        const icon = syntaxErrorAsMarkDown.icon ? `![](${syntaxErrorAsMarkDown.icon})` : '';
                        const popupErrorHoverHeaderMessage = `${icon} ${header}`;

                        const newDecorations = markers.map((marker: monaco.editor.IMarkerData) => {
                            return {
                                range: {
                                    startLineNumber: marker.startLineNumber,
                                    startColumn: marker.startColumn,
                                    endLineNumber: marker.endLineNumber,
                                    endColumn: marker.endColumn,
                                },
                                options: {
                                    hoverMessage: {
                                        value: popupErrorHoverHeaderMessage + marker.message,
                                    },
                                    className: 'squiggly-error', // monaco syntax error style (red underline)
                                    zIndex: 100, // This message will be the upper most mesage in the popup
                                    overviewRuler: {
                                        // The color indication on the right ruler
                                        color: 'rgb(255, 18, 18, 0.7)',
                                        position: monaco.editor.OverviewRulerLane.Right,
                                    },
                                    minimap: {
                                        color: 'rgb(255, 18, 18, 0.7)',
                                        position: monaco.editor.MinimapPosition.Inline,
                                    },
                                },
                            };
                        });                 

                        const oldMarkers = monaco.editor
                            .getModelMarkers({
                                owner: languageId,
                                resource: resource,
                            })

                        if (oldMarkers && oldMarkers.length > 0) {
                            // In case there were previous markers, remove their decorations (for example, when enabling syntaxErrorAsMarkDown after it was disabled)
                            oldDecorations = [];
                            // Remove previous markers
                            this._monacoInstance.editor.setModelMarkers(model, languageId, []);
                        }

                        // Remove previous syntax error decorations and set the new decorations
                        model.deltaDecorations(oldDecorations, newDecorations);
                    }
                }
            })
            .then(undefined, (err) => {
                console.error(err);
            });
    }
}

function changeEventToIntervals(e: monaco.editor.IModelContentChangedEvent) {
    return e.changes.map((change) => ({
        start: change.rangeOffset,
        end: change.rangeOffset + change.text.length,
    }));
}

function toSeverity(lsSeverity: number): monaco.MarkerSeverity {
    switch (lsSeverity) {
        case ls.DiagnosticSeverity.Error:
            return monaco.MarkerSeverity.Error;
        case ls.DiagnosticSeverity.Warning:
            return monaco.MarkerSeverity.Warning;
        case ls.DiagnosticSeverity.Information:
            return monaco.MarkerSeverity.Info;
        case ls.DiagnosticSeverity.Hint:
            return monaco.MarkerSeverity.Hint;
        default:
            return monaco.MarkerSeverity.Info;
    }
}

function toDiagnostics(resource: Uri, diag: ls.Diagnostic): monaco.editor.IMarkerData {
    let code = typeof diag.code === 'number' ? String(diag.code) : <string>diag.code;

    return {
        severity: toSeverity(diag.severity),
        startLineNumber: diag.range.start.line + 1,
        startColumn: diag.range.start.character + 1,
        endLineNumber: diag.range.end.line + 1,
        endColumn: diag.range.end.character + 1,
        message: diag.message,
        code: code,
        source: diag.source,
    };
}

// --- colorization ---
function fromIRange(range: monaco.IRange): ls.Range {
    if (!range) {
        return undefined;
    }

    if (range instanceof monaco.Range) {
        return { start: fromPosition(range.getStartPosition()), end: fromPosition(range.getEndPosition()) };
    }

    const { startLineNumber, startColumn, endLineNumber, endColumn } = range;
    range = new monaco.Range(startLineNumber, startColumn, endLineNumber, endColumn);
}

type kinds = keyof typeof ClassificationKind;

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
    Comment: '608B4E',
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

export class ColorizationAdapter {
    private _disposables: IDisposable[] = [];
    private _contentListener: { [uri: string]: IDisposable } = Object.create(null);
    private _configurationListener: { [uri: string]: IDisposable } = Object.create(null);
    private _schemaListener: { [uri: string]: IDisposable } = Object.create(null);
    private decorations: string[] = [];

    constructor(
        private _monacoInstance: typeof monaco,
        private _languageId: string,
        private _worker: WorkerAccessor,
        defaults: LanguageServiceDefaultsImpl,
        onSchemaChange: monaco.IEvent<Schema>
    ) {
        injectCss();

        const onModelAdd = (model: monaco.editor.IModel): void => {
            let languageId = model.getLanguageId();
            if (languageId !== this._languageId) {
                return;
            }

            const debouncedColorization = _.debounce(
                (intervals?: { start: number; end: number }[]) => this._doColorization(model, languageId, intervals),
                500
            );

            let handle: number;
            this._contentListener[model.uri.toString()] = model.onDidChangeContent((e) => {
                // Changes are represented as a range in doc before change, plus the text that it was replaced with.
                // We are interested in the range _after_ the change (since that's what we need to colorize).
                // folowing logic calculates that.
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

    /**
     * Return true if the range doesn't intersect any of the line ranges.
     * @param range Range
     * @param impactedLineRanges an array of line ranges
     */
    private _rangeDoesNotIntersectAny(
        range: Range,
        impactedLineRanges: { firstImpactedLine: number; lastImpactedLine: number }[]
    ) {
        return impactedLineRanges.every(
            (lineRange) =>
                range.startLineNumber > lineRange.lastImpactedLine || range.endLineNumber < lineRange.firstImpactedLine
        );
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
                return worker.doColorization(resource.toString(), intervals);
            })
            .then((colorizationRanges) => {
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
            .then(undefined, (err) => {
                console.error(err);
            });
    }
}

/**
 * Gets all keys of an enum (the string keys not the numeric values).
 * @param e Enum type
 */
function getEnumKeys<E>(e: any) {
    return Object.keys(e).filter((k) => typeof e[k] === 'number');
}

/**
 * Generates a mapping between ClassificationKind and color.
 */
function getClassificationColorTriplets(): { classification: string; colorLight: string; colorDark: string }[] {
    const keys = getEnumKeys(ClassificationKind);
    const result = keys.map((key) => ({
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
    const range = new Range(start.lineNumber, start.column, end.lineNumber, end.column);
    const inlineClassName = (ClassificationKind as any).$names[classification.kind];
    return {
        range,
        options: {
            inlineClassName,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
    };
}
// --- completion ------

function fromPosition(position: Position): ls.Position {
    if (!position) {
        return void 0;
    }
    return { character: position.column - 1, line: position.lineNumber - 1 };
}

function fromRange(range: Range): ls.Range {
    if (!range) {
        return void 0;
    }
    return { start: fromPosition(range.getStartPosition()), end: fromPosition(range.getEndPosition()) };
}

function toRange(range: ls.Range): Range {
    if (!range) {
        return void 0;
    }
    return new Range(range.start.line + 1, range.start.character + 1, range.end.line + 1, range.end.character + 1);
}

function toCompletionItemKind(kind: number): monaco.languages.CompletionItemKind {
    let mItemKind = monaco.languages.CompletionItemKind;

    switch (kind) {
        case ls.CompletionItemKind.Text:
            return mItemKind.Text;
        case ls.CompletionItemKind.Method:
            return mItemKind.Method;
        case ls.CompletionItemKind.Function:
            return mItemKind.Function;
        case ls.CompletionItemKind.Constructor:
            return mItemKind.Constructor;
        case ls.CompletionItemKind.Field:
            return mItemKind.Field;
        case ls.CompletionItemKind.Variable:
            return mItemKind.Variable;
        case ls.CompletionItemKind.Class:
            return mItemKind.Class;
        case ls.CompletionItemKind.Interface:
            return mItemKind.Interface;
        case ls.CompletionItemKind.Module:
            return mItemKind.Module;
        case ls.CompletionItemKind.Property:
            return mItemKind.Property;
        case ls.CompletionItemKind.Unit:
            return mItemKind.Unit;
        case ls.CompletionItemKind.Value:
            return mItemKind.Value;
        case ls.CompletionItemKind.Enum:
            return mItemKind.Enum;
        case ls.CompletionItemKind.Keyword:
            return mItemKind.Keyword;
        case ls.CompletionItemKind.Snippet:
            return mItemKind.Snippet;
        case ls.CompletionItemKind.Color:
            return mItemKind.Color;
        case ls.CompletionItemKind.File:
            return mItemKind.File;
        case ls.CompletionItemKind.Reference:
            return mItemKind.Reference;
    }
    return mItemKind.Property;
}

function toTextEdit(textEdit: ls.TextEdit): monaco.editor.ISingleEditOperation {
    if (!textEdit) {
        return void 0;
    }
    return {
        range: toRange(textEdit.range),
        text: textEdit.newText,
    };
}

const DOCS_BASE_URL = "https://learn.microsoft.com/azure/data-explorer/kusto/query";

function formatDocLink(docString?: string): monaco.languages.CompletionItem['documentation'] {
    const target: {[href: string]: monaco.UriComponents} = {}
    const urisProxy = new Proxy(target, {
        get(_target, prop, _receiver) {
            // The link comes with a postfix of ".md" that we want to remove
            const linkWithoutPostfix = prop.toString().replace(".md", "");
            // Sometimes we get the link as a full URL. For example in the main doc link of the item
            const fullURL = linkWithoutPostfix.startsWith("https") ? linkWithoutPostfix : `${DOCS_BASE_URL}/${linkWithoutPostfix}`;
            return monaco.Uri.parse(fullURL);
        },
    });
    return {value: docString, isTrusted: true, uris: urisProxy};
}

export class CompletionAdapter implements monaco.languages.CompletionItemProvider {
    constructor(private _worker: WorkerAccessor, private languageSettings: monaco.languages.kusto.LanguageSettings) {}

    public get triggerCharacters(): string[] {
        return [' '];
    }

    provideCompletionItems(
        model: monaco.editor.IReadOnlyModel,
        position: Position,
        context: monaco.languages.CompletionContext,
        token: CancellationToken
    ): Thenable<monaco.languages.CompletionList> {
        const wordInfo = model.getWordUntilPosition(position);
        const wordRange = new Range(position.lineNumber, wordInfo.startColumn, position.lineNumber, wordInfo.endColumn);
        const resource = model.uri;
        const onDidProvideCompletionItems: monaco.languages.kusto.OnDidProvideCompletionItems =
            this.languageSettings.onDidProvideCompletionItems;

        return this._worker(resource)
            .then((worker) => {
                return worker.doComplete(resource.toString(), fromPosition(position));
            })
            .then((info) => (onDidProvideCompletionItems ? onDidProvideCompletionItems(info) : info))
            .then((info) => {
                if (!info) {
                    return;
                }
                let items: monaco.languages.CompletionItem[] = info.items.map((entry) => {
                    let item: monaco.languages.CompletionItem = {
                        label: entry.label,
                        insertText: entry.insertText,
                        sortText: entry.sortText,
                        filterText: entry.filterText,
                        documentation: formatDocLink(entry.documentation?.value),
                        detail: entry.detail,
                        range: wordRange,
                        kind: toCompletionItemKind(entry.kind),
                    };
                    if (entry.textEdit) {
                        item.range = toRange(entry.textEdit.range);
                        item.insertText = entry.textEdit.newText;
                    }
                    if (entry.insertTextFormat === ls.InsertTextFormat.Snippet) {
                        item.insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
                    }
                    return item;
                });

                return {
                    isIncomplete: info.isIncomplete,
                    suggestions: items,
                };
            });
    }
}

function isMarkupContent(thing: any): thing is ls.MarkupContent {
    return thing && typeof thing === 'object' && typeof (<ls.MarkupContent>thing).kind === 'string';
}

function toMarkdownString(entry: ls.MarkupContent | ls.MarkedString): monaco.IMarkdownString {
    if (typeof entry === 'string') {
        return {
            value: entry,
        };
    }
    if (isMarkupContent(entry)) {
        if (entry.kind === 'plaintext') {
            return {
                value: entry.value.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&'),
            };
        }
        return {
            value: entry.value,
        };
    }

    return { value: '```' + entry.value + '\n' + entry.value + '\n```\n' };
}

function toMarkedStringArray(
    contents: ls.MarkupContent | ls.MarkedString | ls.MarkedString[]
): monaco.IMarkdownString[] {
    if (!contents) {
        return void 0;
    }
    if (Array.isArray(contents)) {
        return contents.map(toMarkdownString);
    }
    return [toMarkdownString(contents)];
}

// --- definition ------

function toLocation(location: ls.Location): monaco.languages.Location {
    return {
        uri: Uri.parse(location.uri),
        range: toRange(location.range),
    };
}

export class DefinitionAdapter {
    constructor(private _worker: WorkerAccessor) {}

    public provideDefinition(
        model: monaco.editor.IReadOnlyModel,
        position: Position,
        token: CancellationToken
    ): Thenable<monaco.languages.Definition> {
        const resource = model.uri;

        return this._worker(resource)
            .then((worker) => {
                return worker.findDefinition(resource.toString(), fromPosition(position));
            })
            .then((definition) => {
                if (!definition || definition.length == 0) {
                    return;
                }
                return [toLocation(definition[0])];
            });
    }
}

// --- references ------

export class ReferenceAdapter implements monaco.languages.ReferenceProvider {
    constructor(private _worker: WorkerAccessor) {}

    provideReferences(
        model: monaco.editor.IReadOnlyModel,
        position: Position,
        context: monaco.languages.ReferenceContext,
        token: CancellationToken
    ): Thenable<monaco.languages.Location[]> {
        const resource = model.uri;

        return this._worker(resource)
            .then((worker) => {
                return worker.findReferences(resource.toString(), fromPosition(position));
            })
            .then((entries) => {
                if (!entries) {
                    return;
                }
                return entries.map(toLocation);
            });
    }
}

// --- rename ------

function toWorkspaceEdit(edit: ls.WorkspaceEdit | undefined): monaco.languages.WorkspaceEdit {
    if (!edit || !edit.changes) {
        return void 0;
    }
    let resourceEdits: monaco.languages.IWorkspaceTextEdit[] = [];
    for (let uri in edit.changes) {
        const _uri = Uri.parse(uri);
        for (let e of edit.changes[uri]) {
            resourceEdits.push({
                resource: _uri,
                textEdit: {
                    range: toRange(e.range),
                    text: e.newText,
                },
                versionId: undefined,
            });
        }
    }
    return {
        edits: resourceEdits,
    };
}

export class RenameAdapter implements monaco.languages.RenameProvider {
    constructor(private _worker: WorkerAccessor) {}

    provideRenameEdits(
        model: monaco.editor.IReadOnlyModel,
        position: Position,
        newName: string,
        token: CancellationToken
    ): Thenable<monaco.languages.WorkspaceEdit> {
        const resource = model.uri;

        return this._worker(resource)
            .then((worker) => {
                return worker.doRename(resource.toString(), fromPosition(position), newName);
            })
            .then((edit) => {
                return toWorkspaceEdit(edit);
            });
    }
}

// --- document symbols ------

function toSymbolKind(kind: ls.SymbolKind): monaco.languages.SymbolKind {
    let mKind = monaco.languages.SymbolKind;

    switch (kind) {
        case ls.SymbolKind.File:
            return mKind.Array;
        case ls.SymbolKind.Module:
            return mKind.Module;
        case ls.SymbolKind.Namespace:
            return mKind.Namespace;
        case ls.SymbolKind.Package:
            return mKind.Package;
        case ls.SymbolKind.Class:
            return mKind.Class;
        case ls.SymbolKind.Method:
            return mKind.Method;
        case ls.SymbolKind.Property:
            return mKind.Property;
        case ls.SymbolKind.Field:
            return mKind.Field;
        case ls.SymbolKind.Constructor:
            return mKind.Constructor;
        case ls.SymbolKind.Enum:
            return mKind.Enum;
        case ls.SymbolKind.Interface:
            return mKind.Interface;
        case ls.SymbolKind.Function:
            return mKind.Function;
        case ls.SymbolKind.Variable:
            return mKind.Variable;
        case ls.SymbolKind.Constant:
            return mKind.Constant;
        case ls.SymbolKind.String:
            return mKind.String;
        case ls.SymbolKind.Number:
            return mKind.Number;
        case ls.SymbolKind.Boolean:
            return mKind.Boolean;
        case ls.SymbolKind.Array:
            return mKind.Array;
    }
    return mKind.Function;
}

// --- formatting -----

export class DocumentFormatAdapter implements monaco.languages.DocumentFormattingEditProvider {
    constructor(private _worker: WorkerAccessor) {}

    provideDocumentFormattingEdits(
        model: monaco.editor.IReadOnlyModel,
        options: monaco.languages.FormattingOptions,
        token: CancellationToken
    ): monaco.languages.TextEdit[] | Thenable<monaco.languages.TextEdit[]> {
        const resource = model.uri;
        return this._worker(resource).then((worker) => {
            return worker.doDocumentFormat(resource.toString()).then((edits) => edits.map((edit) => toTextEdit(edit)));
        });
    }
}

export class FormatAdapter implements monaco.languages.DocumentRangeFormattingEditProvider {
    constructor(private _worker: WorkerAccessor) {}

    provideDocumentRangeFormattingEdits(
        model: monaco.editor.IReadOnlyModel,
        range: Range,
        options: monaco.languages.FormattingOptions,
        token: CancellationToken
    ): monaco.languages.TextEdit[] | Thenable<monaco.languages.TextEdit[]> {
        const resource = model.uri;
        return this._worker(resource).then((worker) => {
            return worker
                .doRangeFormat(resource.toString(), fromRange(range))
                .then((edits) => edits.map((edit) => toTextEdit(edit)));
        });
    }
}

// --- Folding ---
export class FoldingAdapter implements monaco.languages.FoldingRangeProvider {
    constructor(private _worker: WorkerAccessor) {}

    provideFoldingRanges(
        model: monaco.editor.ITextModel,
        context: monaco.languages.FoldingContext,
        token: CancellationToken
    ): monaco.languages.FoldingRange[] | PromiseLike<monaco.languages.FoldingRange[]> {
        const resource = model.uri;
        return this._worker(resource).then((worker) => {
            return worker
                .doFolding(resource.toString())
                .then((foldingRanges) =>
                    foldingRanges.map((range): monaco.languages.FoldingRange => toFoldingRange(range))
                );
        });
    }
}

function toFoldingRange(range: FoldingRange): monaco.languages.FoldingRange {
    return {
        start: range.startLine + 1,
        end: range.endLine + 1,
        kind: monaco.languages.FoldingRangeKind.Region,
    };
}

// --- hover ------

export class HoverAdapter implements monaco.languages.HoverProvider {
    constructor(private _worker: WorkerAccessor) {}

    provideHover(
        model: monaco.editor.IReadOnlyModel,
        position: Position,
        token: CancellationToken
    ): Thenable<monaco.languages.Hover> {
        let resource = model.uri;

        return this._worker(resource)
            .then((worker) => {
                return worker.doHover(resource.toString(), fromPosition(position));
            })
            .then((info) => {
                if (!info) {
                    return;
                }
                return <monaco.languages.Hover>{
                    range: toRange(info.range),
                    contents: toMarkedStringArray(info.contents),
                };
            });
    }
}
