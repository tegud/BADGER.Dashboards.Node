(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Utilities.object');

	var functionRegex = /\:([a-z]+)\(([^=]+)=([^)]+)\)/ig;

	var fn = {
		'find': function(obj, key, val) {
			var matching = _.filter(obj, function(current) {
				return current[key] === val;
			});

			return matching[0];
		}
	};

	TLRGRP.BADGER.Utilities.object.getValueFromSubProperty = function(obj, property, defaultValue) {
		var valuePropertySegments = property.split('.');
        var segmentEscaper = /\|/ig;

        _.each(valuePropertySegments, function(segment) {
        	var functionMatches = functionRegex.exec(segment);
        	
        	if(typeof obj === 'undefined') {
        	}
        	else if(functionMatches){
        		obj = fn[functionMatches[1]](obj, functionMatches[2], functionMatches[3]) || defaultValue;
        	}
        	else {
            	obj = obj[segment.replace(segmentEscaper, ".")] || defaultValue;
        	}
        });

        return obj;
	};
})();