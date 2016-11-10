/**
 * Created by yasar on 17.01.2016.
 */

function aptCreateModuleService(builder) {
    if (builder.domain) builder.Domain = _.upperFirst(builder.domain);

    angular
        .module(builder.getModuleName())
        .factory(builder.getServiceName('service'), fn);

    fn.$inject = ['$injector'];
    function fn($injector) {
        if (!this.service) {
            this.service = new aptModuleService($injector);
        }
        return this.service;
    }

    function aptModuleService($injector) {
        //console.log(builder.getServiceName('service') + ' module service initialized');
        this.$injector = $injector;

        var NotifyingService = $injector.get('NotifyingService');
        var Restangular      = $injector.get('Restangular');
        var restOp           = $injector.get('restOperationService');
        var $timeout         = $injector.get('$timeout');
        var aptUtils         = $injector.get('aptUtils');
        var model            = this.model = $injector.has(builder.getServiceName('model')) ? $injector.get(builder.getServiceName('model')) : null;
        var vars = this.vars = {selected: null};
        var repo = this.repo = [];
        var flags = this.flags = {
            isLoading: false
        };
        var lastLoadTime = null;
        var self         = this;
        var serviceObj   = {
            getFlags        : getFlags,
            setSelected     : setSelected,
            onSelectedChange: onSelectedChange,
            edit            : edit,
            get             : get,
            update          : update /* backward-compatibility */,
            add             : add /* backward-compatibility */,
            'delete'        : deleteFn /* backward-compatibility */,
            getItems        : getRepo /* backward-compatibility */,
            getRepo         : getRepo,
            loadRepo        : loadRepo,
            resetRepo       : resetRepo,
            notify          : notify,
            /**
             * shows add-new form, will check the config for popup and size options.
             */
            addNew          : addNew,
            isBusy          : isBusy,
            vars            : vars,
            db              : {
                load    : loadRepo /* backward-compatibility */,
                add     : add,
                update  : update,
                'delete': deleteFn
            }
        };

        if (builder.enableStatusUpdate) {
            serviceObj.updateStatus = updateStatus;
        }

        if (_.get(builder, 'disable.addNew') === true) {
            delete serviceObj.addNew;
        }

        if (_.get(builder, 'disable.edit') === true) {
            delete serviceObj.edit;
        }

        this.serviceObj = serviceObj;

        if (builder.service.init) {
            builder.service.init.call(serviceObj, $injector);
        }

        if (builder.service.methods) {
            angular.forEach(builder.service.methods, function (fn, method) {
                this[method] = fn.bind(self);
            }, serviceObj);
        }


        return serviceObj;

        function getFlags() {
            return flags;
        }

        function updateStatus(item) {
            var dialogs        = $injector.get('dialogs');
            var $templateCache = $injector.get('$templateCache');

            $templateCache.put(builder.getPath('cache') + '/statusChangePopup.tpl.html', getTemplate());
            dialogs.create(builder.getPath('cache') + '/statusChangePopup.tpl.html', controllerFn, undefined, {
                keyboard : false,
                backdrop : true,
                size     : 'sm',
                animation: true
            }, 'vmStatusForm');

            controllerFn.$inject = ['$injector', '$uibModalInstance'];
            function controllerFn($injector, $uibModalInstance) {

                // Templ.blurPage(true);

                var vm               = this;
                var model            = $injector.get(builder.getServiceName('model'));
                var $rootScope       = $injector.get('$rootScope');
                var NotifyingService = $injector.get('NotifyingService');
                var aptUtils         = $injector.get('aptUtils');
                var $newScope        = $rootScope.$new();

                vm.statuses          = [];
                vm.isStatusUpdatable = null;

                model.getApplicableStatuses().then(function (data) {
                    if (_.find(data, {type_id: vm.form.data.status_id})) {
                        aptUtils.emptyAndMerge(vm.statuses, data);
                        vm.isStatusUpdatable = true;
                    } else {
                        vm.isStatusUpdatable = false;
                    }
                });


                vm.form = new aptUtils.form(builder.domain, item, {
                    $scope   : $newScope,
                    stay     : true,
                    mute     : true,
                    hasParent: true
                });

                vm.setStatus = function (status) {
                    vm.form.data.status_id = status.type_id;

                    var $formController = $('[name=' + vm.form.name + ']').data('$formController');
                    if ($formController && $formController.$setDirty) {
                        $formController.$setDirty();
                    }
                };

                NotifyingService.subscribe($newScope, builder.domain + '.formCanceled', function () {
                    $uibModalInstance.close();
                });
            }

            function getTemplate() {
                return '<form ng-submit="vmStatusForm.form.submit()" name="{{vmStatusForm.form.name}}" role="form" novalidate>' +
                       ' <apt-panel class="no-margin" form="vmStatusForm.form">' +
                       ' <apt-panel-title>' +
                       ' <i class="' + builder.icon + ' position-left"></i>' +
                       ' <span class="text-semibold" translate>Status Update</span>' +
                       ' </apt-panel-title>' +
                       ' <apt-panel-body class="text-center">' +
                       ' <div ng-if="vmStatusForm.isStatusUpdatable==null"' +
                       ' class="content"><span translate>Please wait..</span>' +
                       ' </div>' +
                       ' <div ng-if="vmStatusForm.isStatusUpdatable==false"' +
                       ' class="alert alert-warning"><span translate>The status for this record can not be changed.</span>' +
                       ' </div>' +
                       ' <div ng-if="vmStatusForm.isStatusUpdatable==true">' +
                       ' <button type="button"' +
                       ' class="btn btn-default btn-float ml-10 mr-10"' +
                       ' ng-class="{\'btn-info\':vmStatusForm.form.data.status_id == status.type_id}"' +
                       ' ng-click="vmStatusForm.setStatus(status)"' +
                       ' data-ng-repeat="status in vmStatusForm.statuses">' +
                       ' <i data-ng-class="{true:\'icon-play4\', false: \'icon-pause2\'}[vmStatusForm.form.data.status_id == status.type_id]"></i>' +
                       ' <span>{{status.name|translate|startCase}}</span>' +
                       ' </button>' +
                       ' <input type="hidden" ng-model="vmStatusForm.form.data.status_id" type="hidden" />' +
                       ' </div>' +
                       ' </apt-panel-body>' +
                       ' <apt-panel-footer ng-show="vmStatusForm.isStatusUpdatable==true">' +
                       ' <apt-panel-footer-left></apt-panel-footer-left>' +
                       ' <apt-panel-footer-right defaults></apt-panel-footer-right>' +
                       ' </apt-panel-footer>' +
                       ' </apt-panel>' +
                       ' </form>';
            }
        }

        function isBusy() {
            return flags.isLoading;
        }

        function resetRepo() {
            repo.splice(0, repo.length);
        }

        function notify(event, data, stay) {
            //$timeout(function () {
            //NotifyingService.notify(builder.domain + ':' + event, data);
            NotifyingService.notify(builder.domain + ':' + event, {stay: stay, data: data});
            NotifyingService.notify('record.' + event, {stay: stay});
            //});
        }

        function setSelected(item) {
            vars.selected = item;
            notify('selected');
        }

        function onSelectedChange($scope, callbackFn) {
            if (!angular.isObject($scope) || !$scope.hasOwnProperty('$parent')) {
                return;
            }

            NotifyingService.subscribe($scope, builder.domain + '-selected', function () {
                callbackFn(vars.selected);
            });
        }


        function edit(item, editConf) {
            var data, proceed = true;

            if (!editConf) {
                editConf = {
                    popup : true,
                    stay  : true,
                    suffix: 'form'
                }
            }

            if (editConf.popup) {
                if (angular.isObject(item)) {
                    if (item.fromServer) {
                        data = item;
                    } else {
                        data = model.one(item[builder.domain + '_id']).get();
                    }
                } else {
                    data = model.one(item).get();
                }
            } else {
                data = item;
            }

            if (builder.service.edit.before) {
                proceed = builder.service.edit.before.call(this, $injector, data, popup);
            }

            if (proceed) {
                var _builder = _.merge({_builder: builder}, {
                    data   : data,
                    popup  : editConf.popup,
                    type   : builder.domain,
                    stay   : editConf.stay ? editConf.stay : false,
                    suffixx: _.has(builder, 'form.suffix') && builder.form.suffix
                        ? builder.form.suffix
                        : editConf.suffix,
                    suffix : _.has(editConf, 'suffix')
                        ? editConf.suffix
                        : (
                        _.has(builder, 'form.suffix') && builder.form.suffix
                            ? builder.form.suffix
                            : 'form')
                });
                // restOp.edit({type: builder.domain, data: data, popup: popup});
                restOp.edit(_builder);
            }
        }

        function update(item, mute) {
            if (!_.has(item, 'restangularized')) {
                try {
                    Restangular.restangularizeElement(null, item, builder.getRoute());
                } catch (e) {
                    throw {
                        type   : 'structural-error',
                        message: 'item to-be-updated is not restangularized and manual attempt is failed. Make sure it is so before putting it to update process!'
                    };
                }
            }

            if (/**
                 * this control is specific to settings module
                 * we do not use setting_id but _section/key/value will be decisive
                 */
                !_.has(item, '__section')) {

                if (!_.has(item, _.snakeCase(builder.domain) + '_id')) {
                    throw {
                        type   : 'structural-error',
                        message: 'Restangularized item does not have the primary key!'
                    }
                }

                if (!_.isFinite(_.get(item, _.snakeCase(builder.domain) + '_id') * 1)) {
                    throw {
                        type   : 'structural-error',
                        message: 'The primary-key of the restangularized item must be an integer!'
                    }
                }
            }

            var _mute = false,
                _stay = false;

            if (_.isObject(mute)) {
                _mute = mute.mute;
                _stay = mute.stay;
            } else {
                _mute = mute;
            }

            return Restangular.copy(item)
            // return item
                .put()
                .then(function (data) {
                    var filterObj = {},
                        idx;

                    filterObj[_.snakeCase(builder.domain) + '_id'] = data[_.snakeCase(builder.domain) + '_id'];
                    //filterObj[builder.domain + '_id'] = data[builder.domain + '_id'];
                    //idx = _.findIndex(repo, filterObj);
                    //repo.splice(idx, 1, data);

                    var targetObj = _.find(repo, filterObj);
                    if (targetObj) {
                        angular.merge(targetObj, data);
                    } else {
                        /**
                         * @date 29.04.2016
                         * @author Murat Demir
                         * Nexus projesinde update işleminden sonra dönen data repoya push edilmiyordu.
                         * Todo : Diğer projelerde etkilenen yerler olacak mı kontrol edilecek.
                         */
                        repo.push(data);
                    }

                    if (!_mute) {
                        notify('updated', data, _stay);
                    }
                });
        }

        function addNew(_builder) {

            var gettextCatalog = $injector.get('gettextCatalog');

            _builder = _.merge({
                _builder   : builder,
                initialData: null,
                add_before : builder.form.enableAddBefore,
                popup      : true,
                stay       : true,
                suffix     : builder.suffix.form,
                confirm    : {
                    // required: false,
                    required: builder.list.askConfirmBeforeAddNew,
                    title   : gettextCatalog.getString('Confirm'),
                    message : gettextCatalog.getString('Are you sure that you want to continue?')
                },
                $scope     : null
            }, _builder);

            if (_builder.confirm.required) {

                var Templ    = $injector.get('aptTempl');
                var aptUtils = $injector.get('aptUtils');

                Templ.blurPage(true);

                aptUtils.showConfirm(_builder.confirm.title, _builder.confirm.message, function () {
                    Templ.blurPage(false);
                    processAddBefore();

                }, function () {
                    Templ.blurPage(false);
                });

            } else {
                processAddBefore();
            }

            function processAddBefore() {
                if (_.has(builder, 'onBeforeAddNew') && _.isFunction(builder.onBeforeAddNew)) {
                    builder.onBeforeAddNew.call(this, $injector, _builder.$scope, builder).then(function () {
                        proceed();
                    }, function () {
                        // do nothing
                    });
                } else {
                    proceed();
                }
            }

            function proceed() {
                _builder.suffix = _.has(builder, 'form.suffix') && builder.form.suffix
                    ? builder.form.suffix
                    : _builder.suffix;

                restOp.addNew(_builder);
            }
        }

        function add(item, mute) {

            var _mute = false,
                _stay = false;

            if (_.isObject(mute)) {
                _mute = mute.mute;
                _stay = mute.stay;
            } else {
                _mute = mute;
            }

            if (!_.has(item, 'restangularized') || !_.get(item, 'restangularized')) {
                angular.merge(item, model.one());
            }

            return Restangular.copy(item).post().then(function (data) {
                repo.push(data);

                if (!_mute) {
                    notify('added', data, _stay);
                }

                return data;
            });
        }

        function deleteFn(item, datasource) {
            if(_.isUndefined(datasource)){
                datasource=repo;
            }
            restOp.delete({type: builder.domain, data: item, allData: datasource, route: builder.getRestRoute()});
        }

        function getRepo() {
            return repo;
        }

        function dbLoadFn() {
            return loadRepo();
        }

        function get(id) {
            return model.one(id).get();
        }

        function loadRepo(filter, useCache, options) {
            if (flags.isLoading) {
                return;
            }

            if (angular.isUndefined(useCache)) {
                useCache = false;
            }

            if (useCache) {
                var now = new Date();
                if (lastLoadTime != null) {
                    var diff  = now.getTime() - lastLoadTime.getTime();
                    var limit = 300000; //msec
                    //var limit = 10; //msec
                    if (diff < limit) {
                        notify('loaded');
                        return;
                    }
                }
            }

            var bsOverlayReferenceId = null;

            flags.isLoading = true;
            if (_.has(options, 'uniqId')) {
                var bsOverlay        = $injector.get('bsLoadingOverlayService');
                bsOverlayReferenceId = 'ref_' + options.uniqId;
                bsOverlay.start({
                    referenceId: bsOverlayReferenceId
                });
            }

            if (!angular.isObject(filter)) {
                filter = {};
            } else {
                filter = _.omit(filter, $injector);
            }

            if (filter) {
                /**
                 * fix the date value if there is any
                 */
                _.forOwn(filter, function (value, key, filter) {
                    if (moment.isMoment(value)) {
                        filter[key] = value.format('YYYY-MM-DD');
                    } else if (_.isDate(value)) {
                        filter[key] = moment(value).format('YYYY-MM-DD');
                    }
                });
            }

            model.getList(filter).then(function (data) {
                aptUtils.emptyAndMerge(repo, data);
                //angular.merge(repo, data);
                notify('loaded');

                if (options && _.isFunction(options.onLoaded)) {
                    options.onLoaded(repo);
                }

                endLoading();
            }, function (err) {
                endLoading();
                aptUtils.showError(err.status, err.statusText, {});
                console.error(err);
            });

            function endLoading() {
                flags.isLoading = false;
                if (bsOverlay && bsOverlay.isActive(bsOverlayReferenceId)) {
                    bsOverlay.stop({
                        referenceId: bsOverlayReferenceId
                    });
                }
            }

            lastLoadTime = now;
        }
    }
}