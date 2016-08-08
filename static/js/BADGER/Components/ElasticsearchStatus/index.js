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

	function shardStateForCritical(data) {
		var shardStatus = ' ' + data.info.shards.unassigned + ' shard' + (data.info.shards.unassigned === 1 ? '' : 's') + ' unassigned';
		var containsPrimaryShards = _.filter(data.info.shards.unassignedShards, function(shard) { return shard.primary });

		if(containsPrimaryShards.length) {
			return shardStatus + ', including primary shards (DATA LOSS).';
		}

		if(_.every(data.info.nodes, function(node) { return node.status === 'OK'; })) {
			return shardStatus + ', which may include primaries (POTENTIAL DATA LOSS).';
		}

		return shardStatus + ', cannot determine if this includes primary indicies due to presence of sick node.' ;
	}

	function suggestedAction(data) {
		var shardAdvice = '';
		var nodeAdvice = '';

		if(data.info.state === 'yellow') {
			shardAdvice = 'Recovery should continue as normal, if the shard' + (data.info.shards.unassigned === 1 ? ' stays' : 's stay') + ' unassigned for a prolonged period, ensure ' + (data.info.shards.unassigned === 1 ? 'it is' : 'they are') + ' not corrupted.';

			if(_.any(data.info.nodes, function(node) { return node.status === 'TIMEOUT'; })) {
				nodeAdvice = 'Monitor gray nodes to ensure they do not timeout critically. Restart if needed.';
			}
		}
		else if(data.info.state === 'red') {
			var failedNodes = _.filter(data.info.nodes, function(node) { return node.status === 'FAILED'; });
			var timedoutNodes = _.filter(data.info.nodes, function(node) { return node.status === 'TIMEOUT' || node.status === 'LONG-TIMEOUT'; });
			var criticalTimeoutNodes = _.filter(timedoutNodes, function(node) { return node.status === 'LONG-TIMEOUT'; });

			if(failedNodes.length) {
				if(timedoutNodes.length) {
					var masterNodeTimedOut = _.chain(timedoutNodes).filter(function(node) { return (node.status === 'TIMEOUT' || node.status === 'LONG-TIMEOUT') && node.isMaster; }).first().value();

					if(masterNodeTimedOut) {
						nodeAdvice = 'Master node (' + masterNodeTimedOut.name + ')  has timed out, restart this first to determine if failed nodes have just lost contact with master.';
					}
					else {
						nodeAdvice = 'Nodes have timed out and failed, suggest restarting timed out nodes first.';
					}

				}
				else {
					nodeAdvice = 'Failed nodes ';
				}
			}
			else if(criticalTimeoutNodes.length) {
				nodeAdvice = criticalTimeoutNodes.length + ' Node' + (criticalTimeoutNodes.length === 1 ? ' has' : 's have') + ' timed out for a prelonged period of time, suggest restarting ' + (criticalTimeoutNodes.length === 1 ? 'this' : 'these') + ' node' + (criticalTimeoutNodes.length === 1 ? '' : 's') + '.';
			}
			else if(timedoutNodes.length) {
				nodeAdvice = criticalTimeoutNodes.length + ' Node' + (criticalTimeoutNodes.length === 1 ? ' has' : 's have') + ' timed out, suggest monitoring to see if ' + (criticalTimeoutNodes.length === 1 ? 'it' : 'they') + ' recover' + (criticalTimeoutNodes.length === 1 ? 's' : '') + ', and if not, restarting.';
			}
			else {
				shardAdvice = 'Investigate unassigned indicies as a priority, data loss may occur.';
			}
		}

		return (shardAdvice + nodeAdvice) ? (shardAdvice + (shardAdvice && nodeAdvice ? '<br /><br />' : '') + nodeAdvice) : '';
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
				return nodesStatus(data.info.nodes) + ', all primary shards assigned, however ' + data.info.shards.unassigned + ' replica shard' + (data.info.shards.unassigned === 1 ? ' is ' : 's are ') + 'unassigned.';
			}
		},
		red: {
			className: 'critical',
			text: 'CRITICAL',
			description: function(data) {
				return nodesStatus(data.info.nodes) + '. ' + shardStateForCritical(data);
			}
		}
	};

	TLRGRP.BADGER.Dashboard.Components.ElasticsearchStatus = function (configuration) {
        var refreshServerBaseUrl = 'http://' + configuration.host + (configuration.port ? (':' + configuration.port) : '') + '/';
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading({ cssClass: 'loading-clear-bottom' });
        var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated({ cssClass: 'last-updated-top-right' });

        var clusterStatusElement = $(largeTemplate);

        if(configuration.profile) {
        	clusterStatusElement.css({
    			marginTop: 0,
    			marginBottom: '32px'
        	});

        	var gotoElkButton = $('<a class="goto-elk" href="javascript: void(0);">Go to ELK Dashboard<span class="goto-elk-icon fa fa-arrow-circle-o-right"></span></a>').on('click', function() {
				TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
					dashboard: 'Status',
					view: 'ELK'
				});
        	});

        	clusterStatusElement.addClass(configuration.profile);
        	clusterStatusElement.append(gotoElkButton);
        }

		function setShardsPanel(shardsInfo) {
			var shardStates = $('.shard-allocation-states', clusterStatusElement);

			if(!shardsInfo.unassigned && !shardsInfo.relocating && !shardsInfo.initializing) {
				$('.all-good-shards-row', shardStates).removeClass('hidden').siblings().addClass('hidden');
			}
			else {
				$('.all-good-shards-row', shardStates).addClass('hidden');

				$('.unassigned-shards-row', shardStates)[shardsInfo.unassigned ? 'removeClass' : 'addClass']('hidden').find('.count').text(shardsInfo.unassigned + ' shard' + (shardsInfo.unassigned === 1 ? '' : 's'));
				$('.relocating-shards-row', shardStates)[shardsInfo.relocating ? 'removeClass' : 'addClass']('hidden').find('.count').text(shardsInfo.relocating + ' shard' + (shardsInfo.relocating === 1 ? '' : 's'));
				$('.initialising-shards-row', shardStates)[shardsInfo.initializing ? 'removeClass' : 'addClass']('hidden').find('.count').text(shardsInfo.initializing + ' shard' + (shardsInfo.initializing === 1 ? '' : 's'));
			}
		}

		var modules = [];
		if(configuration.profile === 'small') {
			modules.push(lastUpdated);
			modules.push(inlineLoading);
		}
		else {
			modules.push(lastUpdated);
			modules.push(inlineLoading);
		}
		modules.push({
			appendTo: function (container) {
				container.append(clusterStatusElement);
			}
		});

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
					var name = node.name;

					if(typeof name === 'object') {
						name = name.name || name.host;
					}

					name = name.replace(/pentlrges/, '');

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

        var dataStore;

        if(configuration.storeId) {
	        dataStore = {
	            start: function () {
	                TLRGRP.messageBus.publish('TLRGRP.BADGER.SharedDataStore.Subscribe.' + configuration.storeId, {
	                    id: configuration.storeId,
	                    refreshComplete: callbacks.success,
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
