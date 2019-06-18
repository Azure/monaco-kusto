const requirejs = require('requirejs');
const path = require('path');
const fs = require('fs');
const UglifyJS = require("uglify-js");
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
	' * https://github.com/Microsoft/monaco-kusto/blob/master/LICENSE.md',
	' *-----------------------------------------------------------------------------*/',
	''
].join('\n');

bundleOne('monaco.contribution');
bundleOne('kustoMode');
bundleOne('kustoWorker');

function bundleOne(moduleId, exclude) {
	requirejs.optimize({
		baseUrl: 'out/amd/',
		name: 'vs/language/kusto/' + moduleId,
		out: 'release/dev/' + moduleId + '.js',
		exclude: exclude,
		paths: {
			'vs/language/kusto': REPO_ROOT + '/out/amd'
		},
		optimize: 'none',
		packages: [{
			name: 'vscode-languageserver-types',
			location: path.join(REPO_ROOT, 'node_modules/vscode-languageserver-types/lib/umd'),
			main: 'main'
		}, {
			name: 'vscode-uri',
			location: path.join(REPO_ROOT, 'node_modules/vscode-uri/lib/umd'),
			main: 'index'
		}, {
			name: 'vscode-nls',
			location: path.join(REPO_ROOT, '/out/amd/fillers'),
			main: 'vscode-nls'
		}, {
            name: 'xregexp',
            location: path.join(REPO_ROOT, 'node_modules/xregexp'),
            main: 'xregexp-all.js'
        }, {
            name: 'lodash',
            location: path.join(REPO_ROOT, 'node_modules/lodash'),
            main: 'lodash.js'
        }]
	}, function (buildResponse) {
		const devFilePath = path.join(REPO_ROOT, 'release/dev/' + moduleId + '.js');
		const minFilePath = path.join(REPO_ROOT, 'release/min/' + moduleId + '.js');
		const fileContents = fs.readFileSync(devFilePath).toString();
		console.log();
		console.log(`Minifying ${devFilePath}...`);
		const result = UglifyJS.minify(fileContents, {
			output: {
				comments: 'some'
			}
		});
		console.log(`Done.`);
		try { fs.mkdirSync(path.join(REPO_ROOT, 'release/min')) } catch (err) { }
		fs.writeFileSync(minFilePath, BUNDLED_FILE_HEADER + result.code);
	})
}
