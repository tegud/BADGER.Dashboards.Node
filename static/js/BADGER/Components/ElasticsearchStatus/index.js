(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;

	var unknownState = {
		className: 'unknown', 
		text: 'Could not retrieve cluster state', 
		description: 'Cluster state is unknown, check Sentinel is <a href="badger.laterooms.com:3000/currentStatus?pretty" target="_blank">returning valid data</a>.'
	};

	var nodeStatusMap = {
		'OK': 'ok',
		'TIMEOUT': 'timed out',
		'LONG-TIMEOUT': 'critically timed out',
		'FAILED': 'erroring'
	};

	function nodesStatus(nodes) {
		if(_.every(nodes, function(node) {
			return node.status === 'OK';
		})) {
			return 'All nodes are responding';
		}
		else {
			var nodeStatusString = '';

			var countByStatus = _.countBy(nodes, function(node) { return node.status; });

			return _.map(countByStatus, function(count, status) { return count + ' node' + (count === 1 ? ' ' : 's ') + nodeStatusMap[status]; }).join(', ');
		}
	}

	var stateMap = {
		green: { 
			className: 'ok', 
			text: 'All Good',
			description: function(data) {
				return nodesStatus(data.info.nodes) + ', all indicies and replicas are assigned.';
			}
		},
		yellow: { 
			className: 'recovering', 
			text: 'In Recovery',
			description: function(data) {
				return nodesStatus(data.info.nodes) + ', all primary shards assigned, however ' + data.info.shards.unassigned + ' replica shards are unassigned.';
			}
		},
		red: { 
			className: 'critical', 
			text: 'CRITICAL',
			description: function(data) {
				return nodesStatus(data.info.nodes) + ', ';
			}
		}
	};

	TLRGRP.BADGER.Dashboard.Components.ElasticsearchStatus = function (configuration) {
        var refreshServerBaseUrl = 'http://' + configuration.host + ':' + configuration.port + '/';
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading();
        var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated();

        var clusterStatusElement = $('<ul class="cluster-state-panels">'
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
								+ '</li>'
								+ '<li class="shard-allocation-panel">'
									+ '<div class="node-status-header">Shard Allocation</div>'
									+ '<ul class="shard-allocation-states">'
										+ '<li class="unassigned-shards-row hidden"><span class="fa fa-exclamation-triangle"></span> <span class="count"></span> Shards Unassigned</li>'
										+ '<li class="relocating-shards-row hidden"><span class="fa fa-arrows"></span> <span class="count"></span> Shards Relocating</li>'
										+ '<li class="initialising-shards-row hidden"><span class="fa fa-stack-overflow"></span> <span class="count"></span> Shards Initialising</li>'
										+ '<li class="all-good-shards-row"><span class="fa fa-thumbs-up"></span> All primary and replica shards allocated.</li>'
									+ '</ul>'
								+ '</li>'
							+ '</ul>');

		function setShardsPanel(shardsInfo) {
			var shardStates = $('.shard-allocation-states', clusterStatusElement);

			if(!shardsInfo.unassigned && !shardsInfo.relocating && !shardsInfo.initializing) {
				$('.all-good-shards-row', shardStates).removeClass('hidden').siblings().addClass('hidden');
			}
			else {
				$('.all-good-shards-row', shardStates).addClass('hidden');

				$('.unassigned-shards-row', shardStates)[shardsInfo.unassigned ? 'removeClass' : 'addClass']('hidden').find('.count').text(shardsInfo.unassigned);
				$('.relocating-shards-row', shardStates)[shardsInfo.relocating ? 'removeClass' : 'addClass']('hidden').find('.count').text(shardsInfo.relocating);
				$('.initialising-shards-row', shardStates)[shardsInfo.initializing ? 'removeClass' : 'addClass']('hidden').find('.count').text(shardsInfo.initializing);
			}
		}

		var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
			title: configuration.title,
			layout: configuration.layout,
			componentClass: 'conversion-status',
			modules: [
				inlineLoading,
				lastUpdated,
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
                	var clusterState = data.info.state;

                	var currentState = stateMap[clusterState] || unknownState;

                	var indicatorElement = $('.cluster-status-indicator', clusterStatusElement);
                	var statusText = $('.main-status', clusterStatusElement);
                	var descriptionText = $('.status-description', clusterStatusElement);

					indicatorElement[0].className = 'cluster-status-indicator ' + currentState.className;
					statusText.text(currentState.text);
					descriptionText.html(typeof currentState.description === 'function' ? currentState.description(data) : currentState.description);

					$('.node-list', clusterStatusElement).html(_.map(data.info.nodes, function(node) {
						var name = node.name.replace(/pentlrges/, '')
						return '<li class="' + node.status + '">' + (node.isMaster ? '<div class="master"></div>' : '') + '<div class="node-container">' + name + '</div>' + '</li>';
					}));

					setShardsPanel(data.info.shards);

                    console.log(data);

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