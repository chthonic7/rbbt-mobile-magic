angular.module('tower.controllers', ['starter.controllers'])
  .controller('twrCtrl', function($scope, $ionicLoading, $ionicPlatform, $cordovaDeviceOrientation, $http, $ionicModal, $filter, $stateParams) {
    console.log($stateParams);
    $scope.data.loc.lat = +$stateParams.lat;
    $scope.data.loc.lng = +$stateParams.long;
    // Handle entered feedback code when map is ready

    // app setup
    $ionicPlatform.ready(function() {
      // Prevent the phone from going to sleep
      if(window.plugins && window.plugins.insomnia) {
        window.plugins.insomnia.keepAwake();
      }
      // Start listening to device heading
      $scope.watch = $cordovaDeviceOrientation.watchHeading().then(
        null,
        function(err){
          alert(err);
        },
        // When the heading updates, calculate true heading, point the marker, and check if on target
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

    // Symbols for subscribers later
    // $scope.blueDude = {
    //   path: google.maps.SymbolPath.CIRCLE,
    //   scale:  4,
    //   strokeColor: "#009BFF",
    //   strokeWeight: 3
    // };
    // $scope.badSymbol = {
    //   path: 'M -4,-4 4,4 M 4,-4 -4,4',
    //   strokeColor: "#F00",
    //   strokeWeight: 3
    // };
    // $scope.flakySymbol = {
    //   path: 'M -4,-4 4,4 M 4,-4 -4,4',
    //   strokeColor: "#A0A",
    //   strokeWeight: 3
    // };
    // $scope.greenDude = {
    //   path: google.maps.SymbolPath.CIRCLE,
    //   scale:  4,
    //   strokeColor: "#0A0",
    //   strokeWeight: 3
    // };

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
    $scope.towers = {lines:[], labels:[], polys:[]};

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
      };
      $scope.marker = new google.maps.Marker({
        position: $scope.data.loc,
        animation: google.maps.Animation.DROP,
        icon: $scope.icon,
        draggable: true,
        map: $scope.map
      });
      google.maps.event.addDomListener($scope.marker, 'dragend', function(e){
        var pos = $scope.marker.getPosition();
        $scope.$apply(function(){
          $scope.data.loc.lat = pos.lat();
          $scope.data.loc.lng = pos.lng();
          // Calculate the difference between true (gmaps) heading and magnetic heading at this location
          $scope.heading.decl = geomagnetism.model().point([$scope.data.loc.lat, $scope.data.loc.lng]).decl;
        });
      });
      // Refresh our current location
      // $scope.centerOnMe();
      $scope.heading.decl = geomagnetism.model().point([$scope.data.loc.lat, $scope.data.loc.lng]).decl;
      // Ask for towers
      // $scope.towerReq();

      // If a feedback code was entered, take the returned string and process it
      if ($stateParams.feedback !== ''){
        $scope.parseResp({data: $stateParams.feedback});
      }
    };

    // Grab the lat/long
    $scope.centerOnMe = function () {
      // If we don't have a map, don't do anything
      if (!$scope.map) {
        return;
      }

      // Display spinner while gps is working
      $ionicLoading.show({
        template: 'Getting current location...'
      });
      navigator.geolocation.getCurrentPosition(
        $scope.onUpdateSucc,
        function(error){
          alert("Couldn't establish location");
          $ionicLoading.hide();
        });
    };

    // When we get a new lat/long, center map at loc and place marker there. Also update heading.decl
    // TODO: Move to centerOnMe?
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
      var queryString;
      if($scope.uuid){
        queryString = encodeURI("record="+$scope.uuid+"&geo="+$scope.data.loc.lat+","+$scope.data.loc.lng+"&uid="+$scope.maddr.val);
      }
      else{
        queryString = encodeURI("geo="+$scope.data.loc.lat+","+$scope.data.loc.lng+"&uid="+$scope.maddr.val);
      }
      $http.post("https://sales.jabtools.com/ajax/mobile_v012.php",queryString, {headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).then($scope.parseResp, $scope.onFail);
    };

    // Break apart the result "string" that is sent back
    $scope.parseResp = function(resp){
      var qualString = resp.data.split("\nFEEDBACK:",1)[0].split("QUAL:")[1];
      // alert(qualString);
      var feedbackString = resp.data.split("\nTOWER:",1)[0].split("FEEDBACK:")[1];
      $scope.feedback.val = feedbackString.split(":")[0];
      // strip off the devices for the towers
      var towerstrings = resp.data.split("\nDEVICE:",1)[0].split("\nTOWER:").slice(1);
      var towers = {};
      for(var i=0; i < towerstrings.length; i++){
        var data = towerstrings[i].split(':');
        towers[data[0]] = {name: data[0], lat: +data[1], long: +data[2], coordinates: $filter('number')(+data[1], 5)+", "+$filter('number')(+data[2], 5), distance: data[3], devices: []};
      }
      var devicestrings = resp.data.split("\nDEVICE:").slice(1);
      for(var i=0; i < devicestrings.length; i++){
        var data = devicestrings[i].split(':');
        towers[data[0]].devices.push({bridger: data[1], 'Color code': data[2], azimuth: +data[3], frequency: data[4], technology: data[5], services: data[6], beamwidth: +data[8], range: +data[9], show:false});
      }
      console.log(towers);
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
        $scope.qual = "No qualifications";
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

    // Create all the fun stuff for a tower
    $scope.towerPlot = function(tower, name){
      // Check service from the tower and pick a color
      var color = (tower.devices.length > 0)?"#009A00":"#A9A9A9";
      //Draw a line to the tower, paint it, and give the tower an icon.
      var newLine = new google.maps.Polyline({
        path: [$scope.data.loc, {lat: tower.lat, lng: tower.long}],
        icons:[{
          icon: {path: google.maps.SymbolPath.CIRCLE, fillOpacity: 1.0},
          offset: '100%'
        }],
        strokeColor: color,
        map: $scope.map
      });
      //Create the label for the tower
      var newLabel = new google.maps.InfoWindow({
        position: {lat: tower.lat, lng: tower.long}
      });

      // When we select a tower, show label, create the modal, and set map and heading
      google.maps.event.addListener(newLine, 'click', function(e){
        // Show label
        newLabel.open($scope.map);
        // Set up Modals for the tower
        var tscope = $scope.createSubscope(tower);
        // When we close the info window for the tower, also remove the sector from the map
        google.maps.event.addListener(newLabel, 'closeclick', function(e){
          tscope.sector.setMap(null);
        });
        $ionicModal.fromTemplateUrl('templates/tower_info.html', {
          scope: tscope,
          animation: 'slide-in-up'
        }).then(function(modal){
          tscope.close = function() {
            modal.hide();
            for (var i=0; i<tscope.devices.length; i++){
              // Collapse all the devices info sections when we close out modal
              tscope.devices[i].show = false;
            }
          };
          var el = document.createElement('div');
          el.innerHTML = name;
          el.onclick = function(){
            modal.show();
          };
          newLabel.setContent(el);
        });
        // Update heading and map for the new tower
        $scope.newTowerHeading(tower.lat, tower.long);
      });
      // Store a reference to the tower so we can delete it later
      $scope.towers.lines.push(newLine);
      $scope.towers.labels.push(newLabel);
    };

    // Helper method to focus the map and set the target heading when we select a new tower
    $scope.newTowerHeading = function(lat, long) {
      var myLoc = new google.maps.LatLng($scope.data.loc);
      var towerLoc = new google.maps.LatLng(lat, long);
      $scope.heading.goal = (google.maps.geometry.spherical.computeHeading(myLoc, towerLoc) + 360) % 360;
      // Rescale map
      var bounds = new google.maps.LatLngBounds();
      bounds.extend(myLoc);
      bounds.extend(towerLoc);
      $scope.map.fitBounds(bounds);
      // Check if we're looking in that direction
      if ((Math.abs($scope.heading.trueHeading - $scope.heading.goal) <= 5) || (360 - Math.abs($scope.heading.trueHeading - $scope.heading.goal) <= 5)) {
        angular.element(document.getElementById('shiny')).css('color',"#00ff00");
      }
      else{
        angular.element(document.getElementById('shiny')).css('color',"#ffffff");
      }
    };

    // Function to create the new scope for a tower
    $scope.createSubscope = function(tower) {
      var tscope = $scope.$new(true);
      tscope.name = name;
      tscope.items = angular.copy(tower); delete tscope.items.devices; delete tscope.items.lat; delete tscope.items.long;
      tscope.devices = tower.devices;
      tscope.sector = new google.maps.Polygon({
        path: [],
        map: $scope.map,
        fillColor: '#0000ff',
        fillOpacity: 0.25,
        strokeColor: '#000099',
        strokeWeight: 2,
        zIndex: -1 // Ensures the sector is behind everything so it doesn't get in the way
      });
      // Save a reference to the sector so we can remove it
      $scope.towers.polys.push(tscope.sector);
      tscope.towerLoc = new google.maps.LatLng(tower.lat, tower.long);
      tscope.toggleItem = function(item) {
        item.show = !item.show;
        // Draw the sector for the device
        var point, points=[];
        var end=(item.azimuth + item.beamwidth/2 + 360) % 360;
        var a=(item.azimuth - item.beamwidth/2 + 360) % 360;
        var dist = item.range * 1609.34;
        // define the arc
        for (; a != end; a = (a+1)%360){
          point = google.maps.geometry.spherical.computeOffset(tscope.towerLoc, dist, a);
          points.push(point);
        }
        // add the center point to complete the sector
        points.push(tscope.towerLoc);
        tscope.sector.setPath(points);
      };
      return tscope;
    };

    // When we get a new set of towers, clear the old stuff away
    $scope.clearTowers = function(){
      angular.forEach($scope.towers.lines, function(val){val.setMap(null);});
      angular.forEach($scope.towers.labels, function(val){val.close();});
      angular.forEach($scope.towers.polys, function(val){val.setMap(null);});
      delete $scope.towers.lines;
      delete $scope.towers.labels;
      delete $scope.towers.polys;
      $scope.towers.lines = [];
      $scope.towers.labels = [];
      $scope.towers.polys = [];
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
