controllers.factory('Model', [
    '$ionicPlatform', 'Util',
    function($ionicPlatform, Util) {
        'use strict';

        var Model = augment.defclass({
            constructor: function(row) {
                this.id = row && row.id ? row.id : null;
                
                Util.ForEach(row, function(value, key) {
                    if (Util.InArray(key, this._fields))
                        this[key] = value;
                }, this);

            },

            

            /**
             * parse object to string
             * @return {String} string descripes the model
             */
            toString: function() {
                return this.id;
            },

            /**
             * parse object to json
             * @return {JSON} current object
             */
            toJson: function() {
                var json = {
                    id: this.id
                };

                Util.ForEach(this, function(value, key) {
                    if (Util.InArray(key, this._fields))
                        json[key] = value;
                }, this);

                return json;
            }
        });

        return Model;
    }
]);