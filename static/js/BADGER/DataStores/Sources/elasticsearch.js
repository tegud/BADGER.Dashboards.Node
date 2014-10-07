(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.DataSource');

    function setValueOnSubProperty(obj, prop, value) {
        if(typeof value === 'undefined') return;
        
        if (typeof prop === "string")
             prop = prop.split(".");

        if (prop.length > 1) {
             var e = prop.shift();

            if(e === '#') {
                e = obj.length;
            }
            else if(!isNaN(e)) {
                e = parseInt(e, 10);
            }

            if(typeof e === 'string' &&  e.indexOf('|') > -1) {
            	e = e.replace(/|/g, '.');
            }

            setValueOnSubProperty(obj[e] =
                Object.prototype.toString.call(obj[e]) === "[object Object]" || 
                Object.prototype.toString.call(obj[e]) === "[object Array]" 
                    ? obj[e]
                    : {},
                prop,
                value);
        } else {
        	var parsedProperty = prop[0];

            if(typeof parsedProperty === 'string' &&  parsedProperty.indexOf('|') > -1) {
            	parsedProperty = parsedProperty.replace(/\|/g, '.');
            }

            obj[parsedProperty] = value;
         }
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

	var defaultRangeProperties = {
		"@timestamp": { "start": "from", "end": "to" },
		"extended_bounds": { "start": "min", "end": "max" }
	};


	function getTimeProperties(timePropertyLocation) {
		var startProperty = defaultRangeProperties[lastProperty] && defaultRangeProperties[lastProperty].start ? defaultRangeProperties[lastProperty].start : 'from';
		var endProperty = defaultRangeProperties[lastProperty] && defaultRangeProperties[lastProperty].end ? defaultRangeProperties[lastProperty].end : 'to';

		if(typeof timePropertyLocation !== 'string') {
			startProperty = timePropertyLocation.start;
			endProperty = timePropertyLocation.end;
			timePropertyLocation = timePropertyLocation.property;
		}

		var lastDot = timePropertyLocation.lastIndexOf('.');
		var lastProperty = lastDot > -1 ? timePropertyLocation.substring(lastDot + 1) : timePropertyLocation;

		if(defaultRangeProperties[lastProperty] && defaultRangeProperties[lastProperty].start) {
			startProperty = defaultRangeProperties[lastProperty].start;
		}
		if(defaultRangeProperties[lastProperty] && defaultRangeProperties[lastProperty].end) {
			endProperty = defaultRangeProperties[lastProperty].end;
		}

		return {
			start: timePropertyLocation + '.' + startProperty,
			end: timePropertyLocation + '.' + endProperty
		};
	}

	function mapTimeFrameToFilter(interval, units) {
		return 'now-' + interval + units[0];
	}

	var timeFrameMappers = {
		'daysAgo': function(timeFrame, queryItem) {
			var dayOffset = parseInt(timeFrame.timeFrame, 10);
			var day = moment().add('d', -dayOffset);
			var endTimeLimit = moment('1 jan 2014 23:59:59', 'DD MMM YYYY HH:mm:ss');

			if(queryItem.timeOffset) {
				for(var unit in queryItem.timeOffset) {
					if(!queryItem.timeOffset.hasOwnProperty(unit)) {
						continue;
					}

					if(unit === 'relativeInMonth') {
						day = TLRGRP.BADGER.Utilities.relativeMonth(day, queryItem.timeOffset[unit]);
					}
					else {
						day.add(unit, queryItem.timeOffset[unit]);
					}
				}
			}

			if(!dayOffset && queryItem.limitToCurrentTime) {
				endTimeLimit = moment().utc();
			}

			if(queryItem.currentTimeOffset) {
				_.each(queryItem.currentTimeOffset, function(amount, unit) {
					endTimeLimit = endTimeLimit.add(unit, amount);
				});
			}

			var end = moment(day.format('YYYY.MM.DD 00:00:00') + 'Z').format('YYYY-MM-DDT' + endTimeLimit.format('HH:mm:ss') + 'Z');
			var endMoment = moment(end);

			return {
				live: endMoment.add(-10, 'mins').isAfter(moment()),
				interval: '15m',
			 	start: moment(day.format('YYYY.MM.DD 00:00:00') + 'Z').format('YYYY-MM-DDT00:00:00Z'),
		 		end: end
			};
		}
	};

	var defaultTimeFrameMapper = function(timeFrame) {
		return {
			live: true,
			start: mapTimeFrameToFilter(timeFrame.timeFrame, timeFrame.units),
			interval: mapTimeFrameToInterval(timeFrame.timeFrame, timeFrame.units)
		};
	}

    function applyFilterToQuery(query, filter) {
    	if(_.isArray(filter.value)) {
    		if(filter.value.length === 1) {
        		_.each(filter.value[0], function(value, key) {
        			if(_.isArray(filter.setOnProperties[key])) {
        				_.each(filter.setOnProperties[key], function(prop) {
        					setValueOnSubProperty(query, prop, value);
        				});
        			}
        			else {
            			setValueOnSubProperty(query, filter.setOnProperties[key], value);
        			}
        		});
    		}
    		else {
    			console.log('Multiple filter terms no implemented');
    		}
    	}
    	else if (_.isObject(filter.value)) {
    		_.each(filter.value, function(value, key) {
    			if(_.isArray(filter.setOnProperties[key])) {
    				_.each(filter.setOnProperties[key], function(prop) {
    					setValueOnSubProperty(query, prop, value);
    				});
    			}
    			else {
    				setValueOnSubProperty(query, filter.setOnProperties[key], value);
    			}
    		});
    	}
    	else {
    		_.each(filter.setOnProperties, function(properties) {
    			if(_.isArray(properties)) {
    				_.each(properties, function(property) {
        				setValueOnSubProperty(query, property, filter.value);
    				});
    			}
    			else {
        			setValueOnSubProperty(query, properties, filter.value);
    			}
    		});
    	}
    }

    function applyFilters(queries, filters) {
        _.each(filters, function(filter) {
            if(!filter.value) {
                return;
            }

            _.each(queries, function(query) {
                applyFilterToQuery(query, filter);
            });
        });
    }

	TLRGRP.BADGER.Dashboard.DataSource.elasticsearch = function(configuration) {
		return {
			 requestBuilder: function(options, filters) {
			 	var queries = configuration.queries || { query: { query: configuration.query } };

			 	var timeFrame = options.timeFrame;

			 	if(queries.modifiers) {
			 		var baseQuery = JSON.parse(JSON.stringify(queries.query));
			 		var expandedQueries = {};

			 		_.each(queries.modifiers, function(queryModifier, key) {
			 			var query = JSON.parse(JSON.stringify(baseQuery));

			 			expandedQueries[key] = {
			 				timeOffset: queryModifier.timeOffset,
							limitToCurrentTime: queryModifier.limitToCurrentTime,
							currentTimeOffset: queryModifier.currentTimeOffset,
			 				query: query
			 			};
			 		});

			 		queries = expandedQueries;
			 	}

			 	applyFilters(queries, filters);

			 	if(!timeFrame.userSet && configuration.defaultTimeFrame) {
			 		timeFrame = configuration.defaultTimeFrame;

                	TLRGRP.messageBus.publish('TLRGRP.BADGER.TimePeriod.Set', configuration.defaultTimeFrame);
			 	}

	 			var timeFrameMapper = timeFrameMappers[timeFrame.units] || defaultTimeFrameMapper;

			 	return _.map(queries, function(queryItem, key) {
			 		var query = JSON.parse(JSON.stringify(queryItem.query));
		 			var range = timeFrameMapper(timeFrame, queryItem);

					_.each(configuration.timeProperties, function(timePropertyLocation) {
						var timeProperties = getTimeProperties(timePropertyLocation);

						setValueOnSubProperty(query, timeProperties.start, range.start);
						setValueOnSubProperty(query, timeProperties.end, range.end);
					});

					_.each(configuration.intervalProperties, function(intervalPropertyLocation) {
						setValueOnSubProperty(query, intervalPropertyLocation, range.interval);
					});

					var indexBuilder = new TLRGRP.BADGER.Elasticsearch.IndexBuilder({ prefix: 'logstash-' });
					var indicies = indexBuilder.buildFromTimeFrame(timeFrame, queryItem);

					 return {
				 		id: key,
						url: configuration.host + '/' + indicies.join(',') + '/_search',
						method: 'POST',
						contentType: 'application/json',
						data: JSON.stringify(query),
						isLive: range.live
					 };
			 	});
			 },
			 responseMapper: function(data) {
				 return data;
			 }
		};
	};
})();
