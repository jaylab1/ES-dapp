controllers.factory('Geolocation', [
    'Error', 'Util',
    function(Error, Util) {
        'use strict'
        var Geolocation = augment.defclass({

            constructor: function() {
                this.watchId = null;
            },
            latlngToAddress: function(position, onSuccess, onFail) {
                var geocoder = new google.maps.Geocoder();
                geocoder.geocode({
                    'latLng': position
                }, function(results, status) {
                    if (status == google.maps.GeocoderStatus.OK) {
                        if (results[0]) {
                            onSuccess.fire(results[0].formatted_address);
                        } else {
                            onFail.fire("No results found");
                        }
                    } else {
                        onFail.fire("Geocoder failed due to: " + status);
                    }
                });
            },
            isLocationEnabled: function(onSuccess, onFail) {
                cordova.plugins.diagnostic.isLocationEnabledSetting(function(isEnabled) {
                    onSuccess.fire(isEnabled);
                }, function(e) {
                    onFail.fire(new Error(e, true, true));
                }); 
            },
            openLocationSettings: function() {
                cordova.plugins.diagnostic.switchToLocationSettings();
            },
            findPosition: function(onSuccess, onError) {
                navigator.geolocation.getCurrentPosition(function(r) {
                    var position = {
                        toLatLng: function() {
                            return (new google.maps.LatLng(r.coords.latitude, r.coords.longitude));
                        },
                        lat: function() {
                            return r.coords.latitude;
                        },
                        lng: function() {
                            return r.coords.longitude;
                        }
                    };

                    if (onSuccess) onSuccess.fire(position);
                }, function(e) {
                    if (onError) onError.fire(new Error("Can not initialize service no gps data! change your location!", true, true));

                }, {
                    timeout: 10000,
                    enableHighAccuracy: true
                });
            },
            watch: function(onSuccess, onError) {
                this.watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
                    enableHighAccuracy: true
                });

            },
            stopWatching: function() {
                navigator.geolocation.clearWatch(this.watchId);
            }
        });

        return Geolocation;


    }
]);