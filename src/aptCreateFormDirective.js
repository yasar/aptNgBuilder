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
        if (!builder.isAuthorized($injector, 'form')) {
            return aptBuilder.directiveObject.notAuthorized;
        }
        
        checkContentPath($injector);
        createTemplateFiles($injector);
        return new formDirective(builder, $injector);
    }
    
    function formDirective(builder, $injector) {
        var directive = {
            restrict        : 'EA', // ACME
            scope           : {
                item           : '=?',
                itemId         : '=?',
                watch          : '=?',
                readonlyFields : '=?',
                mute           : '=?',
                /**
                 * if this form is shown in a popup, and stay=true then
                 * the popup will remain open, otherwise will close and try to return to listing
                 */
                stay           : '=?',
                /**
                 * is good for passing extra values/objects/arrays
                 * this should be an object.
                 */
                params         : '=?',
                onDataLoad     : '&?',
                hasParent      : '<?',
                /**
                 * must return a $q.promise
                 */
                onBeforeSubmit : '&?',
                name           : '@?',
                registerBuilder: '<?'
            },
            templateUrl     : function (elem, attrs) {
                return path + '/' + builder.suffix.form + (attrs.viewType ? '-' + attrs.viewType : '') + '.tpl.html';
            },
            // link            : linkFn,
            compile         : compileFn,
            controller      : controllerFn,
            controllerAs    : builder.getControllerAsName('form'),
            bindToController: true
        };
        
        
        if (_.has(builder, 'form.require') && !_.isNull(_.get(builder, 'form.require'))) {
            // _.set(directive, 'require', angular.toJson(_.get(builder, 'form.require')));
            _.set(directive, 'require', _.get(builder, 'form.require'));
        }
        
        return directive;
        
        function compileFn(tElement, tAttrs, transclude) {
            
            // if (!checkAuthorization($injector)) {
            //     builder.form.isAuthorized = false;
            //     return;
            // }
            
            if (builder.form.showHelp) {
                // tElement.find('apt-panel').attr('show-help', builder.domain);
                tElement.find('apt-panel').attr('show-help', builder.getHelpPath('form'));
            }
            
            return linkFn;
        }
        
        function linkFn(scope, elem, attrs, ctrls) {
            // if (_.get(builder, 'form.isAuthorized') === false) {
            //     var $compile            = $injector.get('$compile');
            //     var unauthorizedMessage = '<apt-inline-help translate>You are not authorized to edit this form. Please consult your system administrator.</apt-inline-help>';
            //     elem.replaceWith($compile($(unauthorizedMessage))(scope));
            //     return;
            // }
            
            if (_.isFunction(builder.form.link)) {
                builder.form.link.call(this, $injector, builder, scope, elem, attrs, ctrls);
            }
            
            /**
             * seems like this is not used anywhere,
             * that's why commenting it out.
             * check for any side effects!!
             */
            // var $timeout = $injector.get('$timeout');
            // var vm       = scope[builder.getControllerAsName('form')];
            // $timeout(function () {
            //     var formController = angular.element('[name=' + vm.form.name + ']').data('$formController');
            // });
        }
    }
    
    controllerFn.$inject = ['$scope', '$injector'];
    function controllerFn($scope, $injector) {
        
        // if (_.get(builder, 'form.isAuthorized') === false) {
        //     return;
        // }
        
        var aptUtils = $injector.get('aptUtils');
        var vm       = this;
        
        vm.builder = builder;
        
        if (_.isArray(vm.item)) {
            aptUtils.showError('Form Error', 'Form cannot accept an array!');
            return;
        }
        
        var readonlyFields = $scope[builder.getControllerAsName('form')].readonlyFields;
        if (readonlyFields && !_.isArray(readonlyFields)) {
            readonlyFields = [readonlyFields];
        }
        
        if (_.isFunction(builder.form.beforeCreate)) {
            var returnValue = builder.form.beforeCreate.call(this, $injector, $scope, builder);
            if (returnValue === false) {
                return;
            }
            
        }
        
        // vm.form = new aptUtils.form(builder.domain, vm.item, {
        vm.form = new aptUtils.form(builder, vm.item, {
            itemId        : vm.itemId,
            watch         : !!vm.watch,
            $scope        : $scope,
            readonlyFields: readonlyFields,
            // mute          : vm.mute,
            mute          : _.has(vm, 'mute') ? vm.mute : false,
            stay          : _.has(vm, 'stay') ? vm.stay : true,
            onDataLoad    : (_.isFunction(builder.form.onDataLoad) ? builder.form.onDataLoad : vm.onDataLoad),
            hasParent     : vm.hasParent,
            /**
             * must return a promise ($q)
             */
            onBeforeSubmit: (_.isFunction(builder.form.onBeforeSubmit) ? builder.form.onBeforeSubmit : vm.onBeforeSubmit),
            name          : vm.name
        });
        
        if (builder.form.defaults) {
            var defaults = _.isFunction(builder.form.defaults)
                ? builder.form.defaults.call(vm, $injector, $scope, builder)
                : builder.form.defaults;
            
            if (_.get(vm.form.data, '__is_incomplete')) {
                /**
                 * if __is_incomplete exists, then data is from server and
                 * there should, assumably, be no any missing property,
                 * then we should use merge to set the defaults.
                 */
                _.merge(vm.form.data, defaults);
            }
            else {
                /**
                 * _.defaults() will only work for missing properties
                 * if __is_incomplete not exists then
                 * this is an empty object or the form is in edit mode
                 * so we can use defaults.
                 */
                _.defaults(vm.form.data, defaults);
            }
        }
        
        if (_.isFunction(builder.form.controller)) {
            builder.form.controller.call(vm, $injector, $scope, builder);
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
         * Other templates will have the form tag in which the content will be included.
         *
         * @type {string}
         */
        if (!$templateCache.get(contentPath)) {
            var errorMessage = 'The form module for `'
                               + builder.package + '.' + builder.domain
                               + '` does not have [form.content].tpl.html. Should be in: ' + contentPath;
            if (Templ.appConfig.isStrict) {
                throw new Error(errorMessage);
            }
            else {
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
            templatePrefixes = ['', '-plain', '-wrapper', '-nested', '-undecorated', '-inside-form'];
        
        ///
        
        if (!builder.form.title) {
            builder.form.title = builder.Domain + ' Form';
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
        tpl    = tpl.replace(/<<builder>>/g, 'apt-builder="{{' + vm + '.registerBuilder?\'' + builder.getBuilderName() + '\':null}}"');
        return tpl;
    }
    
}