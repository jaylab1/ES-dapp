controllers.controller('HomeController@splash', [
    '$scope', '$state', '$stateParams', '$rootScope', '$cordovaDialogs', 'Callback',
    '$ionicHistory', '$ionicPlatform', 'Geolocation', 'Driver', '$ionicLoading',
    'Util',
    function($scope, $state, $stateParams, $rootScope, $cordovaDialogs, Callback,
        $ionicHistory, $ionicPlatform, Geolocation, Driver, $ionicLoading,
        Util) {
        'use strict';

        $ionicHistory.nextViewOptions({
            disableBack: true
        });

        $rootScope.onError = new Callback(function(e) {
            var message = e && e.message ? e.message : "Error while contacting eserviss server";
            $ionicLoading.hide();
            $cordovaDialogs.alert(e.message, 'Ooops!')
        });

        $rootScope.ifLocationEnabled = function(onEnabled, onNotEnabled) {
            if (Util.IsBrowser()) {
                onEnabled.fire();
                return;
            }

            var g = new Geolocation();
            g.isLocationEnabled(new Callback(function(isEnabled) {
                if (isEnabled)
                    onEnabled.fire();
                else {
                    $cordovaDialogs.alert('Please enable your location from settings!', 'Location is OFF')
                        .then(function() {
                            g.openLocationSettings();
                            if (onNotEnabled) onNotEnabled.fire();
                        });
                }

            }), $rootScope.onError);
        };

        $ionicHistory.nextViewOptions({
            disableBack: true
        });



        $ionicPlatform.ready(function() {

            if (Driver.getInstance().isStored()) {
                $rootScope.ifLocationEnabled(new Callback(function() {
                    $state.go("menu.home");
                }), new Callback(function() {
                    $state.go("signin");
                }));

                return;
            }

            $state.go("signin");
        });

        $ionicPlatform.registerBackButtonAction(function() {
            console.log("registerBackButtonAction");
            return false;
        }, 100);

    }
]);