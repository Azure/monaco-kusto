import { test, describe, expect } from '@jest/globals';
import { createCompletionFilteredText } from './languageFeatures.utils';
import { completionItemBuilder } from '../tests/unit/builders/CompletionListBuilder';

describe('createCompletionFilteredText', () => {
    test('does not prepend prefix to result when search word is undefined', () => {
        const completionItem = completionItemBuilder().withForcePrecedence(true).build();

        const filterText = createCompletionFilteredText(undefined, completionItem);
        expect(filterText).toBe(completionItem.filterText);
    });

    describe('when the search word is included in the original filter text', () => {
        const originalFilterText = 'StartTime';
        const searchWord = 'time';

        test('prepends prefix to result when forcePrecedence=true', () => {
            const completionItem = completionItemBuilder()
                .withFilterText(originalFilterText)
                .withForcePrecedence(true)
                .build();

            const filterText = createCompletionFilteredText(searchWord, completionItem);
            expect(filterText).toBe(`${searchWord}${completionItem.filterText}`);
        });

        test('does not prepend prefix to result when forcePrecedence=false', () => {
            const completionItem = completionItemBuilder()
                .withFilterText(originalFilterText)
                .withForcePrecedence(false)
                .build();

            const filterText = createCompletionFilteredText(searchWord, completionItem);
            expect(filterText).toBe(completionItem.filterText);
        });
    });

    describe('when the search word is NOT included in the original filter text', () => {
        const originalFilterText = 'StartTime';
        const searchWord = 'end';

        test('does not prepend prefix to result when forcePrecedence=true', () => {
            const completionItem = completionItemBuilder()
                .withFilterText(originalFilterText)
                .withForcePrecedence(true)
                .build();

            const filterText = createCompletionFilteredText(searchWord, completionItem);
            expect(filterText).toBe(completionItem.filterText);
        });

        test('does not prepend prefix to result when forcePrecedence=false', () => {
            const completionItem = completionItemBuilder()
                .withFilterText(originalFilterText)
                .withForcePrecedence(false)
                .build();

            const filterText = createCompletionFilteredText(searchWord, completionItem);
            expect(filterText).toBe(completionItem.filterText);
        });
    });
});
