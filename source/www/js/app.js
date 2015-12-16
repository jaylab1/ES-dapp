'use strict';

var application = angular.module('application', ['ionic', 'application.controllers', 'ngCordova', 'ngFx', 'ngAnimate', 'hmTouchEvents', 'google.places']);
var controllers = angular.module('application.controllers', []);

application.run(function($ionicPlatform) {
    $ionicPlatform.ready(function() {
        if (window.cordova && window.cordova.plugins.Keyboard) {
          cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }
        if (window.StatusBar) {
          StatusBar.styleDefault();
        }
    });
});

application.config(function($stateProvider, $urlRouterProvider) {


    $stateProvider
    .state('splash', {
        url: '/splash',
        templateUrl: "templates/splash.html",
        controller: 'HomeController@splash'
    })
    .state('signin', {
        url: '/signin',
        params: {
            car: null,
            mode: null,
            data: null
        },
        templateUrl: "templates/signin.html",
        controller: 'DriverController@signin'
    })
    .state('modes', {
        url: '/modes',
        params: {
            data: null
        },
        templateUrl: "templates/modes.html",
        controller: 'ModeController@select'
    })
    .state('tripmodes', {
        url: '/tripmodes',
        templateUrl: "templates/tripmodes.html",
        controller: 'ModeController@mapSelect'
    })
    /*.state('cars', {
        url: '/cars',
        params: {
            data: null
        },
        templateUrl: "templates/cars.html",
        controller: 'CarController@select'
    })*/
    .state('menu', {
    	abstract: true,
        url: '/menu',
        templateUrl: "templates/menu.html",
        controller: 'DriverController@sidemenu'
    })
    .state('menu.home', {
        url: '/home',
        templateUrl: "templates/menu.home.html",
        controller: 'DriverController@home',
        cache: false
    })
    .state('menu.profile', {
        url: '/profile',
        templateUrl: "templates/menu.profile.html",
        controller: 'DriverController@profile'
    });

    	
    $urlRouterProvider.otherwise('/splash');
    //$urlRouterProvider.otherwise('/menu/home');
});