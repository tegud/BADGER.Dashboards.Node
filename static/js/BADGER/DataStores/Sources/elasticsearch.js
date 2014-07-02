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
			 	var timeFrame = options.timeFrame;

			 	if(!timeFrame.userSet && configuration.defaultTimeFrame) {
			 		timeFrame = configuration.defaultTimeFrame;

                	TLRGRP.messageBus.publish('TLRGRP.BADGER.TimePeriod.Set', configuration.defaultTimeFrame);
			 	}

			 	return _.map(queries, function(queryItem, key) {
			 		var query = JSON.parse(JSON.stringify(queryItem.query));
			 		var oldestIndexRequired = moment().subtract(timeFrame.timeFrame, timeFrame.units);
			 		var currentDate = moment();
			 		var indicies = [];
		 			var interval;
		 			var range;

		 			if(timeFrame.units === 'daysAgo') {
		 				var dayOffset = parseInt(timeFrame.timeFrame, 10);
		 				var day = moment().add('d', -dayOffset);

		 				if(queryItem.dayOffset) {
		 					day.add('d', queryItem.dayOffset);
		 				}

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
		 				interval = mapTimeFrameToInterval(timeFrame.timeFrame, timeFrame.units);
		 				range = {
		 					start: mapTimeFrameToFilter(timeFrame.timeFrame, timeFrame.units)
		 				};
		 			}

					_.each(configuration.timeProperties, function(timePropertyLocation) {
						var timeProperties = getTimeProperties(timePropertyLocation);

						if(range.start) {
							setValueOnSubProperty(query, timeProperties.start, range.start);
						}
						if(range.end) {
							setValueOnSubProperty(query, timeProperties.end, range.end);
						}
					});

					_.each(configuration.intervalProperties, function(intervalPropertyLocation) {
						setValueOnSubProperty(query, intervalPropertyLocation, interval);
					});

			 		while(currentDate.unix() > oldestIndexRequired.unix()) {
			 			indicies.push('logstash-' + currentDate.format('YYYY.MM.DD')); 
			 			currentDate = currentDate.subtract(1, 'day');
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
