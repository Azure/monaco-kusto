/// <reference types='node' />

import * as cp from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as util from 'node:util';
import { mkdirSync, rmSync } from 'node:fs';
import * as path from 'node:path';

import * as rollup from 'rollup';

import esmConfig, { rollupAMDConfig } from './rollup.esm.js';
import { copyRunTimeDepsToOut, packageFolder } from './lib.js';

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

async function compileAMD(type: 'dev' | 'min') {
    const { output, ...config } = rollupAMDConfig(type);
    const bundle = await rollup.rollup(config);
    try {
        await bundle.write(output as rollup.OutputOptions);
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
                fs.cp(path.join(__dirname, '../out/types'), path.join(__dirname, '../release/min'), { recursive: true }),
                fs.cp(path.join(__dirname, '../out/types'), path.join(__dirname, '../release/dev'), { recursive: true }),
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
        copyRunTimeDepsToOut('release/min'),
        compileESM(),
        compileAMD('dev'),
        compileAMD('min'),
        compileTypes()
    ]);
}

main();
