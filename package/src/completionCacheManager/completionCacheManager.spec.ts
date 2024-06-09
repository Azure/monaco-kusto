import { test, describe, expect, beforeEach, afterEach } from '@jest/globals';
import { CompletionCacheManager, GetFromLanguageService, createCompletionCacheManager } from './completionCacheManager';
import * as monaco from 'monaco-editor';
import * as ls from 'vscode-languageserver-types';
import { completionListBuilder, completionItemBuilder } from '../../tests/unit/builders/CompletionListBuilder';
import { CompletionItem } from 'vscode-languageserver-types';

describe('completionCacheManager', () => {
    let completionCacheManager: CompletionCacheManager;
    const mockGetFromLanguageService: jest.MockedFunction<GetFromLanguageService> = jest.fn();
    const resource = {} as monaco.Uri;
    const position = {} as ls.Position;
    let initialCompletionItems: CompletionItem[];
    let subsequentCompletionItems: CompletionItem[];

    beforeEach(() => {
        const initialCompletionList = completionListBuilder().addItem(completionItemBuilder().build()).build();
        initialCompletionItems = initialCompletionList.items;

        const subsequentCompletionList = completionListBuilder().addItem(completionItemBuilder().build()).build();
        subsequentCompletionItems = subsequentCompletionList.items;

        mockGetFromLanguageService.mockClear();
        mockGetFromLanguageService.mockImplementation(() => {
            const mockCallCount = mockGetFromLanguageService.mock.calls.length;
            const completionList = mockCallCount === 1 ? initialCompletionList : subsequentCompletionList;
            return Promise.resolve(completionList);
        });

        completionCacheManager = createCompletionCacheManager(mockGetFromLanguageService);
    });

    test('calls language service on single character', async () => {
        const { items } = await completionCacheManager.getCompletionItems('a', resource, position);

        expect(items).toEqual(initialCompletionItems);
    });

    describe('on subsequent calls', () => {
        test('does not call language service again when the previous word is contained in the current word', async () => {
            await completionCacheManager.getCompletionItems('a', resource, position);
            const { items } = await completionCacheManager.getCompletionItems('ab', resource, position);

            expect(items).toEqual(initialCompletionItems);
        });

        test('calls language service for different non-contained words', async () => {
            await completionCacheManager.getCompletionItems('a', resource, position);
            const { items } = await completionCacheManager.getCompletionItems('b', resource, position);

            expect(items).toEqual(subsequentCompletionItems);
        });

        test('calls language service when current word is undefined', async () => {
            await completionCacheManager.getCompletionItems('a', resource, position);
            const { items } = await completionCacheManager.getCompletionItems(undefined, resource, position);

            expect(items).toEqual(subsequentCompletionItems);
        });

        test('does not call language service again when the current word is contained in the previous word', async () => {
            await completionCacheManager.getCompletionItems('ab', resource, position);
            const { items } = await completionCacheManager.getCompletionItems('a', resource, position);

            expect(items).toEqual(initialCompletionItems);
        });
    });
});
