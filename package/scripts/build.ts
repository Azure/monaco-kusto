/// <reference types='node' />

import * as cp from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as util from 'node:util';
import { mkdirSync, rmSync } from 'node:fs';
import * as path from 'node:path';

import * as rollup from 'rollup';

import esmConfig from './rollup.esm.js';
import { copyLanguageServerFiles, packageFolder, rollupAMDConfig, rollupAMDOutput } from './lib.js';

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

async function compileAMD() {
    const bundle = await rollup.rollup(rollupAMDConfig);
    try {
        await Promise.all([bundle.write(rollupAMDOutput('dev')), bundle.write(rollupAMDOutput('min'))]);
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

function exec(command: string) {
    return util
        .promisify(cp.exec)(command, { cwd: packageFolder })
        .then((res) => {
            process.stdout.write(res.stdout);
            process.stderr.write(res.stderr);
        });
}

async function compileTypes() {
    await Promise.all([
        exec('yarn tsc -p ./scripts/tsconfig.build.json'),

        // copy file so it's relative position to the generated delegation files
        // matches that of the source code. We need to do this because that's
        // how tsc adds it's `/// <reference type="" />
        fs.cp(path.join(__dirname, '../monaco.d.ts'), path.join(__dirname, '../release/monaco.d.ts')),
    ]);
}

async function main() {
    createReleaseFolder();
    await Promise.all([
        copyLanguageServerFiles('release/min'),
        copyLanguageServerFiles('release/dev'),
        compileESM(),
        compileAMD(),
        compileTypes(),
    ]);
}

main();
