import * as cp from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

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
