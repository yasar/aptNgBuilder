# Usage Examples

Create a new directive
```
(function () {
    var builder = myBuilder; // change the builder name
    var _name   = 'myDirective'; // change the directive name
    
    ///

    angular.module(builder.getModuleName())
        .directive(builder.getDirectiveName(_name), Directive);

    function Directive() {

        return {
            bindToController: {
                param1: '<?' // add/remove scope bindings
            },
            scope           : {},
            replace         : true,
            restrict        : 'EA',
            templateUrl     : builder.getPath(_name) + '/' + _name + '.tpl.html',
            controller      : Controller,
            controllerAs    : builder.getControllerAsName(_name),
        }
    }

    Controller.$inject = ['$injector', '$scope'];
    function Controller($injector, $scope) {
        var vm  = this;
    }

})();
```

Show a directive in a popup
```javascript
var aptUtils = this.$injector.get('aptUtils');
aptUtils.popupDirective(reportBuilder, 'manager', {
    controller: popupController,
    attrs     : {
        for  : "{ id : item.tour_id, for: 'tour' }",
        title: "item.title"
    },
    size      : 'small'
});

function popupController($scope, $injector, $uibModalInstance) {
    var vm   = this;
    $scope.item  = item;
    vm.close = function () {
        $uibModalInstance.close();
    };
}
```