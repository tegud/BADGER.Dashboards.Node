(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;

	var checkStates = {
		'0': { name: 'OK', iconClass: 'fa fa-check', priority: 0, summaryClass: 'ok' },
		'1': { name: 'Warn', iconClass: 'fa fa-exclamation', priority: 1, summaryClass: 'warning' },
		'2': { name: 'Critical', iconClass: 'mega-octicon octicon-flame', priority: 3, summaryClass: 'critical' },
		'3': { name: 'Unknown', iconClass: 'fa fa-question', priority: 2, summaryClass: 'unknown' }
	};


	TLRGRP.BADGER.Dashboard.Components.ProviderTierSummary = function (configuration) {
		if(!configuration.title) {
			configuration.title = configuration.tier;
		}

		var emblem;
		if(typeof configuration.tier === 'string') {
			var emblemClass = configuration.tier.split(' ')[0].toLowerCase();
			var emblemLetter = configuration.tier[0].toUpperCase();

	        emblem = $(Mustache.render('<div class="provider-tier-summary-emblem connectivity-service-summary-tier-emblem {{class}}">{{letter}}</div>', {
	        	class: emblemClass,
	        	letter: emblemLetter
	        }));
		}

		var splitPath = location.pathname.split('/');

		var backTo = splitPath.length > 2 ? splitPath[2] : '';

		console.log(backTo);
        var refreshServerBaseUrl = 'http://' + configuration.host + (configuration.port ? (':' + configuration.port) : '') + '/';
        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading({ cssClass: 'loading-clear-bottom' });
        var lastUpdated = new TLRGRP.BADGER.Dashboard.ComponentModules.LastUpdated({ cssClass: 'last-updated-top-right' });
        var summary = $('<div class="provider-tier-summary-container" />')
        	.on('click', '.provider-tier-provider-list-item', function(element) {
        		var clickedElement = $(element.target);
        		var provider = clickedElement.closest('.provider-tier-provider-list-item').data('providerName');
        		var isCheck = clickedElement.hasClass('provider-tier-provider-list-item-check-list-item');
        		var params = {
        			backTo: backTo,
					provider: provider
				};

				if(isCheck) {
					params.showCheck = clickedElement.data('checkName')
				}

				TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
					dashboard: 'ConnectivityService',
					view: 'ProviderDetail',
					queryParameters: params
				});
        	});

		var modules = [lastUpdated, inlineLoading, {
			appendTo: function (container) {
				container.append(summary);

				if(emblem) {
					container.append(emblem);
				}
			}
		}];

		var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
			title: configuration.title,
			layout: configuration.layout,
			componentClass: emblem ? 'provider-tier-summary' : '',
			modules: modules
		});


		var callbacks = {
			success: function (data) {
				var viewModels = TLRGRP.BADGER.Dashboard.Components.ProviderSummaryViewModels;
				viewModels.groupData(data)
					.then(viewModels.buildTierStatusViewModel.bind(undefined, configuration))
					.then(function(tierData) {
						if(!configuration.showAllStates && tierData.worstCheckState == "0") {
							summary.html(Mustache.render('<div class="connectivity-service-tier-status-indicator">'
								+ '<span class="fa fa-thumbs-o-up"></span>'
							+ '</div><div class="connectivity-service-tier-status-text"><div class="connectivity-service-tier-status-big-text">All Good!</div><div class="connectivity-service-tier-status-detail-text">No known issues.</div></div>', {}));
						}
						else {
							summary.html(Mustache.render('<ul class="provider-tier-provider-list">'
									+ '{{#providers}}'
									+ '<li class="{{liClass}}" data-provider-name="{{name}}">'
										+ '<div class="{{innerDivClass}}">'
											+ '<div class="provider-tier-provider-list-item-title{{titleSizeClass}}">{{displayName}}</div>'
											+ '<ul class="provider-tier-provider-list-item-check-list">'
											+ '{{#services}}'
												+ '<li class="provider-tier-provider-list-item-check-list-item {{stateClass}}" data-check-name="{{fullName}}">{{name}}</li>'
											+ '{{/services}}'
											+ '</ul>'
										+ '</div>'
									+ '</li>'
									+ '{{/providers}}'
								+ '</ul>', tierData));
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