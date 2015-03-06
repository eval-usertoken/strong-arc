Licensing.controller('LicensingMainController', [
  '$scope',
  '$q',
  'LicensingService',
  function ($scope, $q, LicensingService) {

    window.setScrollView('.common-instance-view-container');

    LicensingService.getLicenses()
      .then(function(data){
        $scope.licenses = data.data;
      });
  }]);
