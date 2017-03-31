(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    var idIncrementor = 0;

    TLRGRP.BADGER.Dashboard.Components.LineGraphAndCounter = function (configuration) {
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading();

        if(!configuration.graph) {
            configuration.graph = {};
        }

        if(configuration.counter || configuration.counterV2) {
            configuration.graph.counterWindow = configuration.counter ? configuration.counter.window : configuration.counterV2.window;
        }

        if(configuration.alert && configuration.alert.show) {
            configuration.graph.className = (configuration.graph.className ? ' ' : '') + 'with-alert';
        }
        var counter;

        if(configuration.counter && configuration.counter.counters) {
            counter = new TLRGRP.BADGER.Dashboard.ComponentModules.MultiCounter(configuration.counter);
        }
        else if (configuration.counterV2) {
            counter = new TLRGRP.BADGER.Dashboard.ComponentModules.CounterV2(configuration.counterV2);
            configuration.graph.className = (configuration.graph.className || '') + " with-v2-counter";
        }
        else {
            counter = new TLRGRP.BADGER.Dashboard.ComponentModules.Counter(configuration.counter);
        }

        var lineGraph;

        if(configuration.graph.type === 'bar') {
            lineGraph = TLRGRP.BADGER.Dashboard.ComponentModules.BarGraph(configuration.graph);
        }
        else {
            lineGraph = TLRGRP.BADGER.Dashboard.ComponentModules.LineGraph(configuration.graph);
        }
        var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated({ cssClass: 'last-updated-bottom', showExact: true });
        var componentModules = [];

        if(configuration.kibanaDashboard){
            componentModules.push({
                appendTo: function(container) {
                    container.append($('<a class="open-in-kibana" href="http://kibana.laterooms.io/index.html#/dashboard/' + configuration.kibanaDashboard + '" target="_blank">Open in kibana</a>'));
                }
            });
        } 
        componentModules.push(inlineLoading);
        componentModules.push(counter);

        if(configuration.alert && configuration.alert.show) {
            componentModules.push({
                appendTo: function (container) {
                    container.append($('<div class="v2-graph-alert"><div class="indicator fa fa-question"></div></div>'));
                },
                appendToLocation: function () {
                    return 'content';
                }
            });
        }

        componentModules.push(lineGraph);
        componentModules.push({
            appendTo: function (container) {
                if (configuration.summaryText) {
                    container.append($('<div class="error-graph-summary-text">' + configuration.summaryText + '</div>'));
                }
            }
        });
        componentModules.push(lastUpdated);

        var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
            title: configuration.title,
            layout: configuration.layout,
            componentClass: 'graph-and-counter-component ' + configuration.className,
            modules: componentModules
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

