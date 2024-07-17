import { test, describe, expect, beforeEach } from '@jest/globals';
import { editor } from 'monaco-editor/esm/vs/editor/editor.api';
import { getRangeHtml } from './getRangeHtml';
import { LANGUAGE_ID } from '../globals';

describe('getRangeHtml', () => {
    let modelDummy: editor.IModel;

    beforeEach(() => {
        modelDummy = editor.createModel('value', LANGUAGE_ID);
        editor.colorizeModelLine = jest.fn().mockImplementation((_model: any, lineNumber: number) => {
            return `<div>${lineNumber}</div>`;
        });
    });

    test('returns colorized html for each line in the range', () => {
        const range = makeRange(1, 1, 3, 1);

        const rangeHtml = getRangeHtml(modelDummy, range);

        expect(rangeHtml).toBe('<div>1</div><br/><div>2</div><br/><div>3</div>');
    });

    test('skip last line when end column is 0', () => {
        const range = makeRange(1, 1, 3, 0);

        const rangeHtml = getRangeHtml(modelDummy, range);

        expect(rangeHtml).toBe('<div>1</div><br/><div>2</div>');
    });
});

function makeRange(startLineNumber: number, startColumn: number, endLineNumber: number, endColumn: number) {
    return { startLineNumber, startColumn, endLineNumber, endColumn };
}
