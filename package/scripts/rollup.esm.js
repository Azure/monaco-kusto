import * as path from 'node:path';

import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import virtual from '@rollup/plugin-virtual';

import { banner, extensions, packageFolder } from './lib.js';

const ESM_WORKER_LANGUAGE_SERVER_IMPORT = [
    `import '@kusto/language-service/bridge.min';`,
    `import '@kusto/language-service/Kusto.JavaScript.Client.min';`,
    `import '@kusto/language-service/newtonsoft.json.min';`,
    `import '@kusto/language-service-next/Kusto.Language.Bridge.min';`,
].join('\n');

/**
 * Bundles, but doesn't do any transpiling or minifying. Expectation is that
 * consumers will be doing their own minifying and bundling.
 *
 * @type {import('rollup').RollupOptions}
 */
const config = {
    external: /\/node_modules\//,
    input: {
        'monaco.contribution': path.join(packageFolder, 'src/monaco.contribution.ts'),
        'kusto.worker': path.join(packageFolder, 'src/kusto.worker.ts'),
        kustoMode: path.join(packageFolder, 'src/kustoMode.ts'),
    },
    preserveEntrySignatures: 'strict',
    plugins: [
        virtual({
            'language-service': ESM_WORKER_LANGUAGE_SERVER_IMPORT,
        }),
        replace({
            objectGuards: true,
            preventAssignment: true,
        }),
        nodeResolve({ extensions }),
        babel({ extensions, babelHelpers: 'bundled', presets: ['@babel/preset-typescript'] }),
    ],
    output: {
        banner,
        format: 'es',
        dir: path.join(packageFolder, 'release/esm'),
        generatedCode: 'es2015',
        sourcemap: !process.env.CI,
    },
};

export default config;
