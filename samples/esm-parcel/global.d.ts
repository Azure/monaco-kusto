declare module 'url:*' {
    const url: string;
    export default url;
}

declare module 'monaco-editor/esm/vs/editor/edcore.main' {
    export * from 'monaco-editor';
}
