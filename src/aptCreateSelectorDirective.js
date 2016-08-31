/**
 * Created by yasar on 17.01.2016.
 */

function aptCreateSelectorDirective(builder) {

    var suffix   = builder.getSuffix('selector');
    var path     = builder.getPath(suffix);
    var pathSelf = 'common/fields';

    angular
        .module(builder.getModuleName())
        .directive(builder.getDirectiveName('selector'), fn);

    fn.$inject = ['$injector'];
    function fn($injector) {
        return aptSelectorDirective(builder, $injector);
    }

    function aptSelectorDirective(builder, $injector) {
        // console.log(builder.getDirectiveName('selector') + ' directive initialized');
        return {
            restrict        : 'EA', // ACME
            replace         : true,
            scope           : {},
            bindToController: {
                model            : '=?ngModel',
                filterObject     : '=?',
                filterGroup      : '@?',
                filterClass      : '@?',
                filterRequired   : '=?',
                loadIf           : '=?',
                selectItem       : '=?',
                onChange         : '&?ngChange',
                onClick          : '&?ngClick',
                onLoad           : '&?',
                readonly         : '@?',
                viewType         : '@?',
                label            : '@?',
                placeholder      : '@?',
                limit            : '@?',
                locked           : '@?',
                showMenu         : '=?',
                subRoute         : '@?',
                formHandlerSuffix: '@',
                /**
                 * is good to identify when we have multiple
                 * elements of same type within the form
                 */
                identifier       : '@',
                isMultiple       : '@?',
                translate        : '=?',
                translateContext : '@?',
                searchable       : '=?',
                /**
                 * can be used to assign `pre-scrollable` to the holder class
                 * when view type is `list`. so that search box will stay above the scrolling table.
                 */
                listClass        : '@?',
                datasource       : '=?'
            },
            controller      : controllerFn,
            controllerAs    : builder.getControllerAsName('selector'),
            // link            : linkFn,
            compile         : compileFn

        };

        function compileFn(element, attrs) {
            var attrName = _.kebabCase(builder.getDirectiveName('selector'));
            element.removeAttr(attrName);
            element.removeAttr('data-' + attrName);
            delete attrs[attrName];

            return {
                post: linkFn
            };
        }

        function linkFn($scope, element, attrs, selectorCtrl) {
            {
                var $templateCache = $injector.get('$templateCache');
                var tpl;
                var found          = false;
                var vm             = $scope[builder.getControllerAsName('selector')];

                {
                    if (attrs.readonly == 'true') {
                        if (!found && (tpl = $templateCache.get(path + '/' + suffix + '-readonly.tpl.html'))) {
                            found = true;
                        } else if (!found && (tpl = $templateCache.get(pathSelf + '/' + suffix + '-readonly.tpl.html'))) {
                            found = true;
                        }
                    } else if (!attrs.viewType) {
                        if (!found && (tpl = $templateCache.get(path + '/' + suffix + '.tpl.html'))) {
                            found = true;
                        } else if (!found && (tpl = $templateCache.get(pathSelf + '/' + suffix + '.tpl.html'))) {
                            found = true;
                        }
                    } else {
                        if (!found && (tpl = $templateCache.get(path + '/' + suffix + '-' + attrs.viewType + '.tpl.html'))) {
                            found = true;
                        } else if (!found && (tpl = $templateCache.get(pathSelf + '/' + suffix + '-' + attrs.viewType + '.tpl.html'))) {
                            found = true;
                        }
                    }
                }

                if (!found) {
                    console.error('Template can not be found.');
                    return;
                }

                tpl            = tpl.replace(/<<vm>>/g, builder.getControllerAsName('selector'));
                tpl            = tpl.replace(/<<domain>>/g, builder.domain);
                tpl            = tpl.replace(/<<multiple>>/g, (selectorCtrl.isMultiple ? 'multiple' : ''));
                var $compile   = $injector.get('$compile');
                var compiledEl = $compile(tpl)($scope);
                // element.replaceWith(compiledEl);
                // element        = compiledEl;
                element.contents().remove();
                element.append(compiledEl);

                // var $compile   = $injector.get('$compile');
                // element.contents().remove();
                // element.html(tpl);
                // $compile(element.contents())($scope);
            }

            {
                if (angular.isFunction(vm.onChange)) {
                    element.find('select').on('change', vm.onChange);
                }

                // if (angular.isFunction(vm.onClick)) {
                //     element.find('select').on('click', vm.onClick);
                // }

                if (attrs.class) {
                    element.find('select, .list-group, .input-group').addClass(attrs.class);
                    element.removeClass(attrs.class);
                }

                if (attrs.style) {
                    element.find('select, .list-group, .input-group').attr('style', attrs.style);
                    element.removeAttr('style');
                }
            }
        }

    }

    controllerFn.$inject = ['$injector', '$scope'];
    function controllerFn($injector, $scope) {
        // if (console) {
        //     console.log(builder.domain + ' selectorDirective controller executed');
        // }
        // return;
        /**
         * initialization
         */
        {
            var NotifyingService        = $injector.get('NotifyingService');
            var model                   = $injector.get(builder.getServiceName('model'));
            var service                 = $injector.get(builder.getServiceName('service'));
            var restOp                  = $injector.get('restOperationService');
            var Restangular             = $injector.get('Restangular');
            var aptUtils                = $injector.get('aptUtils');
            var gettextCatalog          = $injector.get('gettextCatalog');
            var $timeout                = $injector.get('$timeout');
            var vm                      = this;
            var _selectedItem           = null;
            // var datasource              = null;
            var filterObject            = {};
            var isModelValueInitialized = false;


            vm.selectedItem    = selectedItemFn;
            // vm.onClick         = onClickFn;
            vm.search          = searchFn;
            vm.unlock          = unlockFn;
            vm.resetSelect     = resetSelectFn;
            vm.addNew          = addNewFn;
            vm.edit            = editFn;
            vm.reload          = reloadFn;
            vm.getFilterObject = getFilterObject;

            vm.readonlyData = {};
            vm.data         = [];
            // vm.data         = service.getRepo();
            vm.isLoading    = false;
            vm.isMultiple   = vm.isMultiple == 'true';
            /**
             * enable auto translate
             * if only `attr.translate=false` is provided then the translation will be disabled
             * @type {boolean}
             */
            vm.translate = (_.isUndefined(vm.translate) || vm.translate !== false) ? true : false;

            var defaultPlaceholder = '...';
            vm.placeholder         = vm.placeholder || defaultPlaceholder;
            if (vm.placeholder != defaultPlaceholder && vm.translate) {
                vm.placeholder = gettextCatalog.getString(vm.placeholder);
            }
        }

        init();

        if (builder.selector && builder.selector.controller && angular.isFunction(builder.selector.controller)) {
            builder.selector.controller.call(this, $injector, $scope, builder);
        }


        if (!vm.filterRequired || vm.loadIf) {
            /**
             * load repo
             */
            reload();
        }


        $scope.$watch(
            function () {
                return {filter: vm.filterObject, model: vm.model};
            },
            function (newVal, oldVal) {
                if (_.isUndefined(newVal) || _.isEqual(newVal, oldVal)) {
                    return;
                }

                if (!_.isEqual(newVal.filter, oldVal.filter)) {
                    delete filterObject[builder.getPrimaryKey()];
                    angular.merge(filterObject, newVal.filter);
                    reload();
                }

                /**
                 * following block is causing the setter() to execute twice.
                 * we should monitor the use-case of this block in different places,
                 * once we make sure it is safe to remove it, then we should !
                 *
                 * PS2: this seems to be required, as the model changes, the selectedItem does not change.
                 */
                else if (!_.isEqual(newVal.model, oldVal.model)) {
                    filterObject[builder.getPrimaryKey()] = newVal.model;
                    initModelValue();
                }

            }, true
        );

        function getFilterObject() {
            return filterObject;
        }

        function initModelValue() {
            if (vm.model) {

                var filterModel = {};
                _.set(filterModel, builder.getPrimaryKey(), vm.model);

                /**
                 * check if the model value is available in the option list
                 * or if we have data that satisfies filter criterias.
                 * if not, we have to request from server.
                 */
                if (!vm.datasource
                    && vm.searchable !== false
                    && _.findIndex(vm.data, filterModel) == -1
                    && _.findIndex(vm.data, filterObject) == -1

                    /**
                     * if vm.keyword is set, it means we have already performed the search query
                     * and we should have the result set from the search.
                     */
                    && !vm.keyword) {

                    var modelService = getModelService();
                    if (modelService.hasOwnProperty('search')) {
                        var _filterObject = _.merge({limit: _.isUndefined(vm.limit) ? 25 : vm.limit}, vm.filterObject, filterModel);
                        vm.isLoading      = true;
                        modelService.search(_filterObject).then(function (data) {
                            /**
                             * dont empty the vm.data, just merge with coming data.
                             */
                            angular.merge(vm.data, data);

                            /**
                             * we need this to show the location name on initial load
                             * it will be shown as plain-text in a span element
                             */
                            vm.readonlyData = data[0];

                            /**
                             * this is required for the `change` menu-option to function properly
                             */
                            // vm.selectedItem(vm.readonlyData);
                            // vm.isLoading = false;
                            /**
                             * above code is fixed as below. this is required for when view-type=plain is used.
                             */
                            $timeout(function () {
                                vm.selectedItem(_.find(vm.data, filterModel));
                                vm.isLoading = false;
                            });
                        });
                    }
                }

                /**
                 * we are supposed to have what we are looking for in the option list.
                 */
                else {
                    vm.selectedItem(_.find(vm.data, filterModel));
                }

                isModelValueInitialized = true;
            }
        }

        function selectedItemFn(value) {
            if (!arguments.length) {
                return getter();
            }

            setter();

            function getter() {
                if (!vm.model) {
                    return;
                }

                return _selectedItem;
            }

            function setter() {

                if (_.isUndefined(value) || _.isEqual(vm.selectItem, value)) {
                    return;
                }

                _selectedItem = value;
                vm.selectItem = _selectedItem;

                /**
                 * null is used for resetting model.
                 * note that aptField directive may broadcast('reset-model')
                 */
                if (value !== null) {
                    vm.model = _selectedItem[builder.getPrimaryKey()];
                } else {
                    vm.model = null;
                }

                /**
                 * trigger the change event if any listening
                 *
                 * Note that, we invoke the callback within a timeout function.
                 * This is important because if we are to access the model value within the callback function,
                 * vm.model will not be assigned to ng-model="x" until the next digest cycle.
                 * so we ensure that callback is invoked on next tick.
                 */
                if (angular.isFunction(vm.onChange)) {
                    $timeout(function () {
                        vm.onChange({data: _selectedItem});
                    });
                }
            }
        }

        // function onClickFn(item) {
        //     if (angular.isFunction(vm.onClick)) {
        //         $timeout(function () {
        //             vm.onClick({data: item});
        //         });
        //     }
        // }

        function unlockFn() {
            vm.locked = false;
        }

        function resetSelectFn() {
            selectedItemFn(null);
        }

        function addNewFn() {
            var builderObj = {
                type      : builder.domain,
                add_before: true,
                popup     : true,
                suffix    : vm.formHandlerSuffix ? vm.formHandlerSuffix : 'form'
            };
            restOp.addNew(builderObj);
        }

        function editFn() {
            /**
             * if selectedItem is coming from search result,
             * we are supposed to be getting the result from customGET/search
             * which will cause our item to be plain object/not-restangularized.
             *
             * in order to utilize Restangular's built-in methods, we need a restangularized object.
             * so we should check to see if selectedItem is restangularized, if not then convert it.
             *
             * IMPORTANT point here is that we have set a custom _route parameter in the model
             * which is for resetting the route property of the newly restangularized selectedItem object.
             * Only then the put method will be able to send the http request, properly.
             */
            if (!_selectedItem.hasOwnProperty('restangularized') || !_selectedItem.restangularized) {
                _selectedItem = Restangular.restangularizeElement(null, _selectedItem, model._route);
            }

            var builderObj = {
                type      : builder.domain,
                suffix    : vm.formHandlerSuffix ? vm.formHandlerSuffix : 'form',
                data      : _selectedItem.get(),
                modalClass: 'slide-up'
            };
            restOp.edit(builderObj);

        }

        function searchFn(keyword) {
            if (vm.searchable === false) {
                return;
            }

            if (!keyword) {
                return;
            }

            if (false && keyword.length < 3) {
                return;
            }

            vm.keyword                            = keyword;
            filterObject[builder.getPrimaryKey()] = vm.model;

            return reload();
        }

        function reloadFn() {
            return reload();
        }

        function reload() {
            if (vm.datasource) {
                if (vm.datasource != vm.data) {
                    vm.data = vm.datasource;
                }
                return;
            }

            /**
             * if the condition required to show data is not satisfied
             * make sure we dont show anything, so empty out the vm.data
             */
            if (!_.isUndefined(vm.loadIf) && !vm.loadIf) {
                aptUtils.emptyAndMerge(vm.data, []);
                vm.isLoading = false;
                // deferred.resolve([]);
                return;
            }

            if (vm.isLoading) {
                // deferred.reject('isLoading');
                return;
            }

            if (vm.keyword == ''
                && filterObject.hasOwnProperty(builder.getPrimaryKey())
                && _selectedItem
                && _selectedItem.hasOwnProperty(builder.getPrimaryKey())
                && filterObject[builder.getPrimaryKey()] == _selectedItem[builder.getPrimaryKey()]) {
                // deferred.reject();
                return;
            }

            vm.isLoading = true;

            // service.loadRepo(getCombinedFilter());

            getModelService()
                .getList(getCombinedFilter())
                .then(
                    function (data) {
                        aptUtils.emptyAndMerge(vm.data, data);

                        ///

                        /**
                         * set the selectedItem
                         */
                        if (vm.model) {
                            var findBy    = _.set({}, builder.getPrimaryKey(), parseInt(vm.model));
                            var foundItem = _.find(vm.data, findBy);
                            if (foundItem) {
                                vm.selectedItem(foundItem);
                            }
                        }
                        NotifyingService.notify(builder.domain + ':loaded', data);
                    }
                );
        }

        function init() {

            initModelValue();

            if (!filterObject) {
                filterObject = {};
            }

            if (vm.filterObject) {
                _.merge(filterObject, vm.filterObject);
            }

            if (_.isUndefined(vm.limit)) {
                vm.limit = 25;
            }

            if (vm.searchable === false) {
                vm.limit = null;
            }

            vm.keyword = null;

            if (vm.filterGroup) {
                filterObject['groupname'] = vm.filterGroup;
            }

            $scope.$on('reset-model', function (event) {
                selectedItemFn(null);
                event.preventDefault();
            });

            NotifyingService.subscribe($scope, builder.domain + ':loaded', function (event, data) {
                onDataLoaded(data);
            });
        }

        function getCombinedFilter() {
            return angular.merge(filterObject, {
                key  : vm.keyword,
                limit: vm.limit
            });
        }

        function getModelService() {
            return vm.subRoute
                ? Restangular.all(model._route + '/' + vm.subRoute)
                : model;
        }

        function onDataLoaded() {
            initModelValue();
            // /**
            //  * set the selectedItem
            //  */
            // if (vm.model) {
            //     var findBy    = _.set({}, builder.getPrimaryKey(), parseInt(vm.model));
            //     var foundItem = _.find(vm.data, findBy);
            //     if (foundItem) {
            //         vm.selectedItem(foundItem);
            //     }
            // }

            ///

            vm.isLoading = false;
            // deferred.resolve(data);

            if (angular.isFunction(vm.onLoad)) {
                vm.onLoad({data: vm.data});
            }

        }

    }
}