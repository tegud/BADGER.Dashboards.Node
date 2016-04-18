(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;

	TLRGRP.BADGER.Dashboard.Components.IncidentSummary = function (configuration) {
        var refreshServerBaseUrl = 'http://' + configuration.host + (configuration.port ? (':' + configuration.port) : '') + '/';

        var summary = $('<ul class="incident-summary-modules"></ul>');
		var noAckSummary = $('<li class="incident-summary-module"></li>').appendTo(summary);
		var noResSummary = $('<li class="incident-summary-module"></li>').appendTo(summary);
		var resolvedSummary = $('<li class="incident-summary-module"></li>').appendTo(summary);
		var averageAckSummary = $('<li class="incident-summary-module"></li>').appendTo(summary);

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
					return !incident.acknowledged;
				});

				noAckSummary.html(unAckedIncidents.length + ' Unacknowledged Alerts');

				console.log(unAckedIncidents.length);
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
