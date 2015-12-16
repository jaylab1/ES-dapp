controllers.controller('CarController@select', [
    '$scope', '$state', '$stateParams', 'Http', 'Callback', 'Car',
    '$ionicHistory', '$rootScope',
    function($scope, $state, $stateParams, Http, Callback, Car,
        $ionicHistory, $rootScope) {
        'use strict';

        $ionicHistory.nextViewOptions({
            disableBack: true
        });

        $scope.selected = {};
        $scope.onDoneTapped = function() {
            $stateParams.car = $scope.selected.car;
            $ionicHistory.backView().stateParams = $stateParams;
            $ionicHistory.goBack();
        };

        Car.FindAll(new Callback(function(cars) {
            $scope.cars = cars;
        }), $rootScope.onError);
    }
]);