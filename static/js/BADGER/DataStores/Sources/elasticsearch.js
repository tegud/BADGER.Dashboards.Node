(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.DataSource');

	function setValueOnSubProperty(obj, prop, value) {
	    if (typeof prop === "string")
	        prop = prop.split(".");

	    if (prop.length > 1) {
	        var e = prop.shift();

	        if(!isNaN(e)) {
	        	e = parseInt(e, 10);
	        }

	        setValueOnSubProperty(obj[e] =
	                 Object.prototype.toString.call(obj[e]) === "[object Object]" || 
	                 Object.prototype.toString.call(obj[e]) === "[object Array]" 
	                 ? obj[e]
	                 : {},
	               prop,
	               value);
	    } else
	        obj[prop[0]] = value;
	}

	function mapTimeFrameToInterval(interval, units) {
		var unitMappings = {
			'15minutes': '15s',
			'30minutes': '30s',
			'1hours': '1m',
			'6hours': '6m',
			'12hours': '12m',
			'1days': '24m',
			'2days': '48m',
			'3days': '72m',
			'1weeks': '168m',
			'4weeks': '672m'
		};

		return unitMappings[interval + units];
	}

	function mapTimeFrameToFilter(interval, units) {
		return 'now-' + interval + units[0];	
	}

	TLRGRP.BADGER.Dashboard.DataSource.elasticsearch = function(configuration) {
		var logstashIndexDate = moment().format('YYYY.MM.DD');

	    return {
	        requestBuilder: function(options) {
	        	var query = configuration.query;

        		_.each(configuration.timeProperties, function(timePropertyLocation) {
        			setValueOnSubProperty(query, timePropertyLocation, mapTimeFrameToFilter(options.timeFrame.timeFrame, options.timeFrame.units));
        		});

        		_.each(configuration.intervalProperties, function(intervalPropertyLocation) {
        			setValueOnSubProperty(query, intervalPropertyLocation, mapTimeFrameToInterval(options.timeFrame.timeFrame, options.timeFrame.units));
        		});


        		var oldestIndexRequired = moment().subtract(options.timeFrame.timeFrame, options.timeFrame.units);
        		var currentDate = moment();
        		var indicies = [];

        		while(currentDate.unix() > oldestIndexRequired.unix()) {
        			indicies.push('logstash-' + currentDate.format('YYYY.MM.DD')); 
        			currentDate = currentDate.subtract(1, 'day');
        		}

	            return {
	                url: configuration.host + '/' + indicies.join(',') + '/_search',
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
