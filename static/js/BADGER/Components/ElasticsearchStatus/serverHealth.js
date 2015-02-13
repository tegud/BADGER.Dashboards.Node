(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;
	var largeTemplate = '<ul class="cluster-state-panels">'
		+ '<li><div class="cluster-status-indicator unknown">'
				+ '<span class="fa fa-question status-indicator unknown"></span>'
				+ '<span class="fa fa-check status-indicator ok"></span>'
				+ '<span class="fa fa-life-ring status-indicator recovery"></span>'
				+ '<span class="fa fa-exclamation status-indicator critical"></span>'
			+ '</div></li>'
		+ '<li class="status-text">'
			+ '<div class="main-status"></div>'
			+ '<div class="status-description"></div>'
		+ '</li>'
		+ '<li class="nodes-panel">'
			+ '<div class="node-status-header">Nodes</div>'
			+ '<ul class="node-list"></ul>'
			+ '<ul class="node-legend">'
				+ '<li class="OK"><div class="block"></div>OK</li>'
				+ '<li class="TIMEOUT"><div class="block"></div>Timeout</li>'
				+ '<li class="LONG-TIMEOUT"><div class="block"></div>Critical Timeout</li>'
				+ '<li class="FAILED"><div class="block"></div>Error</li>'
			+ '</ul>'
		+ '</li>'
		+ '<li class="shard-allocation-panel">'
			+ '<div class="node-status-header">Shard Allocation</div>'
			+ '<ul class="shard-allocation-states">'
				+ '<li class="unassigned-shards-row hidden"><span class="fa fa-exclamation-triangle"></span> <span class="count"></span> unassigned</li>'
				+ '<li class="relocating-shards-row hidden"><span class="fa fa-arrows"></span> <span class="count"></span> relocating</li>'
				+ '<li class="initialising-shards-row hidden"><span class="fa fa-stack-overflow"></span> <span class="count"></span> initialising</li>'
				+ '<li class="all-good-shards-row"><span class="fa fa-thumbs-up"></span> All primary and replica shards allocated.</li>'
			+ '</ul>'
		+ '</li>'
	+ '</ul>';

	TLRGRP.BADGER.Dashboard.Components.ElasticsearchServerHealth = function (configuration) {
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
						container.append(clusterStatusElement);
					}
				}
			]
		});

        var dataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
            query: {
                url: refreshServerBaseUrl + 'currentStatus/' + configuration.alertName
            },
            refresh: 5000,
            callbacks: {
                success: function (data) {
                	

                    dataStore.setNewRefresh(10000);
                },
                error: function (errorInfo) {
                    if (errorInfo && errorInfo.responseJSON && errorInfo.responseJSON.error) {
                        inlineError.show(errorInfo.responseJSON.error);
                    }
                    else {
                        inlineError.show('Cannot access health check server.');
                    }

                    dataStore.setNewRefresh(10000);
                }
            },
            mappings: [
                { "type": "pickValue", "value": "query" }
            ],
            components: {
                loading: inlineLoading,
                lastUpdated: lastUpdated
            }
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