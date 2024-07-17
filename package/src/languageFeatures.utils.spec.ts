import { test, describe, expect } from '@jest/globals';
import { createCompletionFilteredText, getFocusedItem } from './languageFeatures.utils';
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

describe('getFocusedItem', () => {
    const first = completionItemBuilder().withFilterText('EndTime').build();
    const second = completionItemBuilder().withFilterText('StartTime').build();
    const third = completionItemBuilder().withFilterText('timespan').build();
    const completionItems = [first, second, third];

    test('returns the first item if the user input is not provided', () => {
        const focusedItem = getFocusedItem(completionItems, undefined);
        expect(focusedItem).toEqual(first);
    });

    test("returns the item matching the user input's case-insensitive prefix", () => {
        const focusedItem = getFocusedItem(completionItems, 'Time');
        expect(focusedItem).toEqual(third);
    });

    test('returns the first item when no items start with the user input', () => {
        const focusedItem = getFocusedItem(completionItems, 'Mitzi');
        expect(focusedItem).toEqual(first);
    });
});
