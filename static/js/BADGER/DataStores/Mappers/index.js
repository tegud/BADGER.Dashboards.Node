(function (){
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.DataStores');

    function getValueFromSubProperty(value, property) {
        var valuePropertySegments = property.split('.');
        var segmentEscaper = /\|/ig;

        _.each(valuePropertySegments, function(segment) {
            value = value[segment.replace(segmentEscaper, ".")];
        });

        return value;
    }

    function extractFromDateHistogram(config, aggregate, name) {
        var dates = aggregate.buckets;

        return _.map(dates, function(dateBucket) {
            var parsedObject = {
                time: moment(dateBucket.to_as_string || dateBucket.key).toDate()
            };

            parsedObject[name] = _.reduce(config.fields, function(memo, field, key) {
                memo[key] = getValueFromSubProperty(dateBucket, field)
                return memo;
            }, {});

            return parsedObject;
        });
    }

    var calculations = {
        'percentage': function(by, property) {
            return (property[by.field] / parseFloat(property[by.over])) * 100;
        }
    };

    TLRGRP.BADGER.Dashboard.DataStores.Mappers = {
        'pickValue': function(mapping, data) {
            return data[mapping.field];
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
                _.each(dateBucket, function(property, key) {
                    if(key === 'time') {
                        return;
                    }

                    property[mapping.toField] = calculations[mapping.calculation](mapping.by, property);
                });
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

            _.each(data, function(dateBucket) {
                var values = _.map(mapping.fields, function(field) {
                    if(isNaN(dateBucket[field][mapping.property]) || dateBucket[field][mapping.property] == Number.POSITIVE_INFINITY) return;

                    return dateBucket[field][mapping.property];
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

                dateBucket[mapping.toField || 'value'] = stats;
            });

            return data;
        }
    };
})();
