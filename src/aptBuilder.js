function aptBuilder(conf) {
    this.domain             = null;
    this.name               = null;
    this.parentBuilder      = null; // (String) lup module is a good example.
    this.title              = null; // used for menu entries and possible other needs.
    this.package            = null;
    this.icon               = '';
    this.dependencies       = ['app.common'];
    this.suffix             = {
        form    : 'form',
        list    : 'list',
        selector: 'selector',
        manager : 'manager',
        layout  : 'layout'
    };
    this.onRun              = null; // function
    this.onBeforeAddNew     = null; // function, called from within module-service
    this.restRoute          = null;
    this.enableStatusUpdate = false;
    this.enableApproval     = false;
    this.authorize          = false;
    /**
     * segmentMatchLevel is used by aptTempl.reset() method in conjunction with isSegmentAware=true paremeter.
     * it is to compare at what level of segment chain we should decide the segment is changed.
     *
     * use case:
     * lup module has sub modules, and inside lup (definitions) we have inside-menu which should supposed to reside
     * on each sub modules to show the navigation. segmentMatchLevel will tell us at which segment level, we should do the reset.
     *
     * ex:
     * main.lup.position.list
     * main.lup.model.list
     * main.lup.brand.list
     *
     * when we set segmentMatchLevel=2, we will skip the reset as the two level which is main.lup is same for all.
     */
    this.segmentMatchLevel = 0;
    this.create = {
        listDirective    : true,
        formDirective    : true,
        moduleService    : true,
        modelService     : true,
        selectorDirective: true,
        layoutController : false,
        managerDirective : false,
        routeConfig      : false
    };
    /**
     * this property is used in aptCreateSelectorDirective
     *
     * this will remove the related functions from the scope completely,
     * doing so, these functions will not be available at all during the application life cycle.
     */
    this.disable = {
        addNew: false,
        edit  : false
    };
    /**
     * can be used for custom configuration
     */
    this.enable = {};
    this.model       = {
        normalize           : null,
        restize             : null,
        requestInterceptors : null,
        responseInterceptors: null,
        transformer         : null
    };
    this.service     = {
        methods: {},
        edit   : {
            before: null
        }
    };
    this.form        = {
        beforeCreate   : null, // hook, function
        controller     : null, // controller function
        enableAddBefore: true,
        defaults       : null, // default form field values
        link           : null, // link function
        onBeforeSubmit : null, // hook, function
        onDataLoad     : null, // hook, function
        require        : null, // NOT SURE what it does
        muteOnSubmit   : false, // don't broadcast the events (added, update etc.) on form submitted
        showHelp       : false,
        stayOnAdd      : true, // good for when in popup
        stayOnUpdate   : true, // good for when in popup
        title          : null,
        footer         : {
            left : null, //panel footer content for left side
            right: null, //panel footer content for right side
        }
    };
    this.layout      = {
        templConfig: {},
        template   : null,
        controller : null //for callback only
    };
    this.list        = {
        askConfirmBeforeAddNew: false,
        controller            : null,
        link                  : null,
        onBeforeEdit          : null,
        onBeforeAddNew        : null,
        onBeforeReload        : null,
        rowMenu               : null,
        
        /**
         * addNewConf & editConf can be configured as:
         * {
         *      suffix: 'manager',
         *      popup : true,
         *      stay  : true,
         *      ignoreFromServer: false, // is good for edit only, when set to true, the record will be re-requested from the server.
         * }
         */
        addNewConf     : null,
        editConf       : null,
        templateWrapper: '<apt-panel></apt-panel>'
    };
    this.manager     = {
        templateWrapper: '<apt-panel></apt-panel>',
        beforeDataLoad : null,
        controller     : null,
        link           : null,
        onDataLoad     : null
    };
    this.selector    = {
        /**
         * we can configure the individual items with the configuration object
         * or set to `true` to enable it with default settings
         * or set to `false` to disable it completely
         * ex: showMenu=true, showMenu=false, showMenu={...}
         */
        showMenu  : {
            addNew: true,
            edit  : true,
            reload: true,
            reset : true
        },
        controller: null
    };
    this.routeConfig = {
        layout : {
            abstract    : true,
            defaultChild: 'list'
        },
        list   : {},
        manager: {}
    };
    this.widgets     = [];
    
    $.extend(true, this, conf);
}

aptBuilder.prototype.getBuilderName = function () {
    return this.name || this.domain + 'Builder';
};
aptBuilder.prototype.getRoute       = function () {
    window.alert('Check console');
    console.error('getRoute() is deprecated, use getRestRoute() instead');
};
aptBuilder.prototype.getRestRoute   = function () {
    if (this.restRoute) {
        return this.restRoute;
    }
    
    // return (this.package ? (this.package == 'modules' ? '' : this.package + '/') : '') + this.domain;
    return (
               this.package ? (
                                this.package == 'modules' ? '/' : this.package + '/') : '/') + this.domain;
};

aptBuilder.prototype.getModuleName = function () {
    return 'apt.' + (
            this.package ? (
                             this.package == 'modules' ? '' : this.package + '.') : '') + this.domain;
};

aptBuilder.prototype.getDirectiveName = function (type) {
    return 'apt' + _.upperFirst(this.domain) + _.upperFirst(this.getSuffix(type));
};

aptBuilder.prototype.getServiceName = function (suffix) {
    return _.upperFirst(this.domain) + _.upperFirst(suffix);
};

aptBuilder.prototype.getPrimaryKey = function () {
    return _.snakeCase(this.domain) + '_id';
};

aptBuilder.prototype.getPath = function (what) {
    var path = this.path;
    if (!path) {
        path = (
                   this.package ? this.package : 'modules') + '/' + this.domain;
        if (!_.isUndefined(what)) {
            path += '/directives/' + this.getSuffix(what);
        }
    }
    return path;
};

aptBuilder.prototype.getHelpPath = function (what) {
    var path = this.path;
    if (!path) {
        // path = (this.package ? this.package : 'modules') + '/_help';
        path = '/_help';
        if (!_.isUndefined(what)) {
            path += '/' + this.package + '.' + this.domain + '.' + this.getSuffix(what) + '.md';
        }
    }
    return path;
};

aptBuilder.prototype.getTemplateContentFileName = function (what, Templ) {
    var appTemplateKey   = 'appConfig.modules.' + this.domain + '.' + this.getSuffix(what) + '.template';
    var appTemplate      = _.has(Templ, appTemplateKey) ? _.get(Templ, appTemplateKey) : '';
    var templateFileName = '[' + this.getSuffix(what) + '.content]' + (
            appTemplate ? '.' + appTemplate : '') + '.tpl.html';
    
    return templateFileName;
};

aptBuilder.prototype.getControllerName = function (type) {
    return _.upperFirst(this.domain) + _.upperFirst(this.getSuffix(type)) + 'Ctrl';
};

aptBuilder.prototype.getControllerAsName = function (type) {
    return 'vm' + _.upperFirst(this.domain) + _.upperFirst(this.getSuffix(type));
};
aptBuilder.prototype.vm                  = function (type, prop) {
    if (_.isUndefined(prop)) {
        return this.getControllerAsName(type);
    }
    
    return this.getControllerAsName(type) + '.' + prop;
};
aptBuilder.prototype.getSuffix           = function (type) {
    var _private = type + '.suffix';
    var _generic = 'suffix.' + type;
    return _.has(this, _private) ? _.get(this, _private) : (
                                     _.has(this, _generic) ? _.get(this, _generic) : type);
    // return _.has(this.suffix, type) ? _.get(this.suffix, type) : type;
};
/**
 * ex:
 *  mastBuilder.permission('a') => "access_mast_menu"
 *  mastBuilder.permission('a','e') => "access_mast_menu"
 *  mastBuilder.permission('r') => "read_mast_module"
 *  mastBuilder.permission('r','o) => "read_mast_module"
 *  mastBuilder.permission('a','s','approve-cancel') => "read_mast#approve-cancel_module"
 *
 * @param right
 * @param type
 * @param section
 * @returns {string}
 */
aptBuilder.prototype.permission = function (right, type, section) {
    if (right.length == 1) {
        if (right == 'a') {
            right = 'access';
        }
        if (right == 'c') {
            right = 'create';
        }
        if (right == 'r') {
            right = 'read';
        }
        if (right == 'u') {
            right = 'update';
        }
        if (right == 'd') {
            right = 'delete';
        }
    }
    
    var permission = [right];
    
    if (!type) {
        type = (
            right == 'access' ? 'menu' : 'module');
    }
    else if (type.length == 1) {
        if (type == 'e') {
            type = 'menu';
        }
        if (type == 'o') {
            type = 'module';
        }
        if (type == 's') {
            type = 'section';
        }
    }
    
    if (type == 'section') {
        permission.push(_.snakeCase(this.domain) + '#' + section);
    }
    else {
        permission.push(_.snakeCase(this.domain));
    }
    
    permission.push(type);
    
    // return right + '_' + _.snakeCase(this.domain) + '_' + type;
    return permission.join('_');
};

/**
 * part could be segment part name, or an index
 *
 * ex:
 * var builder = mastBuilder;
 * var x = builder.segment('list);
 * >> x = 'main.app002.mast.list';
 *
 * var x= builder.segment(1);
 * >> x = 'main';
 *
 * var x= builder.segment(3);
 * >> x = 'mast';
 *
 */
// aptBuilder.prototype.segmentx = function (part) {
//     if (_.isUndefined(this.segments)) {
//         // this.segments = ['main', this.package, _.snakeCase(this.domain)];
//         this.segments = _.remove(['main', this.package, _.camelCase(this.domain)], function (s) {
//             // package might be empty in some cases, and we don't want them.
//             // this.segments will only contain items that we return true for.
//             return s;
//         });
//     }
//
//     var prefix  = this.segments.join('.');
//     var segment = findSegment(part, this.routeConfig);
//
//     if (_.isUndefined(segment)) {
//         return prefix + '.' + part;
//     }
//
//     if (segment.abstract && segment.defaultChild) {
//         return segment.name + '.' + segment.defaultChild;
//     }
//
//     return segment.name;
//
//     function findSegment(part, routeConfig) {
//         var _search  = prefix + (_.isUndefined(part) ? '' : ('.' + part));
//         var _segment = undefined; //because _.find() will return undefined if not found.
//
//         _segment = _.find(routeConfig, {name: _search});
//
//         if (_.isUndefined(_segment) && _.has(routeConfig, 'others')) {
//             _segment = _.find(routeConfig.others, {name: _search});
//         }
//
//         return _segment;
//     }
// };
aptBuilder.prototype.segment = function (part) {
    var parentBuilder = null;
    if (this.parentBuilder) {
        parentBuilder = window[this.parentBuilder];
    }
    
    if (_.isUndefined(this.segments)) {
        //        this.segments = _.remove(['main', this.package, _.camelCase(this.domain)], function (s) {
        this.segments = _.remove([
            'main', this.package,
            ( parentBuilder ? parentBuilder.domain : null),
            _.camelCase(this.domain)
        ], function (s) {
            /**
             * package might be empty in some cases, and we don't want them.
             * this.segments will only contain items that we return true for.
             */
            return s;
        });
    }
    
    if (_.isNumber(part)) {
        return this.segments[part - 1];
    }
    
    /**
     * when part=true, it is used as flag actually.
     * if the condition is not satisfied (abstract and childState)
     * then we should reset this flag to undefined.
     */
    if (part === true) {
        part = _.get(this, 'routeConfig.layout.abstract') && _.has(this, 'routeConfig.layout.defaultChild')
            ? _.get(this, 'routeConfig.layout.defaultChild')
            : undefined;
        
        if (part == '') {
            part = undefined;
        }
    }
    
    // return this.segments.join('.') + (_.isUndefined(part) ? '' : ( '.' + _.trim(part, '.')));
    
    var segment = this.findSegment(part);
    if (segment) {
        return segment.redirectTo ? segment.redirectTo.name : segment.name;
    }
    
    return this.segments.join('.') + (
            _.isUndefined(part) ? '' : (
           '.' + _.trim(part, '.')));
};
// aptBuilder.prototype.segment = function (part) {
//     var arr = ['main', this.package, _.snakeCase(this.domain), _.trim(part, '.')];
//     if (_.isNumber(part)) {
//         console.log('aptBuilder.segment is deprecated. use manual segmentation instead');
//         return;
//     }
//     return this.segments.join('.');
// };

aptBuilder.prototype.fixSegments = function (routes) {
    var _this = this;
    
    if (_.isUndefined(this.segmentRetryQ)) {
        this.segmentRetryQ = [];
    }
    
    if (_.isUndefined(routes)) {
        routes = this.routeConfig;
    }
    
    _.forEach(routes, function (config) {
        if (_.isArray(config)) {
            _.forEach(config, function (value) {
                _this.segmentRetryQ.push(value);
            });
            return;
        }
        
        if (config.abstract && config.defaultChild) {
            var newSegment = _this.findSegment(config.defaultChild, config);
            if (newSegment) {
                config.redirectTo = newSegment;
                // config.name = newSegment.name;
            }
        }
    });
    
    if (this.segmentRetryQ.length) {
        var next = _.pullAt(this.segmentRetryQ, 0);
        this.fixSegments(next);
    }
};

aptBuilder.prototype.findSegment = function (part, referenceSegment) {
    var segments = _.remove(['main', this.package, _.camelCase(this.domain)], function (s) {
        // package might be empty in some cases, and we don't want them.
        // this.segments will only contain items that we return true for.
        return s;
    });
    var prefix   = referenceSegment && referenceSegment.name ? referenceSegment.name : segments.join('.');
    
    var _search  = prefix + (
            _.isUndefined(part) ? '' : (
                   '.' + part));
    var _segment = undefined; //because _.find() will return undefined if not found.
    
    // _segment = _.find(routeConfig, {name: _search});
    _segment = _.find(this.routeConfig, {name: _search});
    
    if (_.isUndefined(_segment) && _.has(this.routeConfig, 'others')) {
        _segment = _.find(this.routeConfig.others, {name: _search});
    }
    
    return _segment;
};

/**
 *
 * @param part
 * @param searchStr
 * @deprecated
 */
aptBuilder.prototype.url = function (part, searchStr) {
    return this.getUrl(part, searchStr);
};
aptBuilder.prototype.getUrl = function (part, searchStr) {
    var path = part;
    
    if (_.isUndefined(part)) {
        path = _.kebabCase(this.domain);
    }
    
    //    if (this.parentBuilder) {
    //        var parentBuilder = window[this.parentBuilder];
    //        path              = parentBuilder.getUrl() + '/' + path;
    //    }
    
    return '/' + _.trim(path, '/') + (
            searchStr ? '?' + searchStr : '');
};

// aptBuilder.prototype.url3 = function (part) {
//     // var arr = [_.snakeCase(this.domain)];
//     var arr = [_.kebabCase(this.domain)];
//     if (part) {
//         if (_.isNumber(part)) {
//             return arr[part + 1];
//         }
//         arr.push(part);
//     }
//     return '/' + arr.join('/');
// };

// aptBuilder.prototype.url2 = function (part) {
//     if (_.isUndefined(this.parts)) {
//         this.parts = [_.kebabCase(this.domain)];
//     }
//     if (part) {
//         if (_.isNumber(part)) {
//             return this.parts[part - 1];
//         }
//         this.parts.push(part);
//     }
//     return '/' + this.parts.join('/');
// };

aptBuilder.prototype.getLayoutTemplate = function (n) {
    if (this.layout.template) {
        return this.layout.template;
    }
    
    if (_.isUndefined(n)) {
        // view-segment is 3 when the route is like: main.<package>.<module>
        n = 3;
    }
    
    // return '<div app-view-segment="3"></div>';
    return '<!--' + this.domain + '#layout--><ui-view />';
};

aptBuilder.prototype.isAuthorized = function ($injector, checkFor) {
    var result = _.get(this, checkFor + '.isAuthorized');
    if (!_.isUndefined(result)) {
        return result;
    }
    
    ///
    
    var authorizeFor = _.get(this, 'authorize', false);
    if (authorizeFor !== false) {
        var aptAuthorizationService = $injector.get('aptAuthorizationService');
        if (authorizeFor === true) {
            var right = null;
            var type  = 'module';
            switch (checkFor) {
                case 'list':
                    right = 'read';
                    break;
                case 'form':
                    right = 'update';
                    break;
            }
            // authorizeFor = [right, this.domain, type].join('_');
            authorizeFor = this.permission(right, type);
        }
        
        if (!_.isArray(authorizeFor)) {
            authorizeFor = [authorizeFor];
        }
        
        result = aptAuthorizationService.isAuthorized(authorizeFor);
    }
    
    if (_.isUndefined(result)) {
        result = true;
    }
    
    if (this[checkFor]) {
        this[checkFor].isAuthorized = result;
    }
    
    return result;
};
/**
 * can have N parameters
 */
aptBuilder.prototype.getEventName = function () {
    var args = Array.prototype.slice.call(arguments);
    return this.package + '.' + this.domain + '.' + args.join('.');
};

aptBuilder.prototype.generate = function (timeout) {
    
    if (sessionStorage && _.has(sessionStorage, 'ngStorage-User')) {
        var user          = JSON.parse(_.get(sessionStorage, 'ngStorage-User'));
        var licenceConfig = user.licenceConfig;
        
        if (_.has(licenceConfig, 'modules.' + this.domain + '.enabled')) {
            var is_enabled = _.get(licenceConfig, 'modules.' + this.domain + '.enabled');
            if (!is_enabled) {
                return;
            }
        }
    }
    if (!_.isUndefined(timeout)) {
        window.setTimeout(_.bind(proceed, this), timeout);
    }
    else {
        proceed.call(this);
    }
    
    function proceed() {
        aptCreateModule(this);
        
        if (this.create.modelService) {
            aptCreateModelService(this);
        }
        
        if (this.create.moduleService) {
            aptCreateModuleService(this);
        }
        
        if (this.create.formDirective) {
            aptCreateFormDirective(this);
        }
        
        if (this.create.listDirective) {
            aptCreateListDirective(this);
        }
        
        if (this.create.selectorDirective) {
            aptCreateSelectorDirective(this);
        }
        
        if (this.create.layoutController) {
            aptCreateLayoutController(this);
        }
        
        if (this.create.managerDirective) {
            aptCreateManagerDirective(this);
        }
    }
};

aptBuilder.utils = {
    makeInt   : function (item, props) {
        if (item == null) {
            return;
        }
        if (!_.isArray(props)) {
            props = [props];
        }
        _.forEach(props, function (prop) {
            if (item.hasOwnProperty(prop) && !isNaN(item[prop]) && item[prop] !== null) {
                item[prop] = _.toInteger(item[prop]);
            }
        });
    },
    makeNumber: function (item, props) {
        if (!_.isArray(props)) {
            props = [props];
        }
        _.forEach(props, function (prop) {
            if (item.hasOwnProperty(prop) && !isNaN(item[prop]) && item[prop] !== null) {
                item[prop] = _.toNumber(item[prop]);
            }
        });
    },
    makeBool  : function (item, props) {
        if (item == null) {
            return;
        }
        if (!_.isArray(props)) {
            props = [props];
        }
        _.forEach(props, function (prop) {
            if (item.hasOwnProperty(prop)) {
                item[prop] = !!(
                item[prop] * 1);
            }
        });
    },
    makeDate  : function (item, props) {
        /**
         * dtr edit form expects moment date.
         * mast selector/date_installation date format expects native date object.
         * so keep it moment date.
         * we have to find a common base for every case scenarios.
         *
         *
         * // return this.makeNativeDate(item, props);
         */
    
        /**
         * @desc 2017-01-10: seems to be stable with this.
         * moment object still causes issue on mast selector.
         */
        // return this.makeNativeDate(item, props);
    
        /**
         * #desc 2017-01-22: mastContract form, opens up in $dirty state,
         * and remains so after update operation.
         *
         * we have replaced the ae-datetimepicker with moment-picker
         * which has full support for moment objects.
         */
    
        if (item == null) {
            return;
        }
        if (!_.isArray(props)) {
            props = [props];
        }
        
        var dateFormat;
        _.forEach(props, function (prop) {
            if (item.hasOwnProperty(prop) && item[prop] !== null) {
                
                if (item[prop].length == 10) {
                    dateFormat = 'YYYY-MM-DD';
                }
                else {
                    dateFormat = 'YYYY-MM-DD HH:mm:ss';
                }
                item[prop] = item[prop] ? moment(item[prop], dateFormat) : moment();
                //item[prop] = item[prop] ? moment(item[prop]) : moment();
            }
        });
    },
    makeNativeDate: function (item, props) {
        return this.makeDate(item, props);
    },
    
//    makeMoment: function (item, props) {
//        if (item == null) {
//            return;
//        }
//        if (!_.isArray(props)) {
//            props = [props];
//        }
//        _.forEach(props, function (prop) {
//            if (item.hasOwnProperty(prop) && item[prop] !== null) {
//                item[prop] = item[prop] ? moment(item[prop], 'YYYY-MM-DD HH:mm:ss') : moment();
//            }
//        });
//    },
    
//    makeNativeDate: function (item, props) {
//        if (item == null) {
//            return;
//        }
//        if (!_.isArray(props)) {
//            props = [props];
//        }
//        _.forEach(props, function (prop) {
//            if (item.hasOwnProperty(prop) && item[prop] !== null) {
//                if (_.isDate(item[prop])) {
//                    return;
//                }
//
//                // item[prop] = new Date(item[prop]);
//                var t = item[prop].split(/[- :]/);
//                if (t[1]) {
//                    // months in javascript starts from 0.
//                    t[1] = (
//                               +t[1]) - 1;
//                }
//                item[prop] = eval('new Date(' + t.join(',') + ')');
//            }
//        });
//    },
    
//    formatDateTimeForDb: function (item, props) {
//        if (item == null) {
//            return;
//        }
//        if (!_.isArray(props)) {
//            props = [props];
//        }
//        _.forEach(props, function (prop) {
//            if (item.hasOwnProperty(prop) && item[prop] !== null) {
//                item[prop] = moment(item[prop]).format('YYYY-MM-DD HH:mm');
//            }
//        });
//    },
    
//    formatTimeForDb: function (item, props) {
//        if (item == null) {
//            return;
//        }
//        if (!_.isArray(props)) {
//            props = [props];
//        }
//        _.forEach(props, function (prop) {
//            if (item.hasOwnProperty(prop) && item[prop] !== null) {
//                item[prop] = moment(item[prop]).format('HH:mm:ss');
//
//            }
//        });
//    },
    makeTime       : function (item, props) {
        if (item == null) {
            return;
        }
        if (!_.isArray(props)) {
            props = [props];
        }
        _.forEach(props, function (prop) {
            if (item.hasOwnProperty(prop) && item[prop] !== null) {
                item[prop] = moment(item[prop], "HH:mm:ss").toDate();
            }
        });
    },
//    makeDateTime   : function (item, props) {
//        // console.log('aptBuilder.utils.makeDateTime() should not be used!! Check the code');
//        if (item == null) {
//            return;
//        }
//        if (!_.isArray(props)) {
//            props = [props];
//        }
//        _.forEach(props, function (prop) {
//            if (item.hasOwnProperty(prop) && item[prop] !== null) {
//                item[prop] = moment(item[prop], "YYYY-MM-DDTHH:mm:ssZ").toDate();
//                ;
//            }
//        });
//    },
    makeString     : function (item, props) {
        if (item == null) {
            return;
        }
        if (!_.isArray(props)) {
            props = [props];
        }
        _.forEach(props, function (prop) {
            if (item.hasOwnProperty(prop)) {
                if (moment.isMoment(item[prop])) {
                    item[prop] = item[prop].format('YYYY-MM-DD HH:mm:ss');
                }
                else if (_.isDate(item[prop])) {
                    item[prop] = moment(item[prop]).format('YYYY-MM-DD HH:mm:ss');
                }
                else if (_.isObject(item[prop])) {
                    item[prop] = angular.toJson(item[prop]);
                }
                else if (_.isBoolean(item[prop])) {
                    item[prop] = item[prop] ? '1' : 'null';
                }
            }
        });
    },
    makeObject     : function (item, props) {
        if (item == null) {
            return;
        }
        if (!_.isArray(props)) {
            props = [props];
        }
        _.forEach(props, function (prop) {
            if (_.has(item, prop) && !_.isEmpty(item[prop]) && !_.isNull(item[prop])) {
                try {
                    item[prop] = angular.fromJson(item[prop]);
                } catch (e) {
                }
            }
        });
    },
    fixCoordinate  : function (item) {
        item.latitude  = _.replace(item.latitude, ',', '.') * 1;
        item.longitude = _.replace(item.longitude, ',', '.') * 1;
    }
};

aptBuilder.directiveObject = {
    notAuthorized: {
        template: '<apt-inline-help translate>You are not authorized to access this content. Please consult your system administrator.</apt-inline-help>'
    }
};

aptBuilder.prototype.utils           = aptBuilder.utils;
aptBuilder.prototype.directiveObject = aptBuilder.directiveObject;