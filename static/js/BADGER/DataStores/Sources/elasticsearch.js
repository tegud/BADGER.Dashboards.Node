(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.DataSource');

	TLRGRP.BADGER.Dashboard.DataSource.elasticsearch = function(configuration) {
		var logstashIndexDate = moment().format('YYYY.MM.DD');

	    return {
	        requestBuilder: function() {
	        	var query = configuration.query;

	            return {
	                url: configuration.host + '/logstash-' + logstashIndexDate + '/_search',
	                method: 'POST',
	                contentType: 'application/json',
	                data: JSON.stringify(query)
	            };
	        },
	        responseMapper: function(data) {
	            return data;
	        }
	    };
	};
})();
