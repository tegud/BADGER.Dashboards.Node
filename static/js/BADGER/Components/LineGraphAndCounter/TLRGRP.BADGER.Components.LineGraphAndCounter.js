(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    var idIncrementor = 0;

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
        var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated({ cssClass: 'last-updated-bottom' });

        var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
            title: configuration.title,
            layout: configuration.layout,
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
                },
                lastUpdated
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
        var dataStoreId = 'LineGraph-' + idIncrementor++;

        function refreshComplete(data) {
            if(configuration.storeId) {
                data = JSON.parse(JSON.stringify(data))
            }

            lastUpdated.setLastUpdated();
            counter.setValue(data);
            lineGraph.setData(data);
        }

        if(configuration.storeId) {
            dataStore = {
                start: function () {
                    TLRGRP.messageBus.publish('TLRGRP.BADGER.SharedDataStore.Subscribe.' + configuration.storeId, {
                        id: dataStoreId,
                        refreshComplete: refreshComplete,
                        loading: inlineLoading
                    });
                },
                stop: function () {
                    TLRGRP.messageBus.publish(dataStoreId);
                }
            };
        } 
        else {
            dataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
                request:  new TLRGRP.BADGER.Dashboard.DataSource[(configuration.dataSource || 'cube')](configuration),
                refresh: 5000,
                mappings: configuration.mappings,
                callbacks: {
                    success: refreshComplete
                },
                components: {
                    loading: inlineLoading
                }
            });
        } 

        var refreshUpdatedTextTimeout;

        (function setLastRefereshText() {
            refreshUpdatedTextTimeout = setTimeout(function() {
                lastUpdated.refreshText();
                setLastRefereshText();
            }, 1000);
        })();

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
                    },
                    remove: function() {
                        clearTimeout(refreshUpdatedTextTimeout);
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

