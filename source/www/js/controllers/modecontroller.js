controllers.controller('ModeController@select', [
    '$scope', '$state', '$stateParams', 'Http', 'Callback', 'Mode',
    '$ionicHistory', '$rootScope',
    function($scope, $state, $stateParams, Http, Callback, Mode,
        $ionicHistory, $rootScope) {
        'use strict';


        $ionicHistory.nextViewOptions({
            disableBack: true
        });
        
        $scope.selected = {};
        $scope.onDoneTapped = function(selectedMode) {
            $stateParams.mode = $scope.selected.mode;
            $ionicHistory.backView().stateParams = $stateParams;
            $ionicHistory.goBack();
        };

        Mode.FindAll(new Callback(function(modes) {
            $scope.modes = modes;
        }), $rootScope.onError);
    }
]);

controllers.controller('ModeController@mapSelect', [
    '$scope', '$state', '$stateParams', 'mapEngine', '$ionicHistory',
    '$rootScope', 'Driver', 'Mode', 'Callback',
    function($scope, $state, $stateParams, mapEngine, $ionicHistory,
        $rootScope, Driver, Mode, Callback) {
        'use strict';

        $ionicHistory.nextViewOptions({
            disableBack: true
        });

        Mode.FindAll(new Callback(function(modes) {
            $scope.modes = modes;
        }), $rootScope.onError);

        var onModeSelected = new Callback(function (mode) {
            Driver.getInstance().mode = mode;
            $state.go("menu.home");
        });

        $scope.onEservissSelected = function () {
            onModeSelected.fire($scope.modes[1]);
        };

        $scope.onEservissPlusSelected = function () {
            onModeSelected.fire($scope.modes[2]);
        };

        $scope.onTaxiSelected = function () {
            onModeSelected.fire($scope.modes[0]);
        };

        
    }
]);