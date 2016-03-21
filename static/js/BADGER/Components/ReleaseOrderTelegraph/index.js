(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

    TLRGRP.BADGER.Dashboard.Components.ReleaseOrderTelegraph = function (configuration) {
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading({ cssClass: 'loading-clear-bottom' });
        var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated({ cssClass: 'last-updated-top-right' });

        var dataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
            query: {
                url: "http://localhost:1240",
            },
            refresh: 2500,
            callbacks: {
                success: function (data) {
                    var signalState = JSON.parse(data.query).signal;

                    var textDescriptions = {
                        'green': 'Board is green<br/>Clear to release',
                        'amber': 'Proceed with caution, check before starting',
                        'red': 'Do not start new releases'
                    };

                    var icons = {
                        'green': '<span class="fa fa-thumbs-up"></span>',
                        'amber': '<span class="release-signal-indicator-icon">!</span>',
                        'red': '<span class="release-signal-indicator-icon">X</span>'
                    };

                    signal.html('<div class="release-signal-indicator ' + signalState + '">' + icons[signalState] + '</div><div class="release-signal-text ' + signalState + '">' + textDescriptions[signalState] + '</div>');
                }
            },
            components: {
                loading: inlineLoading,
                lastUpdated: lastUpdated
            }
        });

        var signal = $('<div></div>');

		var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
			title: configuration.title,
			layout: configuration.layout,
			componentClass: 'conversion-status',
			modules: [
                lastUpdated,
                inlineLoading,
                {
                    appendTo: function (container) {
                        signal.appendTo(container);
                    }
                }
            ]
		});

        var stateMachine = nano.Machine({
            states: {
                uninitialised: {
                    initialise: function (container) {
                        componentLayout.appendTo(container);

                        return this.transitionToState('initialising');
                    }
                },
                initialising: {
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
