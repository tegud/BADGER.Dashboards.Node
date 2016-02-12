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
                                        "term": {
                                            "type": "hotel_acquisitions_errors"
                                        }
                                    }, {
                                        "not": {
                                            "term": {
                                                "tags": "noterror"
                                            }
                                        }
                                    }, {
                                        "not": {
                                            "term": {
                                                "loglevel": "info"
                                            }
                                        }
                                    }, {
                                        "or": [{
                                            "term": {
                                                "Provider": providerName
                                            }
                                        }, {
                                            "term": {
                                                "ProviderReservationException.Provider": providerName
                                            }
                                        }]
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
                                            "type": "domain_events"
                                        }
                                    }, {
                                        "term": {
                                            "isTestBooking": false
                                        }
                                    }, {
                                        "term": {
                                            "hotelProvider": providerName
                                        }
                                    }]
                                }]
                            }]
                        }
                    }
                }
            },
            "aggs": {
                "connectivity_errors": {
                    "filter": { "bool": { "must": [{ "term": { "type": "hotel_acquisitions_errors" } }, { "not": { "exists": { "field": "ProviderReservationException.Provider" } } }] } },
                    "aggs": {
                        "top_error_messages": {
                            "terms": {
                                "field": "Exception.Message.raw"
                            }
                        },
                        "top_errors": {
                            "top_hits": {
                                "size": 50,
                                "sort": [{ "@timestamp": { "order": "desc" } }],
                                "_source": {
                                    "include": [
                                        "@timestamp",
                                        "Provider",
                                        "loglevel",
                                        "terminating_request_id",
                                        "ProviderAvailabilityException",
                                        "Exception.Message",
                                        "Exception.StackTraceString",
                                        "Exception.ExceptionMethod",
                                        "Exception.ClassName",
                                        "Exception.Source",
                                        "Exception.InnerException.Message",
                                        "Exception.InnerException.ClassName",
                                        "Exception.InnerException.ExceptionMethod",
                                        "Exception.InnerException.StackTraceString",
                                        "Exception.InnerException.Source",
                                        "Exception.InnerException.InnerException.Message",
                                        "Exception.InnerException.InnerException.ClassName",
                                        "Exception.InnerException.InnerException.ExceptionMethod",
                                        "Exception.InnerException.InnerException.StackTraceString",
                                        "Exception.InnerException.InnerException.Source",
                                        "Exception.InnerException.InnerException.InnerException.Message",
                                        "Exception.InnerException.InnerException.InnerException.ClassName",
                                        "Exception.InnerException.InnerException.InnerException.ExceptionMethod",
                                        "Exception.InnerException.InnerException.InnerException.StackTraceString",
                                        "Exception.InnerException.InnerException.InnerException.Source"
                                    ]
                                }
                            }
                        }
                    }
                },
                "booking_errors": {
                    "filter":  { "bool": { "must": [{ "term": { "type": "hotel_acquisitions_errors" } }, { "term": { "ProviderReservationException.Provider":providerName } }] } },
                    "aggs": {
                        
                    }
                },
                "bookings": {
                    "filter": {
                        "term": {
                            "type": "domain_events"
                        }
                    },
                    "aggs": {
                        "bookings": {
                            "top_hits": {
                                "size": 50,
                                "sort": [ { "@timestamp": { "order": "desc" } } ],
                                "_source": {
                                    "include": [
                                        "bookingId",
                                        "hotelId",
                                        "totalAmountGbp",
                                        "commission",
                                        "commissionValue",
                                        "rooms",
                                        "nights",
                                        "hotelProvider",
                                        "affiliateId",
                                        "affiliateName",
                                        "bookingCountry",
                                        "channelId",
                                        "sessionId",
                                        "requestId",
                                        "resAPI",
                                        "isTestBooking"
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            "size": 0
        };
    }

    TLRGRP.BADGER.Dashboard.ComponentModules.ProviderSummary.Logs = {
        logStore: function createMetricStore(providerName, inlineLoading, callbacks, configuration, alertData, checkTimeFrames) {
            configuration.defaultTimeFrame = _.last(checkTimeFrames).timeFrame || { timeFrame: "1", units: 'hours' };
            configuration.query = buildQuery(providerName);
            configuration.mappings = [];

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
