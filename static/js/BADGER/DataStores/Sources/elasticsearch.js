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

	TLRGRP.BADGER.Dashboard.DataSource.elasticsearch = function(configuration) {
		var logstashIndexDate = moment().format('YYYY.MM.DD');

		return {
			 requestBuilder: function(options) {
			 	var queries = configuration.queries || [ { query: configuration.query } ];

			 	return _.map(queries, function(queryItem, key) {
			 		var query = queryItem.query;
			 		var oldestIndexRequired = moment().subtract(options.timeFrame.timeFrame, options.timeFrame.units);
			 		var currentDate = moment();
			 		var indicies = [];

			 		if(queryItem.index) {
			 			var logStashTimeFillpointRegex = /\{([0-9a-zA-Z]+)\}/i;
			 			var matches = logStashTimeFillpointRegex.exec(queryItem.index);
			 			var indexDate = moment();

			 			var offsets = {
			 				'yesterday': -1,
			 				'lastWeek': -7,
			 				'2weeksago': -14,
			 				'lastMonth': -28
			 			};

			 			if(offsets[matches[1]]) {
			 				indexDate.add('d', offsets[matches[1]]);
			 			}

						_.each(configuration.timeProperties, function(timePropertyLocation) {
							var timeProperties = getTimeProperties(timePropertyLocation);
							
							setValueOnSubProperty(query, timeProperties.start, moment(indexDate.format('YYYY.MM.DD 00:00:00') + 'Z').format('YYYY-MM-DDT00:00:00Z'));
							setValueOnSubProperty(query, timeProperties.end, moment(indexDate.format('YYYY.MM.DD 00:00:00') + 'Z').format('YYYY-MM-DDT23:59:59Z'));
						});

			 			if(indexDate.zone() < 0) {
			 				var dayBefore = moment(indexDate).add('d', -1);
			 				indicies.push(queryItem.index.replace(logStashTimeFillpointRegex, dayBefore.format('YYYY.MM.DD')));
			 			}
			 			
			 			indicies.push(queryItem.index.replace(logStashTimeFillpointRegex, indexDate.format('YYYY.MM.DD')));
			 			
			 			if(indexDate.zone() > 0) {
			 				var dayAfter = moment(indexDate).add('d', 1);
			 				indicies.push(queryItem.index.replace(logStashTimeFillpointRegex, dayAfter.format('YYYY.MM.DD')));
			 			}
			 		}
			 		else {
			 			var interval;
			 			var range;

			 			if(options.timeFrame.units === 'daysAgo') {
			 				var dayOffset = parseInt(options.timeFrame.timeFrame, 10);
			 				var day = moment().add('d', -dayOffset);

			 				interval = "15m";
			 				range = {
			 				 	start: moment(day.format('YYYY.MM.DD 00:00:00') + 'Z').format('YYYY-MM-DDT00:00:00Z'),
			 			 		end: moment(day.format('YYYY.MM.DD 00:00:00') + 'Z').format('YYYY-MM-DDT23:59:59Z')
			 				};

				 			if(day.zone() < 0) {
				 				var dayBefore = moment(day).add('d', -1);
				 				indicies.push('logstash-' + dayBefore.format('YYYY.MM.DD'));
				 			}
				 			
				 			indicies.push('logstash-' + day.format('YYYY.MM.DD'));
				 			
				 			if(day.zone() > 0) {
				 				var dayAfter = moment(day).add('d', 1);
				 				indicies.push('logstash-' + dayAfter.format('YYYY.MM.DD'));
				 			}
			 			}
			 			else {
			 				interval = mapTimeFrameToInterval(options.timeFrame.timeFrame, options.timeFrame.units);
			 				range = {
			 					start: mapTimeFrameToFilter(options.timeFrame.timeFrame, options.timeFrame.units)
			 				};
			 			}

						_.each(configuration.timeProperties, function(timePropertyLocation) {
							var timeProperties = getTimeProperties(timePropertyLocation);

							setValueOnSubProperty(query, timeProperties.start, range.start);
							setValueOnSubProperty(query, timeProperties.end, range.end);
						});

						_.each(configuration.intervalProperties, function(intervalPropertyLocation) {
							setValueOnSubProperty(query, intervalPropertyLocation, interval);
						});

				 		while(currentDate.unix() > oldestIndexRequired.unix()) {
				 			indicies.push('logstash-' + currentDate.format('YYYY.MM.DD')); 
				 			currentDate = currentDate.subtract(1, 'day');
				 		}
			 		}

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
