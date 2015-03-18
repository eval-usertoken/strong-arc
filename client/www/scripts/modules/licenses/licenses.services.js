Licenses.service('LicensesService', [
  '$q',
  '$http',
  '$log',
  'ArcUserService',
  'Subscription',
  function ($q, $http, $log, ArcUserService, Subscription) {
    var svc = this;
    var apiUrl = 'http://demo.strongloop.com:3001/api';

    svc.getAllProducts = function(){
      return Subscription.getProducts().$promise;
    };

    svc.getArcFeatures = function(){
      return svc.getAllProducts()
        .then(function(products){
          return products.arc.features;
        });
    };

    svc.getLicenses = function() {
      var userId = ArcUserService.getCurrentUserId();

      return Subscription.getSubscriptions({ userId: userId }).$promise;
    };

    svc.getInvalidLicenses = function(data, page){
      var def = $q.defer();
      var now = moment().unix();
      var licenses = data;

      function isLicenseInvalid(license){
        var isArcLicense = license.product === 'arc';

        var expirationDate = moment(license.expirationDate).unix();
        var isExpired = expirationDate < now+86400*1; //1 day from now

        //skip feature check on non-arc licenses as they don't apply here
        if ( !isArcLicense ) return false;

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
        var userId = ArcUserService.getCurrentUserId();

        return svc.getArcFeatures()
          .then(function(arcFeatures){
            return Subscription.renewTrial({ userId: userId }, { product: 'arc', features: arcFeatures }).$promise;
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
