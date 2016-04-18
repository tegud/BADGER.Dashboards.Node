(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;

	TLRGRP.BADGER.Dashboard.Components.IncidentSummary = function (configuration) {
        var refreshServerBaseUrl = 'http://' + configuration.host + (configuration.port ? (':' + configuration.port) : '') + '/';

        var summary = $('<ul class="incident-summary-modules"></ul>');
		var noAckSummary = $('<li class="incident-summary-module incident-summary-module-notacked none"></li>').appendTo(summary);
		var noResSummary = $('<li class="incident-summary-module incident-summary-module-open none"></li>').appendTo(summary);
		var resolvedSummary = $('<li class="incident-summary-module incident-summary-module-resolved none"></li>').appendTo(summary);
		// var averageAckSummary = $('<li class="incident-summary-module"></li>').appendTo(summary);

		var modules = [{
			appendTo: function (container) {
				container.append(summary);
			}
		}];

		var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
			title: configuration.title,
			layout: configuration.layout,
			componentClass: 'incident-summary',
			modules: modules
		});

		var callbacks = {
			success: function (data) {
				var incidents = _.pluck(data.today.hits.hits, '_source');
				var unAckedIncidents = _.filter(incidents, function(incident) {
					return !incident.acknowledged && !incident.resolved;
				});
				var unResolvedIncidents = _.filter(incidents, function(incident) {
					return !incident.resolved;
				});
				var resolvedIncidents = _.filter(incidents, function(incident) {
					return incident.resolved;
				});

				noAckSummary
					[unAckedIncidents.length ? 'removeClass' : 'addClass']('none')
					.html('<div class="incident-summary-module-indicator"><div class="fa fa-bullhorn"></div></div>'
					 + '<div class="incident-summary-module-label">NO ACK<div class="incident-summary-module-label-small">Now</div></div>'
					 + '<div class="incident-summary-module-value">' + unAckedIncidents.length + '</div>');

 				noResSummary
					[unResolvedIncidents.length ? 'removeClass' : 'addClass']('none')
 					.html('<div class="incident-summary-module-indicator"><div class="fa fa-fire"></div></div>'
 					 + '<div class="incident-summary-module-label">OPEN<div class="incident-summary-module-label-small">Now</div></div>'
 					 + '<div class="incident-summary-module-value">' + unResolvedIncidents.length + '</div>');

 				resolvedSummary
					[resolvedIncidents.length ? 'removeClass' : 'addClass']('none')
 					.html('<div class="incident-summary-module-indicator"><div class="fa fa-check"></div></div>'
 					 + '<div class="incident-summary-module-label">SOLVED<div class="incident-summary-module-label-small">This Week</div></div>'
 					 + '<div class="incident-summary-module-value">' + resolvedIncidents.length + '</div>');
            },
            error: function (errorInfo) {
            }
        };

        var dataStore = {
            start: function () {
                TLRGRP.messageBus.publish('TLRGRP.BADGER.SharedDataStore.Subscribe.' + configuration.storeId, {
                    id: 'IncidentSummary-' + (idIncrementor++),
                    refreshComplete: callbacks.success
                });
            },
            stop: function () {
                TLRGRP.messageBus.publish(dataStoreId);
            }
        };

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
				return stateMachine.handle('initialise', container);
			},
			unload: function () {
				stateMachine.handle('stop');
				stateMachine.handle('remove');
			}
		};
	}
})();
