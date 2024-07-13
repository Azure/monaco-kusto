import * as ls from 'vscode-languageserver-types';

export function createCompletionFilteredText(userInput: string | undefined, completionItem: ls.CompletionItem): string {
    if (!userInput) return completionItem.filterText;

    const containedInFilterText = completionItem.filterText.toLowerCase().includes(userInput.toLowerCase());
    if (!containedInFilterText) return completionItem.filterText;

    return `${userInput}${completionItem.filterText}`;
}

export function getSelectedIndex(completionItems: ls.CompletionItem[], userInput: string): number {
    if (!userInput) return 0;

    const firstMatchingItemIndex = completionItems.findIndex((item) =>
        item.filterText?.toLowerCase().startsWith(userInput.toLowerCase())
    );
    return firstMatchingItemIndex === -1 ? 0 : firstMatchingItemIndex;
}
