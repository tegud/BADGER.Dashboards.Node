(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    TLRGRP.BADGER.Dashboard.Components.LineGraphAndCounter = function (configuration) {
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading();
        
        if(!configuration.graph) {
            configuration.graph = {};
        }

        if(configuration.counter) {
            configuration.graph.counterWindow = configuration.counter.window;
        }

        var counter = new TLRGRP.BADGER.Dashboard.ComponentModules.Counter(configuration.counter);
        var lineGraph = TLRGRP.BADGER.Dashboard.ComponentModules.LineGraph(configuration.graph);

        var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
            title: configuration.title,
            componentClass: 'graph-and-counter-component',
            modules: [
                inlineLoading,
                counter,
                lineGraph,
                {
                    appendTo: function (container) {
                        if (configuration.summaryText) {
                            container.append($('<div class="error-graph-summary-text">' + configuration.summaryText + '</div>'));
                        }
                    }
                }
            ]
        });

        var dataStore = new TLRGRP.BADGER.Dashboard.DataStores.AjaxDataStore({
            request:  new TLRGRP.BADGER.Dashboard.DataSource[(configuration.dataSource || 'cube')](configuration),
            refresh: 5000,
            callbacks: {
                success: function (data) {
                    if(data.aggregations) {
                        data = _.map(data.aggregations[configuration.aggregateProperty].buckets, function(bucket) {
                            var value = bucket;

                            if(configuration.valueProperty) {
                                var valuePropertySegments = configuration.valueProperty.split('.');

                                _.each(valuePropertySegments, function(segment) {
                                    value = value[segment];
                                });
                            }
                            else if (configuration.propertyProcessor) {
                                //"expression": "(requests.sessions.value/bookings.doc_count)*100"
                                if(configuration.propertyProcessor.type === 'sessionCommission') {
                                    value = (value.bookings.doc_count / value.requests.sessions.value) * 100;
                                }
                            }
                            else {
                                value = value.doc_count;
                            }

                            return {
                                value: value,
                                time: moment(bucket.to_as_string || bucket.key).toDate()
                            };
                        });
                    }

                    counter.setValue(data);
                    lineGraph.setData(data);
                }
            },
            components: {
                loading: inlineLoading
            }
        });

        var stateMachine = nano.Machine({
            states: {
                uninitialised: {
                    initialise: function (container) {
                        inlineLoading.loading();
                        componentLayout.appendTo(container);
                        this.transitionToState('initialised');
                    }
                },
                initialised: {
                    _onEnter: function () {
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

