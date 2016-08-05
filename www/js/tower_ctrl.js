angular.module('tower.controllers', ['starter.controllers'])
.controller('twrCtrl', function($scope, $ionicLoading, $ionicPlatform, $cordovaDeviceOrientation, $http, $ionicModal, $filter) {
    // Prevent the phone from going to sleep
    $ionicPlatform.ready(function() {
        if(window.plugins && window.plugins.insomnia) {
            window.plugins.insomnia.keepAwake();
        }
    });
    // Symbols for subscribers later
    $scope.blueDude = {
        path: google.maps.SymbolPath.CIRCLE,
        scale:  4,
        strokeColor: "#009BFF",
        strokeWeight: 3
    };
    $scope.badSymbol = {
        path: 'M -4,-4 4,4 M 4,-4 -4,4',
        strokeColor: "#F00",
        strokeWeight: 3
    };
    $scope.flakySymbol = {
        path: 'M -4,-4 4,4 M 4,-4 -4,4',
        strokeColor: "#A0A",
        strokeWeight: 3
    };
    $scope.greenDude = {
        path: google.maps.SymbolPath.CIRCLE,
        scale:  4,
        strokeColor: "#0A0",
        strokeWeight: 3
    };

    // When the map is drawn, add a marker to the map and then automatically ask for towers.
    $scope.mapCreated = function(map) {
        // Bind the map to the scope
        $scope.map = map;
        //Our custom icon to show heading, cuz gmap's arrow is dumb.
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
            draggable: false, //Don't need them to mess with the arrow's positioning
            map: $scope.map
        });
        // Refresh our current location
        $scope.centerOnMe();
        // Calculate the difference between true (gmaps) heading and magnetic heading at this location
        $scope.heading.decl = geomagnetism.model().point([$scope.data.loc.lat, $scope.data.loc.lng]).decl;
        // Ask for towers
        $scope.towerReq();
    };

    // Keep all heading info in one nice place.
    // magHeading - magnetic heading grabbed from compass
    // trueHeading - true (gmaps) heading = magHeading + decl
    // decl - difference b/w magHeading and trueHeading
    // goal - the heading of the tower we want to point to.
    $scope.heading = {
        magHeading: 0,
        trueHeading: 0,
        decl: 0,
        goal: 0
    };
    // To keep track of the towers we got. It's nice to not lose reference of things we care about.
    $scope.towers = {lines:[], labels:[]};

    // Start listening to device heading
    $ionicPlatform.ready(function(){
        $scope.watch = $cordovaDeviceOrientation.watchHeading().then(
            null,
            function(err){
                alert(err);
            },
            // When the heading updates, calculate true heading, point the marker, and see if we're near the goal
            function(result){
                $scope.heading.magHeading = result.magneticHeading;
                // Calculate true heading, and add 360 to keep heading in the right range
                $scope.heading.trueHeading = ($scope.heading.magHeading + $scope.heading.decl + 360) % 360;
                // Update our marker to face the right way.
                $scope.icon.rotation = $scope.heading.trueHeading;
                $scope.marker.setIcon($scope.icon);
                // If the heading is within +/- 5 degrees of the target heading, set the text to green, otherwise, make it white.
                if ((Math.abs($scope.heading.trueHeading - $scope.heading.goal) <= 5) || ((360 - Math.abs($scope.heading.trueHeading - $scope.heading.goal)) <= 5)) {
                    angular.element(document.getElementById('shiny')).css('color',"#00ff00");
                }
                else{
                    angular.element(document.getElementById('shiny')).css('color',"#ffffff");
                }
            }
        );
    });

    // Grab the lat/long
    $scope.centerOnMe = function () {
        // If we don't have a map, don't do anything
        if (!$scope.map) {
            return;
        }

        // Display spinner while gps is working
        $ionicLoading.show({
            template: 'Getting current location...',

        });
        navigator.geolocation.getCurrentPosition($scope.onUpdateSucc, function(error){alert("Couldn't establish location");$ionicLoading.hide();});
    };

    // When we get a new lat/long, center map at loc and place marker there. Also update heading.decl
    $scope.onUpdateSucc = function(pos){
        // Create a google maps latlng object using results
        var newPos = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        $scope.map.setCenter(newPos);
        $scope.marker.setPosition(newPos);
        // $scope.$apply is needed for the variables to properly update, for now
        $scope.$apply(function(){
            // Update location
            $scope.data.loc.lat = pos.coords.latitude;
            $scope.data.loc.lng = pos.coords.longitude;
            // Update declination
            $scope.heading.decl = geomagnetism.model().point([pos.coords.latitude, pos.coords.longitude]).decl;
        });
        //Remove spinner since we're done
        $ionicLoading.hide();
    };

    // Request towers from mobile.php
    $scope.towerReq = function(){
        // Build the request parameters. The 'if' is to cover no uuid yet.
        if($scope.uuid){
            var queryString = encodeURI("record="+$scope.uuid+"&geo="+$scope.data.loc.lat+","+$scope.data.loc.lng+"&uid="+$scope.maddr.val);
        }
        else{
            var queryString = encodeURI("geo="+$scope.data.loc.lat+","+$scope.data.loc.lng+"&uid="+$scope.maddr.val);
        }
        $http.post("https://sales.jabtools.com/ajax/mobile_v011.php",queryString, {headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).then($scope.pResp, $scope.onFail);
    };

    // Break apart the result "string" that is sent back
    $scope.pResp = function(resp){
        var qualString = resp.data.split("QUAL:")[1]; qualString = qualString.substr(0, qualString.search("\nTOWER:"));
        // alert(qualString);
        var towers = resp.data.split("\nTOWER:").slice(1);
        $scope.qualParse(qualString);
        $scope.clearTowers();
        angular.forEach(towers, $scope.towerPlot);
    };

    // Parse the qualification string sent back
    $scope.qualParse = function(qualString){
        var data = qualString.split(":");
        // If no uuid for lead yet, grab the record. Otherwise, just throw it away.
        if(!$scope.uuid) $scope.uuid = data.shift();
        else data.shift();
        // If not qualified, do this
        if(!data[0] || data[0] == "None"){
            $scope.qual = "No qualifications"
            $scope.data.qual.levels = [];
            $scope.data.qual.los = "No Viewshed LOS or LTE service found";
        }
        else{
            // If qualified, grab the level of qualification and LOS.
            $scope.qual = data[0];
            var plans = $scope.qual.split(", ");
            $scope.data.plans = [plans[0]];
            $scope.data.qual.levels = plans;
            $scope.data.qual.los = data[1].split(" ").slice(0,-1).join(" ");
        }
    };

    // Parse the tower string sent (TODO)and create stuff
    $scope.towerPlot = function(towerString){
        var data = towerString.split(":");
        // Check service from the tower and pick a color
        if (data[4] == "N/A"){
            var color = "#A9A9A9";
        } else if(data[4] == "No"){
            var color = "#EE0000";
        } else {
            var color = "#009400";
        }
        //Draw a line to the tower, paint it, and give the tower an icon.
        var newLine = new google.maps.Polyline({
            path: [$scope.data.loc, {lat: +data[1], lng: +data[2]}],
            icons:[{
                icon: {path: google.maps.SymbolPath.CIRCLE, fillOpacity: 1.0},
                offset: '100%'
            }],
            strokeColor: color,
            map: $scope.map
        });
        //Create the label for the tower
        var newLabel = new google.maps.InfoWindow({
            content: data[0],
            position: {lat: +data[1], lng: +data[2]}
        });
        // Set up Modals for each tower
        var tscope = $scope.$new(true);
        tscope.name = data[0];
        tscope.items = {service: data[4], coordinates: $filter('number')(+data[1], 5)+", "+$filter('number')(+data[2], 5)};
        var newModal;
        $ionicModal.fromTemplateUrl('templates/tower_info.html', {
            scope: tscope,
            animation: 'slide-in-up'
        }).then(function(modal){
            newModal = modal;
            tscope.close = function() {newModal.hide();};
            var el = document.createElement('div')
            el.innerHTML = data[0];
            el.onclick = function(){
                newModal.show();
            };
            newLabel.setContent(el);
        });

        // Show label and set target heading when the tower is selected
        google.maps.event.addListener(newLine, 'click', function(e){
            // Show label
            newLabel.open($scope.map);
            // Set target heading
            $scope.heading.goal = (google.maps.geometry.spherical.computeHeading(new google.maps.LatLng($scope.data.loc), new google.maps.LatLng(+data[1], +data[2])) + 360) % 360;
            tscope.items.direction = $filter('number')($scope.heading.goal);
            // Rescale map
            var bounds = new google.maps.LatLngBounds();
            bounds.extend(new google.maps.LatLng($scope.data.loc));
            bounds.extend(new google.maps.LatLng(+data[1], +data[2]));
            $scope.map.fitBounds(bounds);
            // Check if we're looking in that direction
            if ((Math.abs($scope.heading.trueHeading - $scope.heading.goal) <= 5) || (360 - Math.abs($scope.heading.trueHeading - $scope.heading.goal) <= 5)) {
                angular.element(document.getElementById('shiny')).css('color',"#00ff00");
            }
            else{
                angular.element(document.getElementById('shiny')).css('color',"#ffffff");
            }
        });
        // Store a reference to the tower
        $scope.towers.lines.push(newLine);
        $scope.towers.labels.push(newLabel);
    };

    $scope.clearTowers = function(){
        angular.forEach($scope.towers.lines, function(val){val.setMap(null);});
        angular.forEach($scope.towers.labels, function(val){val.close();});
        delete $scope.towers.lines;
        delete $scope.towers.labels;
        $scope.towers.lines = [];
        $scope.towers.labels = [];
    };
    //Clean up code. Stop following device heading and stop insomnia's keepawake.
    $scope.$on("$destroy", function(){
        if($scope.watch){
            $cordovaDeviceOrientation.clearWatch($scope.watch);
        }
        if (window.plugins && window.plugins.insomnia){
            window.plugins.insomnia.allowSleepAgain();
        }
    });
});
