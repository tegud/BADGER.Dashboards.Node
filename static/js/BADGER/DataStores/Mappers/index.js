(function (){
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.DataStores');

    var TDistribution = (function() {
        var lookupTable = [
            { '50%': 1.000,'60%': 1.376,'70%': 1.963,'80%': 3.078,'90%': 6.314,'95%': 12.71,'98%': 31.82,'99%': 63.66,'99.8%': 318.31,'99.9%': 636.62 },
            { '50%': 0.816 ,'60%': 1.061,'70%': 1.386,'80%': 1.886,'90%': 2.920,'95%': 4.303,'98%': 6.965,'99%': 9.925,'99.8%': 22.327,'99.9%': 31.599 },
            { '50%': 0.765 ,'60%': 0.978,'70%': 1.250,'80%': 1.638,'90%': 2.353,'95%': 3.182,'98%': 4.541,'99%': 5.841,'99.8%': 10.215,'99.9%': 12.924 },
            { '50%': 0.741 ,'60%': 0.941,'70%': 1.190,'80%': 1.533,'90%': 2.132,'95%': 2.776,'98%': 3.747,'99%': 4.604,'99.8%': 7.173,'99.9%': 8.610 },
            { '50%': 0.727 ,'60%': 0.920,'70%': 1.156,'80%': 1.476,'90%': 2.015,'95%': 2.571,'98%': 3.365,'99%': 4.032,'99.8%': 5.893,'99.9%': 6.869 },
            { '50%': 0.718 ,'60%': 0.906,'70%': 1.134,'80%': 1.440,'90%': 1.943,'95%': 2.447,'98%': 3.143,'99%': 3.707,'99.8%': 5.208,'99.9%': 5.959 },
            { '50%': 0.711 ,'60%': 0.896,'70%': 1.119,'80%': 1.415,'90%': 1.895,'95%': 2.365,'98%': 2.998,'99%': 3.499,'99.8%': 4.785,'99.9%': 5.408 },
            { '50%': 0.706 ,'60%': 0.889,'70%': 1.108,'80%': 1.397,'90%': 1.860,'95%': 2.306,'98%': 2.896,'99%': 3.355,'99.8%': 4.501,'99.9%': 5.041 },
            { '50%': 0.703 ,'60%': 0.883,'70%': 1.100,'80%': 1.383,'90%': 1.833,'95%': 2.262,'98%': 2.821,'99%': 3.250,'99.8%': 4.297,'99.9%': 4.781 },
            { '50%': 0.700 ,'60%': 0.879,'70%': 1.093,'80%': 1.372,'90%': 1.812,'95%': 2.228,'98%': 2.764,'99%': 3.169,'99.8%': 4.144,'99.9%': 4.587 }
        ];

        return {
            lookup: function compute(sampleSize, confidenceLevel) {
                var degreesOfFreedom = sampleSize - 1;

                if(degreesOfFreedom < 1) {
                    degreesOfFreedom = 1;
                }

                return lookupTable[degreesOfFreedom][confidenceLevel];
            }
        };
    })();
    

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

    function extractFromDateHistogram(config, aggregate, name, defaultValue) {
        var dates = aggregate.buckets;

        return _.map(dates, function(dateBucket) {
            var parsedObject = {
                time: moment(dateBucket.to_as_string || dateBucket.key).toDate()
            };

            parsedObject[name] = _.reduce(config.fields, function(memo, field, key) {
                memo[key] = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(dateBucket, field, defaultValue)
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
        'groupBy': function(mapping, data) {
            function group(root, data) {
                var rootObject = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(data, root);

                return _.reduce(rootObject, function(memo, item) {
                    memo[item.key] = item.doc_count;

                    return memo;
                }, {});
            };

            if(typeof mapping.root === 'string') {
                return group(mapping.root, data);
            }

            return _.reduce(mapping.root, function(memo, root) {
                memo[root.target] = group(root.field, data);

                return memo;
            }, {});
        },
        'pickValue': function(mapping, data) {
            return data[mapping.field || 'query'];
        },
        'pickValues': function(mapping, data) {
            var matchedValues = {};

            if(mapping.multiQuery) {
                _.each(data, function(currentData, key) {
                    var itemValues = {};

                    _.each(mapping.values, function(value) {
                        var itemValue = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(currentData, value.from);

                        if(typeof itemValue === 'undefined' && typeof mapping.defaultTo !== 'undefined') {
                            itemValue = mapping.defaultTo;
                        }

                        setValueOnSubProperty(itemValues, value.to, itemValue);
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
            if(mapping.dataSets) {
                return _.reduce(mapping.dataSets, function(outputData, set) {
                    var fields = {};

                    fields[set.field] = set.value;

                    outputData[set.field] = extractFromDateHistogram({
                        fields: fields
                    }, TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(data.query.aggregations, set.aggregate), 'values', mapping.defaultValue);

                    return outputData;
                }, {});
            }

            if(data.aggregations) {
                return extractFromDateHistogram(mapping, TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(data.aggregations, mapping.aggregateName), mapping.defaultValue);
            }

            return _.reduce(data, function(memo, response, key) {
                var processedBucket = extractFromDateHistogram(mapping, TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(response.aggregations, mapping.aggregateName), key, mapping.defaultValue);

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
        'confidenceInterval': function(mapping, data) {
            function calculateConfidenceInterval(obj) {
                var confidenceInterval = TDistribution.lookup(obj.value.sampleSize, mapping.confidenceLevel || '95%') * (obj.value.deviation / Math.sqrt(obj.value.sampleSize));

                obj.value.confidenceInterval = {
                    minus: obj.value.mean - confidenceInterval,
                    plus: obj.value.mean + confidenceInterval
                };
            }

            if(mapping.notFromHistogram) {
                calculateConfidenceInterval(data);
            }
            else {
                _.each(data, function(dateBucket) {
                    calculateConfidenceInterval(dateBucket);
                });
            }

            return data;
        },
        'stats': function(mapping, data) {
            function average(a) {
                var r = {mean: 0, variance: 0, deviation: 0, sampleSize: a.length}, t = a.length;
                for(var m, s = 0, l = t; l--; s += a[l]);
                for(m = r.mean = s / t, l = t, s = 0; l--; s += Math.pow(a[l] - m, 2));
                return r.deviation = Math.sqrt(r.variance = s / t), r;
            }

            function calculateAverage(rootObject) {
                var values = _.map(mapping.fields, function(field) {
                    var currentValue = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(rootObject[field], mapping.property);
                    if(isNaN(currentValue) || currentValue == Number.POSITIVE_INFINITY || ((typeof mapping.includeZeroValues !== 'undefined' && !mapping.includeZeroValues) && currentValue === 0)) return;

                    return currentValue;
                });

                values = _.filter(values, function(value) {
                    return typeof value !== 'undefined';
                });

                if(!values.length) {
                    values = [0];
                }

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
