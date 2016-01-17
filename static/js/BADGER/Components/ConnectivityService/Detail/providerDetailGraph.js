(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;

	TLRGRP.BADGER.Dashboard.Components.ProviderDetailGraph = function (configuration) {
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
    	var overallBreakdown = $('<li class="connectivity-service-breakdown" />').appendTo(summary);
    	var overallDescription = $('<li class="connectivity-service-description"><h2>Connecting...</h2>Contacting Icinga2...</li>').appendTo(summary);
    	var providerSummary = $('<li />').appendTo(summary);

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
					.then(viewModels.buildSummaryViewModel.bind(undefined, configuration))
					.then(function(summaryViewModel) {
						overallSummary[0].className = 'connectivity-service-status-indicator ' + summaryViewModel.overallSummaryClass;

						overallBreakdown.html(Mustache.render('<ul class="state-checks">' 
							+ '{{#checkSummaries}}<li class="state-checks-item {{itemClass}}"><div class="state-checks-icon {{iconClass}}"></div><div class="state-checks-counter">{{count}} {{name}}</div></li>{{/checkSummaries}}'
						+ '</ul>', summaryViewModel));

						overallDescription.html(Mustache.render('<h2>{{title}}</h2>{{{text}}}', summaryViewModel.description));

						providerSummary.html(Mustache.render('<ul class="connectivity-service-summary-tier-list">'
							+ '{{#tiers}}'
								+ '<li class="connectivity-service-summary-tier-item {{itemClass}}"><div class="connectivity-service-summary-tier-emblem {{emblemClass}}">{{emblemTitle}}</div>{{{status}}}</li>'
							+ '{{/tiers}}'
						+ '</ul>', summaryViewModel));

						overallDescription.width(summary.innerWidth() - (13 + overallSummary.outerWidth() + overallBreakdown.outerWidth() + providerSummary.outerWidth()));
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