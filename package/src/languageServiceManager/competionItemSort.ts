import k2 = Kusto.Language.Editor;

export const createSortingText = (priority: number) => {
    return priority.toString().padStart(10, '0');
};

export function sortByMatchTextKeepingKindOrder(items: k2.CompletionItem[]) {
    const groupedByKind = groupContiguousByKindAndFirstChar(items);
    const sortedGroupedItems = sortGroupedItems(groupedByKind);
    return sortedGroupedItems.flat();
}

function sortGroupedItems(groupedItems: k2.CompletionItem[][]) {
    return groupedItems.map((group) => {
        if (group.length === 1) return group;
        return group.sort((i1, i2) => i1.MatchText.localeCompare(i2.MatchText));
    });
}

function groupContiguousByKindAndFirstChar(items: k2.CompletionItem[]) {
    return items.reduce((result: k2.CompletionItem[][], item: k2.CompletionItem) => {
        const lastGroup = last(result);
        const lastItem = last(lastGroup);

        const shouldCreateNewGroup =
            !lastItem || lastItem.Kind !== item.Kind || lastItem.MatchText[0] !== item.MatchText[0];
        if (shouldCreateNewGroup) result.push([]);
        last(result).push(item);

        return result;
    }, []);
}

function last<T>(array: T[]): T | undefined {
    if (!array) return undefined;
    return array.length > 0 ? array[array.length - 1] : undefined;
}
