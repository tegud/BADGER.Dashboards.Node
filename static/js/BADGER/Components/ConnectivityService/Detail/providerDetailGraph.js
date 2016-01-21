(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;

	TLRGRP.BADGER.Dashboard.Components.ProviderDetailGraph = function (configuration) {
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading({ cssClass: 'loading-clear-bottom' });
        var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated({ cssClass: 'last-updated-top-right' });

        var lineGraph = TLRGRP.BADGER.Dashboard.ComponentModules.BarGraph({
            "lines": [
              { "id": "errors", "color": "red", "value": "query.errors" }
            ]
        });

		var modules = [lastUpdated, inlineLoading, lineGraph, {
			appendTo: function (container) {
				
			}
		}];

		var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
			title: configuration.title,
			layout: configuration.layout,
			componentClass: 'provider-detail-graph tall-graph',
			modules: modules
		});

		var lastData;
		var title;

        TLRGRP.messageBus.subscribe('TLRGRP.BADGER.ProviderDetailSummary.MetricData', function(data) {
    		lastData = data.data;
        	lineGraph.setData(data.data);
        });

        TLRGRP.messageBus.subscribe('TLRGRP.BADGER.ProviderSummary.CheckSelected', function(data) {
        	var selectedCheck = data.check.substring(9);

        	title.text(selectedCheck);
        });

        var dataStore = {
            start: function () {
                // TLRGRP.messageBus.publish('TLRGRP.BADGER.SharedDataStore.Subscribe.' + configuration.storeId, {
                //     id: 'ProviderSummary-' + (idIncrementor++),
                //     refreshComplete: callbacks.success,
                //     loading: inlineLoading,
                //     lastUpdated: lastUpdated
                // });
            },
            stop: function () {
                // TLRGRP.messageBus.publish(dataStoreId);
            }
        };

        var stateMachine = nano.Machine({
            states: {
                uninitialised: {
                    initialise: function (container) {
                        componentLayout.appendTo(container);

                        title = $('h3', container);

                        return this.transitionToState('initialising');
                    }
                },
                initialising: {
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
	}
})();