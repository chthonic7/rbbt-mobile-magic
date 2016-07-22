angular.module('qual.controllers', ['starter.controllers'])
.controller('qualCtrl', function($scope, $state, $http, $filter) {
    $scope.reGeo = function(){
        $scope.data.addr.street = "";
        $scope.data.addr.city = "";
        $scope.data.addr.state = "";
        $scope.data.addr.postal = "";
        $scope.qual = "Qualification pending...";
        $scope.data.plans = [];
        $scope.data.qual.levels = [];
        $scope.data.qual.los = "";
        $state.go('app.map');
    };
    $scope.updateInfo = function(){
        var queryString = encodeURI("record="+$scope.uuid+"&primary_address_street="+$scope.data.addr.street+"&primary_address_city="+$scope.data.addr.city+"&primary_address_state="+$scope.data.addr.state+"&primary_address_postalcode="+$scope.data.addr.postal+"&api_package_service_desired_c="+$scope.data.plans.join(",")+"&api_suggested_start_date_c="+$filter('date')($scope.data.date, 'MM/dd/yyyy'));
        alert(queryString);
        $state.go('app.info');
        $http.post("https://sales.jabtools.com/ajax/mobile.php", queryString, {headers:{'Content-Type': 'application/x-www-form-urlencoded'}}).then(
            function(){$state.go('app.info');},
            function(){alert("Network failed")});
    };
});
