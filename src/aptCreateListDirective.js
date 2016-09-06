/**
 * Created by yasar on 17.01.2016.
 */

function aptCreateListDirective(builder) {
    builder.Domain = _.upperFirst(builder.domain);
    if (!builder.suffix) {
        builder.suffix = {list: 'list'};
    }
    builder.suffix.List = _.upperFirst(builder.suffix.list);

    var path = builder.getPath('list');

    angular
        .module(builder.getModuleName())
        .directive(builder.getDirectiveName('list'), fn);


    fn.$inject = ['$injector'];
    function fn($injector) {
        return new aptListDirective(builder, $injector);
    }


    function aptListDirective(builder, $injector) {
        aptCreateListDirective.ctr++;

        return {
            restrict        : 'EA', // ACME
            scope           : {
                viewType            : '@?',
                filter              : '=?',
                /**
                 * this is required, when adding a new record by clicking the addNew button available for the table.
                 * ex: couponCondition list, will need what coupon_id it should be added under.
                 * usage:
                 * <x-list data-initial-data="{coupon_id: vm.form.data.coupon_id, param1: value1, param2: value2,..}"></x-list>
                 */
                initialData         : '<?',
                addNewConf          : '<',
                editConf            : '<',
                data                : '=?',
                autoload            : '@?',
                /**
                 * can take true|false
                 */
                showLoadingIndicator: '@?',
                onSelect            : '&?',
                /**
                 * is good for passing extra values/objects/arrays
                 * this should be an object.
                 */
                params              : '<?',
                /**
                 * options for aptDatatable to be passed on
                 */
                tableOptions        : '<?'
            },
            templateUrl     : templateUrlFn,
            controller      : controllerFn,
            compile         : compileFn,
            replace         : false,
            controllerAs    : builder.getControllerAsName('list'),
            bindToController: true
        };

        function compileFn(tElement, tAttrs, transclude) {
            if (_.isUndefined(tAttrs.showLoadingIndicator) || tAttrs.showLoadingIndicator != 'false') {
                $(tElement)
                    .append('<div bs-loading-overlay ' +
                            'bs-loading-overlay-template-url="misc/loading-overlay-template.tpl.html"' +
                            'bs-loading-overlay-reference-id="ref_' + aptCreateListDirective.ctr + '"></div>')

                    // parent needs to have position:relative, overlay will cover the page otherwise.
                    .css('position', 'relative');
            }

            if (tAttrs.tableOptions) {
                var datatable = tElement.find('[apt-datatable], apt-datatable');
                datatable.attr('data-options', tAttrs.tableOptions);
            }
        }

        function templateUrlFn(elem, attrs) {
            if (attrs.viewType) {
                return path + '/' + builder.suffix.list + '-' + attrs.viewType + '.tpl.html';
            } else {
                return path + '/' + builder.suffix.list + '.tpl.html';
            }
        }

    }

    controllerFn.$inject = ['$scope', '$attrs', '$injector'];
    function controllerFn($scope, $attrs, $injector) {

        var vm          = this;
        var serviceName = builder.getServiceName('service');
        if (!$injector.has(builder.getServiceName('service'))) {
            throw 'The service named as `' + serviceName + '` is not available!';
        }
        var service = $injector.get(serviceName);
        var aptMenu = $injector.get('aptMenu');
        /**
         * $scope and $attrs are set in the vm (this),
         * so that they can be accessible from within the controller hook defined in the builder block.
         */
        vm.$attrs = $attrs;

        vm.rowMenu              = getRowMenu();
        vm.addNew               = addNew;
        vm.reload               = reloadFn;
        vm.selectItem           = selectItemFn;
        vm.selectedItem         = null;
        vm.showStatusChangeForm = showStatusChangeForm;

        // if (builder.list && builder.list.controller && angular.isFunction(builder.list.controller)) {
        if (_.isFunction(_.get(builder, 'list.controller'))) {
            builder.list.controller.call(this, $injector, $scope, builder);
        }

        // if (_.isUndefined(vm.data)) {
        if (_.isUndefined(vm.data) || _.isNUll(vm.data)) {
            vm.data = service.getRepo();
        }

        /**
         * if vm.autoload is coming from html-bind, it will be string,
         * if is coming from module>controller then it will be boolean.
         * @type {boolean}
         */
        vm.autoload = _.isUndefined(vm.autoload) ? true : ((!vm.autoload || vm.autoload == 'false') ? false : true);
        vm.edit   = editFn;
        vm.delete = deleteFn;

        if (vm.autoload) {
            load();
        }

        function load(useCache) {
            var filter = vm.filter ? vm.filter : null;
            service.loadRepo(filter, useCache, {uniqId: aptCreateListDirective.ctr});
        }

        function editFn(item, popup) {

            /**
             * edit conf ile dısarıdan popup
             * suffix
             * stay durumlarını set edebiliyoruz
             */
            if (_.isUndefined(vm.editConf)) {
                vm.editConf = {};
            }
            _.defaults(vm.editConf, {popup: true, suffix: 'form', stay: true});
            //return service.edit(item, popup);
            return service.edit(item, vm.editConf);
        }

        function deleteFn(item) {
            return service.delete(item);
        }


        /**
         * smart table add new click oldugunda
         * new form ekranının popup ekranında açılmasını ve
         * add before yapıp yapmayacagını configure etmek için duzenlendi.
         */
        function addNew() {
            if (_.has(builder.list, 'beforeAddNew') && _.isFunction(builder.list.beforeAddNew)) {
                builder.list.beforeAddNew.call(this, $injector, $scope, builder).then(function () {
                    proceed();
                }, function () {
                    // do nothing
                });
            } else {
                proceed();
            }

            function proceed() {
                if (_.isUndefined(vm.addNewConf)) {
                    vm.addNewConf = {};
                }
                _.defaults(vm.addNewConf, {popup: true, add_before: true, required: true, suffix: 'form', stay: true});

                return service.addNew({
                    initialData: vm.initialData,
                    popup      : vm.addNewConf.popup,
                    add_before : vm.addNewConf.add_before,
                    suffix     : vm.addNewConf.suffix,
                    stay       : vm.addNewConf.stay,
                    confirm    : {
                        required: vm.addNewConf.required
                    },
                    $scope     : $scope
                });
            }
        }

        function reloadFn() {
            load(false);
        }

        function getRowMenu() {
            var rowMenu;
            if (builder.list && builder.list.rowMenu && angular.isFunction(builder.list.rowMenu)) {
                rowMenu = builder.list.rowMenu.call(this, $injector, vm, $scope);
            } else if (angular.isFunction(builder.rowMenu)) {
                rowMenu = builder.rowMenu.call(this, $injector, vm, $scope);
            } else if (angular.isObject(builder.rowMenu)) {
                rowMenu = builder.rowMenu;
            } else {
                rowMenu = getDefaultRowMenu(vm, aptMenu);
            }
            return rowMenu;
        }

        function selectItemFn(item) {
            if (angular.isFunction(vm.onSelect)) {
                vm.onSelect({item: item});
            }
            vm.selectedItem = item;
        }

        function showStatusChangeForm(item) {
            var service = $injector.get(builder.getServiceName('service'));
            service.updateStatus(item);
        }

        function getDefaultRowMenu(vm, aptMenu) {
            var rowMenu = aptMenu.Item({
                name     : 'row-menu',
                'class'  : 'btn-group-xs',
                translate: _.has(vm, 'params.translateMenu') ? _.get(vm, 'params.translateMenu') : true
            });


            var menuItemEdit = aptMenu.Item({
                text : 'Edit',
                icon : 'icon-pencil',
                click: function (item) {
                    vm.edit(item);
                }
            });

            var menuItemDelete = aptMenu.Item({
                text : 'Delete',
                icon : 'icon-close2',
                class: 'btn-danger',
                click: function (item) {
                    vm.delete(item);
                }
            });

            rowMenu.addChild(menuItemEdit);
            rowMenu.addChild(menuItemDelete);

            return rowMenu;
        }

    }
};

aptCreateListDirective.ctr = 0;