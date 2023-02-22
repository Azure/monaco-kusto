const cp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const packageFolder = path.join(__dirname, '..');

const releaseFolder = path.join(packageFolder, './release');

try {
    fs.mkdirSync(releaseFolder);
} catch (e) {
    if (e instanceof Error && e.code === 'EEXIST') {
        fs.rmSync(releaseFolder, { recursive: true });
        fs.mkdirSync(releaseFolder);
    }
}

cp.execSync('yarn exec tsc -p ./tsconfig.json && tsc -p ./tsconfig.esm.json', { cwd: packageFolder, stdio: 'inherit' });

cp.execSync('node ./scripts/release.js', { cwd: packageFolder, stdio: 'inherit' });

cp.execSync('node ./scripts/bundle.js', { cwd: packageFolder, stdio: 'inherit' });

cp.execSync('yarn exec "mcopy ./node_modules/@kusto/language-service/Kusto.JavaScript.Client.min.js ./out/vs/language/kusto/kusto.javascript.client.min.js && mcopy ./node_modules/@kusto/language-service-next/Kusto.Language.Bridge.min.js ./out/vs/language/kusto/Kusto.Language.Bridge.min.js && mcopy ./node_modules/@kusto/language-service/bridge.min.js ./out/vs/language/kusto/bridge.min.js && node ./node_modules/copy-dir-cli/bin/copy ./node_modules/monaco-editor-core/dev/vs ./out/vs"', { cwd: packageFolder, stdio: 'inherit' });

cp.execFile(
    'yarn exec "mcopy ./src/monaco.d.ts ./release/esm/monaco.d.ts && mcopy ./out/amd/monaco.contribution.d.ts ./release/esm/monaco.contribution.d.ts && mcopy ./src/monaco.d.ts ./release/min/monaco.d.ts && mcopy ./out/amd/monaco.contribution.d.ts ./release/min/monaco.contribution.d.ts && mcopy ./node_modules/@kusto/language-service/Kusto.JavaScript.Client.min.js  ./release/min/kusto.javascript.client.min.js && mcopy ./node_modules/@kusto/language-service-next/Kusto.Language.Bridge.min.js ./release/min/Kusto.Language.Bridge.min.js && mcopy ./node_modules/@kusto/language-service/bridge.min.js ./release/min/bridge.min.js && mcopy ./node_modules/@kusto/language-service/newtonsoft.json.min.js ./release/min/newtonsoft.json.min.js"'
);
