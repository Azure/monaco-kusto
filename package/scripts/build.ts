/// <reference types='node' />

import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const packageFolder = path.join(__dirname, '..');

function createReleaseFolder() {
    const releaseFolder = path.join(packageFolder, './release');
    try {
        fs.mkdirSync(releaseFolder);
    } catch (e) {
        if (e instanceof Error && (e as any).code === 'EEXIST') {
            fs.rmSync(releaseFolder, { recursive: true });
            fs.mkdirSync(releaseFolder);
        }
    }
}

function compile() {
    cp.execSync('yarn exec tsc -p ./tsconfig.json && tsc -p ./tsconfig.esm.json', {
        cwd: packageFolder,
        stdio: 'inherit',
    });
}

function copyRunTimeDepsToOut() {
    const languageServiceFiles = [
        [
            '@kusto/language-service/Kusto.JavaScript.Client.min.js',
            './out/vs/language/kusto/kusto.javascript.client.min.js',
        ],
        [
            '@kusto/language-service-next/Kusto.Language.Bridge.min.js',
            './out/vs/language/kusto/Kusto.Language.Bridge.min.js',
        ],
        ['@kusto/language-service/bridge.min.js', './out/vs/language/kusto/bridge.min.js'],
    ];

    for (const [from, to] of languageServiceFiles) {
        fs.cpSync(require.resolve(from), path.join(packageFolder, to));
    }

    fs.cpSync(
        path.dirname(require.resolve('monaco-editor-core/dev/vs/loader.js')),
        path.join(packageFolder, './out/vs'),
        { recursive: true }
    );
}

function copyTypesToRelease() {
    fs.cpSync(path.join(packageFolder, '/src/monaco.d.ts'), path.join(packageFolder, './release/esm/monaco.d.ts'));
    fs.cpSync(
        path.join(packageFolder, './out/amd/monaco.contribution.d.ts'),
        path.join(packageFolder, './release/esm/monaco.contribution.d.ts')
    );
    fs.cpSync(path.join(packageFolder, '/src/monaco.d.ts'), path.join(packageFolder, './release/min/monaco.d.ts'));
    fs.cpSync(
        path.join(packageFolder, './out/amd/monaco.contribution.d.ts'),
        path.join(packageFolder, './release/min/monaco.contribution.d.ts')
    );
    fs.cpSync(
        require.resolve('@kusto/language-service/Kusto.JavaScript.Client.min.js'),
        path.join(packageFolder, './release/min/kusto.javascript.client.min.js')
    );
    fs.cpSync(
        require.resolve('@kusto/language-service-next/Kusto.Language.Bridge.min.js'),
        path.join(packageFolder, './release/min/Kusto.Language.Bridge.min.js')
    );
    fs.cpSync(
        require.resolve('@kusto/language-service/bridge.min.js'),
        path.join(packageFolder, './release/min/bridge.min.js')
    );
    fs.cpSync(
        require.resolve('@kusto/language-service/newtonsoft.json.min.js'),
        path.join(packageFolder, '/release/min/newtonsoft.json.min.js')
    );
}

createReleaseFolder();
compile();
cp.execSync('node ./scripts/release.js', { cwd: packageFolder, stdio: 'inherit' });
cp.execSync('node ./scripts/bundle.js', { cwd: packageFolder, stdio: 'inherit' });
copyRunTimeDepsToOut();
copyTypesToRelease();
