controllers.controller('DriverController@signin', [
    '$scope', '$state', '$stateParams', 'Driver', 'Callback',
    'Geolocation', '$rootScope', '$ionicLoading', 'Car', '$ionicHistory','$cordovaDevice',
    function($scope, $state, $stateParams, Driver, Callback,
        Geolocation, $rootScope, $ionicLoading, Car, $ionicHistory,$cordovaDevice) {
        'use strict';



        $scope.mode = $stateParams.mode || $stateParams.data && $stateParams.data.mode;
        // $scope.car = $stateParams.car || $stateParams.data && $stateParams.data.car;
        $scope.login = $stateParams.data && $stateParams.data.login || {};
        var emailElem = angular.element(document.getElementById("signin-email"));
        var uuid = "";
        document.addEventListener("deviceready", function () { uuid=$cordovaDevice.getUUID();});
        $scope.onLoginTapped = function(login) {
            if (emailElem.val() && emailElem.val().search('@') === -1) {
                $scope.login.email = emailElem.val() + "@gmail.com";
            }

            if (login && login.email && login.password) {

                Driver.getInstance().email = login.email;
                Driver.getInstance().password = login.password;
                Driver.getInstance().uuid = uuid;
                Driver.getInstance().login(new Callback(function() {

                    /*Driver.getInstance().car = $scope.car;*/
                    $rootScope.ifLocationEnabled(new Callback(function() {

                        Driver.getInstance().store();

                        $ionicLoading.show({
                            template: 'Login Succeeded, initializing your trip now!'
                        });

                        /*Driver.getInstance().car = $scope.car;*/
                        Driver.getInstance().initTrip(new Callback(function() {
                            $ionicLoading.hide();
                            $ionicHistory.nextViewOptions({
                                disableBack: true
                            });
                            $state.go("menu.home");
                        }), $rootScope.onError);

                    }));


                }), $rootScope.onError);

            }




        };

    }
]);

controllers.controller('DriverController@sidemenu', [
    '$scope', '$state', '$stateParams', 'Driver', 'Callback',
    '$rootScope', '$ionicHistory',
    function($scope, $state, $stateParams, Driver, Callback,
        $rootScope, $ionicHistory) {
        'use strict';

        $scope.photo = Driver.getInstance().getProfilePicture();
        $scope.name = Driver.getInstance().firstname + " " + Driver.getInstance().lastname;
        $scope.car = Driver.getInstance().car;
        $scope.driver = Driver.getInstance();
        $scope.state = "sign in";

        $scope.onSignoutTapped = function() {
            Driver.getInstance().signout(new Callback(function() {
                $ionicHistory.nextViewOptions({
                    disableBack: true
                });
                $state.go("signin");
            }), $rootScope.onError);
        }
    }
]);

controllers.controller('DriverController@home', [
    '$scope', '$state', '$stateParams', 'mapEngine', 'Driver',
    'Callback', '$rootScope', '$ionicPopup', '$timeout', 'Mode',
    '$animate', 'Util', 'Error', '$ionicBackdrop', '$ionicHistory',
    '$ionicModal',
    function($scope, $state, $stateParams, mapEngine, Driver,
        Callback, $rootScope, $ionicPopup, $timeout, Mode,
        $animate, Util, Error, $ionicBackdrop, $ionicHistory,
        $ionicModal) {
        'use strict';

        var googlePlaceSelectEvent = null;

        Driver.getInstance().findPosition(new Callback(), new Callback());
        /*$ionicPopup.alert({
            templateUrl: "templates/payment.popup.html",
            cssClass: "eserviss-popup-alert",
            scope: $scope,
            buttons: [{
                text: 'CONFIRM PAYMENT',
                type: 'button-energized',
            }]
        });*/
        /*$ionicPopup.confirm({
            templateUrl: "templates/hailrequest.popup.html",
            cssClass: "eserviss-popup",
            scope: $scope
        });
        return;*/



        $scope.driver = Driver.getInstance();
        $scope.driver.loadSync(); //sync road hails and app hails

        var storeModes = null,
            driverMarker = null,
            hailRequestPopup = null;
        $scope.slots = [];
        $scope.modes = [];

        Mode.FindAll(new Callback(function(modes) {
            storeModes = modes;
            $scope.modes = modes;

            //on request recieved
            Driver.getInstance().onRequsted = new Callback(function(mode, request) {
                mode.playSound();
                mapEngine.pauseWatchMarker();
                if (request.to.lat && request.to.lng) {
                    mapEngine.drawRoute({
                        origin: [request.from.lat, request.from.lng],
                        destination: [request.to.lat, request.to.lng],
                        travelMode: 'driving',
                        strokeColor: '#131540',
                        strokeOpacity: 0.6,
                        strokeWeight: 6
                    });
                } else if (request.from.lat && request.from.lng) {
                    Driver.getInstance().findPosition(new Callback(function(pos) {

                        mapEngine.drawRoute({
                            origin: [pos.lat(), pos.lng()],
                            destination: [request.from.lat, request.from.lng],
                            travelMode: 'driving',
                            strokeColor: '#131540',
                            strokeOpacity: 0.6,
                            strokeWeight: 6
                        });

                    }), $rootScope.onError);


                }

                $scope.onRequestAcceptTapped = function() {
                    Driver.getInstance().mode = mode;
                    mapEngine.resumeWatchMarker();
                    request.accept(Driver.getInstance(), new Callback(function() {
                        hailRequestPopup.close();
                    }), $rootScope.onError);

                };


                $scope.onRequestDeclineTapped = function() {
                    mapEngine.removeRoutes();
                    mapEngine.setZoom(15);
                    mapEngine.resumeWatchMarker();
                    request.decline(Driver.getInstance(), new Callback(function() {
                        hailRequestPopup.close();
                    }), $rootScope.onError);

                };

                if (hailRequestPopup !== null) hailRequestPopup.close();
                $scope.request = request;
                hailRequestPopup = $ionicPopup.confirm({
                    templateUrl: "templates/hailrequest.popup.html",
                    cssClass: "eserviss-popup",
                    scope: $scope
                });

            });


        }), $rootScope.onError);





        Driver.getInstance().onPinged = new Callback(function() {
            if (Driver.getInstance().position)
                mapEngine.watchMarker(Driver.getInstance().position.lat(), Driver.getInstance().position.lng(), Driver.getInstance().markerIcon);
        });

        $ionicModal.fromTemplateUrl('templates/internetoff.html', {
            scope: $scope,
            animation: 'slide-in-up',
            hardwareBackButtonClose: false
        }).then(function(modal) {

            Driver.getInstance().ping(new Callback(function() {
                modal.hide();
            }), new Callback(function() {
                mapEngine.removeRoutes();
                mapEngine.setZoom(15);
                if (hailRequestPopup !== null) hailRequestPopup.close();
                $rootScope.onError.fire(new Error("Hail request by passed"));
            }), new Callback(function() { //force signout command
                $ionicHistory.nextViewOptions({
                    disableBack: true
                });
                $state.go("signin");

            }), new Callback(function(userCancellation) {
                console.log(userCancellation);
                $scope.cancellation = userCancellation;

                $ionicPopup.alert({
                    templateUrl: "templates/cancellation.popup.html",
                    cssClass: "eserviss-popup-alert",
                    scope: $scope,
                    buttons: [{
                        text: 'GOT IT',
                        type: 'button-energized',
                    }]
                }).then(function() {
                    //userCancelled
                    for (var i = 0; Driver.getInstance().mode && i < Driver.getInstance().mode.occupiedSlots.length; i++) {
                        if (Driver.getInstance().mode.occupiedSlots[i].rideId == userCancellation.rideId) Driver.getInstance().mode.occupiedSlots[i].userCancelled(Driver.getInstance());
                    }
                });
            }), new Callback(function() {
                modal.show();
            }));
        });





        var onModeSelected = new Callback(function(mode) {
            var modeConfirmPopup = null;

            /*$scope.modes = null;*/

            //confirm mode selection
            $scope.message = Util.String("YOU SELECTED {0}", [mode.name]);
            $scope.onConfirmAcceptedTapped = function() {
                modeConfirmPopup.close();
                Driver.getInstance().mode = mode;
                //Driver.getInstance().mode.pickupRoadHail(Driver.getInstance(), null, $rootScope.onError);
                $scope.isSlotsShown = true;
            };
            $scope.onConfirmDeclinedTapped = function() {
                modeConfirmPopup.close();
                $scope.modes = storeModes;
            };
            modeConfirmPopup = $ionicPopup.confirm({
                templateUrl: "templates/confirm.popup.html",
                cssClass: "eserviss-popup",
                scope: $scope
            });

        });

        $scope.onModeTapped = function(mode) {
            onModeSelected.fire(mode);
        };


        var onOccupiedSlotSelected = new Callback(function(request) {
            var requestPopup = null;
            //confirm road hail selection
            $scope.message = Util.String("YOU SELECTED TO {0} {1}", [request.state, request.userName]);
            $scope.onConfirmAcceptedTapped = function() {

                if (request.state === "ARRIVE")
                    request.arrive(Driver.getInstance(), new Callback(function() {
                        requestPopup.close();
                    }), $rootScope.onError);
                else if (request.state === "PICKUP")
                    request.pickup(Driver.getInstance(), new Callback(function() {
                        requestPopup.close();
                    }), $rootScope.onError);
                else if (request.state === "DROPOFF") {
                    request.dropoff(Driver.getInstance(), new Callback(function() {
                        requestPopup.close();
                        console.log(request);
                        request.checkPayment(new Callback(function(fee) {
                            Driver.getInstance().saveDailyIncome(fee);
                            $scope.payment = {
                                title: "APP HAIL",
                                subTitle: Util.String("Please get paid from {0}", [request.userName]),
                                ride: {
                                    id: request.rideId
                                },
                                fee: fee
                            };

                            $ionicPopup.alert({
                                templateUrl: "templates/payment.popup.html",
                                cssClass: "eserviss-popup-alert",
                                scope: $scope,
                                buttons: [{
                                    text: 'CONFIRM PAYMENT',
                                    type: 'button-energized',
                                }]
                            }).then(function() {
                                request.confirmPayment(Driver.getInstance(), null, $rootScope.onError);
                                if (Driver.getInstance().mode && Driver.getInstance().mode.occupiedSlots.length === 0 && Driver.getInstance().mode.roadSlots.length === 0) {
                                    Driver.getInstance().mode = null;
                                }
                            });

                        }), $rootScope.onError);
                        mapEngine.removeRoutes();
                        mapEngine.setZoom(15);
                    }), $rootScope.onError);
                }
            };
            $scope.onConfirmDeclinedTapped = function() {
                requestPopup.close();
            };
            requestPopup = $ionicPopup.confirm({
                templateUrl: "templates/confirm.popup.html",
                cssClass: "eserviss-popup",
                scope: $scope
            });
        });

        var onRoadSlotSelected = new Callback(function(roadSlot) {
            var roadHailPopup = null;
            //confirm road hail selection
            $scope.message = "YOU SELECTED TO DROPP OFF A ROAD HAIL";
            $scope.onConfirmAcceptedTapped = function() {
                roadHailPopup.close();
                Driver.getInstance().mode.dropoffRoadHail(Driver.getInstance(), roadSlot, null, new Callback(function(fee) {
                    Driver.getInstance().saveDailyIncome(fee);
                    $scope.payment = {
                        title: "ROAD HAIL",
                        ride: roadSlot,
                        fee: fee
                    };
                    $ionicPopup.alert({
                        templateUrl: "templates/payment.popup.html",
                        cssClass: "eserviss-popup-alert",
                        scope: $scope,
                        buttons: [{
                            text: 'CONFIRM PAYMENT',
                            type: 'button-energized',
                        }]
                    }).then(function() {
                        $scope.driver.loadSync(); //sync road hails and app hails
                        if (Driver.getInstance().mode.occupiedSlots.length === 0 && Driver.getInstance().mode.roadSlots.length === 0) {
                            Driver.getInstance().mode = null;
                        }
                    });

                }), $rootScope.onError);
            };
            $scope.onConfirmDeclinedTapped = function() {
                roadHailPopup.close();
            };
            roadHailPopup = $ionicPopup.confirm({
                templateUrl: "templates/confirm.popup.html",
                cssClass: "eserviss-popup",
                scope: $scope
            });

        });

        var onEmptySlotSelected = new Callback(function() {
            var roadHailPopup = null,
                popupTemplateUrl = "templates/confirm.popup.html",
                cssClass = "eserviss-popup";

            //confirm road hail selection
            $scope.message = "ROAD HAIL";
            var dropoffParams = null;
            $scope.onLocationSelected = function(place) {
                if (!Driver.getInstance().mode.isTaxi()) {
                    dropoffParams = {
                        address1: place.formatted_address,
                        lat1: place.geometry.location.lat(),
                        lng1: place.geometry.location.lng()
                    };
                }
            };

            $scope.onConfirmAcceptedTapped = function(data) {

                Driver.getInstance().mode.pickupRoadHail(Driver.getInstance(), new Callback(function(roadSlot) {
                    roadHailPopup.close();

                    if (!Driver.getInstance().mode.isTaxi()) {
                        Driver.getInstance().mode.roadPayment(roadSlot, Driver.getInstance(), new Callback(function(fee) {
                            $scope.payment = {
                                title: "ROAD HAIL",
                                ride: roadSlot,
                                fee: fee
                            };

                            $ionicPopup.alert({
                                templateUrl: "templates/payment.popup.html",
                                cssClass: "eserviss-popup-alert",
                                scope: $scope,
                                buttons: [{
                                    text: 'CONFIRM PAYMENT',
                                    type: 'button-energized',
                                }]
                            });
                        }), $rootScope.onError);
                    }

                }), $rootScope.onError, dropoffParams);
                if (googlePlaceSelectEvent) {
                    googlePlaceSelectEvent();
                    googlePlaceSelectEvent = null
                }
            };
            $scope.onConfirmDeclinedTapped = function() {
                roadHailPopup.close();
                if (googlePlaceSelectEvent) {
                    googlePlaceSelectEvent();
                    googlePlaceSelectEvent = null
                }
            };

            if (!Driver.getInstance().mode.isTaxi()) {
                $scope.isPlaces = true;
                popupTemplateUrl = "templates/confirminput.popup.html";
                cssClass += " popup-top";

                googlePlaceSelectEvent = $scope.$on("g-places-autocomplete:select", function(event, place) {
                    $scope.onLocationSelected(place);
                });
            }

            roadHailPopup = $ionicPopup.confirm({
                templateUrl: popupTemplateUrl,
                cssClass: cssClass,
                scope: $scope
            });
            /*$ionicBackdrop.release();*/




        });

        var handleSlotDragRight = function(event) {
            event.element.css("position", "relative");
            event.element.css("left", event.deltaX + "px");
        };

        var handleSlotDragRelease = function(event, onSelected) {
            var offset = (event.element[0].offsetWidth - 300);
            if (event.deltaX > offset) {
                event.element.addClass('fx-zoom-right');
                event.element.css("left", "0px");
                onSelected.fire();
            } else {
                event.element.css("left", "0px");
            }
        };



        $scope.onRoadSlotDragRight = handleSlotDragRight;
        $scope.onRoadSlotDragRelease = function(event, slot) {
            handleSlotDragRelease(event, new Callback(function() {
                onRoadSlotSelected.fire(slot);
            }));
        };

        /*$scope.onRoadSlotTapped = function(roadSlot) {
            if (Driver.getInstance().mode.isTaxi())
                return;

            var roadHailPopup = null;

            //confirm road hail selection
            $scope.message = "YOU CAN EDIT DROPOFF LOCATION BELOW";

            $scope.onLocationSelected = function(place) {
                roadSlot.address1 = place.formatted_address;
                roadSlot.lat1 = place.geometry.location.lat();
                roadSlot.lng1 = place.geometry.location.lng();
            };

            $scope.onConfirmAcceptedTapped = function(data) {
                roadHailPopup.close();
                Driver.getInstance().mode.editRoadHail(Driver.getInstance(), roadSlot, null, $rootScope.onError);
            };

            $scope.onConfirmDeclinedTapped = function() {
                roadHailPopup.close();
            };

            roadHailPopup = $ionicPopup.confirm({
                templateUrl: "templates/confirminput.popup.html",
                cssClass: "eserviss-popup",
                scope: $scope
            });
        };*/

        $scope.onOccupiedSlotDragRight = handleSlotDragRight;
        $scope.onOccupiedSlotDragRelease = function(event, slot) {
            handleSlotDragRelease(event, new Callback(function() {
                onOccupiedSlotSelected.fire(slot);
            }));
        };

        $scope.onOccupiedSlotTapped = function(request) {
            var occupiedHailRequestPopup = null;
            var cancelRidePopup = null;

            $scope.request = request;

            var backupRequest = {
                to: $scope.request.to,
                toAddress: $scope.request.toAddress,
                passenger: $scope.request.passenger
            };

            $scope.request.isEditing = true;

            $scope.onPassengersPlusTapped = function() {
                ++$scope.request.passenger;
            };

            $scope.onPassengersMinusTapped = function() {
                if ($scope.request.passenger > 1)
                --$scope.request.passenger;
            };

            $scope.onLocationSelected = function(place) {
                $scope.request.to.lat = place.geometry.location.lat();
                $scope.request.to.lng = place.geometry.location.lng();
                $scope.request.toAddress = place.formatted_address;
                console.log($scope.request);
            };

            $scope.onCloseTapped = function() {
                $scope.request.edit(Driver.getInstance(), null, new Callback(function(e) {
                    $rootScope.onError.fire(e);
                    console.log("backupRequest", backupRequest);
                    $scope.request.passenger = backupRequest.passenger;
                    $scope.request.to = backupRequest.to;
                    $scope.request.toAddress = backupRequest.toAddress;
                    console.log($scope.request);
                }));
                if (googlePlaceSelectEvent) {
                    googlePlaceSelectEvent();
                    googlePlaceSelectEvent = null
                }
                occupiedHailRequestPopup.close();
            };

            $scope.onCancelRideTapped = function() {
                if (googlePlaceSelectEvent) {
                    googlePlaceSelectEvent();
                    googlePlaceSelectEvent = null
                }

                occupiedHailRequestPopup.close();
                $timeout(function() {
                    $scope.message = "YOU CHOOSED TO CANCEL THE RIDE";
                    $scope.placeHolder = "reason to cancel the ride";

                    $scope.onConfirmAcceptedTapped = function(reason) {
                        $scope.request.cancelRide($scope.driver, reason, new Callback(function() {
                            cancelRidePopup.close();
                            mapEngine.removeRoutes();
                            mapEngine.setZoom(15);
                        }), $rootScope.onError);
                    };

                    $scope.onConfirmDeclineTapped = function() {
                        cancelRidePopup.close();
                    };

                    cancelRidePopup = $ionicPopup.confirm({
                        templateUrl: "templates/confirminput.popup.html",
                        cssClass: "eserviss-popup",
                        scope: $scope
                    });
                }, 50);
            };

            googlePlaceSelectEvent = $scope.$on("g-places-autocomplete:select", function(event, place) {
                $scope.onLocationSelected(place);
            });

            occupiedHailRequestPopup = $ionicPopup.confirm({
                templateUrl: "templates/hailrequest.popup.html",
                cssClass: "eserviss-popup",
                scope: $scope
            });
        };

        $scope.onEmptySlotDragRight = handleSlotDragRight;
        $scope.onEmptySlotDragRelease = function(event, slot) {
            handleSlotDragRelease(event, new Callback(function() {
                onEmptySlotSelected.fire(slot);
            }));
        };

        $scope.onResetModeTapped = function() {
            if (Driver.getInstance().mode.occupiedSlots.length !== 0 || Driver.getInstance().mode.roadSlots.length !== 0) {
                $rootScope.onError.fire(new Error("You can't reset mode while you have active passengers"));
                return;
            }

            Driver.getInstance().mode = null;
        };


        $scope.onCenterTapped = function() {
            $rootScope.ifLocationEnabled(new Callback(function() {
                Driver.getInstance().findPosition(new Callback(function(pos) {
                    mapEngine.setCenter(pos.lat(), pos.lng());
                }), $rootScope.onError);
            }));
        };


    }
]);

controllers.controller('DriverController@profile', [
    '$scope', '$state', '$stateParams', 'Driver', '$rootScope',
    'Callback',
    function($scope, $state, $stateParams, Driver, $rootScope,
        Callback) {
        'use strict';

        $scope.profile = {
            email: Driver.getInstance().email,
            firstname: Driver.getInstance().firstname,
            lastname: Driver.getInstance().lastname,
            address: Driver.getInstance().address,
            phone: Driver.getInstance().phone
        };

        $scope.onUpdateTapped = function() {
            Driver.getInstance().email = $scope.profile.email;
            Driver.getInstance().phone = $scope.profile.phone;
            Driver.getInstance().address = $scope.profile.address;
            Driver.getInstance().password = $scope.profile.password;
            Driver.getInstance().updateProfile(new Callback(), $rootScope.onError);
        };

    }
]);