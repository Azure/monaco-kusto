import * as cp from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';

import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonJs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';
import alias from '@rollup/plugin-alias';

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
        await fs.cp(require.resolve(from), path.join(packageFolder, target, to));
    }
}

export const extensions = ['.js', '.ts'];

const entryPointsAMD = ['kustoMode', 'kustoWorker', 'monaco.contribution'];

/**
 * @type { import('rollup').RollupOptions }
 */
export const rollupAMDConfig = {
    input: Object.fromEntries(entryPointsAMD.map((e) => [e, path.join(packageFolder, 'src', e + '.ts')])),
    preserveEntrySignatures: 'strict',
    external: ['vs/editor/editor.main'],
    plugins: [
        alias({
            entries: { ['monaco-editor']: 'vs/editor/editor.main' },
            // customResolver(source) {
            //     console.log({ source });
            //     return null;
            // },
        }),
        nodeResolve({ extensions }),
        // alias({
        //     entries: {
        //         [path.join(packageFolder, 'src/languageService/languageService.ts')]: path.join(
        //             packageFolder,
        //             'src/languageService/languageServiceAMD.ts'
        //         ),
        //     },
        // }),
        replace({
            objectGuards: true,
            preventAssignment: true,
            'Bridge.isNode': false, // By replacing this value, rollup with evaluate `if (Bridge.isNode)` at compile time, so `require()` imports never happen
            // AMD: true,
        }),
        commonJs(), // Required to bundle xregexp
        babel({
            extensions,
            babelHelpers: 'inline',
            presets: [['@babel/preset-env', { targets: { ie: 11 } }], '@babel/preset-typescript'],
        }),
    ],
};

/**
 *
 * Non-dev builds are minified, bundled, and transpiled so they can be consumed
 * directly, without the consumers running their own bundler or transpiler.
 *
 * @param { 'dev' | 'min' } type
 * @returns { import('rollup').OutputOptions }
 */
export function rollupAMDOutput(type) {
    return {
        name: 'test',
        banner,
        format: 'amd',
        amd: { autoId: true, basePath: 'vs/language/kusto' },
        dir: path.join(packageFolder, 'release', type),
        sourcemap: !process.env.CI,
        plugins: [type === 'min' && terser()],
    };
}
