(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.DataStores');

    var defaultOptions = {
        pauseWhenNotVisible: true,
        components: {},
        refresh: 10000
    };

    TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore = function (options) {
        var currentOptions = $.extend(true, {}, defaultOptions, options);
        var currentTimeout;
        var defaultAjaxOptions = {
            type: 'GET'
        };
        var currentTimeFrame = {
            timeFrame: 1,
            units: 'hours'
        };
        var stateMachine = nano.Machine({
            states: {
                stopped: {
                    _onEnter: function () {
                        clearCurrentTimeout();
                    },
                    start: function (doItNow) {
                        if (doItNow) {
                            this.transitionToState('refreshing');
                            return;
                        }
                        this.transitionToState('waiting');
                    },
                    refreshComplete: function (data) {
                        if(currentOptions.request && currentOptions.request.responseMapper) {
                            data = currentOptions.request.responseMapper(data);
                        }
                        executeSuccessCallbackIfSpecified(data);
                    },
                    refreshFailed: function (errorInfo) {
                        executeErrorCallbackIfSpecified(errorInfo);
                    }
                },
                waiting: {
                    _onEnter: function () {
                        var stateMachineApi = this;

                        currentTimeout = setTimeout(function () {
                            stateMachineApi.transitionToState('refreshing');
                        }, currentOptions.refresh);
                    },
                    start: function (doItNow) {
                        var stateMachineApi = this;

                        if (doItNow) {
                            clearTimeout(currentTimeout);
                            this.transitionToState('refreshing');
                            return;
                        }

                        currentTimeout = setTimeout(function () {
                            stateMachineApi.transitionToState('refreshing');
                        }, currentOptions.refresh);
                    },
                    stop: function () {
                        this.transitionToState('stopped');
                    }
                },
                refreshing: {
                    _onEnter: function () {
                        if (currentOptions.components.loading) {
                            currentOptions.components.loading.loading();
                        }

                        var queries = currentOptions.request.requestBuilder({
                            timeFrame: currentTimeFrame
                        });

                        var responses = {};
                        var deferreds = _.map(queries, function(queryOptions) {
                            var ajaxOptions = {
                                url: currentOptions.url,
                                data: currentOptions.data,
                                success: function(data) {
                                    responses[queryOptions.id] = data;
                                }
                            };

                            if(currentOptions.request && currentOptions.request.requestBuilder) {
                                ajaxOptions = $.extend(ajaxOptions, queryOptions);
                            }

                            if (currentOptions.type) {
                                ajaxOptions.type = currentOptions.type;
                            }

                            if (currentOptions.contentType) {
                                ajaxOptions.contentType = currentOptions.contentType;
                            }

                            return $.ajax($.extend(true, {}, defaultAjaxOptions, ajaxOptions));
                        });

                        $.when.apply(undefined, deferreds)
                            .fail(function() {
                                stateMachine.handle('refreshFailed');
                            })
                            .then(function() {
                                // THIS SHOULD NOT STAY HERE
                                var combinedData = _.map(responses['today'].aggregations.bookingsbytime.buckets, function(bucket, index) {
                                    var value = {
                                        today: bucket.bookings.doc_count / parseFloat(bucket.requests.sessions.value),
                                        previousValues: []
                                    };

                                    _.each(responses, function(response, key) {
                                        if(value[key]) {
                                            return;
                                        }

                                        var bucket = response.aggregations.bookingsbytime.buckets[index];
                                        var commission = bucket.bookings.doc_count / parseFloat(bucket.requests.sessions.value);

                                        value[key] = commission;
                                        
                                        if(isNaN(commission) || commission == Number.POSITIVE_INFINITY) return;

                                        value.previousValues.push(commission);
                                    });

                                    return {
                                        value: value,
                                        time: moment(bucket.to_as_string || bucket.key).toDate()
                                    };
                                });

                                function average(a) {
                                    var r = {mean: 0, variance: 0, deviation: 0}, t = a.length;
                                    for(var m, s = 0, l = t; l--; s += a[l]);
                                    for(m = r.mean = s / t, l = t, s = 0; l--; s += Math.pow(a[l] - m, 2));
                                    return r.deviation = Math.sqrt(r.variance = s / t), r;
                                }

                                _.map(combinedData, function(entry) {
                                    var previousValues = entry.value.previousValues;
                                    var calculations = average(previousValues);

                                    entry.value.average = calculations.mean;
                                    entry.value.plusOneStd = calculations.mean + calculations.deviation;
                                    entry.value.minusOneStd = calculations.mean - calculations.deviation;
                                });                     

                                stateMachine.handle('refreshComplete', combinedData);
                            });
                    },
                    refreshComplete: function (data) {
                        executeSuccessCallbackIfSpecified(data);
                        
                        if (currentOptions.components.loading) {
                            currentOptions.components.loading.finished();
                        }

                        this.transitionToState('waiting');
                    },
                    refreshFailed: function (errorInfo) {
                        executeErrorCallbackIfSpecified(errorInfo);

                        if (currentOptions.components.loading) {
                            currentOptions.components.loading.finished();
                        }

                        this.transitionToState('waiting');
                    },
                    stop: function () {
                        this.transitionToState('stopped');
                    }
                }
            },
            initialState: 'stopped'
        });

        function clearCurrentTimeout() {
            if (currentTimeout) {
                clearTimeout(currentTimeout);
            }
        }

        function executeSuccessCallbackIfSpecified(data) {
            if (currentOptions.callbacks.success && $.isFunction(currentOptions.callbacks.success)) {
                currentOptions.callbacks.success(data);
            }
            
            if (currentOptions.components.lastUpdated) {
                currentOptions.components.lastUpdated.setLastUpdated(data.refreshedAt);
            }
        }

        function executeErrorCallbackIfSpecified(errorInfo) {
            if (currentOptions.callbacks.error && $.isFunction(currentOptions.callbacks.error)) {
                currentOptions.callbacks.error(errorInfo);
            }

            if (currentOptions.components.lastUpdated) {
                currentOptions.components.lastUpdated.refreshText();
            }
        }

        function setNewRefresh(refreshIn) {
            currentOptions.refresh = refreshIn;
        }

        if (currentOptions.pauseWhenNotVisible) {
            TLRGRP.messageBus.subscribe('TLRGRP.BADGER.PAGE.Hidden', function () {
                stateMachine.handle('pause');
            });

            TLRGRP.messageBus.subscribe('TLRGRP.BADGER.PAGE.Visible', function () {
                stateMachine.handle('unpause');
            });
        }

        TLRGRP.messageBus.subscribe('TLRGRP.BADGER.TimePeriod.Set', function(timeFrameData) {
            stateMachine.handle('stop');
            
            currentTimeFrame = timeFrameData;

            stateMachine.handle('start', true);
        });

        return {
            start: function (doItNow) {
                stateMachine.handle('start', doItNow);
            },
            stop: function () {
                stateMachine.handle('stop');
            },
            setNewRefresh: function (newRefresh) {
                setNewRefresh(newRefresh);
            }
        };
    };
})();
