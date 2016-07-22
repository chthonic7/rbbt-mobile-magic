angular.module('review.controller', ['ngCordova'])
.controller('reviewCtrl', function($scope, $ionicPlatform, $cordovaFile){
    $scope.init = function(){
        $ionicPlatform.ready(function(){
            if(window.cordova && window.cordova.file){
                $cordovaFile.checkFile(cordova.file.dataDirectory, "lederhosen.hist").then(function(){
                    $cordovaFile.readAsText(cordova.file.dataDirectory, "lederhosen.hist").then(function(result){
                        var data = [];
                        angular.forEach(result.split("\n").slice(0,-1), function(value){
                            data.push(JSON.parse(value));
                        })
                        $scope.result = data;
                    });
                });
            }
        });
    };

    $scope.rm = function(){
        $ionicPlatform.ready(function(){
            if(window.cordova && window.cordova.file){
                $cordovaFile.removeFile(cordova.file.dataDirectory, "lederhosen.hist");
            }
        })
    };

    $scope.spinRust = function(){
        var log_geo = "Geolocation: "+$scope.data.lat+", "+$scope.data.lng+"\n";
        var log_addr;
        var log_qual;
        var log_plans;
        var log_date;
        var log_cust;
        var log = log_geo + log_addr + log_qual + log_plans + log_date + log_cust + "\n";
        $cordovaFile.writeExistingFile(cordova.file.dataDirectory, "leads.hist", log).then(
            function(){
                alert("Saved");
            },
            function(){
                alert("Problem saving data")
            });
    };
})
