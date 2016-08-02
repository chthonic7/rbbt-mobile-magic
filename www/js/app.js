angular.module('starter', ['ionic', 'map.controllers', 'tower.controllers', 'qual.controllers', 'info.controllers', 'review.controller', 'starter.directives'])

.run(function($ionicPlatform, $rootScope, $state, $stateParams) {
    $rootScope.$state = $state;
    $rootScope.$stateParams = $stateParams;
    $ionicPlatform.ready(function() {
        if(window.StatusBar) {
        StatusBar.styleDefault();
        }
    });
})
.config(function($stateProvider, $urlRouterProvider,$httpProvider){
    $stateProvider
        .state('login',{
            url: '/login',
            views:{
                'menuContent': {
                    templateUrl: 'templates/login.html'
                }
            }
        })
        .state('tower',{
            url: '/tower',
            views:{
                'menuContent': {
                    templateUrl: 'templates/tower.html'
                }
            }
        })
        .state('tower.info',{
            url: '/info',
            views:{
                'menuContent': {
                    templateUrl: 'templates/tower_info.html'
                }
            }
        })
        .state('map',{
            url: '/map',
            views:{
                'menuContent': {
                    templateUrl: 'templates/map.html'
                }
            }
        })
        .state('qual',{
            url: '/qual',
            views:{
                'menuContent': {
                    templateUrl: 'templates/qual.html'
                }
            }
        })
        .state('info',{
            url: '/info',
            views:{
                'menuContent': {
                    templateUrl: 'templates/info.html'
                }
            }
        })
        .state('review',{
            url: '/review',
            views:{
                'menuContent': {
                    templateUrl: 'templates/review.html'
                }
            }
        });
    $urlRouterProvider.otherwise('/map');
})

