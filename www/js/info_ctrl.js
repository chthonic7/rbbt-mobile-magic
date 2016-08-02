angular.module('info.controllers', ['starter.controllers'])
.controller('infoCtrl', function($scope, $state, $cordovaFile, $http, $filter) {
    $scope.reGeo = function(){
        $scope.data.addr.street = "";
        $scope.data.addr.city = "";
        $scope.data.addr.state = "";
        $scope.data.addr.postal = "";
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
        $state.go('app.map');
    };
    $scope.enterInfo = function(){
        var queryString = encodeURI("record="+$scope.uuid+"&first_name="+$scope.data.cust.fname+"&last_name="+$scope.data.cust.lname+"&phone_work="+$scope.data.cust.phone+"&api_email_entry_c="+$scope.data.cust.email+"&description="+$scope.data.cust.notes+"&uid="+$scope.maddr.val);
        $http.post("https://sales.jabtools.com/ajax/mobile.php", queryString, {headers:{'Content-Type': 'application/x-www-form-urlencoded'}}).then(
            function(){$state.go('app.review');},
            function(){$scope.save();
                       $state.go('app.review');});
    };
});
