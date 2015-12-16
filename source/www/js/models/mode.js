application.factory('Mode', [
    'Model', 'Http', 'Callback', 'Util', 'Geolocation', 'HailRequest',
    function(Model, Http, Callback, Util, Geolocation, HailRequest) {
        'use strict';

        var Mode = augment(Model, function(parent) {
            /**
             * Mode Constructor
             * @param  {row} resulted row from select statement
             */
            this.constructor = function(row) {
                this._fields = ["name", "maxPassengers"];
                this._modelType = Mode;
                parent.constructor.call(this, row);
                this.maxPassengers = parseInt(this.maxPassengers);
                this.emptySlots = new Array(this.maxPassengers);
                this.occupiedSlots = [];
                this.roadSlots = [];

                //check if occupied slots are set from sync
                if (row && row.occupiedSlots && row.occupiedSlots.length > 0) {
                    // this.occupiedSlots = row.occupiedSlots;
                    this.emptySlots.length -= row.occupiedSlots.length;
                    for (var i = 0; i < row.occupiedSlots.length; i++) {
                        this.occupiedSlots.push(new HailRequest(row.occupiedSlots[i]));
                    }
                }

                //check if road slots are set from sync
                if (row && row.roadSlots && row.roadSlots.length > 0) {
                    this.roadSlots = row.roadSlots;
                    this.emptySlots.length -= this.roadSlots.length;
                }

                switch (this.id) {
                    case "1":
                        this.icon = "img/icons/taxi.png";
                        this.tabIcon = "img/icons/tabs-taxi.png";
                        break;

                    case "2":
                        this.icon = "img/icons/eserviss.png";
                        this.tabIcon = "img/icons/tabs-eserviss.png";
                        break;

                    case "3":
                        this.icon = "img/icons/eserviss-plus.png";
                        this.tabIcon = "img/icons/tabs-eserviss-plus.png";
                        break;

                    case "4":
                        this.icon = "img/icons/free.png";
                        this.tabIcon = "img/icons/tabs-free.png";
                        break;
                }

            };

            this.playSound = function() {
                if (typeof cordova === "undefined")
                    return;

                var mediaPath = "/android_asset/www/audio/";

                
                if (this.isService())
                    mediaPath += "service.mp3";
                else if (this.isServicePlus())
                    mediaPath += "eservice.mp3";
                else
                    mediaPath += "taxi.mp3";

                var media = new Media(mediaPath, function() {}, function(err) {});
                media.play();
            };

            this.toJson = function () {
                var json = parent.toJson.call(this);
                json.occupiedSlots = [];
                for (var i = 0; i < this.occupiedSlots.length; i++) {
                    json.occupiedSlots.push(this.occupiedSlots[i].toJson());
                }
                json.emptySlots = this.emptySlots;
                json.roadSlots = this.roadSlots;

                return json;
            };

            this.sync = function () {
                var modeSync = this.toJson();
                localStorage.setItem("sync", JSON.stringify(modeSync));
            };

            this.requestRoadHail = function(driver, state, roadSlotId, onSuccess, onError, params) {
                var self = this;
                var http = new Http();
                var g = new Geolocation();
                g.latlngToAddress(driver.position.toLatLng(), new Callback(function(address) {
                    var http = new Http();
                    http.get({
                        url: CONFIG.SERVER.URL,
                        params: {
                            roadHail: true,
                            driverId: driver.id,
                            carId: driver.car.id,
                            rideId: roadSlotId,
                            tripTypeId: self.id,
                            lat: driver.position.lat(),
                            lng: driver.position.lng(),
                            address: address,
                            lat1: params && params.lat1 ? params.lat1 : null,
                            lng1: params && params.lng1 ? params.lng1 : null,
                            address1: params && params.address1 ? params.address1 : null,
                            state: state
                        },
                        onSuccess: new Callback(function(id) {
                            var roadSlot = {
                                id: id,
                                carId: driver.car.id,
                                tripTypeId: self.id,
                                lat: driver.position.lat(),
                                lng: driver.position.lng(),
                                address: address,
                                lat1: params && params.lat1 ? params.lat1 : null,
                                lng1: params && params.lng1 ? params.lng1 : null,
                                address1: params && params.address1 ? params.address1 : null,
                                state: state
                            };
                            onSuccess.fire(roadSlot);
                        }),
                        onFail: onError,
                        onError: onError
                    });

                }), onError);

            };

            this.pickupRoadHail = function(driver, onSuccess, onError, params) {
                var self = this;
                this.emptySlots.length--;

                this.requestRoadHail(driver, "pickup", null, new Callback(function(r) {
                    /*localStorage.setItem("ROADHAIL_PICKUP", JSON.stringify(r));*/
                    var notDroppedOff = localStorage.getItem("ROADHAIL_NOT_DROPPED_OFF") ? JSON.parse(localStorage.getItem("ROADHAIL_NOT_DROPPED_OFF")) : {};
                    notDroppedOff[r.id] = r;
                    notDroppedOff[r.id].createdAt = new Date();
                    localStorage.setItem("ROADHAIL_NOT_DROPPED_OFF", JSON.stringify(notDroppedOff));

                    self.roadSlots.push(r);
                    if (onSuccess) onSuccess.fire(r);
                    self.sync();
                }), new Callback(function(e) {
                    self.emptySlots.length++;
                    onError.fire(e);
                }), params);
            };

            this.roadPayment = function (roadSlot, driver, onSuccess, onError) {
                var roadSlotId = roadSlot.id;

                var http = new Http();
                http.get({
                    url: CONFIG.SERVER.URL,
                    params: {
                        roadPayment: true,
                        rideId: roadSlotId,
                        lat: driver.position.lat(),
                        lng: driver.position.lng()
                    },
                    onSuccess: new Callback(function(r) {
                        onSuccess.fire(r);
                    }),
                    onFail: onError,
                    onError: onError
                });
            };

            this.dropoffRoadHail = function(driver, roadSlot, onSuccess, onPayment, onError) {
                var self = this;
                var roadSlotId = roadSlot.id;
                var makePaymentConfirmation = function() {
                    var http = new Http();
                    http.get({
                        url: CONFIG.SERVER.URL,
                        params: {
                            payment_confirmation: true,
                            rideId: roadSlotId, //roadSlotId,
                            userId: 0,
                            lat: driver.position.lat(),
                            lng: driver.position.lng()
                        },
                        onSuccess: null,
                        onFail: onError,
                        onError: onError
                    });
                };

                var makeRoadPaymentRequest = function() {
                    var http = new Http();
                    http.get({
                        url: CONFIG.SERVER.URL,
                        params: {
                            roadPayment: true,
                            rideId: roadSlotId, //roadSlotId,
                            lat: driver.position.lat(),
                            lng: driver.position.lng()
                        },
                        onSuccess: new Callback(function(r) {
                            onPayment.fire(r);
                            makePaymentConfirmation();
                        }),
                        onFail: onError,
                        onError: onError
                    });
                };

                this.emptySlots.length++;
                Util.ArrayRemove(this.roadSlots, function(slot) {
                    return slot.id === roadSlotId;
                });

                var params = null;
                if (!this.isTaxi()) {
                    params = {
                        lat1: roadSlot.lat1,
                        lng1: roadSlot.lng1,
                        address1: roadSlot.address1
                    };
                }

                this.requestRoadHail(driver, "dropoff", roadSlotId, new Callback(function() {
                    /*localStorage.removeItem("ROADHAIL_PICKUP");*/
                    var notDroppedOff = localStorage.getItem("ROADHAIL_NOT_DROPPED_OFF") ? JSON.parse(localStorage.getItem("ROADHAIL_NOT_DROPPED_OFF")) : {};
                    delete notDroppedOff[roadSlot.id];
                    localStorage.setItem("ROADHAIL_NOT_DROPPED_OFF", JSON.stringify(notDroppedOff));

                    if (onSuccess) onSuccess.fire();
                    makeRoadPaymentRequest();
                    self.sync();
                }), new Callback(function(e) {
                    self.emptySlots.length--;
                    self.roadSlots.push(roadSlot);
                    onError.fire(e);
                }), params);
            };

            this.onRquestDroppedOff = function(droppedOffRequest) {
                Util.ArrayRemove(this.occupiedSlots, function(slot) {
                    return slot.id === droppedOffRequest.id;
                });
                this.emptySlots.length += droppedOffRequest.passenger;
            };

            this.isTaxi = function() {
                return this.id == "1";
            };

            this.isService = function() {
                return this.id == "2";
            };

            this.isServicePlus = function() {
                return this.id == "3";
            };


        });

        Mode.All = null;

        Mode.Find = function(id) {
            if (Mode.All === null)
                return null;

            return Util.Find(Mode.All, function(mode) {
                return mode.id === id;
            });

        };
        Mode.FindAll = function(onSuccess, onError) {
            var http = new Http();
            http.get({
                url: CONFIG.SERVER.URL,
                params: {
                    modes: true
                },
                model: Mode,
                onSuccess: new Callback(function(modes) {
                    Mode.All = modes;
                    onSuccess.fire(modes);
                }),
                onError: onError
            });
        };

        return Mode;
    }
]);