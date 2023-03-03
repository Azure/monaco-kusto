import * as cp from 'node:child_process';
import * as path from 'node:path';
import { readFileSync } from 'node:fs';

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

export const extensions = ['.js', '.ts'];
