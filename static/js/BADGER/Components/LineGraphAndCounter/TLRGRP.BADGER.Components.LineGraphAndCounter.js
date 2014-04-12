(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    TLRGRP.BADGER.Dashboard.Components.LineGraphAndCounter = function (configuration) {
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading();
        
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
            url: 'http://10.44.35.20:1081/1.0/metric?expression=' + configuration.expression,
            refresh: 5000,
            callbacks: {
                success: function (data) {
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

