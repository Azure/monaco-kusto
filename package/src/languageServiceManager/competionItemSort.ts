import k2 = Kusto.Language.Editor;

export const createSortingText = (priority: number) => {
    return priority.toString().padStart(10, '0');
};

export function sortByMatchTextKeepingKindOrder(items: k2.CompletionItem[]) {
    const groupedByKind = groupContiguousByKind(items);
    const sortedGroupedItems = sortGroupedItems(groupedByKind);
    return sortedGroupedItems.flat();
}

function sortGroupedItems(groupedItems: k2.CompletionItem[][]) {
    return groupedItems.map((group) => group.sort((i1, i2) => i1.MatchText.localeCompare(i2.MatchText)));
}

function groupContiguousByKind(items: k2.CompletionItem[]) {
    return items.reduce((result: k2.CompletionItem[][], item: k2.CompletionItem) => {
        const lastGroup = last(result);

        const shouldCreateNewGroup = !lastGroup || last(lastGroup)?.Kind !== item.Kind;
        if (shouldCreateNewGroup) result.push([]);
        last(result).push(item);

        return result;
    }, []);
}

function last<T>(array: T[]): T | undefined {
    return array.length > 0 ? array[array.length - 1] : undefined;
}
