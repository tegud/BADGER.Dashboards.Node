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
    }
  });

    grunt.registerTask('default', ['jshint', 'mochacli']);
    grunt.registerTask('test', ['jshint', 'mochacli', 'karma']);
};