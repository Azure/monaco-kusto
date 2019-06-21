// When / if this will be bundled with monaco-editor (or monaco-languages) this won't be necessary (since it's been done there centrally).
// but for now, we need to rewrite modules into namespaces when publishing our d.ts file.

const path = require('path');
const fs = require('fs');
const REPO_ROOT = path.resolve(__dirname, '..');

rewriteDts();

function rewriteDts() {
	const dtsPath = path.join(REPO_ROOT, 'src/monaco.d.ts');
	const originalText = fs.readFileSync(dtsPath).toString();
	modifiedText = originalText.replace(/declare module monaco./g, 'export declare namespace ');
	const destFolder = path.join(REPO_ROOT, 'release/min/');
	const destPath = path.join(destFolder, 'monaco-kusto.d.ts');
	fs.mkdirSync(destFolder, {recursive: true});
	fs.writeFileSync(destPath, modifiedText, {flag: 'w'});
}