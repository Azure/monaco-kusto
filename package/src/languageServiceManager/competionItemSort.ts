export const createSortingText = (priority: number) => {
    return priority.toString().padStart(10, '0');
};
