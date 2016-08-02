angular.module('map.controllers', ['starter.controllers'])
.controller('mapCtrl', function($scope, $ionicLoading, $ionicPlatform, $cordovaDeviceOrientation, $http) {
    $ionicPlatform.ready(function() {
        if(window.plugins && window.plugins.insomnia) {
            window.plugins.insomnia.keepAwake();
        }
        else{
            alert("Plugin Insomnia not loaded!");
        }
    });
    $scope.mapCreated = function(map) {
        $scope.map = map;
        $scope.marker = new google.maps.Marker({
            position: $scope.data.loc,
            animation: google.maps.Animation.DROP,
            draggable: true,
            map: $scope.map
        });
        google.maps.event.addDomListener($scope.marker, 'dragend', function(e){
            var pos = $scope.marker.getPosition();
            $scope.$apply(function(){
                $scope.data.loc.lat = pos.lat();
                $scope.data.loc.lng = pos.lng();
            });
        });
        $scope.$watch("roaming.value", function(val){
            if(val==true){
                $scope.marker.setDraggable(false);
                navigator.geolocation.getCurrentPosition($scope.onUpdateSucc, function(error){alert("Couldn't establish location"); clearInterval($scope.watcher);}, {timeout:10000, maximumAge:10000, enableHighAccuracy:true});
                $scope.watcher = setInterval(function(){
                    navigator.geolocation.getCurrentPosition($scope.onUpdateSucc, function(error){alert("Couldn't establish location"); clearInterval($scope.watcher);}, {timeout:10000, maximumAge:10000, enableHighAccuracy:true});
                }, 10000);
            }
            else{
                $scope.marker.setDraggable(true);
                if ($scope.watcher){
                    clearInterval($scope.watcher);
                }
            }
        });
        $scope.centerOnMe();
    };

    $scope.centerOnMe = function () {
        if (!$scope.map) {
            return;
        }
        $scope.loading = $ionicLoading.show({
            content: 'Getting current location...',

        });
        navigator.geolocation.getCurrentPosition($scope.onUpdateSucc, function(error){alert("Couldn't establish location");});
    };

    $scope.sendAReq = function(){
        navigator.geolocation.getCurrentPosition(function(pos){
            $scope.$apply(function(){
                $scope.data.loc.lat = pos.coords.latitude;
                $scope.data.loc.lng = pos.coords.longitude;
            });}, function(error){}, {timeout:10000, maximumAge:10000, enableHighAccuracy:true});
        $scope.sendReq();
    };
    $scope.onUpdateSucc = function(pos){
        var newPos = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        $scope.map.setCenter(newPos);
        $scope.marker.setPosition(newPos);
        if($scope.loading){
            $scope.loading.hide();
        }
        if ((Math.abs($scope.data.loc.lat - pos.coords.latitude) > .0005) || (Math.abs($scope.data.loc.lng - pos.coords.longitude) > .0005)){
            $scope.$apply(function(){
                $scope.data.loc.lat = pos.coords.latitude;
                $scope.data.loc.lng = pos.coords.longitude;
            });
            if($scope.roaming.value){
                $scope.roamReq();
            }
        }
    };
    $scope.roamReq = function(){
        if($scope.uuid){
            var queryString = encodeURI("record="+$scope.uuid+"&geo="+$scope.data.loc.lat+","+$scope.data.loc.lng+"&uid="+$scope.maddr.val);
        }
        else{
            var queryString = encodeURI("geo="+$scope.data.loc.lat+","+$scope.data.loc.lng+"&uid="+$scope.maddr.val);
        }
        $http.post("https://sales.jabtools.com/ajax/mobile_v011.php",queryString, {headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).then($scope.parseResp, $scope.onFail);
    };
    $scope.$on("$destroy", function(){
        if($scope.watcher){
            clearInterval($scope.watcher);
        }
        if (window.plugins && window.plugins.insomnia){
            window.plugins.insomnia.allowSleepAgain();
        }
    });
});
