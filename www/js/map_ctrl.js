angular.module('map.controllers', ['starter.controllers'])
.controller('mapCtrl', function($scope, $ionicLoading, $ionicPlatform) {
    $scope.mapCreated = function(map) {
        $scope.map = map;
        $scope.marker = new google.maps.Marker({
            position: new google.maps.LatLng($scope.data.loc.lat, $scope.data.loc.lng),
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
        $scope.centerOnMe();
    };
    $scope.centerOnMe = function () {
        console.log("Centering");
        if (!$scope.map) {
            return;
        }

        $scope.loading = $ionicLoading.show({
            content: 'Getting current location...',

        });

        navigator.geolocation.getCurrentPosition($scope.onUpdateSucc, function(error){alert("fucklk");});
    };

    $scope.onUpdateSucc = function(pos){
        console.log('Got pos', pos);
        var newPos = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        $scope.map.setCenter(newPos);
        $scope.marker.setPosition(newPos);
        $scope.loading.hide();
        $scope.$apply(function(){
            $scope.data.loc.lat = pos.coords.latitude;
            $scope.data.loc.lng = pos.coords.longitude;
        });
    };
});
