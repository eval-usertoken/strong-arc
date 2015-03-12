Licenses.service('LicensesService', [
  '$q',
  '$http',
  '$log',
  'ArcUserService',
  function ($q, $http, $log, ArcUserService) {
    var svc = this;
    var apiUrl = 'http://demo.strongloop.com:3001/api';

    svc.getAllProducts = function(){
      var url = apiUrl + '/subscriptions/products';

      return $http.get(url, { cache: true })
        .then(function(data){
          return data.data;
        });
    };

    svc.getArcFeatures = function(){
      return svc.getAllProducts()
        .then(function(products){
          return products.arc.features;
        });
    };

    svc.getLicenses = function() {
      var userId = ArcUserService.getCurrentUserId();
      var url = apiUrl + '/users/'+userId+'/subscriptions';

      return $http.get(url, { cache: false });
    };

    svc.getInvalidLicenses = function(data, page){
      var def = $q.defer();
      var now = moment().unix();
      var licenses = data.data;

      function isLicenseInvalid(license){
        var isArcLicense = license.product === 'arc';

        var expirationDate = moment(license.expirationDate).unix();
        var isExpired = expirationDate < now+86400*1; //1 day from now

        //skip feature check on non-arc licenses as they don't apply here
        if ( !isArcLicense ) return isExpired;

        //check features allowed
        var features = license.features.split(', ');
        var isFeatureAllowed = features && _.contains(features, page.substr(1)); //remove '/' in page

        return isExpired || !isFeatureAllowed
      }

      licenses = licenses.filter(isLicenseInvalid);

      def.resolve(licenses);

      return def.promise;
    };

    svc.renewLicenses = function(licenses){
      function renew(license){
        var apiUrl = svc.getApiUrl();
        var userId = ArcUserService.getCurrentUserId();
        var url = apiUrl + '/users/'+userId+'/renewTrial'; //todo need endpoint to renew

        return svc.getArcFeatures()
          .then(function(arcFeatures){
            return $http.post(url, { product: 'arc', features: arcFeatures });
          });
      }

      return $q.all(licenses.map(renew));
    };

    svc.validateLicenses = function(page){
      return svc.getLicenses()
        .then(function(data){
          return svc.getInvalidLicenses(data, page);
        })
        .then(svc.renewLicenses)
        .catch(function(err){
          $log.error(err);

          return err;
        });
    };

    svc.getApiUrl = function(){
      return apiUrl;
    };

    return svc;
  }
]);
