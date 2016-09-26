/**
 * Created by yasar on 17.01.2016.
 */

function aptCreateModelService(builder) {
    {
        var modelDefaults = {
            methods: {
                collection: [{name: 'search', httpMethod: 'getList', route: 'search'}],
                element   : [{name: 'search', httpMethod: 'getList', route: 'search'}]
            }
        };

        if (builder.enableStatusUpdate) {
            modelDefaults.methods.collection.push({
                name: 'getApplicableStatuses', httpMethod: 'getList', route: 'getApplicableStatuses'
            });
        }

        /**
         * define default service methods
         */
        _.mergeWith(builder.model, modelDefaults, function (objValue, srcValue) {
            if (_.isArray(objValue)) {
                return objValue.concat(srcValue);
            }
        });
    }


    angular
        .module(builder.getModuleName())
        .factory(builder.getServiceName('model'), factoryFn);

    factoryFn.$inject = ['$injector'];
    function factoryFn($injector) {
        if (!this.srv) {
            var Restangular = $injector.get('Restangular'),
                srv         = Restangular
                    .withConfig(function (RestangularConfigurer) {
                        RestangularConfigurer.setRestangularFields({
                            id: builder.getPrimaryKey()
                        });

                        if (angular.isArray(builder.model.methods.collection)
                            && builder.model.methods.collection.length > 0) {
                            RestangularConfigurer.addElementTransformer(builder.getRestRoute(), true /* collection */,
                                function (restObject) {

                                    if (!angular.isObject(restObject)) {
                                        return restObject;
                                    }

                                    angular.forEach(builder.model.methods.collection, function (method) {
                                        restObject.addRestangularMethod(method.name, method.httpMethod, method.route);
                                    });

                                    return restObject;
                                });
                        }

                        if (angular.isArray(builder.model.methods.element)
                            && builder.model.methods.element.length > 0) {
                            RestangularConfigurer.addElementTransformer(builder.getRestRoute(), false /* element */,
                                function (restObject) {

                                    if (!angular.isObject(restObject)) {
                                        return restObject;
                                    }

                                    angular.forEach(builder.model.methods.element, function (method) {
                                        restObject.addRestangularMethod(method.name, method.httpMethod, method.route);
                                    });

                                    return restObject;
                                });
                        }

                        if (angular.isFunction(builder.model.transformer)) {
                            RestangularConfigurer.addElementTransformer(builder.getRestRoute(),
                                function (restObject) {

                                    builder.model.transformer.call(this, restObject, $injector);

                                    return restObject;
                                });
                        }
                    })
                    .service(builder.getRestRoute());
            srv._route      = builder.getRestRoute();
            this.srv        = srv;
        }
        return this.srv;
    }

    if (builder.model.requestInterceptors || builder.model.responseInterceptors) {
        angular
            .module(builder.getModuleName())
            .config(configFn);


        configFn.$inject = ['$injector'];
        function configFn($injector) {
            var RestangularProvider = $injector.get('RestangularProvider');

            if (builder.model.responseInterceptors) {
                RestangularProvider.addResponseInterceptor(function (data, operation, what, url, response, deferred) {
                    var routeUrl = RestangularProvider.configuration.baseUrl + '/' + builder.getRestRoute();
                    if (data && (routeUrl == url || url.indexOf(routeUrl + '/') == 0)) {
                        processInterceptor.call(this, builder.model.responseInterceptors, operation, data, what, url, $injector);
                    }

                    return data;
                });
            }
            if (builder.model.requestInterceptors) {
                RestangularProvider.addRequestInterceptor(function (data, operation, what, url, response, deferred) {
                    var routeUrl = RestangularProvider.configuration.baseUrl + '/' + builder.getRestRoute();
                    if (data && (routeUrl == url || url.indexOf(routeUrl + '/') == 0)) {
                        processInterceptor.call(this, builder.model.requestInterceptors, operation, data, what, url, $injector);
                    }

                    return data;
                });
            }
        }

        function processInterceptor(interceptors, operation, data, what, url, $injector) {
            if (_.isArray(interceptors)) {
                angular.forEach(interceptors, _process);
            } else {
                _process(interceptors);
            }

            function _process(interceptor) {
                _.defaults(interceptor, {
                    operation: ['get', 'customGET', 'put', 'post', 'getList']
                });

                if (interceptor.operation.indexOf(operation) == -1) {
                    return;
                }

                if (angular.isArray(data)) {
                    angular.forEach(data, function (item) {
                        interceptor.callback.call(this, item, what, url, $injector);
                    });
                } else {
                    interceptor.callback.call(this, data, what, url, $injector);
                }
            }
        }
    }


}