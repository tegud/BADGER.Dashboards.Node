(function() {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentFactories');

    TLRGRP.BADGER.Dashboard.ComponentFactories.AllPoolsLoadBalancerStatus = function(factoryConfig) {
        return {
            load: function() {
                var deferred = $.Deferred();

                $.get('http://' + factoryConfig.host + ':' + factoryConfig.port + '/pools').then(function(data) {

                    var components = data.children.map(function(pool) {
                        return {
                            'type': 'LoadBalancerStatus',
                            'poolId': pool.name,
                            'title': pool.name + ' Status',
                            'host': factoryConfig.host,
                            'port': factoryConfig.port,
                            'span': factoryConfig.span
                        };
                    });

                    deferred.resolve(components);
                });

                return deferred;
            }
        };
    };

})();
