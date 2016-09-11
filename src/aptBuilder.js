/**
 * Created by yasar on 17.01.2016.
 */


function aptBuilder(conf) {
    this.domain             = null;
    this.title              = null; // used for menu entries and possible other needs.
    this.package            = null;
    this.suffix             = {
        form    : 'form',
        list    : 'list',
        selector: 'selector',
        manager : 'manager',
        layout  : 'layout'
    };
    this.onRun              = null;
    this.route              = null;
    this.enableStatusUpdate = false;
    this.create             = {
        listDirective    : true,
        formDirective    : true,
        moduleService    : true,
        modelService     : true,
        selectorDirective: true,
        layoutController : false,
        managerDirective : false
    };

    this.model = {
        normalize           : null,
        restize             : null,
        requestInterceptors : null,
        responseInterceptors: null
    };

    this.service = {
        methods: {},
        edit   : {
            before: null
        }
    };

    this.layout = {
        template  : null,
        controller: null //for callback only
    };

    this.dependencies = ['app.common'];

    this.icon = '';

    $.extend(true, this, conf);
}

aptBuilder.prototype.getRoute = function () {
    if (this.route) {
        return this.route;
    }

    return (this.package ? (this.package == 'modules' ? '' : this.package + '/') : '') + this.domain;
};

aptBuilder.prototype.getModuleName = function () {
    return 'apt.' + (this.package ? (this.package == 'modules' ? '' : this.package + '.') : '') + this.domain;
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
        path = (this.package ? this.package : 'modules') + '/' + this.domain;
        if (!_.isUndefined(what)) {
            path += '/directives/' + this.getSuffix(what);
        }
    }
    return path;
};

aptBuilder.prototype.getTemplateContentFileName = function (what, Templ) {
    var appTemplateKey   = 'appConfig.modules.' + this.domain + '.' + this.getSuffix(what) + '.template';
    var appTemplate      = _.has(Templ, appTemplateKey) ? _.get(Templ, appTemplateKey) : '';
    var templateFileName = '[' + this.getSuffix(what) + '.content]' + (appTemplate ? '.' + appTemplate : '') + '.tpl.html';

    return templateFileName;
};

aptBuilder.prototype.getControllerName = function (type) {
    return _.upperFirst(this.domain) + _.upperFirst(this.getSuffix(type)) + 'Ctrl';
};

aptBuilder.prototype.getControllerAsName = function (type) {
    return 'vm' + _.upperFirst(this.domain) + _.upperFirst(this.getSuffix(type));
};
aptBuilder.prototype.vm                  = function (type, prop) {
    return this.getControllerAsName(type) + '.' + prop;
};
aptBuilder.prototype.getSuffix           = function (type) {
    return _.has(this.suffix, type) ? _.get(this.suffix, type) : type;
};

aptBuilder.prototype.getLayoutTemplate = function () {
    if (this.layout.template) {
        return this.layout.template;
    }

    // view-segment is 3 when the route is like: main.<package>.<module>
    return '<div app-view-segment="3"></div>';
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
    } else {
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
        if (item == null) return;
        if (!_.isArray(props)) props = [props];
        _.forEach(props, function (prop) {
            if (item.hasOwnProperty(prop) && !isNaN(item[prop]) && item[prop] !== null) {
                item[prop] = _.toInteger(item[prop]);
            }
        });
    },
    makeNumber: function (item, props) {
        if (!_.isArray(props)) props = [props];
        _.forEach(props, function (prop) {
            if (item.hasOwnProperty(prop) && !isNaN(item[prop]) && item[prop] !== null) {
                item[prop] = _.toNumber(item[prop]);
            }
        });
    },
    makeBool  : function (item, props) {
        if (item == null) return;
        if (!_.isArray(props)) props = [props];
        _.forEach(props, function (prop) {
            if (item.hasOwnProperty(prop)) {
                item[prop] = !!(item[prop] * 1);
            }
        });
    },
    makeDate  : function (item, props) {
        if (item == null) return;
        if (!_.isArray(props)) props = [props];
        _.forEach(props, function (prop) {
            if (item.hasOwnProperty(prop) && item[prop] !== null) {
                item[prop] = item[prop] ? moment(item[prop]) : moment();
            }
        });
    },

    makeNativeDate: function (item, props) {
        if (item == null) return;
        if (!_.isArray(props)) props = [props];
        _.forEach(props, function (prop) {
            if (item.hasOwnProperty(prop) && item[prop] !== null) {
                item[prop] = new Date(item[prop]);
            }
        });
    },

    formatDateTimeForDb: function (item, props) {
        if (item == null) return;
        if (!_.isArray(props)) props = [props];
        _.forEach(props, function (prop) {
            if (item.hasOwnProperty(prop) && item[prop] !== null) {
                item[prop] = moment(item[prop]).format('YYYY-MM-DD HH:mm');
                ;
            }
        });
    },

    formatTimeForDb: function (item, props) {
        if (item == null) return;
        if (!_.isArray(props)) props = [props];
        _.forEach(props, function (prop) {
            if (item.hasOwnProperty(prop) && item[prop] !== null) {
                item[prop] = moment(item[prop]).format('HH:mm:ss');

            }
        });
    },
    makeTime       : function (item, props) {
        if (item == null) return;
        if (!_.isArray(props)) props = [props];
        _.forEach(props, function (prop) {
            if (item.hasOwnProperty(prop) && item[prop] !== null) {
                item[prop] = moment(item[prop], "HH:mm:ss").toDate();
            }
        });
    },
    makeDateTime   : function (item, props) {
        // console.log('aptBuilder.utils.makeDateTime() should not be used!! Check the code');
        if (item == null) return;
        if (!_.isArray(props)) props = [props];
        _.forEach(props, function (prop) {
            if (item.hasOwnProperty(prop) && item[prop] !== null) {
                item[prop] = moment(item[prop], "YYYY-MM-DDTHH:mm:ssZ").toDate();
                ;
            }
        });
    },
    makeString     : function (item, props) {
        if (item == null) return;
        if (!_.isArray(props)) props = [props];
        _.forEach(props, function (prop) {
            if (item.hasOwnProperty(prop)) {
                if (moment.isMoment(item[prop])) {
                    item[prop] = item[prop].format('YYYY-MM-DD');
                } else if (_.isDate(item[prop])) {
                    item[prop] = moment(item[prop]).format('YYYY-MM-DD');
                } else if (_.isObject(item[prop])) {
                    item[prop] = angular.toJson(item[prop]);
                } else if (_.isBoolean(item[prop])) {
                    item[prop] = item[prop] ? '1' : 'null';
                }
            }
        });
    },
    makeObject     : function (item, props) {
        if (item == null) return;
        if (!_.isArray(props)) props = [props];
        _.forEach(props, function (prop) {
            if (_.has(item, prop) && !_.isEmpty(item[prop]) && !_.isNull(item[prop])) {
                try {
                    item[prop] = angular.fromJson(item[prop]);
                } catch (e) {
                }
            }
        });
    }
};

aptBuilder.prototype.utils = aptBuilder.utils;