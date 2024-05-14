import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
    // nodePolyfills required because of @kusto/language-service
    plugins: [nodePolyfills({ overrides: { fs: null } })],
    optimizeDeps: {
        include: [
            // https://github.com/vitejs/vite/discussions/1791#discussioncomment-320938
            // add more modules here when you get a "new dependencies optimized" warning from vite.
            'monaco-editor/esm/vs/language/json/json.worker',
            '@kusto/monaco-kusto/release/esm/kusto.worker',
            '@kusto/language-service/bridge.min',
            'monaco-editor/esm/vs/editor/editor.worker',
            'xregexp',
        ],
    },
    server: {
        port: 7777,
    },
});
