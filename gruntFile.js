'use strict';

module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
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
        html: ['dist/views/*.hbs'],
        options: {
            root: './',
            dest: 'dist'
        }
    },
    usemin: {
        html: ['dist/views/*.hbs']
    },
      copy: {
        dist: {
            files: [{
                expand: true,
                dot: true,
                cwd: 'static',
                dest: 'dist/static',
                src: ['**/*.*']
            },
            {
                expand: true,
                dot: true,
                cwd: 'views',
                dest: 'dist/views',
                src: ['**/*.*']
            }]
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
                      cwd: 'dist',
                      dest: 'dist',
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

    grunt.registerTask('default', ['jshint', 'mochacli']);
    grunt.registerTask('test', ['jshint', 'mochacli', 'karma']);
    grunt.registerTask('build', ['clean', 'copy', 'useminPrepare', 'concat', 'uglify', 'filerev', 'usemin', 'clean:tmp']);
};