Licenses.controller('LicensesMainController', [
  '$scope',
  '$q',
  'LicensesService',
  function ($scope, $q, LicensesService) {

    window.setScrollView('.common-instance-view-container');

    LicensesService.getLicenses()
      .then(function(data){
        $scope.licenses = data;
      });
  }]);
