/**
 * Created by yasar on 12.05.2016.
 */


function aptCreateLayoutController(builder) {

    if (builder.domain) {
        builder.Domain = _.upperFirst(builder.domain);
    }

    angular.module(builder.getModuleName()).controller(builder.getControllerName('layout'), Controller);

    Controller.$inject = ['$injector', '$scope'];
    function Controller($injector, $scope) {

        var aptTempl       = $injector.get('aptTempl');
        var gettextCatalog = $injector.get('gettextCatalog');
        var service        = null;
        if ($injector.has(builder.getServiceName('service'))) {
            var service = $injector.get(builder.getServiceName('service'));
        }

        aptTempl.reset(true);
        // aptTempl.page.title                 = builder.Domain + ' Manager';
        // aptTempl.page.title                 = gettextCatalog.getString(builder.Domain);
        // aptTempl.page.icon                  = builder.icon;
        aptTempl.resetWithBuilder(builder);
        aptTempl.config.showSecondaryNavbar = true;
        aptTempl.config.fillContent         = false;
        aptTempl.config.transparentHeader   = false;
        aptTempl.config.showHeader          = true;
        aptTempl.config.showBreadcrumb      = true;
        aptTempl.config.showFooter          = false;
        aptTempl.config.showSidebarLeft     = true;
        aptTempl.config.showSidebarRight    = false;


        if (_.isObject(builder.layout.templConfig)) {
            _.merge(aptTempl.config, builder.layout.templConfig);
        }

        if (_.isFunction(builder.layout.controller)) {
            builder.layout.controller.call(this, $injector, $scope, builder);
        }

        if (service && service._destroy) {
            $scope.$on('$destroy', function () {
                service._destroy($scope);
            });

        }

    }
}