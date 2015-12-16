application.factory('Car', [
    'Model', 'Http',
    function(Model, Http) {
        'use strict';

        var Car = augment(Model, function(parent) {
            /**
             * Car Constructor
             * @param  {row} resulted row from select statement
             */
            this.constructor = function(row) {
                this._fields = ["brand", "color", "plateNumber", "number", "name", "image"];
                this._modelType = Car;
                parent.constructor.call(this, row);

                this.name = this.number + "-" + this.brand;
            }
        });

        

        Car.FindAll = function(onSuccess, onError) {
            var http = new Http();
            http.get({
                url: CONFIG.SERVER.URL,
                params: {
                    cars: true
                },
                model: Car,
                onSuccess: onSuccess,
                onError: onError
            });
        };

        return Car;
    }
]);