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
                text   : builder.title || builder.Domain,
                icon   : builder.icon,
                segment: 'main.' + (builder.package ? builder.package + '.' : '') + builder.domain,
                // auth   : ['access_' + _.snakeCase(builder.domain) + '_menu']
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

        app.config(routeLoader);

        routeLoader.$inject = ['$injector'];
        function routeLoader($injector) {
            var $routeSegmentProvider = $injector.get('$routeSegmentProvider');

            ///

            var layoutConfig = {template: builder.getLayoutTemplate()};
            if (builder.create.layoutController) {
                layoutConfig.controller = builder.getControllerName('layout');
            }

            ///

            var listConfig = {
                default : true
            };
            if(builder.create.managerDirective){
                listConfig = _.defaults({
                    template: '<' + _.kebabCase(builder.getDirectiveName('manager')) + ' />'
                }, listConfig);
                var listParam  = 'routeConfig.manager';
                if (_.has(builder, listParam)) {
                    listConfig = _.defaults(_.get(builder, listParam), listConfig);
                }
            } else {
                listConfig = _.defaults({
                    template: '<apt-panel><' + _.kebabCase(builder.getDirectiveName('list')) + ' /></apt-panel>'
                }, listConfig);
                var listParam  = 'routeConfig.list';
                if (_.has(builder, listParam)) {
                    listConfig = _.defaults(_.get(builder, listParam), listConfig);
                }
            }

            ///

            $routeSegmentProvider
                .when(builder.url(), builder.segment(), {
                    label: builder.title,
                })
                .when(builder.url('list'), builder.segment('list'), {
                    access: {
                        permission: [builder.permission('read', 'module')]
                    },
                    label : 'List',
                    parent: '/'
                })

                // start with: main
                .within(builder.segment(1))

                // package: app999
                .within(builder.segment(2))

                // module: staff
                .segment(builder.segment(3), layoutConfig)

                // section: staff.list
                .within()

                .segment('list', listConfig);
        }
    }
}