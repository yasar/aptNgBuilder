/**
 * Created by yasar on 17.01.2016.
 */

function aptCreateFormDirective(builder) {
    if (builder.domain) {
        builder.Domain = _.upperFirst(builder.domain);
    }

    if (!builder.suffix) {
        builder.suffix = {
            form: 'form'
        };
    }

    builder.suffix.Form = _.upperFirst(builder.suffix.form);
    var path            = builder.getPath(builder.suffix.form),
        contentPath     = null; // will be set within formDirectiveFn


    angular
        .module(builder.getModuleName())
        .directive(builder.getDirectiveName('form'), formDirectiveFn);


    formDirectiveFn.$inject = ['$injector'];
    function formDirectiveFn($injector) {
        checkContentPath($injector);
        createTemplateFiles($injector);
        return new formDirective(builder, $injector);
    }

    function formDirective(builder, $injector) {
        var directive = {
            restrict        : 'EA', // ACME
            scope           : {
                item          : '=?',
                itemId        : '=?',
                watch         : '=?',
                readonlyFields: '=?',
                // isDirty       : '&?',
                mute          : '=?',
                /**
                 * if this form is shown in a popup, and stay=true then
                 * the popup will remain open, otherwise will close and try to return to listing
                 */
                stay          : '=?',
                /**
                 * is good for passing extra values/objects/arrays
                 * this should be an object.
                 */
                params        : '=?',
                onDataLoad    : '&?',
                hasParent     : '<?',
                /**
                 * must return a $q.promise
                 */
                onBeforeSubmit: '&?',
                name          : '@?'
            },
            templateUrl     : function (elem, attrs) {
                return path + '/' + builder.suffix.form + (attrs.viewType ? '-' + attrs.viewType : '') + '.tpl.html';
            },
            link            : linkFn,
            controller      : controllerFn,
            controllerAs    : builder.getControllerAsName('form'),
            bindToController: true
        };

        if (_.has(builder, 'form.require')) {
            _.set(directive, 'require', _.get(builder, 'form.require'));
        }

        return directive;

        function linkFn(scope, elem, attrs, ctrls) {
            if (builder.form && builder.form.link && angular.isFunction(builder.form.link)) {
                builder.form.link.call(this, $injector, builder, scope, elem, attrs, ctrls);
            }
            var $timeout = $injector.get('$timeout');
            var vm       = scope[builder.getControllerAsName('form')];
            $timeout(function () {
                var formController = angular.element('[name=' + vm.form.name + ']').data('$formController');
            });
        }
    }

    function checkContentPath($injector) {
        var Templ          = $injector.get('aptTempl'),
            $log           = $injector.get('$log'),
            $templateCache = $injector.get('$templateCache');

        contentPath = path + '/' + builder.getTemplateContentFileName(builder.suffix.form, Templ);

        /**
         * First look for [form.content].tpl.html
         *
         * This file is the base form content.
         * The content should not be wrapped with <form> tag.
         * Other templates will have the required tag in which the content will be included.
         *
         * @type {string}
         */
        if (!$templateCache.get(contentPath)) {
            var errorMessage = 'The form module for `'
                + builder.package + '.' + builder.domain
                + '` does not have [form.content].tpl.html. Should be in: ' + contentPath;
            if (Templ.appConfig.isStrict) {
                throw new Error(errorMessage);
            } else {
                $log.warn(errorMessage);
            }
        }
    }

    function createTemplateFiles($injector) {
        var $templateCache   = $injector.get('$templateCache'),
            Templ            = $injector.get('aptTempl'),
            $log             = $injector.get('$log'),
            /**
             * first one should be empty string ''
             *
             * @type {string[]}
             */
            templatePrefixes = ['', '-plain', '-wrapper', '-nested', '-undecorated'];

        ///

        if (!_.has(builder, 'form.title')) {
            _.set(builder, 'form.title', builder.Domain + ' Form');
        }

        ///

        _.forEach(templatePrefixes, function (prefix) {

            var templateName     = builder.suffix.form + prefix + '.tpl.html',
                formTemplatePath = path + '/' + templateName,
                formTemplate     = $templateCache.get(formTemplatePath);


            if (!formTemplate) {

                var defaultTemplateName     = builder.suffix.form + prefix + '.default.tpl.html',
                    /*defaultPath             = 'theme/' + Templ.appConfig.theme + '/templates',*/
                    defaultPath             = 'aptNgBuilder/templates',
                    formDefaultTemplatePath = defaultPath + '/' + defaultTemplateName,
                    formTemplate            = $templateCache.get(formDefaultTemplatePath);

                if (!formTemplate) {
                    throw new Error('The form module does not have `' + defaultTemplateName + '`. Should be in: '
                        + formDefaultTemplatePath);
                }

            }

            $templateCache.put(formTemplatePath, fixTemplateVariables(formTemplate));
        });

    }

    function fixTemplateVariables(tpl) {
        var vm = builder.getControllerAsName('form');
        tpl    = tpl.replace(/<<vm>>/g, vm);
        tpl    = tpl.replace(/<<path>>/g, path);
        tpl    = tpl.replace(/<<icon>>/g, builder.icon);
        tpl    = tpl.replace(/<<formTitle>>/g, builder.form.title);
        tpl    = tpl.replace(/<<contentPath>>/g, contentPath);
        return tpl;
    }

    controllerFn.$inject = ['$scope', '$injector'];
    function controllerFn($scope, $injector) {
        var aptUtils = $injector.get('aptUtils');
        var vm       = this;

        vm.builder = builder;

        if (angular.isArray(vm.item)) {
            aptUtils.showError('Form Error', 'Form cannot accept an array!');
            return;
        }

        var readonlyFields = $scope[builder.getControllerAsName('form')].readonlyFields;
        if (readonlyFields && !angular.isArray(readonlyFields)) {
            readonlyFields = [readonlyFields];
        }

        if (builder.form && builder.form.beforeCreate && angular.isFunction(builder.form.beforeCreate)) {
            var returnValue = builder.form.beforeCreate.call(this, $injector, $scope, builder);
            if (returnValue === false) {
                return;
            }

        }

        vm.form = new aptUtils.form(builder.domain, vm.item, {
            itemId        : vm.itemId,
            watch         : !!vm.watch,
            $scope        : $scope,
            readonlyFields: readonlyFields,
            mute          : vm.mute,
            stay          : vm.stay ? vm.stay : true,
            onDataLoad    : (_.isFunction(_.get(builder, 'form.onDataLoad')) ? builder.form.onDataLoad : vm.onDataLoad),
            hasParent     : vm.hasParent,
            /**
             * must return a promise ($q)
             */
            onBeforeSubmit: (_.isFunction(_.get(builder, 'form.onBeforeSubmit')) ? builder.form.onBeforeSubmit : vm.onBeforeSubmit),
            name          : vm.name
        });

        if (builder.form && builder.form.controller && angular.isFunction(builder.form.controller)) {
            builder.form.controller.call(vm, $injector, $scope, builder);
        }

    }
}