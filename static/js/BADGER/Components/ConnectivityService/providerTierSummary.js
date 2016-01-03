(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;

	TLRGRP.BADGER.Dashboard.Components.ProviderTierSummary = function (configuration) {

		var emblemClass = configuration.tier.split(' ')[0].toLowerCase();
		var emblemLetter = configuration.tier[0].toUpperCase();

        var refreshServerBaseUrl = 'http://' + configuration.host + ':' + configuration.port + '/';
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading({ cssClass: 'loading-clear-bottom' });
        var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated({ cssClass: 'last-updated-top-right' });
        var summary = $('<div class="provider-tier-summary-container" />');
        var emblem = $(Mustache.render('<div class="provider-tier-summary-emblem connectivity-service-summary-tier-emblem {{class}}">{{letter}}</div>', {
        	class: emblemClass,
        	letter: emblemLetter
        }));

		var modules = [lastUpdated, inlineLoading, {
			appendTo: function (container) {
				container
					.append(emblem)
					.append(summary);
			}
		}];

		var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
			title: configuration.title,
			layout: configuration.layout,
			componentClass: 'provider-tier-summary',
			modules: modules
		});

		var callbacks = {
			success: function (data) {
				var viewModels = TLRGRP.BADGER.Dashboard.Components.ProviderSummaryViewModels;
				viewModels.groupData(data)
					.then(function(groupedData) {
						var tierData = _.chain(groupedData).filter(function(tier) {
							return tier.tier === configuration.tier;
						}).first().value();

						if(tierData.worstCheckState == "0") {
							summary.html(Mustache.render('<div class="connectivity-service-tier-status-indicator">'
								+ '<span class="fa fa-thumbs-o-up"></span>'
							+ '</div><div class="connectivity-service-tier-status-text"><div class="connectivity-service-tier-status-big-text">All Good</div><div class="connectivity-service-tier-status-detail-text">No known issues!</div></div>', {}));
						}
						else {
							
						}
					});
            },
            error: function (errorInfo) {
            }
        };

        var dataStore = {
            start: function () {
                TLRGRP.messageBus.publish('TLRGRP.BADGER.SharedDataStore.Subscribe.' + configuration.storeId, {
                    id: 'ProviderTierSummary-' + (idIncrementor++),
                    refreshComplete: callbacks.success,
                    loading: inlineLoading
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