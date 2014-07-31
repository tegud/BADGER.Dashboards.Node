(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.DataSource');

	function setValueOnSubProperty(obj, prop, value) {
		if(typeof value === 'undefined') return;
		
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

			if(queryItem.timeOffset) {
				for(var unit in queryItem.timeOffset) {
					if(!queryItem.timeOffset.hasOwnProperty(unit)) {
						continue;
					}

					day.add(unit, queryItem.timeOffset[unit]);
				}
			}

			return {
				interval: '15m',
			 	start: moment(day.format('YYYY.MM.DD 00:00:00') + 'Z').format('YYYY-MM-DDT00:00:00Z'),
		 		end: moment(day.format('YYYY.MM.DD 00:00:00') + 'Z').format('YYYY-MM-DDT23:59:59Z')
			};
		}
	};

	var defaultTimeFrameMapper = function(timeFrame) {
		return {
			start: mapTimeFrameToFilter(timeFrame.timeFrame, timeFrame.units),
			interval: mapTimeFrameToInterval(timeFrame.timeFrame, timeFrame.units)
		};
	}

	TLRGRP.BADGER.Dashboard.DataSource.elasticsearch = function(configuration) {
		return {
			 requestBuilder: function(options) {
			 	var queries = configuration.queries || [ { query: configuration.query } ];
			 	var timeFrame = options.timeFrame;

			 	if(queries.modifiers) {
			 		var baseQuery = JSON.parse(JSON.stringify(queries.query));
			 		var expandedQueries = {};
			 		
			 		_.each(queries.modifiers, function(queryModifier, key) {
			 			var query = JSON.parse(JSON.stringify(baseQuery));

			 			expandedQueries[key] = {
			 				dayOffset: queryModifier.dayOffset,
			 				timeOffset: queryModifier.timeOffset,
			 				query: query
			 			};
			 		});

			 		queries = expandedQueries;
			 	}

			 	if(!timeFrame.userSet && configuration.defaultTimeFrame) {
			 		timeFrame = configuration.defaultTimeFrame;

                	TLRGRP.messageBus.publish('TLRGRP.BADGER.TimePeriod.Set', configuration.defaultTimeFrame);
			 	}

	 			var timeFrameMapper = timeFrameMappers[timeFrame.units] || defaultTimeFrameMapper; 

			 	return _.map(queries, function(queryItem, key) {
			 		var query = JSON.parse(JSON.stringify(queryItem.query));
		 			var range = timeFrameMapper(timeFrame, queryItem);

		 			console.log(range);
		 			
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
						  data: JSON.stringify(query)
					 };
			 	});
			 },
			 responseMapper: function(data) {
				 return data;
			 }
		};
	};
})();
