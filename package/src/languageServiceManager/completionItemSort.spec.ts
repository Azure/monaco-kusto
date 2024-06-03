import { test, describe, expect } from '@jest/globals';
import { createSortingText } from './competionItemSort';

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
