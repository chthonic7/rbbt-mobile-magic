angular.module('starter.controllers', ['ui.router', 'ngCordova'])
.controller('mainCtrl', function($scope, $state, $cordovaFile, $ionicPlatform, $http, $filter, $cordovaCamera) {
    $scope.data={
        loc:{
            lat: 39.5784168,
            lng: -104.8561335
        },
        addr:{
            street: "",
            city: "",
            state: "",
            postal: ""
        },
        qual:{
            levels: [],
            los: "",
        },
        plans: [],
        date: $filter("date")(new Date(), 'yyyy-MM-dd'),
        cust:{
            fname: "",
            lname: "",
            phone: "",
            email: "",
            notes: ""
        }
    };
    $scope.minDate = new Date();
    $scope.uuid = "m001579140ca7fb437.48201850";
    $scope.qual = "Qualification pending...";
    $scope.roaming = {value: false};
    $ionicPlatform.ready(function() {
        if(window.MacAddress) {
            MacAddress.getMacAddress(function(maddr){
                $scope.maddr = {val: maddr};
            }, function(err){alert(err);});
        }
        else{
            $scope.maddr = {val: ""};
            alert("Cannot obtain MAC address");
        }
    });

    $scope.sendReq = function(){
        $http.get("https://maps.googleapis.com/maps/api/geocode/json?latlng="+$scope.data.loc.lat+","+$scope.data.loc.lng+"&key=AIzaSyDTjXAh39Y1K6n6tnH5SP-bMD0YcdeodS8").then($scope.addrResp, $scope.onFail);
        if($scope.uuid){
            var queryString = encodeURI("record="+$scope.uuid+"&geo="+$scope.data.loc.lat+","+$scope.data.loc.lng+"&uid="+$scope.maddr.val);
        }
        else{
            var queryString = encodeURI("geo="+$scope.data.loc.lat+","+$scope.data.loc.lng+"&uid="+$scope.maddr.val);
        }
        $http.post("https://sales.jabtools.com/ajax/mobile_v011.php",queryString, {headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).then($scope.parseResp, $scope.onFail);
    };

    $scope.addrResp = function(resp){
        var addr = {house: "", street: "", city: "", state: "", zip: ""};
        angular.forEach(resp.data.results[0].address_components, function(val){
            switch(val.types[0]){
            case "street_number":
                addr.house = val.short_name;
                break;
            case "route":
                addr.street = val.short_name;
                break;
            case "locality":
                addr.city = val.short_name;
                break;
            case "administrative_area_level_1":
                addr.state = val.short_name;
                break;
            case "postal_code":
                addr.zip = val.short_name;
                break;
            }
        });
        $scope.data.addr.street = addr.house + " " + addr.street;
        $scope.data.addr.city = addr.city;
        $scope.data.addr.state = addr.state;
        $scope.data.addr.postal = addr.zip;
    };

    $scope.parseResp = function(resp){
        var qualString = resp.data.split("QUAL:")[1]; qualString = qualString.substr(0, qualString.search("\nTOWER:"));
        alert(qualString);
        var towers = resp.data.split("\nTOWER:").slice(1);
        $scope.qualParse(qualString);
        // angular.forEach(towers, $scope.towerPlot);
    };

    $scope.save = function(){
        $ionicPlatform.ready(function(){
            if(window.cordova && window.cordova.file){
                $cordovaFile.checkFile(cordova.file.dataDirectory, "lederhosen.hist").then(
                    function(){
                        $cordovaFile.writeExistingFile(corova.file.dataDirectory, "lederhosen.hist", JSON.stringify($scope.data)+"\n").then(function(){alert("ya");}, function(){alert("na");});
                    },
                    function(){
                        $cordovaFile.writeFile(corova.file.dataDirectory, "lederhosen.hist", JSON.stringify($scope.data)+"\n", true).then(function(){alert("yah");}, function(){alert("nah");});
                    });
            }
        });
    };

    $scope.load = function(){
        var data = [];
        $ionicPlatform.ready(function(){
            if(window.cordova && window.cordova.file){
                $cordovaFile.readAsText(corova.file.dataDirectory, "leads.hist").then(function(result){
                    angular.forEach(result.split("\n"), function(value){
                        data.push(JSON.parse(value));
                    })
                });
            }
        });
        return data;
    };

    $scope.onFail = function (error){
        alert('Error: ' + JSON.stringify(error));
    };

    $scope.selfieTime = function(){
        var options = {
            saveToPhotoAlbum: true
        };
        $ionicPlatform.ready(function(){
            $cordovaCamera.getPicture(options).then(function(imageData){
                alert("you took a picture");
                alert(imageData);
            });
        });
    };

    $scope.resetId = function(){
        delete $scope.uuid;
        $scope.data.addr.street = "";
        $scope.data.addr.city = "";
        $scope.data.addr.full = "Looking up address...";
        $scope.data.qual.levels = [];
        $scope.data.qual.los = "";
        $scope.data.plans = [];
        $scope.data.date = $filter("date")(new Date(), 'yyyy-MM-dd');
        $scope.data.cust.fname = "";
        $scope.data.cust.lname = "";
        $scope.data.cust.phone = "";
        $scope.data.cust.email = "";
        $scope.data.cust.notes = "";
        $scope.qual = "Qualification pending...";
    };

    $scope.reGeo = function(){
        $scope.data.addr.street = "";
        $scope.data.addr.city = "";
        $scope.data.addr.state = "";
        $scope.data.addr.postal = "";
        $scope.data.qual.levels = [];
        $scope.data.qual.los = "";
        $scope.data.plans = [];
        $scope.data.date = $filter("date")(new Date(), 'yyyy-MM-dd');
        $scope.qual = "Qualification pending...";
        $state.go('app.map');
    };

    $scope.reQual = function(){
        $scope.data.cust.fname = "";
        $scope.data.cust.lname = "";
        $scope.data.cust.phone = "";
        $scope.data.cust.email = "";
        $scope.data.cust.notes = "";
        $state.go('app.qual');
    };

    $ionicPlatform.registerBackButtonAction(function(){
        switch($state.current.name){
        case 'app.map':
            ionic.Platform.exitApp();
            break;
        case 'app.tower':
        case 'app.login':
            $state.go('app.map');
            break;
        case 'app.qual':
            $scope.reGeo();
            break;
        case 'app.info':
            $scope.reQual();
            break;
        case 'app.review':
            $state.go('app.info');
            break;
        }
    }, 101);
});
