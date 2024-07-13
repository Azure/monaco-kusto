import { test, describe, expect } from '@jest/globals';
import { createCompletionFilteredText, getSelectedIndex } from './languageFeatures.utils';
import { completionItemBuilder } from '../tests/unit/builders/CompletionListBuilder';

describe('createCompletionFilteredText', () => {
    test('does not prepend prefix to result when user input is undefined', () => {
        const completionItem = completionItemBuilder().build();

        const filterText = createCompletionFilteredText(undefined, completionItem);
        expect(filterText).toBe(completionItem.filterText);
    });

    test('prepends prefix to result when the user input is included in the original filter text', () => {
        const originalFilterText = 'StartTime';
        const userInput = 'time';

        const completionItem = completionItemBuilder().withFilterText(originalFilterText).build();

        const filterText = createCompletionFilteredText(userInput, completionItem);
        expect(filterText).toBe(`${userInput}${completionItem.filterText}`);
    });

    test('does not prepend prefix to result when the user input is NOT included in the original filter text', () => {
        const originalFilterText = 'StartTime';
        const userInput = 'end';

        const completionItem = completionItemBuilder().withFilterText(originalFilterText).build();

        const filterText = createCompletionFilteredText(userInput, completionItem);
        expect(filterText).toBe(completionItem.filterText);
    });
});

describe('getSelectedIndex', () => {
    test('returns 0 if the user input is not provided', () => {
        const completionItems = [completionItemBuilder().withFilterText('EndTime').build()];
        const selectedIndex = getSelectedIndex(completionItems, undefined);
        expect(selectedIndex).toBe(0);
    });

    test("returns the index of the first item matching the user input's case-insensitive prefix", () => {
        const completionItems = [
            completionItemBuilder().withFilterText('EndTime').build(),
            completionItemBuilder().withFilterText('StartTime').build(),
            completionItemBuilder().withFilterText('timespan').build(),
        ];
        const selectedIndex = getSelectedIndex(completionItems, 'Time');
        expect(selectedIndex).toBe(2);
    });

    test('returns 0 when no items start with the user input', () => {
        const completionItems = [
            completionItemBuilder().withFilterText('EndTime').build(),
            completionItemBuilder().withFilterText('StartTime').build(),
            completionItemBuilder().withFilterText('timespan').build(),
        ];
        const selectedIndex = getSelectedIndex(completionItems, 'Mitzi');
        expect(selectedIndex).toBe(0);
    });
});
