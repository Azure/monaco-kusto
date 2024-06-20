import k2 = Kusto.Language.Editor;
import { test, describe, expect } from '@jest/globals';
import { createSortingText, sortCompletionItems } from './competionItemSort';
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

describe('sortCompletionItems', () => {
    test('should sort by match text grouped by kind and first char', () => {
        const items = [
            kustoCompletionItemBuilder()
                .withMatchText('count_distinct')
                .withPriority(2)
                .withKind(k2.CompletionKind.AggregateFunction)
                .build(),
            kustoCompletionItemBuilder()
                .withMatchText('count')
                .withPriority(2)
                .withKind(k2.CompletionKind.AggregateFunction)
                .build(),
            kustoCompletionItemBuilder()
                .withMatchText('where')
                .withPriority(0)
                .withKind(k2.CompletionKind.AggregateFunction)
                .build(),
            kustoCompletionItemBuilder()
                .withMatchText('bin_at')
                .withPriority(2)
                .withKind(k2.CompletionKind.BuiltInFunction)
                .build(),
            kustoCompletionItemBuilder()
                .withMatchText('bin')
                .withPriority(2)
                .withKind(k2.CompletionKind.BuiltInFunction)
                .build(),
            kustoCompletionItemBuilder()
                .withMatchText('avg')
                .withPriority(2)
                .withKind(k2.CompletionKind.AggregateFunction)
                .build(),
        ];

        const sortedItems = sortCompletionItems(items);

        const results = sortedItems.map((item) => item.MatchText);
        expect(results).toEqual(['where', 'avg', 'count', 'count_distinct', 'bin', 'bin_at']);
    });
});
