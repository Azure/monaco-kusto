import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), nodePolyfills({ overrides: { fs: null } })],
    define: {
        'process.env': {
            NODE_DEBUG: process.env.NODE_DEBUG,
            NODE_ENV: process.env.NODE_ENV,
        },
        'process.platform': '"browser"',
        __DEV__: 'false',
        global: {},
    },
    build: {
        commonjsOptions: {
            transformMixedEsModules: true,
        },
    },
    esbuildOptions: {
        esbuildOptions: {
            define: {
                global: 'globalThis',
            },
        },
        define: {
            global: 'globalThis',
        },
    },
    optimizeDeps: {
        include: ['@kusto/monaco-kusto/release/esm/kusto.worker', 'monaco-editor/esm/vs/editor/editor.worker'],
    },
});
