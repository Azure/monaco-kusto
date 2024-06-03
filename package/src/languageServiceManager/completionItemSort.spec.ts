import { test, describe, expect } from '@jest/globals';
import { createSortingText } from './competionItemSort';

describe('createSortingText', () => {
    test('returns the correct sort text according to the given order', () => {
        expect(createSortingText(0)).toBe('0000000000');
        expect(createSortingText(1)).toBe('0000000001');
        expect(createSortingText(25)).toBe('0000000025');
        expect(createSortingText(26)).toBe('0000000026');
        expect(createSortingText(51)).toBe('0000000051');
        expect(createSortingText(123)).toBe('0000000123');
    });
});
