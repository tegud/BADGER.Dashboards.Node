(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;

	var tierOrder = {
		'Platinum Providers': 0, 
		'Gold Providers': 1, 
		'Silver Providers': 2, 
		'Bronze Providers': 3
	};

	var checkStates = {
		'0': { name: 'OK', iconClass: 'fa fa-check', priority: 0, summaryClass: 'ok' },
		'1': { name: 'Warn', iconClass: 'fa fa-exclamation', priority: 1, summaryClass: 'warning' },
		'2': { name: 'Critical', iconClass: 'mega-octicon octicon-flame', priority: 3, summaryClass: 'critical' },
		'3': { name: 'Unknown', iconClass: 'fa fa-question', priority: 2, summaryClass: 'unknown' }
	};

	function groupData(data) {
		return new Promise(function(resolve) {
			var tiers = _.chain(data.query.results).reduce(function(allGroups, service) {
				return allGroups.concat(service.joins.host.groups);
			}, []).uniq().value();

			var groupedData = _.chain(data.query.results)
				.groupBy(function(service) {
					var tier = _.intersection(service.joins.host.groups, tiers);

					return tier.length ? tier[0] : 'Unknown';
				})
				.map(function(services, key) {
					var providers = _.chain(services).groupBy(function(service) {
	        			return service.joins.host.name;
					}).map(function(services, provider) {
						var ordererdStates = _.sortBy(services, function(check) {
							return checkStates[check.attrs.last_check_result.state].priority;
						});

						return {
							provider: provider,
							worstCheckState: _.chain(ordererdStates).map(function(check) {
								return check.attrs.last_check_result.state;
							}).last().value(),
							services: services
						};
					}).value();

					var ordererdStates = _.sortBy(providers, function(provider) {
						return checkStates[provider.worstCheckState].priority;
					});

					return {
						tier: key,
						worstCheckState: _.chain(ordererdStates).map(function(provider) {
							return provider.worstCheckState;
						}).last().value(),
						providers: providers
					};
				})
				.sortBy(function(tier) {
					return tierOrder[tier.tier];
	        	})
				.value();

			resolve(groupedData);
		});
	}

	function buildViewModel(groupedData) {
		return new Promise(function(resolve) {
			var providerCheckCounts = _.reduce(groupedData, function(allCheckCounts, tier) {
				var tierCounts = _.reduce(tier.providers, function(allCounts, provider) {
					if(!allCounts[provider.worstCheckState]) {
						allCounts[provider.worstCheckState] = 0;
					}

					allCounts[provider.worstCheckState] += 1;
					
					return allCounts;
				}, {});

				return _.reduce(tierCounts, function(allCheckCounts, count, state) {
					if(!allCheckCounts[state]) {
						allCheckCounts[state] = 0;
					}
					
					allCheckCounts[state] += count;

					return allCheckCounts;
				}, allCheckCounts);
			}, {});

			var checkSummaries = _.map(checkStates, function(state, key) {
				return _.defaults({}, state, {
					itemClass: state.name.toLowerCase(),
					count: providerCheckCounts[key] || 0
				});
			});

			var ordererdStates = _.sortBy(groupedData, function(tier) {
				return checkStates[tier.worstCheckState].priority;
			});

			var worstState = _.chain(ordererdStates).map(function(tier) {
				return tier.worstCheckState;
			}).last().value();

			resolve({
				overallSummaryClass: (typeof worstState !== 'undefined' ? checkStates[worstState].summaryClass : 'unknown'),
				checkSummaries: checkSummaries,
				tiers: _.map(groupedData, function(tier) {
					var status;

					if(_.every(tier.providers, function(provider) {
						return provider.worstCheckState == 0;
					})) {
						status = Mustache.render('<div><div class="fa fa-check connectivity-service-status-tier-big-ok-indicator"></div><div class="connectivity-service-status-tier-big-ok-text">{{count}} OK</div></div>', {
							count: tier.providers.length
						});
					}
					else {
						var checkSummaries = _.map(checkStates, function(state, key) {
							return _.defaults({}, state, {
								itemClass: state.name.toLowerCase(),
								count: _.filter(tier.providers, function(provider) { 
									return provider.worstCheckState == key;
								}).length
							});
						});

						status = Mustache.render('<ul class="connectivity-service-status-tier-big-ok-indicators">{{#checkSummaries}}'
								+ '<li class="connectivity-service-status-tier-big-ok-indicator-item {{itemClass}}"><div class="connectivity-service-status-tier-big-ok-indicator-item-icon {{iconClass}}"></div><div class="connectivity-service-status-tier-big-ok-indicator-item-counter">{{count}}</div></li>'
							+ '{{/checkSummaries}}</ul>', { checkSummaries: checkSummaries })
					}

					return {
						emblemClass: tier.tier.split(' ')[0].toLowerCase(),
						emblemTitle: tier.tier[0],
						status: status
					};
				})
			});
		});
	}

	TLRGRP.BADGER.Dashboard.Components.ProviderSummary = function (configuration) {
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
				container.append(summary);
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
				groupData(data)
					.then(buildViewModel)
					.then(function(summaryViewModel) {
					overallSummary[0].className = 'connectivity-service-status-indicator ' + summaryViewModel.overallSummaryClass;

					overallBreakdown.html(Mustache.render('<ul class="state-checks">' 
						+ '{{#checkSummaries}}<li class="state-checks-item {{itemClass}}"><div class="state-checks-icon {{iconClass}}"></div><div class="state-checks-counter">{{count}} {{name}}</div></li>{{/checkSummaries}}'
					+ '</ul>', summaryViewModel));

					overallDescription.html(Mustache.render('<h2>Providers</h2>Description of status goes here.', summaryViewModel));

					providerSummary.html(Mustache.render('<ul class="connectivity-service-summary-tier-list">'
						+ '{{#tiers}}'
							+ '<li class="connectivity-service-summary-tier-item"><div class="connectivity-service-summary-tier-emblem {{emblemClass}}">{{emblemTitle}}</div>{{{status}}}</li>'
						+ '{{/tiers}}'
					+ '</ul>', summaryViewModel));
				});
            },
            error: function (errorInfo) {
            }
        };

        var dataStore = {
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