const requirejs = require('requirejs');
const path = require('path');
const fs = require('fs');
const Terser = require("terser");
const helpers = require('monaco-plugin-helpers');

const REPO_ROOT = path.resolve(__dirname, '..');

const sha1 = helpers.getGitVersion(REPO_ROOT);
const semver = require('../package.json').version;
const headerVersion = semver + '(' + sha1 + ')';

const BUNDLED_FILE_HEADER = [
	'/*!-----------------------------------------------------------------------------',
	' * Copyright (c) Microsoft Corporation. All rights reserved.',
	' * monaco-kusto version: ' + headerVersion,
	' * Released under the MIT license',
	' * https://https://github.com/Azure/monaco-kusto/blob/master/README.md',
	' *-----------------------------------------------------------------------------*/',
	''
].join('\n');

bundleOne('monaco.contribution', ['kustoMode']),
bundleOne('kustoMode'),
bundleOne('kustoWorker')

function bundleOne(moduleId, exclude) {
	requirejs.optimize({
		baseUrl: '../',
		name: 'out/amd/' + moduleId,
		out: 'release/dev/' + moduleId + '.js',
		exclude: exclude ? exclude.map(function (file) { return 'out/amd/' + file }) : [],
		paths: {
			'out/amd': REPO_ROOT + '/out/amd'
		},
		optimize: 'none',
		packages: [{
			name: 'vscode-languageserver-types',
			location: path.join(REPO_ROOT, '/node_modules/vscode-languageserver-types/lib/umd'),
			main: 'main'
		}, {
			name: 'xregexp',
			location: path.join(REPO_ROOT, '/node_modules/xregexp'),
			main: 'xregexp-all.js'
		}, {
			name: 'lodash.debounce',
			location: path.join(REPO_ROOT, '/node_modules/lodash.debounce'),
			main: 'index.js'
		}]
	}, function (buildResponse) {
		const devFilePath = path.join(REPO_ROOT, 'release/dev/' + moduleId + '.js');
		const minFilePath = path.join(REPO_ROOT, 'release/min/' + moduleId + '.js');
		const fileContents = fs.readFileSync(devFilePath).toString();
		console.log();
		console.log(`Minifying ${devFilePath}...`);
		const result = Terser.minify(fileContents, {
			output: {
				comments: 'some'
			}
		});
		console.log(`Done.`);
		try { fs.mkdirSync(path.join(REPO_ROOT, 'release/min')) } catch (err) { }
		fs.writeFileSync(minFilePath, BUNDLED_FILE_HEADER + result.code);
	})
}
