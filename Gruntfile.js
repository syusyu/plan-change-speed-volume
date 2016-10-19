module.exports = function (grunt) {
    'use strict';
    var path = require('path');
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        bower: {
            install: {
                options: {
                    targetDir: './src',
                    // layout: 'byType',
                    layout: function(type, component) {
                        //type is 'js', 'css', 'fonts', ... etc
                        //component is 'jquery', 'bootstrap', 'font-awesome', .... etc
                        return type === 'js' ? path.join(type, component) : path.join(type);
                    },
                    install: true,
                    verbose: false,
                    cleanTargetDir: false,
                    cleanBowerDir: false
                }
            }
        },
    });
    grunt.loadNpmTasks('grunt-bower-task');
    grunt.registerTask('default', ['bower:install']);
};