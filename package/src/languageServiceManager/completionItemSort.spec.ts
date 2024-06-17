import k2 = Kusto.Language.Editor;
import { test, describe, expect } from '@jest/globals';
import { createSortingText, sortByMatchTextKeepingKindOrder } from './competionItemSort';
import { kustoCompletionItemBuilder } from '../../tests/unit/builders/KustoCompletionItem';

describe('createSortingText', () => {
    test('returns the correct sort text according to the given order', () => {
        const items = [
            { priority: 51, label: 'fifth' },
            { priority: 26, label: 'forth' },
            { priority: 0, label: 'first' },
            { priority: 123, label: 'sixth' },
            { priority: 1, label: 'second' },
            { priority: 25, label: 'third' },
        ];

        const sortedItems = items.sort((a, b) =>
            createSortingText(a.priority).localeCompare(createSortingText(b.priority))
        );

        expect(sortedItems[0].label).toBe('first');
        expect(sortedItems[1].label).toBe('second');
        expect(sortedItems[2].label).toBe('third');
        expect(sortedItems[3].label).toBe('forth');
        expect(sortedItems[4].label).toBe('fifth');
        expect(sortedItems[5].label).toBe('sixth');
    });
});

describe('sortByMatchTextKeepingKindOrder', () => {
    test('should sort by match text grouped by kind', () => {
        const item1 = kustoCompletionItemBuilder()
            .withMatchText('count_distinct')
            .withKind(k2.CompletionKind.AggregateFunction)
            .build();
        const item2 = kustoCompletionItemBuilder()
            .withMatchText('count')
            .withKind(k2.CompletionKind.AggregateFunction)
            .build();
        const item3 = kustoCompletionItemBuilder()
            .withMatchText('bin_at')
            .withKind(k2.CompletionKind.BuiltInFunction)
            .build();
        const item4 = kustoCompletionItemBuilder()
            .withMatchText('bin')
            .withKind(k2.CompletionKind.BuiltInFunction)
            .build();
        const item5 = kustoCompletionItemBuilder()
            .withMatchText('avg')
            .withKind(k2.CompletionKind.AggregateFunction)
            .build();
        const items = [item1, item2, item3, item4, item5];

        const sortedItems = sortByMatchTextKeepingKindOrder(items);

        expect(sortedItems[0].MatchText).toBe('count');
        expect(sortedItems[1].MatchText).toBe('count_distinct');
        expect(sortedItems[2].MatchText).toBe('bin');
        expect(sortedItems[3].MatchText).toBe('bin_at');
        expect(sortedItems[4].MatchText).toBe('avg');
    });
});
