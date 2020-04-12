const path = require('path');
const helpers = require('monaco-plugin-helpers');

const REPO_ROOT = path.join(__dirname, '../');

helpers.packageESM({
	repoRoot: REPO_ROOT,
	esmSource: 'out/esm',
	esmDestination: 'release/esm',
	entryPoints: [
		'monaco.contribution.js',
		'kustoMode.js',
		'kusto.worker.js',
	],
	resolveAlias: {
	},
	resolveSkip: [
		'monaco-editor-core'
	],
	destinationFolderSimplification: {
		'node_modules': '_deps',
		'vscode-languageserver-types/lib/esm': 'vscode-languageserver-types',
		'/node_modules/xregexp': 'xregexp',
		'/node_modules/lodash-amd': 'lodash-amd'
	}
});