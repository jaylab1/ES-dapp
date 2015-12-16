application.factory('Driver', [
    'Model', 'Callback', 'Http', 'Geolocation', '$interval', 'HailRequest', 'Car',
    'Error', 'Mode', '$rootScope', 'Util',
    function(Model, Callback, Http, Geolocation, $interval, HailRequest, Car,
        Error, Mode, $rootScope, Util) {
        'use strict';

        var Driver = augment(Model, function(parent) {
            /**
             * Driver Constructor
             * @param  {row} resulted row from select statement
             */
            this.constructor = function(row) {
                this._fields = ["firstname", "lastname", "gender", "address", "email", "phone", "photo", "car"];
                this._modelType = Driver;
                this.car = row && row.car ? new Car(row.car) : null;
                this.mode = null;
                this.position = null;
                this.onRequsted = null;
                this.onPinged = null;
                this.pingInterval = null;
                this.markerIcon = "img/icons/marker.png";
                parent.constructor.call(this, row);

                this.car = new Car(this.car);
                this.dailyIncome = this.getDailyIncome();

                /*this.mode = new Mode({id: 1, name: "Taxi", maxPassengers: 1});
                var request = {
                    "userId": "99",
                    "userName": "Alain Slim",
                    "phone": "01091011362",
                    "passenger": "1",
                    "fromLocation": "33.86789485942279,35.5177870169189",
                    "fromAddress": "Al Shouhada, Lebanon",
                    "toLocation": "33.86696837898706,35.517443694164996",
                    "toAddress": "Old Saida Rd, Lebanon",
                    "tripTypeId": "1",
                    "rideId": "3",
                    "comment": "Ccg"
                };
                var testingHailRequest = new HailRequest(request);
                testingHailRequest.mode = this.mode;
                testingHailRequest.isResponsed = true;
                this.mode.occupiedSlots.push(testingHailRequest);
                return;*/

            };

            this.toJson = function() {
                var json = parent.toJson.call(this);
                json.car = this.car.toJson();
                return json;
            }

            this.saveDailyIncome = function (fee) {
                var dailyIncome = JSON.parse(localStorage.getItem('DAILY_INCOME'));
                if (!dailyIncome) dailyIncome = {};
                var d = new Date();
                var todayKey = d.getFullYear() + '/' + d.getMonth() + '/' + d.getDate();
                if (dailyIncome[todayKey]) {
                    fee = parseFloat(fee);
                    dailyIncome[todayKey] = parseFloat(dailyIncome[todayKey]);
                    dailyIncome[todayKey] += fee;
                } else {
                    dailyIncome[todayKey] = fee;
                }
                localStorage.setItem('DAILY_INCOME', JSON.stringify(dailyIncome));

                this.dailyIncome = dailyIncome[todayKey];
            };

            this.getDailyIncome = function () {
                var dailyIncome = JSON.parse(localStorage.getItem('DAILY_INCOME'));
                var d = new Date();
                var todayKey = d.getFullYear() + '/' + d.getMonth() + '/' + d.getDate();
                if (dailyIncome && dailyIncome[todayKey])
                    return dailyIncome[todayKey];
                else
                    return 0;
            };

            this.getProfilePicture = function() {
                return /*"http://eserviss.com/concept/img/driver/" + */this.photo;
            }

            this.findPosition = function(onSuccess, onError) {
                var self = this;
                var g = new Geolocation();
                g.findPosition(new Callback(function(pos) {
                    self.position = pos;
                    onSuccess.fire(pos);
                }), onError);
            };

            this.loadSync = function () {
                var sync = JSON.parse(localStorage.getItem("sync"));
                console.log(sync);
                if (sync && (sync.occupiedSlots.length > 0 || sync.roadSlots.length > 0)) {
                    this.mode = new Mode(sync);
                }
            };

            this.login = function(onSuccess, onError) {
                var http = new Http();
                http.get({
                    url: CONFIG.SERVER.URL,
                    model: Driver,
                    params: {
                        Nlogin: true,
                        uid:this.uid,
                        email: this.email,
                        password: this.password
                    },
                    onSuccess: new Callback(function(driver) {
                        Driver.SharedInstance = driver;
                        onSuccess.fire();
                    }),
                    onFail: onError,
                    onError: onError
                });



            };

            this.initTrip = function(onSuccess, onError) {
                var self = this;
                this.findPosition(new Callback(function(position) {

                    var g = new Geolocation();
                    g.latlngToAddress(position.toLatLng(), new Callback(function(address) {
                        var http = new Http();
                        http.get({
                            url: CONFIG.SERVER.URL,
                            params: {
                                initialize: true,
                                tripTypeId: 0, // tripType.id,
                                carId: self.car.id,
                                driverId: self.id,
                                lng: position.lng(),
                                lat: position.lat(),
                                address: address
                            },
                            onSuccess: onSuccess,
                            onError: onError
                        });

                    }), onError);

                }), onError);
            }

            this.ping = function(onSuccess, onByPassed, onForceSignout, onUserCancelled, onError) {

                var self = this;

                var http = new Http();
                http.isLoading = false;

                var sendPingData = function() {
                    self.findPosition(new Callback(function(position) {
                        var modeId = self.mode ? self.mode.id : null;
                        
                        /*var roadHail = localStorage.getItem("ROADHAIL_PICKUP");
                        var roadHailId = roadHail ? (JSON.parse(roadHail)).id : null;*/

                        var notDroppedOff = localStorage.getItem("ROADHAIL_NOT_DROPPED_OFF") ? JSON.parse(localStorage.getItem("ROADHAIL_NOT_DROPPED_OFF")) : {};
                        var notDroppedOffIdList = [];

                        var now = new Date();
                        var PASSENGER_MAX_SPENT_TIME = 45 * 60 * 1000;

                        Util.ForEach(notDroppedOff, function (notDroppedOffHail) {
                            notDroppedOffHail.createdAt = new Date(notDroppedOffHail.createdAt);
                            var passengerSpentTime = now - notDroppedOffHail.createdAt;
                            console.log(passengerSpentTime);
                            if (passengerSpentTime > PASSENGER_MAX_SPENT_TIME)
                                notDroppedOffIdList.push(notDroppedOffHail.id);
                        });


                        http.get({
                            url: CONFIG.SERVER.URL,
                            params: {
                                ping: true,
                                driverId: self.id,
                                tripTypeId: modeId,
                                carId: self.car.id,
                                lng: position.lng(),
                                lat: position.lat(),
                                address: null,
                                /*roadHailId: roadHailId,*/
                                derror: notDroppedOffIdList
                            },
                            onSuccess: new Callback(function () {
                                if (!$rootScope.pingCounter)
                                    $rootScope.pingCounter = 1;
                                else
                                    $rootScope.pingCounter++;

                                for (var i = 0; i < notDroppedOffIdList.length; i++) {
                                    delete notDroppedOffIdList[notDroppedOffIdList[i]];
                                }
                                localStorage.setItem("ROADHAIL_NOT_DROPPED_OFF", notDroppedOffIdList);

                                if (onSuccess) onSuccess.fire();
                            }),
                            onFail: new Callback(function (e) {
                                self.onSignedout();
                                onForceSignout.fire();
                                // if (onError) onError.fire(e);
                            }),
                            onError: onError
                        });
                    }), onError);
                };

                var pullRequest = function() {
                    /*var request = {
                        "userId": "99",
                        "userName": "Alain Slim",
                        "phone": "01091011362",
                        "passenger": "1",
                        "fromLocation": "33.86789485942279,35.5177870169189",
                        "fromAddress": "Al Shouhada, Lebanon",
                        "toLocation": "33.86696837898706,35.517443694164996",
                        "toAddress": "Old Saida Rd, Lebanon",
                        "tripTypeId": "1",
                        "rideId": "3",
                        "comment": "Ccg"
                    };
                    self.onRequsted.fire(new HailRequest(request));
                    return;*/
                    http.get({
                        url: CONFIG.SERVER.URL,
                        model: HailRequest,
                        params: {
                            'pull-requests': true,
                            driverId: self.id,
                            carId: self.car.id
                        },
                        onSuccess: new Callback(function (request) {
                            var mode = Mode.Find(request.tripTypeId);
                            self.onRequsted.fire(mode, request);
                        }),
                        onFail: new Callback(function(e, s, r) {
                            if (s === "BY_PASS") {
                                onByPassed.fire();
                                var http = new Http();
                                http.get({
                                    url: CONFIG.SERVER.URL,
                                    params: {
                                        remove_message: true,
                                        rideId: r.rideId,
                                        carId: self.car.id
                                    }
                                });

                            }

                            if (s === "CANCEL") {
                                if (onUserCancelled) onUserCancelled.fire(r);
                                var http = new Http();
                                http.get({
                                    url: CONFIG.SERVER.URL,
                                    params: {
                                        remove_message: true,
                                        rideId: r.rideId,
                                        carId: self.car.id
                                    }
                                });
                            }
                        })
                    });
                };

                this.pingInterval = $interval(function() {
                    sendPingData();
                    pullRequest();
                    if (self.onPinged) self.onPinged.fire();
                }, 10000);

            };

            this.updateProfile = function(onSuccess, onError) {
                var http = new Http();
                http.get({
                    url: CONFIG.SERVER.URL,
                    model: Driver,
                    params: {
                        'profile-update': true,
                        driverId: this.id,
                        photo: "base 64 photo will be here",
                        phone: this.phone,
                        address: this.address,
                        password: this.password
                    },
                    onSuccess: onSuccess,
                    onFail: onError,
                    onError: onError
                });
            };

            this.onSignedout = function () {
                localStorage.removeItem("driver");
                $interval.cancel(this.pingInterval);
            };

            this.signout = function(onSuccess, onError) {
                var self = this;
                this.findPosition(new Callback(function(position) {

                    var g = new Geolocation();
                    g.latlngToAddress(position.toLatLng(), new Callback(function(address) {
                        var http = new Http();
                        http.get({
                            url: CONFIG.SERVER.URL,
                            model: Driver,
                            params: {
                                signout: true,
                                tripTypeId: self.mode ? self.mode.id : null,
                                carId: self.car.id,
                                driverId: self.id,
                                lng: position.lng(),
                                lat: position.lat(),
                                address: address
                            },
                            onSuccess: new Callback(function() {
                                self.onSignedout();
                                onSuccess.fire();
                            }),
                            onFail: onError,
                            onError: onError
                        });

                    }), onError);

                }), onError);
            }

            this.store = function() {
                localStorage.setItem('driver', JSON.stringify(this.toJson()));
            }

            this.isStored = function() {
                var driver = localStorage.getItem('driver');

                if (driver !== null) {
                    Driver.SharedInstance = new Driver(JSON.parse(driver));
                    return true;
                }

                return false;
            }
        });

        Driver.SharedInstance = null;

        Driver.getInstance = function() {

            if (Driver.SharedInstance === null)
                Driver.SharedInstance = new Driver();

            return Driver.SharedInstance;
        }


        return Driver;
    }
]);