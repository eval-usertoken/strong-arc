// Copyright StrongLoop 2014
ArcUser.controller('LoginController', [
  '$scope',
  '$location',
  'ArcUserService',
  'ref',
  function ($scope, $location, ArcUserService, ref) {
    $scope.ref = ref;
  }
]);

