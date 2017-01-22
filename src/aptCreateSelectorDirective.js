/**
 * Created by yasar on 17.01.2016.
 */

function aptCreateSelectorDirective(builder) {
    
    var suffix   = builder.getSuffix('selector');
    var path     = builder.getPath(suffix);
    var pathSelf = 'aptNgBuilder/templates';
    
    angular
        .module(builder.getModuleName())
        /**
         * not sure if we should use `suffix` instead of 'selector' below (?!)
         */
        .directive(builder.getDirectiveName('selector'), fn);
    
    fn.$inject = ['$injector'];
    function fn($injector) {
        if (!builder.isAuthorized($injector, 'list')) {
            return aptBuilder.directiveObject.notAuthorized;
        }
        
        return new aptSelectorDirective(builder, $injector);
    }
    
    function aptSelectorDirective(builder, $injector) {
        aptCreateSelectorDirective.ctr++;
        return {
            restrict        : 'EA', // ACME
            /**
             *
             *
             * when used with apt-field and required
             * the required attribute stays at apt-xx-selector.
             * it should be at the template element itself.
             * so, we have to set replace:true.
             */
            replace         : true,
            // scope           : {},
            scope           : true,
            bindToController: {
                model            : '=?ngModel',
                filterObject     : '<?',
                // filterGroup      : '@?',
                // filterClass      : '@?',
                filterRequired   : '<?',
                loadIf           : '<?',
                selectItem       : '=?',
                onChange         : '&?onChange',
                onClick          : '&?onClick',
                onChange2        : '&?ngChange', /*see the comment below*/
                onClick2         : '&?ngClick', /*see the comment below*/
                onLoad           : '&?',
                onReset          : '&?',
                readonly         : '@?',
                viewType         : '@?',
                label            : '@?',
                placeholder      : '@?',
                limit            : '@?',
                locked           : '@?',
                /**
                 *
                 *
                 * check the builder config for more info and options for showMenu
                 */
                showMenu         : '<?',
                subRoute         : '@?',
                formHandlerSuffix: '@',
                /**
                 *
                 *
                 * is good to identify when we have multiple
                 * elements of same type within the form
                 */
                identifier       : '@',
                isMultiple       : '@?',
                translate        : '<?',
                translateContext : '@?',
                searchable       : '<?',
                /**
                 *
                 *
                 * can be used to assign `pre-scrollable` to the holder class
                 * when view type is `list`. so that search box will stay above the scrolling table.
                 */
                listClass        : '@?',
                datasource       : '=?',
                /**
                 *
                 *
                 * when subscribed to `add`, the selector will populate the newly added records
                 * this will listen to event fired at moduleService
                 */
                subscribeAdd     : '<?', // true|false, default: false
                helpText         : '@',
                /**
                 *
                 *
                 * in case we need to use custom template for items
                 */
                itemTemplate     : '@?',
                itemScopeId      : '@?',
                customFilter     : '@?'
            },
            controller      : controllerFn,
            controllerAs    : builder.getControllerAsName('selector'),
            compile         : compileFn,
            require         : [builder.getDirectiveName('selector'), '?ngModel', '^^?form']
        };
        
        function compileFn(element, attrs) {
            var attrName = builder.getDirectiveName('selector');
            element.removeAttr(attrName);
            element.removeAttr('data-' + attrName);
            delete attrs[attrName];
            delete attrs.$attr[attrName];
            
            // if (attrs.itemTemplate) {
            //     attrs.itemTemplate = attrs.itemTemplate.replace(/<<vm>>/g, builder.getControllerAsName('selector'));
            // }
            
            return {
                post: linkFn
            };
        }
        
        function linkFn($scope, element, attrs, ctrls) {
            var vm                 = ctrls[0];
            var $ngModelController = ctrls[1];
            var $formController    = ctrls[2];
            ///
            var fcParam            = '$parent.vmField.$formController';
            if (!$formController && _.has($scope, fcParam)) {
                $formController = _.get($scope, fcParam);
            }
            ///
            var $templateCache = $injector.get('$templateCache');
            var $compile       = $injector.get('$compile');
            var tpl;
            var found          = false;
            var findNgModelStr = '[data-ng-model],[ng-model]';
            
            vm.$ngModelController = $ngModelController;
            vm.builder            = builder;
            
            ///
            
            if (attrs.readonly == 'true') {
                if (!found && (tpl = $templateCache.get(path + '/' + suffix + '-readonly.tpl.html'))) {
                    found = true;
                }
                else if (!found && (tpl = $templateCache.get(pathSelf + '/' + suffix + '-readonly.tpl.html'))) {
                    found = true;
                }
            }
            else if (!attrs.viewType) {
                if (!found && (tpl = $templateCache.get(path + '/' + suffix + '.tpl.html'))) {
                    found = true;
                }
                else if (!found && (tpl = $templateCache.get(pathSelf + '/' + suffix + '.tpl.html'))) {
                    found = true;
                }
            }
            else {
                if (!found && (tpl = $templateCache.get(path + '/' + suffix + '-' + attrs.viewType + '.tpl.html'))) {
                    found = true;
                }
                else if (!found && (tpl = $templateCache.get(pathSelf + '/' + suffix + '-' + attrs.viewType + '.tpl.html'))) {
                    found = true;
                }
            }
            
            ///
            
            if (!found) {
                console.error('Template can not be found: `' + tpl + '`');
                return;
            }
            
            tpl = tpl.replace(/<<vm>>/g, builder.getControllerAsName('selector'));
            tpl = tpl.replace(/<<builder>>/g, builder.getBuilderName());
            tpl = tpl.replace(/<<domain>>/g, builder.domain);
            tpl = tpl.replace(/<<multiple>>/g, (vm.isMultiple ? 'multiple' : ''));
            tpl = tpl.replace(/<<customFilter>>/g, (vm.customFilter ? '|' + vm.customFilter : ''));
            
            /**
             * this didnt work as expected. so commenting it out.
             * later, we may have to find a work around for this stiuation.
             */
            if (vm.itemTemplate) {
                vm.itemTemplateFixed = vm.itemTemplate.replace(/<<vm>>/g, builder.getControllerAsName('selector'));
            }
            
            element.contents().remove();
            // element.append($compile(tpl)($scope));
            
            var $tpl = $(tpl);
            
            // make sure `required` attribute is transferred.
            // also note that, we are looking for the element having ng-model as
            // it is the one obligated to do the validation
            if (attrs.required) {
                $tpl.find(findNgModelStr).attr('required', attrs.required);
            }
            
            var compiledElement = $compile($tpl)($scope)
            // element.replaceWith(compiledElement);
            element.append(compiledElement);
            
            if ($formController) {
                if (element.is('[ng-model]') || element.is('[data-ng-model]')) {
                    addControl(element);
                }
                else if (compiledElement.is('ng-model') || compiledElement.is('data-ng-model')) {
                    /**
                     * not sure if we realy need this block.
                     */
                    addControl(compiledElement);
                }
                else if (compiledElement.is('[ng-model]') || compiledElement.is('[data-ng-model]')) {
                    addControl(compiledElement);
                }
                else {
                    _.map(compiledElement.find(findNgModelStr), addControl);
                }
                
                function addControl(formElement) {
                    try {
                        var $ngModelController = $(formElement).data().$ngModelController;
                        $formController.$addControl($ngModelController);
                    } catch (e) {
                    }
                }
            }
            
            
            ///
            
            if (_.isFunction(vm.onChange)) {
                element.find('select').on('change', vm.onChange);
            }
            
            if (attrs.class) {
                element.find('select, .list-group, .input-group').addClass(attrs.class);
                element.removeClass(attrs.class);
            }
            
            if (attrs.style) {
                element.find('select, .list-group, .input-group').attr('style', attrs.style);
                element.removeAttr('style');
            }
            
            
            ///
            
            // $ngModelController.$render = function() {
            //     iElement.find('div').text($ngModelController.$viewValue);
            // };
            
            // selectorCtrl.setNgModelController($ngModelController);
            
        }
    }
    
    controllerFn.$inject = ['$injector', '$scope'];
    function controllerFn($injector, $scope) {
        /**
         * initialization
         */
        var NotifyingService        = $injector.get('NotifyingService');
        var model                   = $injector.get(builder.getServiceName('model'));
        var service                 = $injector.get(builder.getServiceName('service'));
        var restOp                  = $injector.get('restOperationService');
        var Restangular             = $injector.get('Restangular');
        var aptUtils                = $injector.get('aptUtils');
        var aptAuthorizationService = $injector.get('aptAuthorizationService');
        var gettextCatalog          = $injector.get('gettextCatalog');
        var $timeout                = $injector.get('$timeout');
        var $window                 = $injector.get('$window');
        var vm                      = this;
        var _selectedItem           = null;
        // var datasource              = null;
        var filterObject            = {};
        var isModelValueInitialized = false;
        
        $scope.$window = $window;
        
        vm.$ngModelController = null;
        //
        // vm.setNgModelController = setNgModelController;
        
        /**
         * this is a workaround.
         * originally we had ngChange/ngClick attributes on the directive,
         * however, it is observed that when used within apt-field, since we don't use ng-model with apt-field
         * ng-change or ng-click raises the error: "Controller 'ngModel', required by directive 'ngChange', can't be found!"
         * in order to fix this issue we should use on-change and on-click attributes.
         * to make the code backward-compatible ng-change is bound to onChange2
         * and here we are fixing these attributes.
         */
        if (vm.onChange2) {
            vm.onChange = vm.onChange2;
        }
        if (vm.onClick2) {
            vm.onClick = vm.onClick2;
        }
        
        /**
         * this is required for selector-menu directive.
         * it will use builder.permission method to get the correct permission string
         * for the `access` directive to check the authorization.
         *
         * note that this is set at scope level, not vm level.
         * it is required so because, child scopes can access to direct parent scopes,
         * but not to a vm under any parents' scope.
         */
        $scope.builder = builder;
        
        vm.showMenu        = vm.showMenu || _.get(builder, 'selector.showMenu') || true;
        // vm.isAuthorized    = builder.authorize ? builder.isAuthorized('list') : true;
        vm.searchable      = _.isUndefined(vm.searchable) ? true : vm.searchable;
        vm.selectedItem    = selectedItemFn;
        vm.click           = clickFn;
        vm.search          = searchFn;
        vm.unlock          = unlockFn;
        vm.resetSelect     = resetSelectFn;
        vm.addNew          = addNewFn;
        vm.edit            = editFn;
        vm.reload          = reloadFn;
        vm.getFilterObject = getFilterObject;
        
        vm.ctr          = aptCreateSelectorDirective.ctr;
        vm.readonlyData = {};
        vm.data         = [];
        // vm.data         = service.getRepo();
        vm.isLoading    = false;
        vm.isMultiple   = vm.isMultiple == 'true';
        /**
         * enable auto translate
         * if only `attr.translate=false` is provided then the translation will be disabled
         */
        vm.translate = (_.isUndefined(vm.translate) || vm.translate !== false) ? true : false;
        
        var defaultPlaceholder = '...';
        vm.placeholder         = vm.placeholder || defaultPlaceholder;
        if (vm.placeholder != defaultPlaceholder && vm.translate) {
            vm.placeholder = gettextCatalog.getString(vm.placeholder);
        }
        
        vm.x_helpText = vm.helpText;
        if (vm.helpText && vm.translate) {
            vm.x_helpText = gettextCatalog.getString(vm.helpText);
        }
        
        if (_.get(builder, 'disable.addNew') === true) {
            delete vm.addNew;
        }
        
        if (_.get(builder, 'disable.edit') === true) {
            delete vm.edit;
        }
        
        ///
        
        init();
        
        if (_.isFunction(builder.selector.controller)) {
            builder.selector.controller.call(this, $injector, $scope, builder);
        }
        
        
        // if ((!_.isUndefined(vm.filterRequired) && !vm.filterRequired) || vm.loadIf) {
        if (_.isUndefined(vm.filterRequired) || !vm.filterRequired || vm.loadIf) {
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
                    // debugger;
                    filterObject[builder.getPrimaryKey()] = newVal.model;
                    initModelValue();
                }
                
            }, true
        );
        
        if (vm.subscribeAdd) {
            NotifyingService.subscribe($scope, builder.domain + ':added', function (event, data) {
                vm.data.push(data.data);
            });
        }
        
        function getFilterObject() {
            return filterObject;
        }
        
        // function setNgModelController(ctrl) {
        //     $ngModelController = ctrl;
        //
        //     $ngModelController.$render = function () {
        //         vm.model = $ngModelController.$viewValue;
        //     };
        // }
        
        function initModelValue() {
            
            /**
             * suppose we have set a variable having initial value of `null` for vm.model,
             * checking model against `if(vm.model)` will not pass through.
             *
             * we should check if it is defined or not.
             */
            // if (vm.model) {
            if (!_.isUndefined(vm.model)) {
                
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
                    if (modelService.hasOwnProperty('search') && (_.isUndefined(vm.loadIf) || vm.loadIf)) {
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
            /**
             * if we have selectItem set already and model is null or undefined,
             * then model value is set outside and we should reset it internally.
             */
            else if (vm.selectItem && (_.isNull(vm.model) || _.isUndefined(vm.model))) {
                vm.resetSelect();
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
                
                /**
                 * clear the keyword, make sure this is placed at top.
                 */
                vm.keyword = null;
                
                if (_.isUndefined(value)) {
                    /**
                     * nullify the selectItem. issue #2284
                     */
                    vm.selectItem = null;
                    _selectedItem = null;
                    return;
                }
                
                if (_.isEqual(vm.selectItem, value)) {
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
                    
                }
                else {
                    vm.model = null;
                }
                
                // todo: make sure this does not break anything
                if (vm.$ngModelController) {
                    vm.$ngModelController.$setViewValue(vm.model);
                }
                
                /**
                 * trigger the change event if any listening
                 *
                 * Note that, we invoke the callback within a timeout function.
                 * This is important because if we are to access the model value within the callback function,
                 * vm.model will not be assigned to ng-model="x" until the next digest cycle.
                 * so we ensure that callback is invoked on next tick.
                 */
                if (_.isFunction(vm.onChange)) {
                    $timeout(function () {
                        // vm.onChange({data: _selectedItem});
                        vm.onChange({data: _selectedItem, builder: builder});
                    });
                }
            }
        }
        
        function clickFn(item) {
            if (_.isFunction(vm.onClick)) {
                $timeout(function () {
                    vm.onClick({data: item});
                });
            }
        }
        
        function unlockFn() {
            vm.locked = false;
        }
        
        function resetSelectFn() {
            selectedItemFn(null);
            if (_.isFunction(vm.onReset)) {
                vm.onReset({builder: builder});
            }
        }
        
        function addNewFn() {
            var builderObj = {
                type      : builder.domain,
                add_before: builder.form.enableAddBefore,
                popup     : true,
                suffix    : vm.formHandlerSuffix ? vm.formHandlerSuffix : builder.suffix.form
            };
            restOp.addNew(builderObj);
        }
        
        function editFn() {
            
            if (_.isNull(_selectedItem)) {
                return;
            }
            
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
                type  : builder.domain,
                suffix: vm.formHandlerSuffix ? vm.formHandlerSuffix : builder.suffix.form,
                
                /**
                 * not sure why we have used .get() method here.
                 * get() method will return a promise
                 * and it will throw error of `Can not determine how to edit the record!`
                 * so apparently, we are supposed to use _selectedItem as is.
                 */
                // data      : _selectedItem.get(),
                data: _selectedItem,
                
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
        
        function reloadFn(options) {
            return reload(options);
        }
        
        function reload(options) {
            /**
             * `vm.datasource` is externally supplied datasource,
             * so if it is set then we shouldn't request data from server.
             */
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
            
            /**
             * if we are in loading phase, don't start again.
             */
            if (vm.isLoading) {
                // deferred.reject('isLoading');
                return;
            }
            
            var pkey  = builder.getPrimaryKey();
            var force = options && options.force ? options.force : false;
            
            if (!force) {
                if ((vm.keyword == '' || _.isNull(vm.keyword) || _.isUndefined(vm.keyword))
                    && filterObject.hasOwnProperty(pkey)
                    && _selectedItem
                    && _selectedItem.hasOwnProperty(pkey)
                    && filterObject[pkey] == _selectedItem[pkey]) {
                    // deferred.reject();
                    return;
                }
            }
            
            vm.isLoading = true;
            
            // service.loadRepo(getCombinedFilter());
            
            var modelService   = getModelService();
            var combinedFilter = getCombinedFilter();
            modelService
                .getList(combinedFilter)
                .then(
                    function (data) {
                        aptUtils.emptyAndMerge(vm.data, data);
                        
                        ///
                        
                        /**
                         * set the selectedItem
                         */
                        if (vm.model) {
                            var findBy    = _.set({}, pkey, parseInt(vm.model));
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
        
        // function getCombinedFilter() {
        //     return angular.merge(filterObject, {
        //         key  : vm.keyword,
        //         limit: vm.limit
        //     });
        // }
        
        // function getCombinedFilter() {
        //     var obj  = {};
        //     var pkey = builder.getPrimaryKey();
        //
        //     if (vm.keyword) obj.keyword = vm.keyword;
        //     if (vm.limit) obj.limit = vm.limit;
        //     if (vm.model) obj[pkey] = vm.model;
        //
        //     return obj;
        // }
        
        function getCombinedFilter() {
            var obj  = filterObject;
            var pkey = builder.getPrimaryKey();
            
            if (vm.keyword) {
                obj.keyword = vm.keyword;
            }
            else {
                delete obj.keyword;
            }
            if (vm.limit) {
                obj.limit = vm.limit;
            }
            else {
                delete obj.limit;
            }
            if (vm.model) {
                obj[pkey] = vm.model;
            }
            else {
                delete obj[pkey];
            }
            
            return obj;
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
            
            if (_.isFunction(vm.onLoad)) {
                vm.onLoad({data: vm.data});
            }
            
        }
        
    }
}
aptCreateSelectorDirective.ctr = 0;