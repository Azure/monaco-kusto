import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import * as ls from 'vscode-languageserver-types';
import debounce from 'lodash-es/debounce';

import type { LanguageServiceDefaults, LanguageSettings, OnDidProvideCompletionItems } from './monaco.contribution';
import type { Schema } from './languageServiceManager/schema';
import type { ClassifiedRange } from './languageServiceManager/kustoLanguageService';
import { AugmentedWorkerAccessor } from './kustoMode';
import { CompletionCacheManager, createCompletionCacheManager } from './completionCacheManager/completionCacheManager';
import { createCompletionFilteredText } from './languageFeatures.utils';

// --- diagnostics ---

interface Cancelable {
    cancel(): void;
    flush(): void;
}

export class DiagnosticsAdapter {
    private _disposables: monaco.IDisposable[] = [];
    private _contentListener: { [uri: string]: monaco.IDisposable } = Object.create(null);
    private _configurationListener: { [uri: string]: monaco.IDisposable } = Object.create(null);
    private _schemaListener: { [uri: string]: monaco.IDisposable } = Object.create(null);
    private _cursorListener: { [editorId: string]: monaco.IDisposable } = Object.create(null);
    private _debouncedValidations: {
        [uri: string]: ((intervals?: { start: number; end: number }[]) => void) & Cancelable;
    } = Object.create(null);

    constructor(
        private _monacoInstance: typeof globalThis.monaco,
        private _languageId: string,
        private _worker: AugmentedWorkerAccessor,
        private defaults: LanguageServiceDefaults,
        onSchemaChange: monaco.IEvent<Schema>
    ) {
        const onModelAdd = (model: monaco.editor.IModel): void => {
            let languageId = model.getLanguageId();
            const modelUri = model.uri.toString();
            if (languageId !== this._languageId) {
                return;
            }

            const debouncedValidation = this.getOrCreateDebouncedValidation(model, languageId);

            this._contentListener[modelUri] = model.onDidChangeContent((e) => {
                const intervalsToValidate = changeEventToIntervals(e);
                debouncedValidation(intervalsToValidate);
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
                });
                this._cursorListener[editorId] = editor.onDidChangeCursorSelection((e) => {
                    const model = editor.getModel();
                    const languageId = model.getLanguageId();
                    if (languageId !== this._languageId) {
                        return;
                    }
                    const cursorOffset = model.getOffsetAt(e.selection.getPosition());
                    const debouncedValidation = this.getOrCreateDebouncedValidation(model, languageId);
                    debouncedValidation([{ start: cursorOffset, end: cursorOffset }]);
                });
            }
        };

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

            let debouncedValidation = this._debouncedValidations[uriStr];
            if (debouncedValidation) {
                debouncedValidation.cancel();
                delete this._debouncedValidations[uriStr];
            }
        };
        if (this.defaults.languageSettings.enableQuickFixes) {
            this._disposables.push(
                monaco.languages.registerCodeActionProvider(this._languageId, {
                    provideCodeActions: async (model, range, context, _token) => {
                        const startOffset = model.getOffsetAt(range.getStartPosition());
                        const endOffset = model.getOffsetAt(range.getEndPosition());
                        // We want to show the quick fix option only if we have markers in our selected range
                        const showQuickFix = context.markers.length > 0;
                        const actions = await this.getMonacoCodeActions(model, startOffset, endOffset, showQuickFix);
                        return {
                            actions,
                            dispose: () => {},
                        };
                    },
                })
            );
        }

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
                for (let key in this._debouncedValidations) {
                    this._debouncedValidations[key].cancel();
                }
            },
        });

        this._monacoInstance.editor.getModels().forEach(onModelAdd);
        this._monacoInstance.editor.getEditors().forEach(onEditorAdd);
    }

    private async getMonacoCodeActions(
        model: monaco.editor.ITextModel,
        startOffset: number,
        endOffset: number,
        enableQuickFix: boolean
    ): Promise<monaco.languages.CodeAction[]> {
        const actions = [];
        const worker = await this._worker(model.uri);
        const resource = model.uri;
        const codeActions = await worker.getResultActions(resource.toString(), startOffset, endOffset);
        for (let i = 0; i < codeActions.length; i++) {
            const codeAction = codeActions[i];
            if (codeAction.kind.includes('Extract Function')) {
                // Ignore extract function actions for now since they are buggy currently
                continue;
            }
            const codeActionKind = this.defaults.languageSettings.quickFixCodeActions?.find((actionKind) =>
                codeAction.kind.includes(actionKind)
            )
                ? 'quickfix'
                : 'custom';
            if (codeActionKind === 'quickfix' && !enableQuickFix) {
                return;
            }
            const changes = codeAction.changes;
            const edits = changes.map((change) => {
                const startPosition = model.getPositionAt(change.start);
                const endPosition = model.getPositionAt(change.start + change.deleteLength);
                return {
                    resource: model.uri,
                    textEdit: {
                        range: {
                            startLineNumber: startPosition.lineNumber,
                            startColumn: startPosition.column,
                            endLineNumber: endPosition.lineNumber,
                            endColumn: endPosition.column,
                        },
                        text: change.insertText ?? '',
                    },
                };
            });
            actions.push({
                title: codeAction.title,
                diagnostics: [],
                kind: codeActionKind,
                edit: {
                    edits: [...edits],
                },
            });
        }
        return actions;
    }

    private getOrCreateDebouncedValidation(model: monaco.editor.ITextModel, languageId: string) {
        const modelUri = model.uri.toString();
        if (!this._debouncedValidations[modelUri]) {
            this._debouncedValidations[modelUri] = debounce(
                (intervals?: { start: number; end: number }[]) => this._doValidate(model, languageId, intervals),
                500
            );
        }
        return this._debouncedValidations[modelUri];
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

                        const oldMarkers = monaco.editor.getModelMarkers({
                            owner: languageId,
                            resource: resource,
                        });

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

function toDiagnostics(resource: monaco.Uri, diag: ls.Diagnostic): monaco.editor.IMarkerData {
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
// --- completion ------

function fromPosition(position: monaco.Position): ls.Position {
    if (!position) {
        return void 0;
    }
    return { character: position.column - 1, line: position.lineNumber - 1 };
}

function fromRange(range: monaco.Range): ls.Range {
    if (!range) {
        return void 0;
    }
    return { start: fromPosition(range.getStartPosition()), end: fromPosition(range.getEndPosition()) };
}

function toRange(range: ls.Range): monaco.Range {
    if (!range) {
        return void 0;
    }
    return new monaco.Range(
        range.start.line + 1,
        range.start.character + 1,
        range.end.line + 1,
        range.end.character + 1
    );
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

const DEFAULT_DOCS_BASE_URL = 'https://learn.microsoft.com/azure/data-explorer/kusto/query';

export class CompletionAdapter implements monaco.languages.CompletionItemProvider {
    private readonly languageSettings: LanguageSettings;
    private completionCacheManager: CompletionCacheManager;

    constructor(workerAccessor: AugmentedWorkerAccessor, languageSettings: LanguageSettings) {
        this.languageSettings = languageSettings;
        const getFromLanguageService = async (resource: monaco.Uri, position: ls.Position) => {
            const worker = await workerAccessor(resource);
            return worker.doComplete(resource.toString(), position);
        };
        this.completionCacheManager = createCompletionCacheManager(getFromLanguageService);
    }

    public get triggerCharacters(): string[] {
        return [' ', '.', '('];
    }

    provideCompletionItems(
        model: monaco.editor.IReadOnlyModel,
        position: monaco.Position,
        context: monaco.languages.CompletionContext,
        token: monaco.CancellationToken
    ): monaco.Thenable<monaco.languages.CompletionList> {
        const wordInfo = model.getWordUntilPosition(position);
        const wordRange = new monaco.Range(
            position.lineNumber,
            wordInfo.startColumn,
            position.lineNumber,
            wordInfo.endColumn
        );
        const resource = model.uri;
        const word = model?.getWordAtPosition(position)?.word;
        const onDidProvideCompletionItems: OnDidProvideCompletionItems =
            this.languageSettings.onDidProvideCompletionItems;

        return this.completionCacheManager
            .getCompletionItems(word, resource, fromPosition(position))
            .then((info) => (onDidProvideCompletionItems ? onDidProvideCompletionItems(info) : info))
            .then((info) => {
                if (!info) return;

                let items: monaco.languages.CompletionItem[] = info.items.map((entry) => {
                    let item: monaco.languages.CompletionItem = {
                        label: entry.label,
                        insertText: entry.insertText,
                        sortText: entry.sortText,
                        filterText: createCompletionFilteredText(word, entry),
                        // TODO: Is this cast safe?
                        documentation: this.formatDocLink((entry.documentation as undefined | ls.MarkupContent)?.value),
                        detail: entry.detail,
                        range: wordRange,
                        kind: toCompletionItemKind(entry.kind),
                    };
                    if (entry.textEdit) {
                        // TODO: Where is the "range" property coming from?
                        item.range = toRange((entry.textEdit as any).range);
                        item.insertText = entry.textEdit.newText;
                    }
                    if (entry.insertTextFormat === ls.InsertTextFormat.Snippet) {
                        item.insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
                    }
                    return item;
                });

                return {
                    incomplete: true,
                    suggestions: items,
                };
            });
    }

    private formatDocLink(docString?: string): monaco.languages.CompletionItem['documentation'] {
        // If the docString is empty, we want to return undefined to prevent an empty documentation popup.
        if (!docString) {
            return undefined;
        }
        const { documentationBaseUrl = DEFAULT_DOCS_BASE_URL, documentationSuffix } = this.languageSettings;
        const urisProxy = new Proxy(
            {},
            {
                get(_target, prop, _receiver) {
                    // The link comes with a postfix of ".md" that we want to remove
                    let url = prop.toString().replace('.md', '');
                    // Sometimes we get the link as a full URL. For example in the main doc link of the item
                    if (!url.startsWith('https')) {
                        url = `${documentationBaseUrl}/${url}`;
                    }
                    const monacoUri = monaco.Uri.parse(url);
                    if (documentationSuffix) {
                        // We need to override the toString method to add the suffix, otherwise it gets encoded and page doesn't open
                        monacoUri.toString = () => url + documentationSuffix;
                    }
                    return monacoUri;
                },
            }
        );
        return { value: docString, isTrusted: true, uris: urisProxy };
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
        uri: monaco.Uri.parse(location.uri),
        range: toRange(location.range),
    };
}

export class DefinitionAdapter {
    constructor(private _worker: AugmentedWorkerAccessor) {}

    public provideDefinition(
        model: monaco.editor.IReadOnlyModel,
        position: monaco.Position,
        token: monaco.CancellationToken
    ): monaco.Thenable<monaco.languages.Definition> {
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
    constructor(private _worker: AugmentedWorkerAccessor) {}

    provideReferences(
        model: monaco.editor.IReadOnlyModel,
        position: monaco.Position,
        context: monaco.languages.ReferenceContext,
        token: monaco.CancellationToken
    ): monaco.Thenable<monaco.languages.Location[]> {
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
        const _uri = monaco.Uri.parse(uri);
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
    constructor(private _worker: AugmentedWorkerAccessor) {}

    provideRenameEdits(
        model: monaco.editor.IReadOnlyModel,
        position: monaco.Position,
        newName: string,
        token: monaco.CancellationToken
    ): monaco.Thenable<monaco.languages.WorkspaceEdit> {
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

// --- formatting -----

export class DocumentFormatAdapter implements monaco.languages.DocumentFormattingEditProvider {
    constructor(private _worker: AugmentedWorkerAccessor) {}

    provideDocumentFormattingEdits(
        model: monaco.editor.IReadOnlyModel,
        options: monaco.languages.FormattingOptions,
        token: monaco.CancellationToken
    ): monaco.languages.TextEdit[] | monaco.Thenable<monaco.languages.TextEdit[]> {
        const resource = model.uri;
        return this._worker(resource).then((worker) => {
            return worker.doDocumentFormat(resource.toString()).then((edits) => edits.map((edit) => toTextEdit(edit)));
        });
    }
}

export class FormatAdapter implements monaco.languages.DocumentRangeFormattingEditProvider {
    constructor(private _worker: AugmentedWorkerAccessor) {}

    provideDocumentRangeFormattingEdits(
        model: monaco.editor.IReadOnlyModel,
        range: monaco.Range,
        options: monaco.languages.FormattingOptions,
        token: monaco.CancellationToken
    ): monaco.languages.TextEdit[] | monaco.Thenable<monaco.languages.TextEdit[]> {
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
    constructor(private _worker: AugmentedWorkerAccessor) {}

    provideFoldingRanges(
        model: monaco.editor.ITextModel,
        context: monaco.languages.FoldingContext,
        token: monaco.CancellationToken
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

function toFoldingRange(range: ls.FoldingRange): monaco.languages.FoldingRange {
    return {
        start: range.startLine + 1,
        end: range.endLine + 1,
        kind: monaco.languages.FoldingRangeKind.Region,
    };
}

// --- hover ------

export class HoverAdapter implements monaco.languages.HoverProvider {
    constructor(private _worker: AugmentedWorkerAccessor) {}

    provideHover(
        model: monaco.editor.IReadOnlyModel,
        position: monaco.Position,
        token: monaco.CancellationToken
    ): monaco.Thenable<monaco.languages.Hover> {
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
