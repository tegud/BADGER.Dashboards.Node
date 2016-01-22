(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;

	TLRGRP.BADGER.Dashboard.Components.ProviderDetailGraph = function (configuration) {
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading({ cssClass: 'loading-clear-bottom' });
        var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated({ cssClass: 'last-updated-top-right' });

        var lineGraph = TLRGRP.BADGER.Dashboard.ComponentModules.BarGraph({
            "lines": [
            	{ "id": "bookingErrors", "color": "orange", "value": "query.bookingErrors" },
            	{ "id": "providerErrors", "color": "red", "value": "query.errors" },
            	{ "id": "bookings", "color": "green", "value": "query.bookings" }
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
		var metric = 'providerErrors';

        function checkSelected(data) {
        	var selectedCheck = data.check.substring(9);
        	metric = data.metric;

        	title.text(selectedCheck);
        	lineGraph.setData(lastData, [metric]);
        }

        function refreshData(data) {
    		lastData = data.data;
    		checkSelected(data);
        }

        TLRGRP.messageBus.subscribe('TLRGRP.BADGER.ProviderDetailSummary.MetricData', refreshData);
        TLRGRP.messageBus.subscribe('TLRGRP.BADGER.ProviderSummary.CheckSelected', checkSelected);

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

        		TLRGRP.messageBus.unsubscribeAll('TLRGRP.BADGER.ProviderDetailSummary.MetricData');
        		TLRGRP.messageBus.unsubscribeAll('TLRGRP.BADGER.ProviderDetailSummary.CheckSelected');
			}
		};
	}
})();