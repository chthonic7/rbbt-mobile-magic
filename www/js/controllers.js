angular.module('starter.controllers', ['ui.router', 'ngCordova'])
    .controller('mainCtrl', function($scope, $cordovaFile, $ionicPlatform, $http, $filter, $cordovaCamera) {
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
    }
    $scope.minDate = new Date();
    $scope.qual = "Qualification pending...";

    $scope.sendReq = function(){
        $http.get("https://maps.googleapis.com/maps/api/geocode/json?latlng="+$scope.data.loc.lat+","+$scope.data.loc.lng+"&key=AIzaSyDTjXAh39Y1K6n6tnH5SP-bMD0YcdeodS8").then($scope.addrResp, $scope.onFail);
        if($scope.uuid){
            $http.get("https://sales.jabtools.com/ajax/mobile.php?record="+$scope.uuid+"&geo="+$scope.data.loc.lat+","+$scope.data.loc.lng, {timeout: 125000}).then($scope.parseResp, $scope.onFail);
        }
        else{
            $http.get("https://sales.jabtools.com/ajax/mobile.php?geo="+$scope.data.loc.lat+","+$scope.data.loc.lng, {timeout: 125000}).then($scope.parseResp, $scope.onFail);
        }
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
        var data = resp.data.split(" ");
        if(!$scope.uuid) $scope.uuid = data.shift();
        else data.shift();
        data.pop();
        if(!data){
            $scope.qual = "No qualifications"
            $scope.data.qual.levels = [];
            $scope.data.qual.los = "No Viewshed LOS or LTE service found";
        }
        else{
            $scope.qual = data.join(" ").split(":")[0];
            var plans = $scope.qual.split(", ");
            // $scope.plans = {selected: plans.slice(0,1), options: plans};
            $scope.data.plans = plans.slice(0,1);
            $scope.data.qual.levels = plans;
            $scope.data.qual.los = data.join(" ").split(":")[1];
        }
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

    $scope.postTime = function(){
        $http.post("https://sales.jabtools.com/ajax/mobile.php", 'record=m001577d6be8f00cd3.73054109&internet_c=10MB',{
            headers:{
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then(function(resp){alert(JSON.stringify(resp));}, function(err){alert("Error"+JSON.stringify(err));});
    };
});
