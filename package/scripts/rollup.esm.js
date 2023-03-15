import * as path from 'node:path';

import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';

import { banner, extensions, packageFolder } from './lib.js';

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
        // 'languageService': path.join(packageFolder, 'src/languageService.ts'),
        // 'languageServiceNext': path.join(packageFolder, 'src/languageServiceNext.ts')
    },
    preserveEntrySignatures: 'strict',
    plugins: [
        nodeResolve({ extensions }),
        replace({
            objectGuards: true,
            preventAssignment: true,
            // AMD: false,
        }),
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
