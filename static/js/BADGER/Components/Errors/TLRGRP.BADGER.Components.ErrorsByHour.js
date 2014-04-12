(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    function padHour(hour) {
        if (hour < 10) {
            return '0' + hour;
        }
        return hour;
    }

    TLRGRP.BADGER.Dashboard.Components.ErrorsByHour = function (configuration) {
        var logstashPath = '/logstash-' + moment().format('YYYY.MM.DD') + '/_search';
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading();
        var dataStore = new TLRGRP.BADGER.Dashboard.DataStores.AjaxDataStore({
            url: 'http://10.44.35.21:9200' + logstashPath,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                "query": {
                    "term": { "@type": "lr_errors" }
                },
                "facets": {
                    "byHour": {
                        "date_histogram": {
                            "field": "@timestamp",
                            "interval": "hour"
                        }
                    }
                }
            }),
            refresh: 30000,
            callbacks: {
                success: function (data) {
                    var hourCounts = {};

                    _(data.facets.byHour.entries).each(function (item) {
                        var hour = new Date(item.time).getHours();
                        hourCounts[padHour(hour) + ':00'] = item.count;
                    });

                    hourList.setData(hourCounts);
                },
                error: function (errorInfo) {
                }
            },
            components: {
                loading: inlineLoading
            }
        });

        var hourList = new TLRGRP.BADGER.Dashboard.ComponentModules.ErrorHourList({});

        var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
            title: 'By Hour',
            componentClass: 'errors-by-hour-selector',
            modules: [
                inlineLoading,
                hourList
            ]
        });

        var stateMachine = nano.Machine({
            states: {
                uninitialised: {
                    initialise: function (container) {
                        componentLayout.appendTo(container);
                        this.transitionToState('initialised');
                    }
                },
                initialised: {
                    _onEnter: function () {
                        inlineLoading.loading();
                        dataStore.start(true);
                    }
                }
            },
            initialState: 'uninitialised'
        });

        return {
            render: function (container) {
                return stateMachine.handle('initialise', container);
            },
            unload: function () {
                stateMachine.handle('stop');
                stateMachine.handle('remove');
            }
        };
    };
})();

