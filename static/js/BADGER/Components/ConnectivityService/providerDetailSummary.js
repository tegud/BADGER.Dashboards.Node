(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;

    function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

	var checkStates = {
		'0': { name: 'OK', iconClass: 'fa fa-check', priority: 3, summaryClass: 'ok' },
		'1': { name: 'Warn', iconClass: 'fa fa-exclamation', priority: 1, summaryClass: 'warning' },
		'2': { name: 'Critical', iconClass: 'mega-octicon octicon-flame', priority: 0, summaryClass: 'critical' },
		'3': { name: 'Unknown', iconClass: 'fa fa-question', priority: 2, summaryClass: 'unknown' }
	};

	TLRGRP.BADGER.Dashboard.Components.ProviderDetailSummary = function (configuration) {
		if(!configuration.title) {
			configuration.title = getParameterByName('provider') + ' Summary';
		}

        var refreshServerBaseUrl = 'http://' + configuration.host + ':' + configuration.port + '/';
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading({ cssClass: 'loading-clear-bottom' });
        var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated({ cssClass: 'last-updated-top-right' });

        var summary = $('<ul class="connectivity-service-summary"></ul>');
        var overallSummary = $('<div class="connectivity-service-status-indicator pending">'
			+ '<span class="fa fa-question connectivity-service-summary-status-indicator pending"></span>'
			+ '<span class="fa fa-question connectivity-service-summary-status-indicator unknown"></span>'
			+ '<span class="fa fa-check connectivity-service-summary-status-indicator ok"></span>'
			+ '<span class="fa fa-exclamation connectivity-service-summary-status-indicator warning"></span>'
			+ '<span class="mega-octicon octicon-flame connectivity-service-summary-status-indicator critical"></span>'
		+ '</div>').appendTo($('<li />').appendTo(summary));
    	var overallDescription = $('<li class="connectivity-provider-description"><h2>Connecting...</h2>Contacting Icinga2...</li>').appendTo(summary);
    	var checkSummary = $('<li />').appendTo(summary);

		var modules = [lastUpdated, inlineLoading, {
			appendTo: function (container) {
				container.append(summary);
			}
		}];

		var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
			title: configuration.title,
			layout: configuration.layout,
			componentClass: 'provider-summary',
			modules: modules
		});

		var callbacks = {
			success: function (data) {
				var viewModels = TLRGRP.BADGER.Dashboard.Components.ProviderSummaryViewModels;

				viewModels.groupData(data)
					.then(function(groupedChecks) {
						var provider = groupedChecks[0].providers[0];

						// overallSummary[0].className = 'connectivity-service-status-indicator ' + summaryViewModel.overallSummaryClass;

						// overallDescription.html(Mustache.render('<h2>{{title}}</h2>{{{text}}}', summaryViewModel.description));

						checkSummary.html(Mustache.render('<ul class="connectivity-service-summary-tier-list">'
							+ '{{#services}}'
								+ '<li class="provider-summary-item {{itemClass}}"><div class="connectivity-service-summary-tier-emblem {{emblemClass}}">{{{checkIcon}}}</div><div class="provider-summary-check-item-title">{{displayName}}</div></li>'
							+ '{{/services}}'
						+ '</ul>', {
							services: _.map(provider.services, function(service) {
								var checkIcons = {
									'Provider Bookings': '£',
									'Provider Booking Errors': '<span class="mega-octicon octicon-flame"></span>',
									'Provider Errors': '<span class="fa fa-exclamation"></span>',
								};

								var displayName = service.attrs.display_name.substring(9);

								return {
									name: service.attrs.display_name,
									displayName: displayName,
									checkIcon: checkIcons[service.attrs.name],
									itemClass: checkStates[service.attrs.last_check_result.state].summaryClass
								};
							}) 
						}));

						console.log(groupedChecks);

						overallDescription.width(summary.innerWidth() - (13 + overallSummary.outerWidth() + checkSummary.outerWidth()));
					});
            },
            error: function (errorInfo) {
            }
        };

        var dataStore = {
            start: function () {
                TLRGRP.messageBus.publish('TLRGRP.BADGER.SharedDataStore.Subscribe.' + configuration.storeId, {
                    id: 'ProviderSummary-' + (idIncrementor++),
                    refreshComplete: callbacks.success,
                    loading: inlineLoading,
                    lastUpdated: lastUpdated
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