application.factory('mapEngine', [
    '$rootScope', 'Util',
    function($rootScope, Util) {
        return {
            params: null,

            centerDivContainer: null,
            acceleratedMarker: null,
            navigationInfoWindow: null,
            gMapsInstance: null,
            isReady: false,
            setCenter: function(lat, lng) {
                this.params = {
                    lat: lat,
                    lng: lng
                };
                $rootScope.$broadcast('googleMap@Center');
            },
            pauseWatchMarker: function() {
                this.params = {
                    isWatchingMarker: false
                };
                $rootScope.$broadcast('googleMap@OnWatchChange');
            },
            resumeWatchMarker: function() {
                this.params = {
                    isWatchingMarker: true
                };
                $rootScope.$broadcast('googleMap@OnWatchChange');
            },
            watchMarker: function(lat, lng, icon) {
                this.params = {
                    lat: lat,
                    lng: lng,
                    isWatchingMarker: true,
                    icon: icon || null
                };
                $rootScope.$broadcast('googleMap@WatchMarker');
            },
            drawRoute: function(routeConfig) {
                this.params = {
                    lat: routeConfig.origin[0],
                    lng: routeConfig.origin[1],
                    routeConfig: routeConfig
                };
                $rootScope.$broadcast('googleMap@DrawRoute');
            },
            removeRoutes: function() {
                this.gMapsInstance.removePolylines();
            },
            getCenterDiv: function() {
                if (this.centerDivContainer === null) {
                    this.centerDivContainer = document.createElement("div");
                    this.centerDivContainer.style.position = "relative";
                    this.centerDivContainer.style.top = "50%";
                    this.centerDivContainer.style.left = "50%";
                    $rootScope.$broadcast('googleMap@CenterDiv');
                }

                return this.centerDivContainer;
            },
            navigationMarker: function(onClicked) {
                if (this.acceleratedMarker) {
                    this.getCenterDiv().style.display = "block";
                    this.acceleratedMarker.style.display = "block";
                    return;
                }
                this.acceleratedMarker = document.createElement("div");
                this.acceleratedMarker.style.background = "url(img/icons/pin.png) center center no-repeat";
                this.acceleratedMarker.style.position = "absolute";
                this.acceleratedMarker.style.bottom = "0";
                this.acceleratedMarker.style.left = "-7px";
                this.acceleratedMarker.style.zIndex = "1";
                this.acceleratedMarker.style.width = "29px";
                this.acceleratedMarker.style.height = "40px";
                this.acceleratedMarker.style.cursor = "pointer";
                this.acceleratedMarker.onclick = onClicked || null;

                this.getCenterDiv().appendChild(this.acceleratedMarker);
            },
            navigationInfo: function(onClicked) {
                this.navigationInfoWindow = {
                    div: null,
                    rightText: null,
                    leftText: null
                };

                this.navigationInfoWindow.div = document.createElement("div");
                var leftCol = document.createElement("div");
                leftCol.style.float = "left";
                leftCol.style.width = "25%";
                leftCol.style.height = "100%";
                leftCol.style.backgroundColor = "#343434";
                leftCol.style.color = "#FFFFFF";
                leftCol.style.lineHeight = "44px";
                this.navigationInfoWindow.leftText = leftCol;
                this.navigationInfoWindow.div.appendChild(leftCol);

                var righttCol = document.createElement("div");
                righttCol.style.float = "left";
                righttCol.style.width = "75%";
                righttCol.style.height = "100%";
                righttCol.style.fontWeight = "600";
                righttCol.innerHTML = '<i class="icon ion-chevron-right yellow right"></i>';
                this.navigationInfoWindow.rightText = righttCol;
                righttCol.onclick = onClicked || null;
                this.navigationInfoWindow.div.appendChild(righttCol);

                var arrowDown = document.createElement("div");
                arrowDown.style.width = "0";
                arrowDown.style.height = "0";
                arrowDown.style.borderLeft = "20px solid transparent";
                arrowDown.style.borderRight = "20px solid transparent";
                arrowDown.style.borderTop = "20px solid #FFB300";
                arrowDown.style.position = "absolute";
                arrowDown.style.left = "50%";
                arrowDown.style.bottom = "-20px";
                this.navigationInfoWindow.div.appendChild(arrowDown);

                this.navigationInfoWindow.div.style.position = "absolute";
                this.navigationInfoWindow.div.style.top = "-105px";
                this.navigationInfoWindow.div.style.left = "-125px";
                this.navigationInfoWindow.div.style.width = "210px";
                this.navigationInfoWindow.div.style.height = "50px";
                this.navigationInfoWindow.div.style.lineHeight = "50px";
                this.navigationInfoWindow.div.style.backgroundColor = "#F7F7F7";
                this.navigationInfoWindow.div.style.textAlign = "center";
                this.navigationInfoWindow.div.style.border = "solid 3px #FFB300";

                this.getCenterDiv().appendChild(this.navigationInfoWindow.div);
            },
            navigationInfoWindowRightText: function(innerHtml) {
                this.navigationInfoWindow.rightText.innerHTML = "<h5 style='margin: 0; line-height: 44px;' class='b'>" + innerHtml + "</h5>" + ' <i class="icon ion-chevron-right yellow right" style="margin: 0; line-height: 44px; right: 5px !important;"></i>';
            },
            navigationInfoWindowLeftText: function(imgSrc, info) {

                var parentDivStyle = '';
                var imgStyle = Util.String("style='vertical-align: {0};'", ["middle"]);

                var infoElem = '';
                if (info) {
                    parentDivStyle = Util.String("style='line-height: {0}px;'", [22]);
                    imgStyle = Util.String("style='vertical-align: {0};'", ["text-top"]);
                    infoElem = Util.String("<span>{0}</span>", [info]);
                }

                var imgElem = '';
                if (imgSrc) {
                    imgElem = Util.String("<img {0} width='60%' src='{1}' />", [imgStyle, imgSrc]);
                }

                if (info && !imgSrc)
                    parentDivStyle = '';

                this.navigationInfoWindow.leftText.innerHTML = Util.String("<div class='text-center  yellow b' {0}> {1} {2} </div>", [parentDivStyle, imgElem, infoElem]);
            },
            addCenterMarker: function() {
                $rootScope.$broadcast('googleMap@AddCenterMarker');
            },
            ready: function(onReady) {
                var self = this;
                var destroyListener = $rootScope.$on('map@ready', function() {
                    onReady();
                    destroyListener();
                    self.gMapsInstance.refresh();
                    self.isReady = true;
                });

            },
            drawCircle: function(lat, lng, radius) {
                this.params = {
                    circleOptions: {
                        lat: lat,
                        lng: lng,
                        radius: radius,
                        fillColor: '#004de8',
                        fillOpacity: 0.27,
                        strokeColor: '#004de8',
                        strokeOpacity: 0.62,
                        strokeWeight: 1
                    }
                };
                $rootScope.$broadcast('googleMap@DrawCircle');
            },
            getCenter: function() {
                return this.gMapsInstance.getCenter();
            },
            getMap: function() {
                return this.gMapsInstance.map;
            },
            addMarker: function(lat, lng, icon) {
                this.params = {
                    lat: lat,
                    lng: lng,
                    icon: icon || null
                };
                $rootScope.$broadcast('googleMap@AddMarker');
            },
            addUserAccuracy: function(lat, lng, accuracy, options) {
                this.params = {
                    lat: lat,
                    lng: lng,
                    accuracy: accuracy,
                    options: options || {}
                };
                $rootScope.$broadcast('googleMap@AddUserAccuracy');
            },
            setZoom: function (zoom) {
                $rootScope.$broadcast('googleMap@SetZoom', zoom);  
            }
        };
    }
]);

application.directive('googleMap', [
    '$rootScope',
    function($rootScope) {
        var gMaps = null,
            watchMarker = null,
            isWatchingMarker = true,
            accuracyMarker = null;
        return {
            restrict: 'AE',
            replace: true,
            link: function(scope, element, attrs) {
                var resizeMap = function() {
                    element[0].style.height = attrs.height || "100%";
                    element[0].style.width = attrs.width || "100%";
                    element.addClass('pane');
                    google.maps.event.trigger(gMaps.map, "resize");
                };

                if (gMaps) {
                    resizeMap();
                    gMaps.unbindAll();
                    gMaps.removeMarkers();
                    gMaps.removePolygons();
                    gMaps.removePolylines();
                    gMaps.refresh();
                    element.append(gMaps.getDiv());
                    $rootScope.$broadcast('googleMap@resetMap');
                    return;
                }

                element[0].id = "map";
                gMaps = new GMaps({
                    div: "#map",
                    lat: attrs.lat || 33.8886289,
                    lng: attrs.lng || 35.4954794,
                    disableDefaultUI: true/*,
                    zoom: 15*/
                });

                resizeMap();
                google.maps.event.addListenerOnce(gMaps.map, 'tilesloaded', function() {
                    $rootScope.$broadcast('googleMap@preReady');
                });
            },
            controller: function($scope, mapEngine, $rootScope) {

                $scope.$on('googleMap@resetMap', function() {
                    if (mapEngine.centerDivContainer) mapEngine.centerDivContainer.style.display = "none";
                    if (mapEngine.navigationInfoWindow) mapEngine.navigationInfoWindow.div.style.display = "none";
                    if (mapEngine.acceleratedMarker) mapEngine.acceleratedMarker.style.display = "none";
                    gMaps.removePolylines();
                    isWatchingMarker = true;
                    watchMarker = null;
                    $rootScope.$broadcast('map@ready');
                });

                $scope.$on('googleMap@preReady', function() {
                    mapEngine.gMapsInstance = gMaps;
                    $rootScope.$broadcast('map@ready');
                });

                $scope.$on('googleMap@Center', function() {
                    var latLng = new google.maps.LatLng(mapEngine.params.lat, mapEngine.params.lng);
                    gMaps.panTo(latLng);
                });

                $scope.$on('googleMap@SetZoom', function(event, zoom) {
                    gMaps.setZoom(zoom);
                });

                $scope.$on('googleMap@WatchMarker', function() {
                    if (!isWatchingMarker)
                        return;

                    if (watchMarker === null) {
                        watchMarker = gMaps.addMarker({
                            lat: mapEngine.params.lat,
                            lng: mapEngine.params.lng,
                            icon: mapEngine.params.icon
                        });
                    }

                    watchMarker.setPosition(new google.maps.LatLng(mapEngine.params.lat, mapEngine.params.lng));
                    gMaps.panTo(new google.maps.LatLng(mapEngine.params.lat, mapEngine.params.lng));
                });

                $scope.$on('googleMap@DrawRoute', function() {
                    gMaps.removePolylines();
                    gMaps.drawRoute(mapEngine.params.routeConfig);
                    //gMaps.panTo();
                    var startLatLng = new google.maps.LatLng(mapEngine.params.routeConfig.origin[0], mapEngine.params.routeConfig.origin[1]);
                    var endLatLng = new google.maps.LatLng(mapEngine.params.routeConfig.destination[0], mapEngine.params.routeConfig.destination[1]);
                    gMaps.fitLatLngBounds([startLatLng, endLatLng]);
                    //gMaps.map.setZoom(14);
                });

                $scope.$on('googleMap@OnWatchChange', function() {
                    isWatchingMarker = mapEngine.params.isWatchingMarker;
                });

                $scope.$on('googleMap@CenterDiv', function() {
                    gMaps.getDiv().appendChild(mapEngine.centerDivContainer);
                });

                $scope.$on('googleMap@AddCenterMarker', function() {
                    gMaps.addMarker({
                        lat: gMaps.getCenter().lat(),
                        lng: gMaps.getCenter().lng()
                    });
                });

                $scope.$on('googleMap@DrawCircle', function() {
                    gMaps.drawCircle(mapEngine.params.circleOptions);
                });

                $scope.$on('googleMap@AddMarker', function() {
                    gMaps.addMarker({
                        lat: mapEngine.params.lat,
                        lng: mapEngine.params.lng,
                        icon: mapEngine.params.icon
                    });
                });

                $scope.$on('googleMap@AddUserAccuracy', function() {
                    if (accuracyMarker) {
                        gMaps.removeMarker(accuracyMarker.center);
                        gMaps.removeMarker(accuracyMarker.outer);
                    }

                    accuracyMarker = {};
                    accuracyMarker.center = gMaps.addMarker({
                        lat: mapEngine.params.lat,
                        lng: mapEngine.params.lng,
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 10,
                            fillColor: '#0A7FFF',
                            fillOpacity: 1,
                            strokeColor: '#FFFFFF',
                            strokeOpacity: 1,
                            strokeWeight: 5
                        }
                    });

                    accuracyMarker.outer = gMaps.addMarker({
                        lat: mapEngine.params.lat,
                        lng: mapEngine.params.lng,
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: mapEngine.params.accuracy,
                            fillColor: '#004de8',
                            fillOpacity: 0.27,
                            strokeColor: '#004de8',
                            strokeOpacity: 0.62,
                            strokeWeight: 1
                        }
                    });

                    if (mapEngine.params.options.info) {
                        var infoBubble = new InfoBubble({
                            padding: "30px",
                            map: gMaps.map,
                            position: new google.maps.LatLng(mapEngine.params.lat, mapEngine.params.lng),
                            content: "<h5 class='abs-middle text-center white' style='overflow: hidden; margin-top: 20%;'>" + mapEngine.params.options.info + "</h5>",
                            backgroundClassName: 'marker-info-time',
                            backgroundColor: 'transparent',
                            borderColor: 'transparent',
                            borderWidth: 0,
                            arrowSize: 15,
                            hideCloseButton: true,
                            borderRadius: 30,
                            arrowStyle: 0,
                            shadowStyle: 0,
                        });
                        infoBubble.open();
                    }
                });

            }
        };
    }
]);