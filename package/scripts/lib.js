import * as cp from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';

import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonJs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export const packageFolder = path.join(__dirname, '..');
export const pkg = JSON.parse(readFileSync(path.resolve(packageFolder, 'package.json')).toString());

const sha1 = String(cp.execSync('git rev-parse HEAD')).split('\n')[0];
const headerVersion = pkg.version + '(' + sha1 + ')';
export const banner = [
    '/*!-----------------------------------------------------------------------------',
    ' * Copyright (c) Microsoft Corporation. All rights reserved.',
    ' * monaco-kusto version: ' + headerVersion,
    ' * Released under the MIT license',
    ' * https://https://github.com/Azure/monaco-kusto/blob/master/README.md',
    ' *-----------------------------------------------------------------------------*/',
    '',
].join('\n');

/**
 * Currently AMD builds require these files to be in a specific spot at
 * runtime. See `requireScripts` in kustoWorker.ts
 *
 * @param {string} target
 */
export async function copyRunTimeDepsToOut(target) {
    const languageServiceFiles = [
        ['@kusto/language-service/Kusto.JavaScript.Client.min.js', 'kusto.javascript.client.min.js'],
        ['@kusto/language-service/bridge.min.js', 'bridge.min.js'],
        ['@kusto/language-service/newtonsoft.json.min.js', 'newtonsoft.json.min.js'],
        ['@kusto/language-service-next/Kusto.Language.Bridge.min.js', 'Kusto.Language.Bridge.min.js'],
    ];

    for (const [from, to] of languageServiceFiles) {
        await fs.cp(require.resolve(from), path.join(packageFolder, target, 'language/kusto', to));
    }
}

export const extensions = ['.js', '.ts'];

const entryPointsAMD = ['kustoMode', 'kustoWorker', 'monaco.contribution'];

/**
 * Non-dev builds are minified, bundled, and transpiled so they can be consumed
 * directly, without the consumers running their own bundler or transpiler.
 *
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
