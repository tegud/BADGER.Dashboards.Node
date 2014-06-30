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

        var counter = new TLRGRP.BADGER.Dashboard.ComponentModules[configuration.counter && configuration.counter.counters ? 'MultiCounter': 'Counter'](configuration.counter);
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

        function getValueFromSubProperty(value, property) {
            var valuePropertySegments = property.split('.');
            var segmentEscaper = /\|/ig;

            _.each(valuePropertySegments, function(segment) {
                value = value[segment.replace(segmentEscaper, ".")];
            });

            return value;
        }

        var dataStore;


        if(configuration.queries) {
            dataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
                request:  new TLRGRP.BADGER.Dashboard.DataSource[(configuration.dataSource || 'cube')](configuration),
                refresh: 5000,
                callbacks: {
                    success: function (data) {
                        if(data.aggregations) {
                            data = _.map(data.aggregations[configuration.aggregateProperty].buckets, function(bucket) {
                                var value = bucket;

                                if(configuration.valueProperty) {
                                    if(_.isArray(configuration.valueProperty)) {
                                        value = {};

                                        _.each(configuration.valueProperty, function(valueProperty) {
                                            value[valueProperty.property] = getValueFromSubProperty(bucket, valueProperty.value);
                                        });
                                    }
                                    else {
                                        value = getValueFromSubProperty(bucket, configuration.valueProperty);
                                    }
                                }
                                else if (configuration.propertyProcessor) {
                                    if(configuration.propertyProcessor.type === 'sessionCommission') {
                                        value = (value.bookings.doc_count / value.requests.sessions.value) * 100;
                                    }
                                    else if(configuration.propertyProcessor.type === 'percentiles') {
                                        value = value.percentiles.values['50.0'];
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
        } 
        else {
            dataStore = new TLRGRP.BADGER.Dashboard.DataStores.AjaxDataStore({
                request:  new TLRGRP.BADGER.Dashboard.DataSource[(configuration.dataSource || 'cube')](configuration),
                refresh: 5000,
                callbacks: {
                    success: function (data) {
                        if(data.aggregations) {
                            data = _.map(data.aggregations[configuration.aggregateProperty].buckets, function(bucket) {
                                var value = bucket;

                                if(configuration.valueProperty) {
                                    if(_.isArray(configuration.valueProperty)) {
                                        value = {};

                                        _.each(configuration.valueProperty, function(valueProperty) {
                                            value[valueProperty.property] = getValueFromSubProperty(bucket, valueProperty.value);
                                        });
                                    }
                                    else {
                                        value = getValueFromSubProperty(bucket, configuration.valueProperty);
                                    }
                                }
                                else if (configuration.propertyProcessor) {
                                    if(configuration.propertyProcessor.type === 'sessionCommission') {
                                        value = (value.bookings.doc_count / value.requests.sessions.value) * 100;
                                    }
                                    else if(configuration.propertyProcessor.type === 'percentiles') {
                                        value = value.percentiles.values['50.0'];
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
        }

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
                    },
                    stop: function() {
                        dataStore.stop();
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

