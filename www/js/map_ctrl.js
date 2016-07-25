angular.module('map.controllers', ['starter.controllers'])
.controller('mapCtrl', function($scope, $ionicLoading, $ionicPlatform, $cordovaDeviceOrientation) {
    $ionicPlatform.ready(function() {
        if(window.plugins && window.plugins.insomnia) {
            window.plugins.insomnia.keepAwake();
        }
        else{
            alert("hi");
        }
    });
    $scope.mapCreated = function(map) {
        $scope.map = map;
        $scope.icon = {
            path: "M 0,-6 3,6 0,1 -3,6 z",
            fillColor: "#000",
            fillOpacity: 1.0,
            strokeWeight: 2,
            rotation: 0
        }
        $scope.marker = new google.maps.Marker({
            position: $scope.data.loc,
            animation: google.maps.Animation.DROP,
            icon: $scope.icon,
            draggable: true,
            map: $scope.map
        });
        $scope.line2 = new google.maps.Polyline({
            path: [$scope.data.loc, {lat: 39.58, lng: -104.86}],
            icons:[{
                icon: {path: google.maps.SymbolPath.CIRCLE, fillOpacity: 1.0},
                offset: '100%'
            }],
            strokeColor: '#00FF00',
            map: $scope.map
        });
        $scope.line = new google.maps.Polyline({
            path: [$scope.data.loc, {lat: 39.57, lng: -104.85}],
            icons:[{
                icon: {path: google.maps.SymbolPath.CIRCLE, fillOpacity: 1.0},
                offset: '100%'
            }],
            strokeColor: '#FF0000',
            map: $scope.map
        });
        google.maps.event.addDomListener($scope.marker, 'dragend', function(e){
            var pos = $scope.marker.getPosition();
            $scope.$apply(function(){
                $scope.data.loc.lat = pos.lat();
                $scope.data.loc.lng = pos.lng();
                $scope.heading.decl = geomagnetism.model().point([pos.lat(), pos.lng()]).decl;
            });
        });
        $scope.centerOnMe();
    };
    $scope.heading = {
        magHeading: 0,
        trueHeading: 0,
        decl: 0
    };
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
    $scope.sendAReq = function(){
        navigator.geolocation.getCurrentPosition(function(pos){
            $scope.$apply(function(){
                $scope.data.loc.lat = pos.coords.latitude;
                $scope.data.loc.lng = pos.coords.longitude;
            });}, function(error){}, {timeout:10000, maximumAge:10000, enableHighAccuracy:true});
        $scope.sendReq();
    };
    $ionicPlatform.ready(function(){
        $scope.watch = $cordovaDeviceOrientation.watchHeading().then(
            null,
            function(err){
                alert(err);
            },
            function(result){
                $scope.heading.magHeading = result.magneticHeading;
                $scope.heading.trueHeading = ($scope.heading.magHeading + $scope.heading.decl + 360) % 360;
                $scope.icon.rotation = $scope.heading.trueHeading;
                $scope.marker.setIcon($scope.icon);
                // $scope.eMap.css({
                //     '-webkit-transform': 'rotate(' + $scope.heading.trueHeading + 'deg)'
                // });
            }
        );
    });
    $scope.centerOnMe = function () {
        console.log("Centering");
        if (!$scope.map) {
            return;
        }

        $scope.loading = $ionicLoading.show({
            content: 'Getting current location...',

        });

        navigator.geolocation.getCurrentPosition($scope.onUpdateSucc, function(error){alert("Couldn't establish location");});
    };
    $scope.onUpdateSucc = function(pos){
        var newPos = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        $scope.map.setCenter(newPos);
        $scope.marker.setPosition(newPos);
        if($scope.loading){
            $scope.loading.hide();
        }
        $scope.$apply(function(){
            $scope.data.loc.lat = pos.coords.latitude;
            $scope.data.loc.lng = pos.coords.longitude;
            $scope.heading.decl = geomagnetism.model().point([pos.coords.latitude, pos.coords.longitude]).decl;
        });
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
        $http.post("https://sales.jabtools.com/ajax/mobile.php",queryString, {headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).then($scope.parseResp, $scope.onFail);
    };
    $scope.$on("$destroy", function(){
        if($scope.watcher){
            clearInterval($scope.watcher);
        }
        if (window.plugins.insomnia){
            window.plugins.insomnia.allowSleepAgain();
        }
    });
});
