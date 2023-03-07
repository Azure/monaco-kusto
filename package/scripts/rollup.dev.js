import * as path from 'node:path';

import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonJs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

import { banner, extensions, packageFolder } from './lib.js';

const entryPointsAMD = ['kustoMode', 'kustoWorker', 'monaco.contribution'];

/**
 * @param {'dev' | 'min'} type
 * @returns {import('rollup').RollupOptions}
 */
export function rollupAMDConfig(type) {
    return {
        external: ['monaco-editor-core'],
        input: Object.fromEntries(entryPointsAMD.map((e) => [e, path.join(packageFolder, 'src', e + '.ts')])),
        plugins: [
            nodeResolve({ extensions }),
            commonJs(),
            babel({
                extensions,
                babelHelpers: 'inline',
                presets: [['@babel/preset-env', { targets: { ie: 11 } }], '@babel/preset-typescript'],
            }),
            type === 'min' && terser(),
        ],
        output: {
            name: 'test',
            banner,
            format: 'amd',
            amd: { autoId: true, basePath: 'vs/language/kusto' },
            dir: path.join(packageFolder, 'release', type),
            globals: {
                'monaco-editor-core': 'monaco',
            },
            sourcemap: !process.env.CI,
        },
    };
}

export default rollupAMDConfig('dev');
