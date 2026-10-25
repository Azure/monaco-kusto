export type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};

export function getTrailingSeparatorStart(text: string): number {
    let start = text.length;
    for (let i = text.length - 1; i >= 0; i--) {
        const character = text.charAt(i);
        if (character === '\r' || character === '\n') {
            start = i;
        } else if (character !== ' ' && character !== '\t') {
            break;
        }
    }
    return start;
}
