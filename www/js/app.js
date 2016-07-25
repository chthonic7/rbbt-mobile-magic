angular.module('starter', ['ionic', 'map.controllers', 'qual.controllers', 'info.controllers', 'review.controller', 'starter.directives'])

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
        .state('app',{
            url: "/app",
            abstract: true,
            templateUrl: "templates/menu.html"
        })
        .state('app.login',{
            url: '/login',
            views:{
                'menuContent': {
                    templateUrl: 'templates/login.html'
                }
            }
        })
        .state('app.map',{
            url: '/map',
            views:{
                'menuContent': {
                    templateUrl: 'templates/map.html'
                }
            }
        })
        .state('app.qual',{
            url: '/qual',
            views:{
                'menuContent': {
                    templateUrl: 'templates/qual.html'
                }
            }
        })
        .state('app.info',{
            url: '/info',
            views:{
                'menuContent': {
                    templateUrl: 'templates/info.html'
                }
            }
        })
        .state('app.review',{
            url: '/review',
            views:{
                'menuContent': {
                    templateUrl: 'templates/review.html'
                }
            }
        });
    $urlRouterProvider.otherwise('/app/map');
})

