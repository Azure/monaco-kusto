/// <reference types='node' />

// import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import * as rollup from 'rollup';
import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonJs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';


const packageFolder = path.join(__dirname, '..');

const pkg = JSON.parse(fs.readFileSync(path.resolve(packageFolder, 'package.json')).toString());

const extensions = ['.js', '.ts'];

const input: rollup.InputOption = {
    'monaco.contribution': path.join(packageFolder, 'src/monaco.contribution.ts'),
    kustoWorker: path.join(packageFolder, 'src/kusto.worker.ts'),
    kustoMode: path.join(packageFolder, 'src/kustoMode.ts'),
    'Kusto.Language.Bridge': require.resolve('@kusto/language-service-next/Kusto.Language.Bridge'),
    bridge: require.resolve('@kusto/language-service/bridge'),
    'newtonsoft.json': require.resolve('@kusto/language-service/newtonsoft.json'),
    'kusto.javascript.client': require.resolve('@kusto/language-service/Kusto.JavaScript.Client.min'),
};

async function compileAMD(type: 'dev' | 'min') {
    const bundle = await rollup.rollup({
        external: ['monaco-editor-core'],
        input,
        plugins: [
            nodeResolve({ extensions }),
            commonJs(),
            babel({
                extensions,
                babelHelpers: 'bundled',
                presets: ['@babel/preset-typescript', ['@babel/preset-env', { targets: { ie: 11 } }]],
            }),
            type === 'min' && terser(),
        ],
    });
    try {
        await bundle.write({
            format: 'amd',
            dir: path.join(packageFolder, 'release', type),
            globals: {
                'monaco-editor-core': 'monaco',
            },
        });
    } finally {
        await bundle.close();
    }
}

// function createReleaseFolder() {
//     const releaseFolder = path.join(packageFolder, './release');
//     try {
//         fs.mkdirSync(releaseFolder);
//     } catch (e) {
//         if (e instanceof Error && (e as any).code === 'EEXIST') {
//             fs.rmSync(releaseFolder, { recursive: true });
//             fs.mkdirSync(releaseFolder);
//         }
//     }
// }

async function compileESM() {
    const bundle = await rollup.rollup({
        external: ['monaco-editor-core', ...Object.keys(pkg.dependencies)],
        input,
        plugins: [
            nodeResolve({ extensions }),
            commonJs(),
            babel({ extensions, babelHelpers: 'bundled', presets: ['@babel/preset-typescript'] }),
        ],
    });
    try {
        await bundle.write({
            format: 'es',
            dir: path.join(packageFolder, 'release/esm'),
            globals: {
                'monaco-editor-core': 'monaco',
            },
        });
    } finally {
        await bundle.close();
    }
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
    // fs.cpSync(
    //     require.resolve('@kusto/language-service/Kusto.JavaScript.Client.min.js'),
    //     path.join(packageFolder, './release/min/kusto.javascript.client.min.js')
    // );
    // fs.cpSync(
    //     require.resolve('@kusto/language-service-next/Kusto.Language.Bridge.min.js'),
    //     path.join(packageFolder, './release/min/Kusto.Language.Bridge.min.js')
    // );
    // fs.cpSync(
    //     require.resolve('@kusto/language-service/bridge.min.js'),
    //     path.join(packageFolder, './release/min/bridge.min.js')
    // );
    // fs.cpSync(
    //     require.resolve('@kusto/language-service/newtonsoft.json.min.js'),
    //     path.join(packageFolder, '/release/min/newtonsoft.json.min.js')
    // );
}

// createReleaseFolder();
// compile();

async function main() {
    await compileESM()
    // await Promise.all([compileESM(), compileAMD('dev'), compileAMD('min')]);
}

main();

// cp.execSync('node ./scripts/release.js', { cwd: packageFolder, stdio: 'inherit' });
// cp.execSync('node ./scripts/bundle.js', { cwd: packageFolder, stdio: 'inherit' });
// copyRunTimeDepsToOut();
// copyTypesToRelease();
