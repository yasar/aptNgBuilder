module.exports = function (grunt) {

    var _ = require('lodash');

    // Load required Grunt tasks. These are installed based on the versions listed
    // * in 'package.json' when you do 'npm install' in this directory.
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-html2js');


    /** ********************************************************************************* */
    /** **************************** File Config **************************************** */
    var fileConfig = {
        build_dir  : 'build',
        compile_dir: 'bin',

        /**
         * This is a collection of file patterns for our app code (the
         * stuff in 'src/'). These paths are used in the configuration of
         * build tasks. 'js' is all project javascript, except tests.
         * 'commonTemplates' contains our reusable components' ('src/common')
         * template HTML files, while 'appTemplates' contains the templates for
         * our app's code. 'html' is just our main HTML file. 'less' is our main
         * stylesheet, and 'unit' contains our app's unit tests.
         */
        app_files: {
            js          : ['./src/**/*.js'],
            appTemplates: ['src/**/*.tpl.html'],
        },

    };

    /** ********************************************************************************* */
    /** **************************** Task Config **************************************** */
    var taskConfig = {
        pkg: grunt.file.readJSON("package.json"),

        /**
         * The banner is the comment that is placed at the top of our compiled
         * source files. It is first processed as a Grunt template, where the '<%='
         * pairs are evaluated based on this very configuration object.
         */
        meta: {
            banner: '/**\n' +
                    ' * <%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
                    ' *\n' +
                    ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
                    ' */\n'
        },

        /**
         * The directories to delete when 'grunt clean' is executed.
         */
        clean: {
            all: [
                '<%= build_dir %>',
                '<%= compile_dir %>'
            ]
        },

        /**
         * The 'copy' task just copies files from A to B. We use it here to copy
         * our project assets (images, fonts, etc.) and javascripts into
         * 'build_dir', and then to copy the assets to 'compile_dir'.
         */
        copy: {
            build_appjs: {
                files: [
                    {
                        src   : ['<%= app_files.js %>'],
                        dest  : '<%= build_dir %>/',
                        cwd   : '.',
                        expand: true
                    }
                ]
            }
        },

        /**
         * 'grunt concat' concatenates multiple source files into a single file.
         */
        concat: {
            // The 'compile_js' target concatenates app and vendor js code together.
            compile_js: {
                options: {
                    banner: '<%= meta.banner %>'
                },
                src    : [
                    'module.prefix',
                    '<%= build_dir %>/src/**/*.js',
                    '<%= html2js.app.dest %>',
                    'module.suffix'
                ],
                dest   : '<%= compile_dir %>/<%= pkg.name %>-<%= pkg.version %>.js'
            }
        },

        /**
         * Minify the sources!
         */
        uglify: {
            compile: {
                options: {
                    mangle  : true,
                    beautify: false,
                    banner  : '<%= meta.banner %>'
                },
                files  : {
                    '<%= concat.compile_js.dest %>': '<%= concat.compile_js.dest %>'
                }
            }
        },


        /**
         * HTML2JS is a Grunt plugin that takes all of your template files and
         * places them into JavaScript files as strings that are added to
         * AngularJS's template cache. This means that the templates too become
         * part of the initial payload as one JavaScript file. Neat!
         */
        html2js: {
            app: {
                options: {
                    base  : 'src',
                    rename: function (moduleName) {
                        return taskConfig.pkg.name + '/' + moduleName;
                    }
                },
                src    : ['<%= app_files.appTemplates %>'],
                dest   : '<%= build_dir %>/templates-<%= pkg.name %>.js',
                module : '<%= pkg.name %>Templates'
            }
        }
    };


    /** ********************************************************************************* */
    /** **************************** Project Configuration ****************************** */
    grunt.initConfig(_.extend(taskConfig, fileConfig));

    grunt.registerTask('default', ['build', 'compile']);
    grunt.registerTask('build', ['clean:all', 'html2js', 'copy:build_appjs']);
    grunt.registerTask('compile', ['concat:compile_js', 'uglify']);
};
