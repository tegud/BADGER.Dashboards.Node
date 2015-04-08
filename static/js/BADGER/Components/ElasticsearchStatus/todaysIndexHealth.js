(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;
	var largeTemplate = '<ul class="cluster-state-panels">'
		+ '<li><div class="cluster-status-indicator unknown">'
				+ '<span class="fa fa-question status-indicator unknown"></span>'
			+ '</div></li>'
		+ '<li class="status-text">'
			+ '<div class="main-status">Today\'s Index State Unknown</div>'
			+ '<div class="status-description">Loading sentinel health information for cluster</div>'
		+ '</li>'
	+ '</ul>';

	TLRGRP.BADGER.Dashboard.Components.ElasticsearchTodaysIndexHealth = function (configuration) {
        var refreshServerBaseUrl = 'http://' + configuration.host + ':' + configuration.port + '/';
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading({ cssClass: 'loading-clear-bottom' });
        var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated({ cssClass: 'last-updated-top-right' });

        var clusterStatusElement = $(largeTemplate);

		var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
			title: configuration.title,
			layout: configuration.layout,
			componentClass: 'conversion-status',
			modules: [
				lastUpdated,
				inlineLoading,
				{
					appendTo: function (container) {
						return;
                        container.append(clusterStatusElement);
					}
				}
			]
		});

        var callbacks = {
            success: function (data) {
                clusterStatusElement.html('');
            },
            error: function (errorInfo) {
                if (errorInfo && errorInfo.responseJSON && errorInfo.responseJSON.error) {
                    inlineError.show(errorInfo.responseJSON.error);
                }
                else {
                    inlineError.show('Cannot access health check server.');
                }
            }
        };
        var dataStore;

        if(configuration.storeId) {
            dataStore = {
                start: function () {
                    TLRGRP.messageBus.publish('TLRGRP.BADGER.SharedDataStore.Subscribe.' + configuration.storeId, {
                        id: 'TodaysIndexHealth',
                        refreshComplete: callbacks.success,
                        loading: inlineLoading
                    });
                },
                stop: function () {
                    TLRGRP.messageBus.publish('TLRGRP.BADGER.SharedDataStore.Unsubscribe.' + configuration.storeId, 'TodaysIndexHealth');
                }
            };
        } 
        else {
            dataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
                query: {
                    url: refreshServerBaseUrl + 'currentStatus/' + configuration.alertName
                },
                refresh: 5000,
                callbacks: callbacks,
                mappings: [
                    { "type": "pickValue", "value": "query" }
                ],
                components: {
                    loading: inlineLoading,
                    lastUpdated: lastUpdated
                }
            });
        }

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
                    }
                }
            },
            initialState: 'uninitialised'
        });

		return {
			render: function (container) {
				inlineLoading.loading();
				return stateMachine.handle('initialise', container);
			},
			unload: function () {
				stateMachine.handle('stop');
				stateMachine.handle('remove');
			}
		};
	}
})();