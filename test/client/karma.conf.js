module.exports = function(config) {
    config.set({
        basePath: '../..',
        frameworks: ['mocha'],
        files: [
            'static/js/lib/TLRGRP.core.js',
            'static/js/lib/nanomachine.js',
            'static/js/lib/lodash.js',
            'static/js/lib/mustache.js',
            'static/js/lib/jquery-2.0.0.js',
            'static/js/BADGER/**/*.js',
            'test/client/tests/**/*.js',
            'test/client/lib/expect.js',
            'test/client/lib/TLRGRP.Core.Testing.js'
        ],
        exclude: [],
        reporters: ['progress'],
        port: 9876,
        colors: true,
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_ERROR,
        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,
        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['PhantomJS'],
        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: true
    });
};