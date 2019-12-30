var gulp = require('gulp');
var tsb = require('gulp-tsb');
var fs = require('fs');
var path = require('path');
var merge = require('merge-stream');
var rjs = require('gulp-requirejs');
var uglify = require('gulp-uglify');
var rimraf = require('rimraf');
var es = require('event-stream');
var notify = require('gulp-notify');

gulp.task('clean-release', function(cb) {
    rimraf('release/*', { maxBusyTries: 1 }, cb);
});
gulp.task('clean-bundle', function(cb) {
    rimraf('out/bundle', { maxBusyTries: 1 }, cb);
});

gulp.task('bundles', ['compile-without-clean', 'clean-release', 'clean-bundle'], function(cb) {
    function bundleOne(moduleId, exclude, cb1) {
        rjs({
            baseUrl: '/out/',
            name: 'vs/language/kusto/' + moduleId,
            out: moduleId + '.js',
            exclude: exclude,
            paths: {
                'vs/language/kusto': __dirname + '/out'
            },
            packages: [
                {
                    name: 'vscode-languageserver-types',
                    location: __dirname + '/node_modules/vscode-languageserver-types/lib/umd',
                    main: 'main'
                },
                {
                    name: 'xregexp',
                    location: __dirname + '/node_modules/xregexp',
                    main: 'xregexp-all.js'
                },
                {
                    name: 'lodash',
                    location: __dirname + '/node_modules/lodash',
                    main: 'lodash.js'
                }
            ]
        })
            .pipe(gulp.dest('./out/bundle/'))
            .pipe(
                notify(function() {
                    if (cb1) cb1();
                    return 'done  ' + moduleId;
                })
            );
    }
    bundleOne('monaco.contribution', ['vs/language/kusto/kustoMode']);
    bundleOne('kustoMode');
    bundleOne('kustoWorker', [], cb);
});
gulp.task('release', ['clean-out', 'releasePack']);

gulp.task('releasePack', ['bundles'], function() {
    return merge(
        gulp
            .src('./out/bundle/*')
            .pipe(
                es.through(function(data) {
                    data.contents = new Buffer(data.contents.toString());
                    this.emit('data', data);
                })
            )
            .pipe(gulp.dest('./release/dev'))
            .pipe(
                uglify({
                    preserveComments: 'some'
                })
            )
            .pipe(gulp.dest('./release/min')),
        gulp.src('src/monaco.d.ts').pipe(gulp.dest('./release/min')),
        gulp.src('out/monaco.contribution.d.ts').pipe(gulp.dest('./release/min')),
        gulp
            .src('node_modules/@kusto/language-service/kusto.javascript.client.min.js')
            .pipe(gulp.dest('./release/min')),
        gulp
            .src('node_modules/@kusto/language-service-next/Kusto.Language.Bridge.min.js')
            .pipe(gulp.dest('./release/min')),
        gulp.src('node_modules/@kusto/language-service/bridge.min.js').pipe(gulp.dest('./release/min')),
        gulp.src('node_modules/@kusto/language-service/newtonsoft.json.min.js').pipe(gulp.dest('./release/min'))
    );
});
var compilation = tsb.create(Object.assign({ verbose: true }, require('./src/tsconfig.json').compilerOptions));

var tsSources = 'src/**/*.ts';

function compileTask() {
    return merge(gulp.src(tsSources).pipe(compilation())).pipe(gulp.dest('out'));
}

gulp.task('clean-out', function(cb) {
    rimraf('out', { maxBusyTries: 1 }, cb);
});
gulp.task('compile', ['clean-out'], compileTask);
gulp.task('compile-without-clean', compileTask);
gulp.task('watch', ['release'], function() {
    gulp.watch(tsSources, ['releasePack']);
});
