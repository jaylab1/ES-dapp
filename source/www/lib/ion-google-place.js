angular.module('ion-google-place', [])
    .directive('ionGooglePlace', [
        '$ionicTemplateLoader',
        '$ionicBackdrop',
        '$q',
        '$timeout',
        '$rootScope',
        '$document',
        'mapEngine',
        function($ionicTemplateLoader, $ionicBackdrop, $q, $timeout, $rootScope, $document, mapEngine) {
            return {
                require: '?ngModel',
                restrict: 'E',
                scope: {
                    onSelected: '&'
                },
                template: '<input type="text" readonly="readonly" class="ion-google-place" autocomplete="off">',
                replace: true,
                link: function(scope, element, attrs, ngModel) {
                    var mapPlaces = null;
                    if (mapEngine.getMap())
                        mapPlaces = new google.maps.places.PlacesService(mapEngine.getMap());
                    else {
                        scope.$on('map@ready', function() {
                            mapPlaces = new google.maps.places.PlacesService(mapEngine.getMap());
                        });
                    }

                    var popupElement = angular.element(document.getElementsByClassName("popup-open"));

                    scope.locations = [];
                    var geocoder = new google.maps.Geocoder();
                    var searchEventTimeout = undefined;

                    var POPUP_TPL = [
                        '<div class="ion-google-place-container">',
                        '<div class="bar bar-header item-input-inset">',
                        '<label class="item-input-wrapper">',
                        '<i class="icon ion-ios7-search placeholder-icon"></i>',
                        '<input class="google-place-search" type="search" ng-model="searchQuery" placeholder="Enter an address, place or ZIP code">',
                        '</label>',
                        '<button class="button button-clear">',
                        'Cancel',
                        '</button>',
                        '</div>',
                        '<ion-content class="has-header has-header">',
                        '<ion-list>',
                        '<ion-item ng-repeat="location in locations" type="item-text-wrap" ng-click="selectLocation(location)">',
                        '{{location.formatted_address}}',
                        '</ion-item>',
                        '</ion-list>',
                        '</ion-content>',
                        '</div>'
                    ].join('');
                    /*console.log(attrs.country);*/
                    var popupPromise = $ionicTemplateLoader.compile({
                        template: POPUP_TPL,
                        scope: scope,
                        appendTo: $document[0].body
                    });

                    popupPromise.then(function(el) {
                        var searchInputElement = angular.element(el.element.find('input'));

                        scope.selectLocation = function(location) {
                            /*console.log("location selected", location);*/
                            scope.onSelected({
                                location: location
                            });
                            ngModel.$setViewValue(location.formatted_address);
                            ngModel.$render();
                            el.element.css('display', 'none');
                            $ionicBackdrop.release();
                            popupElement.addClass("popup-open");
                        };

                        scope.$watch('searchQuery', function(query) {
                            if (searchEventTimeout) $timeout.cancel(searchEventTimeout);
                            searchEventTimeout = $timeout(function() {
                                /*console.log("searchQuery: ", query);*/
                                if (!query) return;
                                if (query.length < 3);
                                geocoder.geocode({
                                    address: query,
                                    componentRestrictions: {
                                        country: attrs.country || null
                                    }
                                }, function(results, status) {
                                    if (status == google.maps.GeocoderStatus.OK) {
                                        /*console.log("locations are ", results);*/
                                        scope.$apply(function() {
                                            scope.locations = results;
                                        });

                                        if (mapPlaces) {
                                            // console.log(mapEngine.getCenter());
                                            //var lebanon = new google.maps.LatLng(33.89, 35.51);
                                            mapPlaces.textSearch({
                                                location: mapEngine.getCenter(),
                                                query: query,
                                                radius: 50000
                                            }, function(r, s) {

                                                if (s == google.maps.GeocoderStatus.OK) {
                                                    for (var i = 0; i < r.length; i++) {
                                                        r[i].formatted_address = r[i].name;
                                                        scope.locations.push(r[i]);
                                                    }
                                                    scope.$apply();

                                                }


                                            });
                                        }


                                    } else {
                                        // @TODO: Figure out what to do when the geocoding fails
                                    }
                                });
                            }, 350); // we're throttling the input by 350ms to be nice to google's API
                        });

                        var onClick = function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            $ionicBackdrop.retain();
                            el.element.css('display', 'block');
                            popupElement.removeClass("popup-open");
                            searchInputElement[0].focus();
                            setTimeout(function() {
                                searchInputElement[0].focus();
                            }, 0);
                        };

                        var onCancel = function(e) {
                            scope.searchQuery = '';
                            $ionicBackdrop.release();
                            el.element.css('display', 'none');
                        };

                        element.bind('click', onClick);
                        element.bind('touchend', onClick);

                        el.element.find('button').bind('click', onCancel);
                    });

                    if (attrs.placeholder) {
                        element.attr('placeholder', attrs.placeholder);
                    }


                    ngModel.$formatters.unshift(function(modelValue) {
                        if (!modelValue) return '';
                        return modelValue;
                    });

                    ngModel.$parsers.unshift(function(viewValue) {
                        return viewValue;
                    });

                    ngModel.$render = function() {
                        /*console.log(ngModel.$viewValue);*/
                        if (!ngModel.$viewValue) {
                            element.val('');
                        } else if (typeof ngModel.$viewValue === "string") {
                            element.val(ngModel.$viewValue);
                        } else {
                            element.val(ngModel.$viewValue.formatted_address || '');
                        }
                    };
                }
            };
        }
    ]);