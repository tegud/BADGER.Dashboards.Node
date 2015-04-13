(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;
	var largeTemplate = '<ul class="cluster-state-panels server-health-node-list">'
		+ '<li><div class="cluster-status-indicator unknown">'
				+ '<span class="fa fa-question status-indicator unknown"></span>'
			+ '</div></li>'
		+ '<li class="status-text">'
			+ '<div class="main-status">Server Health State Unknown</div>'
			+ '<div class="status-description">Loading sentinel health information for cluster</div>'
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

        var callbacks = {
            success: function (data) {
                var thresholds;

                thresholds = data && data.info && data.info.thresholds ? data.info.thresholds : [];

                var nodesThresholds = _.chain(data.info.thresholds).filter(function(threshold) {
                    return threshold.type === 'nodes';
                }).first().value();

                var nodeThresholdBreaches = nodesThresholds ? _.reduce(nodesThresholds.nodes, function(result, node) {
                    result[node.name] = node;

                    return result;
                }, {}) : {};

                clusterStatusElement.html(_.map(data.info.nodes, function(node) {
                    var nodeTypeClass = 'fa-question-circle';

                    if(node.tags && node.tags.indexOf('archive') > -1) {
                        nodeTypeClass = 'fa-archive';
                    }
                    else if (node.tags && node.tags.indexOf('realtime') > -1) {
                        nodeTypeClass = 'fa-line-chart';
                    }

                    var fs = node.stats.fs;
                    var nodeStatusClass = 'info';
                    var breachedStats = {};

                    if(nodeThresholdBreaches[node.name]) {
                        nodeStatusClass = nodeThresholdBreaches[node.name].level;

                        breachedStats = _.reduce(nodeThresholdBreaches[node.name].breaches, function(result, current) {
                            result[current.stat] = current;

                            return result;
                        }, {});
                    }

                    function getThresholdStatusForStat(stat) {
                        if(!breachedStats[stat]) {
                            return 'info';
                        }

                        return breachedStats[stat].breach.level;
                    }

                    return '<li class="node-info ' + nodeStatusClass + '">'
                         + '<div class="node-type"><span class="fa ' + nodeTypeClass + '"></span></div>'
                         + '<h3>' + node.name + '</h3>'
                         + '<div class="node-item"><span class="fa fa-plug"></span><div class="item-text">' + node.ip + '</div></div>'
                         + '<div class="node-item"><span class="fa fa-tags"></span><div class="item-text">' + node.tags + '</div></div>'
                         + '<div class="main-items">'
                             + '<div class="node-item big-item ' + getThresholdStatusForStat('cpu') + '">'
                                + '<div class="big-item-side"><div class="big-item-icon mega-octicon octicon-dashboard"></div><div class="item-text">CPU</div></div>'
                                + '<div><span class="big-item-value">' + node.stats.cpu + '</span>%</div>'
                             + '</div>'
                             + '<div class="node-item big-item ' + getThresholdStatusForStat('memory.heap.used.percent') + '">'
                                + '<div class="big-item-side"><div class="big-item-icon mega-octicon octicon-circuit-board"></div><div class="item-text">HEAP</div></div>'
                                + '<div><span class="big-item-value">' + node.stats.memory.heap.used.percent + '</span>%</div>'
                             + '</div>'
                             + '<div class="node-item big-item ' + getThresholdStatusForStat('fs.available_in_bytes') + '">'
                                + '<div class="big-item-side"><div class="big-item-icon mega-octicon octicon-database"></div><div class="item-text">DISK</div></div>'
                                + '<div><span class="big-item-value">' + (((fs.total_in_bytes - fs.available_in_bytes) / fs.total_in_bytes) * 100).toFixed(0) + '</span>%</div>'
                                + '<div>' + (fs.available_in_bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB Free</div>'
                             + '</div>'
                         + '</div>'
                    + '</li>';
                }).join(''));
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
                        id: 'ServerHealth',
                        refreshComplete: callbacks.success,
                        loading: inlineLoading
                    });
                },
                stop: function () {
                    TLRGRP.messageBus.publish('TLRGRP.BADGER.SharedDataStore.Unsubscribe.' + configuration.storeId, 'ServerHealth');
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