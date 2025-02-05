import { test, describe, expect, beforeEach } from '@jest/globals';
import { CompletionCacheManager, GetFromLanguageService, createCompletionCacheManager } from './completionCacheManager';
import * as monaco from 'monaco-editor';
import * as ls from 'vscode-languageserver-types';

describe('completionCacheManager', () => {
    let completionCacheManager: CompletionCacheManager;
    const mockGetFromLanguageService: jest.MockedFunction<GetFromLanguageService> = jest.fn();
    const resource = {} as monaco.Uri;
    const position = {
        line: 0,
        character: 0,
    } as ls.Position;

    beforeEach(() => {
        mockGetFromLanguageService.mockClear();
        completionCacheManager = createCompletionCacheManager(mockGetFromLanguageService);
    });

    test('calls language service on single character', async () => {
        await completionCacheManager.getCompletionItems('a', resource, position);
        expect(mockGetFromLanguageService).toHaveBeenCalledTimes(1);
    });

    describe('on subsequent calls', () => {
        beforeEach(async () => {
            await completionCacheManager.getCompletionItems('ab', resource, position);
            mockGetFromLanguageService.mockClear();
        });

        test('does not call language service again when the previous word is contained in the current word', async () => {
            await completionCacheManager.getCompletionItems('abc', resource, position);
            expect(mockGetFromLanguageService).toHaveBeenCalledTimes(0);
        });

        test('calls language service for different non-contained words', async () => {
            await completionCacheManager.getCompletionItems('ba', resource, position);
            expect(mockGetFromLanguageService).toHaveBeenCalledTimes(1);
        });

        test('calls language service when current word is undefined', async () => {
            await completionCacheManager.getCompletionItems(undefined, resource, position);
            expect(mockGetFromLanguageService).toHaveBeenCalledTimes(1);
        });

        test('calls language service when the current word is contained in the previous word', async () => {
            await completionCacheManager.getCompletionItems('a', resource, position);
            expect(mockGetFromLanguageService).toHaveBeenCalledTimes(1);
        });

        test('calls language service when the position line has changed', async () => {
            const newPosition = {
                line: 1,
                character: 0,
            };
            await completionCacheManager.getCompletionItems('ab', resource, newPosition);
            expect(mockGetFromLanguageService).toHaveBeenCalledTimes(1);
        });
    });
});
