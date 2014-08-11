(function (){
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.DataStores');

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

    function extractFromDateHistogram(config, aggregate, name) {
        var dates = aggregate.buckets;

        return _.map(dates, function(dateBucket) {
            var parsedObject = {
                time: moment(dateBucket.to_as_string || dateBucket.key).toDate()
            };

            parsedObject[name] = _.reduce(config.fields, function(memo, field, key) {
                memo[key] = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(dateBucket, field)
                return memo;
            }, {});

            return parsedObject;
        });
    }

    var calculations = {
        'percentage': function(by, property) {
            return (TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(property, by.field) / parseFloat(TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(property, by.over))) * 100;
        }
    };

    TLRGRP.BADGER.Dashboard.DataStores.Mappers = {
        'pickValue': function(mapping, data) {
            return data[mapping.field];
        },
        'pickValues': function(mapping, data) {
            var matchedValues = {};

            if(mapping.multiQuery) {
                _.each(data, function(currentData, key) {
                    var itemValues = {};

                    _.each(mapping.values, function(value) {
                        setValueOnSubProperty(itemValues, value.to, TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(currentData, value.from))
                    });

                    matchedValues[key] = itemValues;
                });

            }
            else {
                _.each(mapping.values, function(value) {
                    setValueOnSubProperty(matchedValues, value.to, TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(data, value.from))
                });
            }


            return matchedValues;
        },
        'extractFromDateHistogram': function(mapping, data) {
            if(data.aggregations) {
                return extractFromDateHistogram(mapping, data.aggregations[mapping.aggregateName]);
            }

            return _.reduce(data, function(memo, response, key) {
                var processedBucket = extractFromDateHistogram(mapping, response.aggregations[mapping.aggregateName], key);

                if(!memo.length) {
                    return processedBucket;
                }

                var memoLength = memo.length;
                var x = 0;

                for(; x < memoLength; x++) {
                    memo[x][key] = processedBucket[x][key];
                }

                return memo;
            }, []);
        },
        'calculation': function(mapping, data) {
            if(!calculations[mapping.calculation]) {
                return; 
            }

            _.each(data, function(dateBucket) {
                if(mapping.notFromHistogram) {
                    setValueOnSubProperty(dateBucket, mapping.toField, calculations[mapping.calculation](mapping.by, dateBucket));
                }
                else {
                    _.each(dateBucket, function(property, key) {
                        if(key === 'time') {
                            return;
                        }

                        setValueOnSubProperty(property, mapping.toField, calculations[mapping.calculation](mapping.by, property));
                    });
                }
            });
            return data;
        },
        'stats': function(mapping, data) {
            function average(a) {
                var r = {mean: 0, variance: 0, deviation: 0}, t = a.length;
                for(var m, s = 0, l = t; l--; s += a[l]);
                for(m = r.mean = s / t, l = t, s = 0; l--; s += Math.pow(a[l] - m, 2));
                return r.deviation = Math.sqrt(r.variance = s / t), r;
            }

            function calculateAverage(rootObject) {
                var values = _.map(mapping.fields, function(field) {
                    var currentValue = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(rootObject[field], mapping.property);
                    if(isNaN(currentValue) || currentValue == Number.POSITIVE_INFINITY) return;

                    return currentValue;
                });
                var stats = average(values);

                _.each(mapping.stds, function(numberOfStds) {
                    if(!stats.standardDeviations) {
                        stats.standardDeviations = [];
                    }
                    stats.standardDeviations[numberOfStds] = {
                        minus: stats.mean - (stats.deviation * numberOfStds),  
                        plus: stats.mean + (stats.deviation * numberOfStds)
                    };
                });

                setValueOnSubProperty(rootObject, (mapping.toField || 'value'), stats);
            }

            if(mapping.notFromHistogram) {
                calculateAverage(data);
            }
            else {
                _.each(data, function(dateBucket) {
                    calculateAverage(dateBucket);
                });
            }

            return data;
        }
    };
})();
