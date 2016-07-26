angular.module('tower.controllers', ['starter.controllers'])
.controller('twrCtrl', function($scope, $ionicLoading, $ionicPlatform, $cordovaDeviceOrientation, $http) {
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
            draggable: false,
            map: $scope.map
        });
        // $scope.centerOnMe();
        $scope.heading.decl = geomagnetism.model().point([$scope.data.loc.lat, $scope.data.loc.lng]).decl;
    };

    $scope.heading = {
        magHeading: 0,
        trueHeading: 0,
        decl: 0,
        goal: 0
    };
    $scope.towers = {lines:[], labels:[]};
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
                if ((Math.abs($scope.heading.trueHeading - $scope.heading.goal) <= 5) || ((360 - Math.abs($scope.heading.trueHeading - $scope.heading.goal)) <= 5)) {
                    angular.element(document.getElementById('shiny')).css('color',"#00ff00");
                }
                else{
                    angular.element(document.getElementById('shiny')).css('color',"#ffffff");
                }
            }
        );
    });

    $scope.centerOnMe = function () {
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
        $scope.$apply(function(){
            $scope.data.loc.lat = pos.coords.latitude;
            $scope.data.loc.lng = pos.coords.longitude;
            $scope.heading.decl = geomagnetism.model().point([pos.coords.latitude, pos.coords.longitude]).decl;
        });
        if($scope.loading){
            $scope.loading.hide();
        }
    };
    $scope.towerReq = function(){
        if($scope.uuid){
            var queryString = encodeURI("record="+$scope.uuid+"&geo="+$scope.data.loc.lat+","+$scope.data.loc.lng+"&uid="+$scope.maddr.val);
        }
        else{
            var queryString = encodeURI("geo="+$scope.data.loc.lat+","+$scope.data.loc.lng+"&uid="+$scope.maddr.val);
        }
        $http.post("https://sales.jabtools.com/ajax/mobile_v011.php",queryString, {headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).then($scope.pResp, $scope.onFail);
    };
    $scope.pResp = function(resp){
        var qualString = resp.data.split("QUAL:")[1]; qualString = qualString.substr(0, qualString.search("\nTOWER:"));
        alert(qualString);
        var towers = resp.data.split("\nTOWER:").slice(1);
        $scope.qualParse(qualString);
        angular.forEach(towers, $scope.towerPlot);
    };
    $scope.qualParse = function(qualString){
        var data = qualString.split(":");
        alert(JSON.stringify(data));
        if(!$scope.uuid) $scope.uuid = data.shift();
        else data.shift();
        if(!data[0] || data[0] == "None"){
            $scope.qual = "No qualifications"
            $scope.data.qual.levels = [];
            $scope.data.qual.los = "No Viewshed LOS or LTE service found";
        }
        else{
            $scope.qual = data[0];
            var plans = $scope.qual.split(", ");
            $scope.data.plans = plans[0];
            $scope.data.qual.levels = plans;
            $scope.data.qual.los = data[1].split(" ").slice(0,-1).join(" ");
        }
    };
    $scope.towerPlot = function(towerString){
        var data = towerString.split(":");
        if (data[4] == "N/A"){
            var color = "#535353";
        } else if(data[4] == "No"){
            var color = "#FF0000";
        } else {
            var color = "#00FF00";
        }
        var newLine = new google.maps.Polyline({
            path: [$scope.data.loc, {lat: +data[1], lng: +data[2]}],
            icons:[{
                icon: {path: google.maps.SymbolPath.CIRCLE, fillOpacity: 1.0},
                offset: '100%'
            }],
            strokeColor: color,
            map: $scope.map
        });
        var newLabel = new google.maps.InfoWindow({
            content: data[0],
            position: {lat: +data[1], lng: +data[2]}
        });
        google.maps.event.addListener(newLine, 'click', function(e){
            newLabel.open($scope.map);
            $scope.heading.goal = (google.maps.geometry.spherical.computeHeading(new google.maps.LatLng($scope.data.loc), new google.maps.LatLng(+data[1], +data[2])) + 360) % 360;
            if ((Math.abs($scope.heading.trueHeading - $scope.heading.goal) <= 5) || (360 - Math.abs($scope.heading.trueHeading - $scope.heading.goal) <= 5)) {
                angular.element(document.getElementById('shiny')).css('color',"#00ff00");
            }
            else{
                angular.element(document.getElementById('shiny')).css('color',"#ffffff");
            }
        });
        $scope.towers.lines.push(newLine);
        $scope.towers.labels.push(newLabel);
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
