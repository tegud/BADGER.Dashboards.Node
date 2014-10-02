'use strict';

module.exports = function (grunt) {
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        env: {
            dev: {
                NODE_ENV: 'dev'
            }
        },
        jshint: {
            all: [
                'Gruntfile.js',
                'index.js',
                'lib/*.js',
                'static/js/TicketWizard/**/*.js',
                'test/server/**/*.js',
                'test/client/tests/**/*.js'
            ],
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish')
            }
        },
        mochacli: {
            src: ['test/server/**/*.js'],
            options: {
                timeout: 3000,
                ignoreLeaks: false,
                ui: 'bdd',
                reporter: 'spec'
            }
        },
        karma: {
            unit: {
                configFile: 'test/client/karma.conf.js'
            }
        },
        useminPrepare: {
            css: ['dist/**/*.css'],
            html: ['dist/views/*.hbs'],
            options: {
                root: './',
                dest: 'dist'
            }
        },
        usemin: {
            css: ['dist/static/**/*.css'],
            html: ['dist/views/*.hbs'],
            options: {
                'assetsDirs': ['dist', 'dist/static', 'dist/static/images', 'static/images']
            }
        },
        copy: {
            dist: {
                files: [
                    {
                        expand: true,
                        dot: true,
                        cwd: 'static',
                        dest: 'dist/static',
                        src: ['**/*.{js,css,wav,json,otf,eot,svg,ttf,woff}']
                    }
                ]
            },
            builtTemplates: {
                files: [
                    {
                        expand: true,
                        dot: true,
                        cwd: 'views',
                        dest: 'dist/views',
                        src: ['**/*.hbs']
                    }
                ]
            }
        },
        filerev: {
            options: {
                encoding: 'utf8',
                algorithm: 'md5',
                length: 8
            },
            images: {
                files: [
                    {
                        expand: true,
                        dot: true,
                        cwd: 'static',
                        dest: 'dist/static',
                        src: [
                            '**/*.{jpg,jpeg,gif,png,svg}'
                        ]
                    }
                ]
            },
            js: {
                files: [
                    {
                        expand: true,
                        dot: true,
                        cwd: 'dist',
                        dest: 'dist',
                        src: [
                            '**/*.{js,json}'
                        ]
                    }
                ]
            },
            css: {
                files: [
                    {
                        expand: true,
                        dot: true,
                        cwd: 'dist',
                        dest: 'dist',
                        src: [
                            '**/*.css'
                        ]
                    }
                ]
            }
        },
        clean: {
            dist: {
                files: {
                    src: ['dist']
                }
            },
            tmp: {
                files: {
                    src: ['.tmp']
                }
            }
        }
    });

    grunt.registerTask('default', ['jshint', 'mochacli', 'karma']);
    grunt.registerTask('test', ['jshint', 'mochacli', 'karma']);
    grunt.registerTask('build', ['clean', 'copy', 'useminPrepare', 'concat', 'uglify', 'filerev:images', 'usemin:css', 'filerev:css', 'filerev:js', 'usemin:html', 'clean:tmp']);
    grunt.registerTask('serve', ['env:dev', 'startServer']);

    grunt.registerTask('startServer', 'Starts the application server', function () {
        this.async();

        new require('./index')().start({
            port: 1235
        });
    });
};