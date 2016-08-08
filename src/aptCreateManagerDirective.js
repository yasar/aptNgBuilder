/**
 * Created by yasar on 12.05.2016.
 */


function aptCreateManagerDirective(builder) {

    var suffix = builder.suffix.manager;

    angular
        .module(builder.getModuleName())
        .directive(builder.getDirectiveName(suffix), DirectiveFactory);

    DirectiveFactory.$inject = ['$injector'];
    function DirectiveFactory($injector) {
        return new Directive(builder, $injector);
    }

    function Directive(builder, $injector) {
        aptCreateManagerDirective.ctr++;

        var directive = {
            restrict        : 'EA', // ACME
            scope           : {
                /**
                 * different modules may require different things.
                 * that's why we are accepting any of the followings.
                 * it is the manager's responsibility to handle them.
                 * manager is expected to be defined in the module file.
                 */
                item  : '=?',
                items : '=?',
                itemId: '<?',
                /**
                 * for passing-in extra params
                 * this is usually best practiced with an object.
                 */
                params: '<?'
            },
            templateUrl     : templateUrlFn,
            link            : linkFn,
            controller      : Controller,
            controllerAs    : builder.getControllerAsName(suffix),
            bindToController: true
        };

        if (_.has(builder, 'form.require')) {
            _.set(directive, 'require', _.get(builder, 'form.require'));
        }

        return directive;

        function templateUrlFn(elem, attrs) {
            /**
             * Check the item attribute.
             * If we do have an item available, that means we are in edit mode, and should use update-form
             * if there is no item, then we are in new mode, and should use add-form
             */
            if (attrs.viewType) {
                return builder.getPath(suffix) + '/' + suffix + '-' + attrs.viewType + '.tpl.html';
            } else {
                return builder.getPath(suffix) + '/' + suffix + '.tpl.html';
            }
        }

        function linkFn(scope, elem, attrs, ctrls, x) {
            if (builder.manager && builder.manager.link && angular.isFunction(builder.manager.link)) {
                builder.manager.link.call(this, $injector, builder, scope, elem, attrs, ctrls);
            }
        }
    }

    Controller.$inject = ['$injector', '$scope'];
    function Controller($injector, $scope) {
        var vm       = this;
        var service  = $injector.get(builder.getServiceName('Service'));
        var aptUtils = $injector.get('aptUtils');

        if (builder.manager && builder.manager.beforeDataLoad && angular.isFunction(builder.manager.beforeDataLoad)) {
            builder.manager.beforeDataLoad.call(this, $injector, $scope, builder);
        }

        if (_.isUndefined(vm.item) && _.isUndefined(vm.items) && !_.isUndefined(vm.itemId)) {
            vm.item = {};
            service.get(vm.itemId).then(function (data) {
                //aptUtils.removeAndMerge(vm.item, data);
                _.merge(vm.item, data);
                if (_.isFunction(_.get(builder, 'manager.onDataLoad'))) {
                    builder.manager.onDataLoad();
                }
            });
        }

        if (builder.manager && builder.manager.controller && angular.isFunction(builder.manager.controller)) {
            builder.manager.controller.call(this, $injector, $scope, builder);
        }

    }
}
aptCreateManagerDirective.ctr = 0;