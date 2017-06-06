angular.module('qual.controllers', ['starter.controllers'])
  .controller('qualCtrl', function($scope, $state, $http, $filter) {
    $scope.updateInfo = function(){
      var queryString = encodeURI("record="+$scope.uuid+"&primary_address_street="+$scope.data.addr.street+"&primary_address_city="+$scope.data.addr.city+"&primary_address_state="+$scope.data.addr.state+"&primary_address_postalcode="+$scope.data.addr.postal+"&api_package_service_desired_c="+$scope.data.plans.join(",")+"&api_suggested_start_date_c="+$filter('date')($scope.data.date, 'MM/dd/yyyy')+"&uid="+$scope.maddr.val);
      $http.post("https://sales.jabtools.com/ajax/mobile.php", queryString, {headers:{'Content-Type': 'application/x-www-form-urlencoded'}}).then(
        function(){$state.go('info');},
        function(){alert("Network failed");}
      );
    };
  });
