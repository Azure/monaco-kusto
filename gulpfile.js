var gulp = require('gulp');
var tsb = require('gulp-tsb');
var fs = require('fs');
var path = require('path');
var merge = require('merge-stream');
var rjs = require('gulp-requirejs');
var uglify = require('gulp-uglify');
var rimraf = require('rimraf');
var es = require('event-stream');

gulp.task('clean-release', function(cb) { rimraf('release', { maxBusyTries: 1 }, cb); });
gulp.task('release', ['clean-release','compile'], function() {
	function bundleOne(moduleId, exclude) {
		return rjs({
			baseUrl: '/out/',
			name: 'vs/language/kusto/' + moduleId,
			out: moduleId + '.js',
			exclude: exclude,
			paths: {
				'vs/language/kusto': __dirname + '/out'
			},
			packages: [{
				name: 'vscode-languageserver-types',
				location: __dirname + '/node_modules/vscode-languageserver-types/lib/umd',
				main: 'main'
			}, {
				name: 'xregexp',
				location: __dirname + '/node_modules/xregexp',
				main: 'xregexp-all.js'
			}, {
				name: 'lodash',
				location: __dirname + '/node_modules/lodash',
				main: 'lodash.js'
			}]
		})
	}

	return merge(
		merge(
			bundleOne('monaco.contribution', ['vs/language/kusto/kustoMode']),
			bundleOne('kustoMode'),
			bundleOne('kustoWorker')
		)
		.pipe(es.through(function(data) {
			data.contents = new Buffer(
				data.contents.toString()
			);
			this.emit('data', data);
		}))
		.pipe(gulp.dest('./release/dev'))
		.pipe(uglify({
			preserveComments: 'some'
		}))
		.pipe(gulp.dest('./release/min')),
		gulp.src('src/monaco.d.ts').pipe(gulp.dest('./release/min')),
		gulp.src('out/monaco.contribution.d.ts').pipe(gulp.dest('./release/min')),
		gulp.src('node_modules/@kusto/language-service/kusto.javascript.client.js').pipe(gulp.dest('./release/min')),
		gulp.src('node_modules/@kusto/language-service-next/Kusto.Language.Bridge.js').pipe(gulp.dest('./release/min')),
		gulp.src('node_modules/@kusto/language-service/bridge.js').pipe(gulp.dest('./release/min')),
		gulp.src('node_modules/@kusto/language-service/newtonsoft.json.js').pipe(gulp.dest('./release/min'))
	);
});


var compilation = tsb.create(Object.assign({ verbose: true }, require('./src/tsconfig.json').compilerOptions));

var tsSources = 'src/**/*.ts';

function compileTask() {
	return merge(
		gulp.src(tsSources).pipe(compilation())
	)
	.pipe(gulp.dest('out'));
}

gulp.task('clean-out', function(cb) { rimraf('out', { maxBusyTries: 1 }, cb); });
gulp.task('compile', ['clean-out'], compileTask);
gulp.task('compile-without-clean', compileTask);
gulp.task('watch', ['compile'], function() {
	gulp.watch(tsSources, ['compile-without-clean']);
});