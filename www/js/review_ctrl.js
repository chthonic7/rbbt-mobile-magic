angular.module('review.controller', ['ngCordova'])
.controller('reviewCtrl', function($scope, $state, $ionicPlatform, $cordovaFile, $http){
    // $scope.init = function(){
    //     $ionicPlatform.ready(function(){
    //         if(window.cordova && window.cordova.file){
    //             $cordovaFile.checkFile(cordova.file.dataDirectory, "lederhosen.hist").then(function(){
    //                 $cordovaFile.readAsText(cordova.file.dataDirectory, "lederhosen.hist").then(function(result){
    //                     var data = [];
    //                     angular.forEach(result.split("\n").slice(0,-1), function(value){
    //                         data.push(JSON.parse(value));
    //                     })
    //                     $scope.result = data;
    //                 });
    //             });
    //         }
    //     });
    // };
    $scope.finalize = function(){
        var queryString = encodeURI("record="+$scope.uuid+"&deleted=0"+"&uid="+$scope.maddr.val);
        $http.post("https://sales.jabtools.com/ajax/mobile.php", queryString, {headers:{'Content-Type': 'application/x-www-form-urlencoded'}}).then(
            function(){$scope.resetId();},
            function(){$scope.resetId(); alert("Could not access network");});
        $state.go('map');
    };
    $scope.reGeo = function(){
        $scope.data.addr.street = "";
        $scope.data.addr.city = "";
        $scope.data.addr.state = "";
        $scope.data.addr.postal = "";
        $scope.data.qual.levels = [];
        $scope.data.qual.los = "";
        $scope.data.plans = [];
        $scope.data.date = new Date();
        $scope.data.cust.fname = "";
        $scope.data.cust.lname = "";
        $scope.data.cust.phone = "";
        $scope.data.cust.email = "";
        $scope.data.cust.notes = "";
        $scope.qual = "Qualification pending...";
        $state.go('map');
    };
})
