(function() {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules.ProviderSummary.Metrics');

    var timeCharToUnits = {
        's': 'seconds',
        'm': 'minutes',
        'h': 'hours',
        'd': 'days'
    };

    function getTimeFrameFromCheck(service) {
        if (service.attrs.name === 'Provider Bookings') {
            return { timeFrame: service.attrs.vars.bookings_in_last_hours, units: 'hours' };
        } else if (service.attrs.vars.graphite_url) {
            var graphiteTimeSegment = /from=-(([0-9]+)(h|m|s))/ig;

            var graphiteTimeMatches = graphiteTimeSegment.exec(service.attrs.vars.graphite_url);

            var time = parseInt(graphiteTimeMatches[2], 10);
            var timeUnits = graphiteTimeMatches[3];

            return { timeFrame: time, units: timeCharToUnits[timeUnits] }
        }
    }

    function buildQuery(providerName) {
        return {
            "query": {
                "filtered": {
                    "filter": {
                        "bool": {
                            "must": [{
                                "or": [{
                                    "and": [{
                                        "range": {
                                            "@timestamp": {
                                                "from": "now-1h"
                                            }
                                        }
                                    }, {
                                        "terms": {
                                            "metric": [
                                                "providerErrors",
                                                "providerBookingErrors"
                                            ]
                                        }
                                    }]
                                }, {
                                    "and": [{
                                        "range": {
                                            "@timestamp": {
                                                "from": "now-48h"
                                            }
                                        }
                                    }, {
                                        "term": {
                                            "service": "bookingsByProvider"
                                        }
                                    }]
                                }]
                            }, {
                                "term": {
                                    "provider": providerName
                                }
                            }]
                        }
                    }
                }
            },
            "aggs": {
                "errors": {
                    "filter": {
                        "term": {
                            "service": "connectivity"
                        }
                    },
                    "aggs": {
                        "bytime": {
                            "date_histogram": {
                                "min_doc_count": 0,
                                "extended_bounds": {
                                    "min": "now-1h",
                                    "max": "now"
                                },
                                "field": "@timestamp",
                                "interval": "1m"
                            },
                            "aggs": {
                                "types": {
                                    "terms": {
                                        "field": "metric"
                                    },
                                    "aggs": {
                                        "total": {
                                            "sum": {
                                                "field": "value"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "bookings": {
                    "filter": {
                        "term": {
                            "service": "bookingsByProvider"
                        }
                    },
                    "aggs": {
                        "bytime": {
                            "date_histogram": {
                                "min_doc_count": 0,
                                "extended_bounds": {
                                    "min": "now-48h",
                                    "max": "now"
                                },
                                "field": "@timestamp",
                                "interval": "1h"
                            },
                            "aggs": {
                                "types": {
                                    "terms": {
                                        "field": "metric"
                                    },
                                    "aggs": {
                                        "total": {
                                            "sum": {
                                                "field": "value"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "size": 0
        };
    }

    TLRGRP.BADGER.Dashboard.ComponentModules.ProviderSummary.Metrics = {
        metricStore: function createMetricStore(providerName, inlineLoading, callbacks, configuration, alertData, checkTimeFrames) {
            configuration.defaultTimeFrame = _.last(checkTimeFrames).timeFrame || { timeFrame: "1", units: 'hours' };
            configuration.query = buildQuery(providerName);
            configuration.mappings = [{
                "type": "extractFromDateHistogram",
                "defaultValue": 0,
                "dataSets": [
                    {
                        "aggregate": "errors.bytime",
                        "field": "bookingErrors",
                        "value": "types.buckets.:find(key=providerBookingErrors).total.value"
                    },
                    {
                        "aggregate": "errors.bytime",
                        "field": "errors",
                        "value": "types.buckets.:find(key=providerErrors).total.value"
                    },
                    {
                        "aggregate": "bookings.bytime",
                        "field": "bookings",
                        "value": "types.buckets.:find(key=count).total.value"
                    }
                ]
            }];

            return new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
                request: new TLRGRP.BADGER.Dashboard.DataSource.elasticsearch(configuration),
                refresh: 5000,
                mappings: configuration.mappings,
                callbacks: callbacks,
                components: {
                    loading: inlineLoading
                }
            });
        }
    };
})();
