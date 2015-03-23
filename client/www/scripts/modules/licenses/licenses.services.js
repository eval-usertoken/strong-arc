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

    //check arc licenses on accessing route
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

    //for arc routes handling
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

    //for licensing page
    svc.renewProducts = function(toRenew){
      var userId = ArcUserService.getCurrentUserId();
      var renewArr = [];

      function renewProduct(product){
        var def = $q.defer();

        Subscription.renewTrial({ userId: userId }, { product: product.id, features: product.features }).$promise
          .then(function(data){
            def.resolve(data);
          })
          .catch(function(err){
            //resolve w/ error so failed call doesn't block the rest
            def.resolve(err);
          });

        return def.promise;
      }

      //convert object w/ keys to an array for use by $q.all map
      for ( var id in toRenew ) {
        toRenew[id].id = id;
        renewArr.push(toRenew[id]);
      }

      return $q.all(renewArr.map(renewProduct));
    };

    svc.getRenewableProducts = function(products){
      var def = $q.defer();
      var productKeys = Object.keys(products);

      //if any features or licenses are not enabled, renew them
      var toRenew = {};

      productKeys.map(function(id){
        var product = products[id];
        var license = product.license || {};
        var access = license.access || {};
        var expirationDate = moment(license.expirationDate).unix();
        var now = moment().unix();
        var isExpired = expirationDate < now+86400*1;

        toRenew[id] = {};

        //check for at least one missing feature
        for ( var i=0; i<product.features.length; i++ ) {
          var feature = product.features[i];

          if ( !access[feature] ) {
            //renew all features as the api doesn't allow us to renew just one feature
            toRenew[id].features = product.features;
            break;
          }
        }

        //also renew if the license is expired
        if ( isExpired ) {
          toRenew[id].features = product.features;
        }

        //remove the products that have no features to be renewed
        for ( var id in toRenew ) {
          if (!toRenew[id].features ) {
            delete toRenew[id];
          }
        }
      });

      $log.log('toRenew', toRenew);

      def.resolve(toRenew);

      return def.promise;
    };

    svc.getProductsAndLicenses = function(){
      return $q.all([svc.getAllProducts(), svc.getLicenses()])
        .then(function(data){
          var products = JSON.parse(angular.toJson(data[0])); //remove angular properties from object
          var licenses = data[1];
          var productKeys = Object.keys(products);

          //embed the license (if any) for each product on the object for use in view
          productKeys.map(function(id){
            //check user licenses and add them to product list
            licenses.forEach(function(lic){
              if ( lic.product === id ) {
                var features = lic.features.split(', ');
                lic.access = {};

                //apply feature access flag for easy access in view
                features.map(function(feature){
                  lic.access[feature] = true;
                });

                products[id].license = lic;
              }
            });
          });

          $log.log('products', products);

          return products;
        });
    };

    return svc;
  }
]);
