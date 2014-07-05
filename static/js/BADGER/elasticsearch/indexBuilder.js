(function() {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Elasticsearch');

	TLRGRP.BADGER.Elasticsearch.IndexBuilder = function(options) {
		return { 
			buildFromTimeFrame: function(timeFrame, queryItem) {
				var indicies = [];
				var today = moment();
				var timeZone = today.zone();
				var day = today.utc();
				var oldestIndexRequired;
				var latestIndexRequired = moment(day);

	 			if(timeFrame.units === 'daysAgo') {
					var dayOffset = parseInt(timeFrame.timeFrame, 10);
					var queryItemDayOffset = queryItem && queryItem.dayOffset ? queryItem.dayOffset : 0;
					day.add('d', -dayOffset + queryItemDayOffset);

	 				oldestIndexRequired = moment(day);
	 				latestIndexRequired = moment(day);
	 			}
	 			else {
	 				oldestIndexRequired = day.subtract(timeFrame.timeFrame, timeFrame.units);
	 			}

				if(timeZone < 0) {
					oldestIndexRequired.add('d', -1);
				}
					
				if(timeZone > 0) {
					latestIndexRequired.add('d', 1);
				}

				day = oldestIndexRequired;

				var indexLimit = parseInt(latestIndexRequired.format('YYYYMMDD'), 10);
				while(parseInt(day.format('YYYYMMDD'), 10) <= indexLimit) {
					indicies.push(options.prefix + day.format('YYYY.MM.DD')); 
					day.add('d', 1);
				}

				return indicies;
			}
		};
	};
})();
