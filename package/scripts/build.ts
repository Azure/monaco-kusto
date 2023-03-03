/// <reference types='node' />

import * as cp from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as util from 'node:util';
import { mkdirSync, rmSync } from 'node:fs';
import * as path from 'node:path';

import * as rollup from 'rollup';
import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonJs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

import esmConfig from './rollup.esm.js';
import { banner, packageFolder } from './lib.js';

function createReleaseFolder() {
    const releaseFolder = path.join(packageFolder, './release');
    try {
        mkdirSync(releaseFolder);
    } catch (e) {
        if (e instanceof Error && (e as any).code === 'EEXIST') {
            rmSync(releaseFolder, { recursive: true });
            mkdirSync(releaseFolder);
        }
    }
}

async function copyRunTimeDepsToOut() {
    const languageServiceFiles = [
        ['@kusto/language-service/Kusto.JavaScript.Client.min.js', './release/min/kusto.javascript.client.min.js'],
        ['@kusto/language-service-next/Kusto.Language.Bridge.min.js', './release/min/Kusto.Language.Bridge.min.js'],
        ['@kusto/language-service/bridge.min.js', './release/min/bridge.min.js'],
        ['@kusto/language-service/newtonsoft.json.min.js', './release/min/newtonsoft.json.min.js'],
    ];

    for (const [from, to] of languageServiceFiles) {
        await fs.cp(require.resolve(from), path.join(packageFolder, to));
    }
}

const extensions = ['.js', '.ts'];

async function compileAMD(type: 'dev' | 'min') {
    compileOneAMD(type, 'monaco.contribution.ts', [path.join(packageFolder, 'src/kustoMode.ts')]);
    compileOneAMD(type, 'kustoWorker.ts');
    compileOneAMD(type, 'kustoMode.ts');
}

interface CompileOneAMDOptions extends rollup.RollupOptions {
    type: 'dev' | 'min';
    external?: string[];
}

async function compileOneAMD(type: string, input: string, external: string[] = []) {
    const bundle = await rollup.rollup({
        external: ['monaco-editor-core', ...external],
        input: path.join(packageFolder, 'src', input),
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
    });
    try {
        await bundle.write({
            banner,
            format: 'amd',
            amd: { autoId: true, basePath: 'vs/language/kusto' },
            dir: path.join(packageFolder, 'release', type),
            globals: {
                'monaco-editor-core': 'monaco',
            },
            paths: { [path.join(packageFolder, 'src/kustoMode')]: 'vs/language/kusto/kustoMode' },
        });
    } finally {
        await bundle.close();
    }
}

async function compileESM() {
    const { output, ...options } = esmConfig;
    const bundle = await rollup.rollup(options);
    try {
        await bundle.write(output as rollup.OutputOptions);
    } finally {
        await bundle.close();
    }
}

const exec = (command: string) =>
    util
        .promisify(cp.exec)(command, { cwd: packageFolder })
        .then((res) => {
            console.log(res.stdout);
            console.error(res.stdout);
        });

async function compileTypes() {
    await Promise.all([
        exec('yarn tsc -p ./scripts/tsconfig.amd.json').then(() =>
            Promise.all([
                fs.cp(path.join(__dirname, '../out/dev'), path.join(__dirname, '../release/min'), { recursive: true }),
                fs.cp(path.join(__dirname, '../out/dev'), path.join(__dirname, '../release/dev'), { recursive: true }),
            ])
        ),
        exec('yarn tsc -p ./scripts/tsconfig.esm.json'),
        // copy file so it's relative position to the generated delegation files matches that of the source code. We need to do this because that's how tsc adds it's `/// <reference type="" />
        fs.cp(path.join(__dirname, '../monaco.d.ts'), path.join(__dirname, '../release/monaco.d.ts')),
    ]);
}

async function main() {
    createReleaseFolder();
    await Promise.all([
        // copyRunTimeDepsToOut(),
        compileESM(),
        // compileAMD('dev'),
        // compileAMD('min'),
        // compileTypes()
    ]);
}

main();
