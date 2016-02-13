(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;

    var mappings = {
        "bookingErrors": "bookingErrors",
        "providerErrors": "errors",
        "bookings": "bookings"
    };

	TLRGRP.BADGER.Dashboard.Components.ProviderDetailDetail = function (configuration) {
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading({ cssClass: 'loading-clear-bottom' });
        var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated({ cssClass: 'last-updated-top-right' });
        var gridContainer = $('<ul class="provider-detail-detail-grid-container />');

		var modules = [lastUpdated, inlineLoading, {
			appendTo: function (container) {
				container.append(gridContainer);				
			}
		}];

		var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
			title: configuration.title,
			layout: configuration.layout,
			componentClass: 'provider-detail-detail',
			modules: modules
		});

        TLRGRP.messageBus.subscribe('TLRGRP.BADGER.ProviderDetailSummary.LogData', function(data) {
        	console.log(data.data);

        	gridContainer.html(Mustache.render('<li></li>', {
        		
        	}));
        });
        TLRGRP.messageBus.subscribe('TLRGRP.BADGER.ProviderSummary.CheckSelected', function() {});

        var stateMachine = nano.Machine({
            states: {
                uninitialised: {
                    initialise: function (container) {
                        componentLayout.appendTo(container);

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

        		TLRGRP.messageBus.unsubscribeAll('TLRGRP.BADGER.ProviderDetailSummary.LogData');
        		TLRGRP.messageBus.unsubscribeAll('TLRGRP.BADGER.ProviderDetailSummary.CheckSelected');
			}
		};
	}
})();