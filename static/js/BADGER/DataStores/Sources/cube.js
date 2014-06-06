(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.DataSource');

	TLRGRP.BADGER.Dashboard.DataSource.cube = function(configuration) {
        return {
            requestBuilder: function() {
                return {
                    url: (configuration.host || 'http://10.44.35.20:1081') + '/1.0/metric?expression=' + configuration.expression
                };
            },
            responseMapper: function(data) {
                return data;
            }
        };
	};
})();
