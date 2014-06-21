(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.DataSource');

	function setValueOnSubProperty(obj, prop, value) {
	    if (typeof prop === "string")
	        prop = prop.split(".");

	    if (prop.length > 1) {
	        var e = prop.shift();
	        setValueOnSubProperty(obj[e] =
	                 Object.prototype.toString.call(obj[e]) === "[object Object]"
	                 ? obj[e]
	                 : {},
	               prop,
	               value);
	    } else
	        obj[prop[0]] = value;
	}

	function mapTimeFrameToInterval(interval, units) {
		var unitMappings = {
			'15minutes': '30s',
			'30minutes': '30s',
			'1hours': '1m',
			'6hours': '30s',
			'12hours': '30s',
			'1days': '30s',
			'2days': '30s',
			'3days': '30s',
			'1weeks': '30s',
			'4weeks': '30s'
		};

		return unitMappings[interval + units];
	}

	TLRGRP.BADGER.Dashboard.DataSource.elasticsearch = function(configuration) {
		var logstashIndexDate = moment().format('YYYY.MM.DD');

	    return {
	        requestBuilder: function(options) {
	        	var query = configuration.query;

        		_.each(configuration.timeProperties, function(timePropertyLocation) {

        		});

        		_.each(configuration.intervalProperties, function(intervalPropertyLocation) {
        			setValueOnSubProperty(query, intervalPropertyLocation, mapTimeFrameToInterval(options.timeFrame.timeFrame, options.timeFrame.units));
        		});

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
