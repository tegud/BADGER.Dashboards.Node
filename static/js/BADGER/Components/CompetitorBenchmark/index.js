(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;
	var largeTemplate = '<ul class="competitor-benchmark-list">'
	+ '</ul>';

	TLRGRP.BADGER.Dashboard.Components.CompetitorBenchmark = function (configuration) {
        var refreshServerBaseUrl = 'http://' + configuration.host + (configuration.port ? (':' + configuration.port) : '') + '/';
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading({ cssClass: 'loading-clear-bottom' });
        var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated({ cssClass: 'last-updated-top-right' });

        var clusterStatusElement = $(largeTemplate);

		var modules = [lastUpdated, inlineLoading, {
			appendTo: function (container) {
				container.append(clusterStatusElement);
			}
		}];

		var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
			title: configuration.title,
			layout: configuration.layout,
			componentClass: 'conversion-status',
			modules: modules
		});

		var callbacks = {
            success: function (data) {
            	var clusterState = data.info.state;

            	var currentState = stateMap[clusterState] || unknownState;

            	var indicatorElement = $('.cluster-status-indicator', clusterStatusElement);
            	var statusText = $('.main-status', clusterStatusElement);
            	var descriptionText = $('.status-description', clusterStatusElement);

				indicatorElement[0].className = 'cluster-status-indicator ' + currentState.className;
				indicatorElement.attr('title', currentState.text);

				statusText.text(currentState.text);
				descriptionText.html((typeof currentState.description === 'function' ? currentState.description(data) : currentState.description) + '<br/></br>' + suggestedAction(data));

				$('.node-list', clusterStatusElement).html(_.map(data.info.nodes, function(node) {
					var name = node.name.replace(/pentlrges/, '')
					return '<li class="' + node.status + '">' + (node.isMaster ? '<div class="master"></div>' : '') + '<div class="node-container">' + name + '</div>' + '</li>';
				}));

				setShardsPanel(data.info.shards);
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

        var dataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
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
