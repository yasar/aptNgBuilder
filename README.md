# aptNgBuilder

The purpose of this document is just to give you a brief idea about what this project can do. 
It is not intended to be a full documentation or guide.

You can feel free to play around.

---

This is a configuration-based angularjs code generator project.
It does not create or alter any files, generates code on-the-fly in the memory.

For a quick overview, please take a look at the below configuration. 

```javascript
var module1 = new aptBuilder({
    domain            : 'module1',
    package           : 'package1',
    icon              : 'fa fa-***',
    enableStatusUpdate: true,
    title             : 'Module 1',
    menu              : {
        target: 'menu_name' // integrates with menu builder
    },
    create            : {
        listDirective    : true,
        formDirective    : true,
        selectorDirective: false,
        managerDirective : true,
        moduleService    : true,
        modelService     : true,
        layoutController : true,
        routeConfig      : true
    },
    
    onRun             : function ($injector) {
        // when the angular app runs for the first time.
        // the code added in here will be executed in angular.run(function(){/* ... */});
        /* ... */
    },
    
    onBeforeAddNew: function($injector, $sccope, builder){
        // called from within module-service
        /* ... */
    },
    
    /*
     * This will create the form directive for editing.
     */
    form: {
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
    },
    
    /*
     * In case we need a custom layout for the module, we can create a layout controller
     */
    layout: {
        templConfig: {
            showSecondaryNavbar : true,
            fillContent         : true,
            transparentHeader   : false,
            showHeader          : true,
            showBreadcrumb      : true,
            showFooter          : false,
            showSidebarLeft     : true,
            showSidebarRight    : false
        },
        template   : null,
        controller : null
    },
    
    /* this will create list directive for data listing in a tabular format */
    list: {
        askConfirmBeforeAddNew: false,
        controller            : function ($injector, $scope, builder) {/* ... */},
        link                  : null,
        onBeforeEdit          : null,
        onBeforeAddNew        : null,
        onBeforeReload        : null,
        rowMenu               : function ($injector, vm) {
            var Menu    = $injector.get('aptMenu');
            var rowMenu = Menu.Item('row-menu',{});
            /* ... */
            
            return rowMenu;
        },
        addNewConf     : {
              suffix: 'manager',
              popup : true,
              stay  : true,
              ignoreFromServer: false, // is good for edit only, when set to true, the record will be re-requested from the server.
         },
        editConf       : null,
        templateWrapper: '<div></div>'
    },
    
    /*
     * Interceptors complies with Restangular.
     * Before sending or after receiving the data, 
     * in case we need to verify or modify the data before it is available to services
     * this is to place to do it.
     */
    model: {
        responseInterceptors: [
            {
                operation: ['get', 'customGET', 'put', 'post', 'getList', 'customGETLIST'],
                callback : function (item) {
                    return item;
                }
            }
        ],
        requestInterceptors: [
            {
                operation: ['get', 'customGET', 'put', 'post', 'getList', 'customGETLIST'],
                callback : function (item) {
                    return item;
                }
            }
        ],
        methods            : {
            element   : [
                {name: 'method_name1', httpMethod: 'get', route: 'route1'},
            ],
            collection: [
                {name: 'method_name2', httpMethod: 'post', route: 'route2'}
            ]
        }
    }
});
```
