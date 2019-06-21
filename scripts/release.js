/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

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
		'vscode-nls': path.join(REPO_ROOT, "out/esm/fillers/vscode-nls.js"),
		'lodash': path.join(REPO_ROOT, "node_modules/lodash/lodash.js"),
		'xregexp': path.join(REPO_ROOT, "node_modules/xregexp/xregexp-all.js")
	},
	resolveSkip: [
		'monaco-editor-core'
	],
	destinationFolderSimplification: {
		'node_modules': '_deps',
		'vscode-languageserver-types/lib/esm': 'vscode-languageserver-types',
		'vscode-uri/lib/esm': 'vscode-uri',
	}
});