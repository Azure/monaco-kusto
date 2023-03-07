import * as path from 'node:path';

import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonJs from '@rollup/plugin-commonjs';

import { banner, extensions, packageFolder } from './lib.js';

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
    /**
     * @param {any} id
     */
    external: /\/node_modules\//,
    input: {
        'monaco.contribution': path.join(packageFolder, 'src/monaco.contribution.ts'),
        'kusto.worker': path.join(packageFolder, 'src/kusto.worker.ts'),
        kustoMode: path.join(packageFolder, 'src/kustoMode.ts'),
    },
    plugins: [
        nodeResolve({ extensions }),
        commonJs(),
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
