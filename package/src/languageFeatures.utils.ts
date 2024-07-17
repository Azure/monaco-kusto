import * as ls from 'vscode-languageserver-types';

export function createCompletionFilteredText(userInput: string | undefined, completionItem: ls.CompletionItem): string {
    if (!userInput) return completionItem.filterText;

    const containedInFilterText = completionItem.filterText.toLowerCase().includes(userInput.toLowerCase());
    if (!containedInFilterText) return completionItem.filterText;

    return `${userInput}${completionItem.filterText}`;
}

export function getFocusedItem(completionItems: ls.CompletionItem[], userInput: string): ls.CompletionItem {
    const firstCompletionItem = completionItems[0];
    if (!userInput) return firstCompletionItem;

    const firstMatchingItem = completionItems.find((item) =>
        item.filterText?.toLowerCase().startsWith(userInput.toLowerCase())
    );
    return firstMatchingItem ?? firstCompletionItem;
}
