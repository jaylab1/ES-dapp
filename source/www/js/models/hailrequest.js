application.factory('HailRequest', [
    'Model', 'Http', 'Callback', 'Error', 'Geolocation',
    function(Model, Http, Callback, Error, Geolocation) {
        'use strict';

        var HailRequest = augment(Model, function(parent) {
            /**
             * HailRequest Constructor
             * @param  {row} resulted row from select statement
             */
            this.constructor = function(row) {
                row.id = row.rideId;
                row.fromLocation = row.fromLocation.length === 0 ? "33.89329, 35.5057469999" : row.fromLocation;
                this._fields = ["userId", "userName", "passenger", "fromLocation", "fromAddress", "toLocation", "toAddress", "tripTypeId", "rideId", "comment", "phone", "state"];
                this._tableName = "HailRequest";
                this._modelType = HailRequest;
                parent.constructor.call(this, row);
                this.passenger = parseInt(this.passenger);
                this.from = {
                    lat: this.fromLocation.split(',')[0],
                    lng: this.fromLocation.split(',')[1]
                };
                this.to = {
                    lat: this.toLocation.split(',')[0],
                    lng: this.toLocation.split(',')[1]
                };
                this.state = row.state ? row.state : "ARRIVE";
                this.isResponsed = false;



            }

            this.sync = function () {
                
            };

            this.userCancelled = function(driver) {
                driver.mode.onRquestDroppedOff(this);
                if (driver.mode) driver.mode.sync();
                if (driver.mode.occupiedSlots.length === 0) 
                    driver.mode = null;
            };

            this.cancelRide = function(driver, reason, onSuccess, onError) {
                var self = this;
                driver.findPosition(new Callback(function() {

                    var http = new Http();
                    var g = new Geolocation();
                    g.latlngToAddress(driver.position.toLatLng(), new Callback(function(address) {
                        var http = new Http();

                        http.get({
                            url: CONFIG.SERVER.URL,
                            params: {
                                ride_cancel: true,
                                rideId: self.rideId,
                                comment: reason,
                                lat: driver.position.lat(),
                                lng: driver.position.lng(),
                                address: address
                            },
                            onSuccess: new Callback(function() {
                                driver.mode.onRquestDroppedOff(self);
                                if (driver.mode) driver.mode.sync();
                                if (driver.mode.occupiedSlots.length === 0)
                                    driver.mode = null;
                                onSuccess.fire();
                            }),
                            onFail: onError,
                            onError: onError
                        });

                    }), onError);

                }), onError);


            }

            this.response = function(response, driver, onSuccess, onError) {
                var self = this;
                var http = new Http();
                http.get({
                    url: CONFIG.SERVER.URL,
                    params: {
                        'get-response': true,
                        driverId: driver.id,
                        response: response,
                        rideId: this.rideId,
                        carId: driver.car.id,
                        userId: this.userId,
                        passengers: this.passenger,
                        tripTypeId: this.tripTypeId,
                        user_pickup_location: this.fromLocation,
                        user_pickup_address: this.fromAddress,
                        user_dropoff_location: this.toLocation,
                        user_dropoff_address: this.toAddress
                    },
                    onSuccess: new Callback(function() {
                        self.isResponsed = true;
                        onSuccess.fire();
                    }),
                    onFail: onError,
                    onError: onError
                });
            };

            this.accept = function(driver, onSuccess, onError) {

                var self = this;
                if (driver.mode === null || (driver.mode.emptySlots.length - this.passenger) >= 0) {
                    this.response("accept", driver, new Callback(function() {
                        /*if (driver.mode === null) driver.mode = self.mode;*/
                        driver.mode.emptySlots.length -= self.passenger;
                        for (var i = 0; i < self.passenger; i++) {
                            driver.mode.occupiedSlots.push(self);
                        }
                        if (driver.mode) driver.mode.sync();
                        onSuccess.fire();
                    }), onError);

                } else {
                    onError.fire(new Error("you don't have any empty slots left!", true, true));
                }
            };

            this.decline = function(driver, onSuccess, onError) {
                this.response("decline", driver, onSuccess, onError);
            };

            this.changeState = function(driver, state, onSuccess, onError) {
                var self = this;
                var http = new Http();
                var g = new Geolocation();
                g.latlngToAddress(driver.position.toLatLng(), new Callback(function(address) {
                    var http = new Http();
                    var paramsOptions = {
                        userId: self.userId,
                        rideId: self.rideId,
                        carId: driver.car.id,
                        driverId: driver.id,
                        lat: driver.position.lat(),
                        lng: driver.position.lng(),
                        address: address,
                    };
                    paramsOptions[state] = true;

                    http.get({
                        url: CONFIG.SERVER.URL,
                        params: paramsOptions,
                        onSuccess: onSuccess,
                        onFail: onError,
                        onError: onError
                    });

                }), onError);
            };

            this.arrive = function(driver, onSuccess, onError) {
                var self = this;
                this.changeState(driver, 'arrived', new Callback(function() {
                    self.state = "PICKUP";
                    onSuccess.fire();
                    if (driver.mode) driver.mode.sync();
                }), onError);
            };

            this.pickup = function(driver, onSuccess, onError) {
                var self = this;
                this.changeState(driver, 'pickup', new Callback(function() {
                    self.state = "DROPOFF";
                    onSuccess.fire();
                    if (driver.mode) driver.mode.sync();
                }), onError);
            };

            this.dropoff = function(driver, onSuccess, onError) {
                var self = this;
                this.changeState(driver, 'dropoff', new Callback(function() {
                    driver.mode.onRquestDroppedOff(self);
                    onSuccess.fire();
                    if (driver.mode) driver.mode.sync();

                    if (driver.mode.occupiedSlots.length === 0)
                        driver.mode = null;
                }), onError);
            };

            this.checkPayment = function(onNotPaid, onError) {
                var self = this;
                var http = new Http();
                http.get({
                    url: CONFIG.SERVER.URL,
                    params: {
                        payment_check: true,
                        rideId: self.rideId,
                        userId: self.userId
                    },
                    onSuccess: null,
                    onFail: new Callback(function(e, status, response) {
                        onNotPaid.fire(response.fee);
                    }),
                    onError: onError
                });
            };

            this.confirmPayment = function(driver, onSuccess, onError) {
                var self = this;
                var http = new Http();
                http.get({
                    url: CONFIG.SERVER.URL,
                    params: {
                        payment_confirmation: true,
                        rideId: self.rideId,
                        userId: self.userId,
                        lat: driver.position.lat(),
                        lng: driver.position.lng()
                    },
                    onSuccess: new Callback(function () {
                        if (driver.mode) driver.mode.sync();
                        onSuccess.fire();
                    }),
                    onFail: onError,
                    onError: onError
                });
            };

            this.edit = function(driver, onSuccess, onError) {
                var self = this;
                var http = new Http();
                var g = new Geolocation();
                g.latlngToAddress(driver.position.toLatLng(), new Callback(function(address) {
                    var http = new Http();

                    http.get({
                        url: CONFIG.SERVER.URL,
                        params: {
                            ride_edit: true,
                            rideId: self.rideId,
                            userId: self.userId,
                            lat: driver.position.lat(),
                            lng: driver.position.lng(),
                            address: address,
                            lat1: self.to.lat,
                            lng1: self.to.lng,
                            dropoff_address: self.toAddress,
                            passengers: self.passenger
                        },
                        onSuccess: new Callback(function () {
                            if (driver.mode) driver.mode.sync();
                            onSuccess.fire();
                        }),
                        onFail: onError,
                        onError: onError
                    });

                }), onError);
            }
        });

        return HailRequest;
    }
]);