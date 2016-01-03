(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

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

	function buildSummaryViewModel(groupedData) {
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
					var checkSummaries = _.map(checkStates, function(state, key) {
						return _.defaults({}, state, {
							itemClass: state.name.toLowerCase(),
							count: _.filter(tier.providers, function(provider) { 
								return provider.worstCheckState == key;
							}).length
						});
					});
					var presentChecks = _.filter(checkSummaries, function(check) {
						return check.count !== 0
					});
					var ordererdStates = _.sortBy(tier.providers, function(provider) {
						return checkStates[provider.worstCheckState].priority;
					});

					var worstState = _.chain(ordererdStates).map(function(provider) {
						return provider.worstCheckState;
					}).last().value();

					if(presentChecks.length === 1) {
						status = Mustache.render('<div class="connectivity-service-status-tier-big-indicator-holder {{itemClass}}"><div class="{{iconClass}} connectivity-service-status-tier-big-indicator"></div><div class="connectivity-service-status-tier-big-text">{{count}} {{text}}</div></div>', {
							count: tier.providers.length,
							text: _.first(presentChecks).name.toUpperCase().substring(0, 4),
							itemClass: _.first(presentChecks).itemClass,
							iconClass: _.first(presentChecks).iconClass
						});
					}
					else {

						status = Mustache.render('<ul class="connectivity-service-status-tier-big-ok-indicators">{{#checkSummaries}}'
								+ '<li class="connectivity-service-status-tier-big-ok-indicator-item {{itemClass}}"><div class="connectivity-service-status-tier-big-ok-indicator-item-icon {{iconClass}}"></div><div class="connectivity-service-status-tier-big-ok-indicator-item-counter">{{count}}</div></li>'
							+ '{{/checkSummaries}}</ul>', { checkSummaries: checkSummaries })
					}

					return {
						emblemClass: tier.tier.split(' ')[0].toLowerCase(),
						emblemTitle: tier.tier[0],
						itemClass: checkStates[worstState].summaryClass,
						status: status
					};
				})
			});
		});
	}

	TLRGRP.BADGER.Dashboard.Components.ProviderSummaryViewModels = {
		groupData: groupData,
		buildSummaryViewModel: buildSummaryViewModel
	};
})();