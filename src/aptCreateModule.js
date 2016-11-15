/**
 * Created by yasar on 17.01.2016.
 */

/**
 *
 * @param builder aptBuilder
 */
function aptCreateModule(builder) {

    checkDependency();

    var app = angular
        .module(builder.getModuleName(), builder.dependencies)
        /**
         * this was defined so, but seems like it never got a proper usage.
         * so commenting it out now.
         */
        // .constant('buildConf', builder)
        .run(['$rootScope', '$injector', function ($rootScope, $injector) {
            if (_.get(builder, 'public')) {
                _.set($rootScope, 'apt.modules.' + builder.package + '.' + builder.domain, builder);
            }

            var aptTempl = $injector.get('aptTempl');
            var prop     = 'appConfig.modules.' + builder.domain + '.enable';
            if (_.has(aptTempl, prop)) {
                _.merge(builder.enable, _.get(aptTempl, prop));
            }

            if (_.isFunction(builder.onRun)) {
                builder.onRun($injector);
            }
        }]);

    processWidgets();
    processMenu(app);
    processRoute(app);


    function checkDependency() {
        if (!_.has(builder, 'dependencies')) {
            builder.dependencies = [];
        } else if (_.isString(builder.dependencies)) {
            builder.dependencies = [builder.dependencies];
        } else if (!_.isArray(builder.dependencies)) {
            throw new Exception('Dependencies for `' + builder.getModuleName() + '` must be an array or a string for single dependency.');
        }
    }

    function processWidgets() {
        if (!_.has(builder, 'widgets') || !builder.widgets) {
            return;
        }

        app.run(widgetLoader);

        widgetLoader.$inject = ['$injector'];
        function widgetLoader($injector) {
            _.forIn(_.get(builder, 'widgets'), function (widget) {

                if (!checkAuthorization($injector, widget)) {
                    return;
                }

                registerWidgetCreator($injector, widget);
            });
        }

        function checkAuthorization($injector, widget) {
            var authorizeFor = _.get(widget, 'authorize', false);
            if (authorizeFor !== false) {
                var aptAuthorizationService = $injector.get('aptAuthorizationService');
                if (authorizeFor === true) {
                    // authorizeFor = 'access_' + builder.domain + '_menu';
                    authorizeFor = builder.permission('access', 'menu');
                }

                if (!_.isArray(authorizeFor)) {
                    authorizeFor = [authorizeFor];
                }

                if (!aptAuthorizationService.isAuthorized(authorizeFor)) {
                    return false;
                }
            }

            return true;
        }

        function registerWidgetCreator($injector, widget) {
            var targetBuilder        = _.get(window, widget.target + 'Builder');
            var targetBuilderService = $injector.get(targetBuilder.getServiceName('service'));

            if (_.has(targetBuilderService, 'registerWidgetCreator')) {
                targetBuilderService.registerWidgetCreator(widget.creator);
            }
        }
    }

    function processMenu(app) {
        /**
         * if nothing provided for menu or is set to false then
         * we assume this module does not utilize the menu system,
         * so do nothing but return.
         */
        if (!_.has(builder, 'menu') || !builder.menu) {
            return;
        }

        app.run(menuLoader);

        menuLoader.$inject = ['$injector'];
        function menuLoader($injector) {
            var aptMenu           = $injector.get('aptMenu');
            var $rootScope        = $injector.get('$rootScope');
            var NotifyingService  = $injector.get('NotifyingService');
            var defaultTargetMenu = 'sideMenu';
            var defaultMenuItem   = {
                text: builder.title || builder.Domain,
                icon: builder.icon,
                name: _.camelCase(builder.domain + '_menu'),
                // segment: 'main.' + (builder.package ? builder.package + '.' : '') + builder.domain,

                /**
                 * true will force it to check for defaultChild if segment is abstract
                 */
                segment: builder.segment(true),
                // segment: builder.segment(),
                auth   : [builder.permission('access', 'menu')]
            };

            ///

            /**
             * if menu is to true, then load menu with Defaults
             */
            if (builder.menu === true) {
                return attachMenu(aptMenu.get(defaultTargetMenu), getMenuItem({}));
            }

            ///

            var menuColl = builder.menu;

            if (_.isFunction(builder.menu)) {
                menuColl = builder.menu.call(this, $injector);
            }

            if (_.isObject(menuColl) && !_.isArray(menuColl)) {
                menuColl = [menuColl];
            }

            if (!_.isArray(menuColl)) {
                throw new Exception('Menu option for `' + builder.getModuleName() + '` must be an array or an object or a function.');
            }

            ///

            _.forEach(menuColl, function (menu) {
                var targetMenu = aptMenu.get(menu.target || defaultTargetMenu);

                if (_.has(menu, 'loadWhen')) {
                    NotifyingService.subscribe($rootScope, menu.loadWhen, function () {
                        attachMenu(targetMenu, getMenuItem(menu));
                    });
                } else {
                    attachMenu(targetMenu, getMenuItem(menu));
                }
            });

            function attachMenu(targetMenu, menuItem) {
                if (!targetMenu || !menuItem) {
                    return;
                }

                targetMenu.addChild(menuItem);
            }

            function getMenuItem(menu) {
                // return _.defaultsDeep((_.has(menu, 'menuItem') ? menu.menuItem : {}), defaultMenuItem);
                return _.defaultsDeep((_.has(menu, 'menuItem') ? menu.menuItem : menu), defaultMenuItem);
            }
        }

    }

    function processRoute(app) {
        if (!_.has(builder, 'create.routeConfig') || !builder.create.routeConfig) {
            return;
        }

        app.config(routeConfig);

        routeConfig.$inject = ['$injector'];
        function routeConfig($injector) {
            var $stateProvider     = $injector.get('$stateProvider');
            var $urlRouterProvider = $injector.get('$urlRouterProvider');
            var statesObj          = {};

            /// Layout State

            var layoutState = {
                name         : builder.segment(),
                url          : builder.url(),
                template     : builder.getLayoutTemplate(),
                abstract     : _.get(builder, 'routeConfig.layout.abstract'),
                ncyBreadcrumb: {
                    label: builder.title
                }
            };

            if (builder.create.layoutController) {
                layoutState.controller   = builder.getControllerName('layout');
                layoutState.controllerAs = builder.getControllerAsName('layout');
            }
            $stateProvider.state(layoutState);

            if (_.has(builder, 'routeConfig.layout.defaultChild')) {
                layoutState.defaultChild = _.get(builder, 'routeConfig.layout.defaultChild');
            }

            ///

            var _name     = null;
            var _template = '';

            if (builder.create.listDirective) {
                _name     = 'list';
                _template = '<apt-panel><' + _.kebabCase(builder.getDirectiveName(_name))
                            + ( _.get(builder, 'list.editConf') ? ' edit-conf=\'' + angular.toJson(builder.list.editConf) + '\'' : '')
                            + ( _.get(builder, 'list.addNewConf') ? ' add-new-conf=\'' + angular.toJson(builder.list.addNewConf) + '\'' : '')
                            + ' /></apt-panel>';
                addState(_name, _template);
            }

            else if (builder.create.managerDirective) {
                _name     = 'manager';
                _template = '<apt-panel><' + _.kebabCase(builder.getDirectiveName(_name)) + ' /></apt-panel>';
                addState(_name, _template);
            }
            // statesObj[_name] = _template;

            ///

            if (_.has(builder, 'routeConfig.others')) {
                var others = _.get(builder, 'routeConfig.others');
                if (!_.isArray(others)) {
                    console.error('routeConfig.others must be an array. Domain: ' + builder.domain);
                } else {
                    // _.forEach(others, $stateProvider.state);
                    _.forEach(others, function (value) {
                        addState(value);
                    });
                }
            }

            ///

            pushStates();

            builder.fixSegments();

            function addState(_name, _template) {
                var state = null;
                if (_.isObject(_name)) {
                    state = _name;
                } else {
                    state = _.defaults(
                        /**
                         * if there is a configuration available, take it
                         * and default to with provided object (2nd parameter)
                         * remember, first object will be preserved and only missing ones will be used from the second one.
                         */
                        _.get(builder, 'routeConfig.' + _name),

                        /**
                         * the default configuration for this state
                         */
                        {
                            name         : builder.segment(_name),
                            url          : _.get(builder, 'routeConfig.layout.abstract') &&
                                           _.get(builder, 'routeConfig.layout.defaultChild') == _name ? '' : builder.url(_name),
                            template     : _template,
                            access       : {
                                permission: [builder.permission('read', 'module')]
                            },
                            ncyBreadcrumb: {
                                label: _.upperFirst(_name)
                            }
                        }
                    );
                }

                // $stateProvider.state(state);
                statesObj[state.name] = state;
            }

            function pushStates() {
                _.forEach(statesObj, function (state) {
                    $stateProvider.state(state);
                });
            }

        }
    }
}