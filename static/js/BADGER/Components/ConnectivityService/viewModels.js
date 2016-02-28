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
		'0': { name: 'OK', iconClass: 'fa fa-check', priority: 3, summaryClass: 'ok' },
		'1': { name: 'Warn', iconClass: 'fa fa-exclamation', priority: 1, summaryClass: 'warning' },
		'2': { name: 'Critical', iconClass: 'mega-octicon octicon-flame', priority: 0, summaryClass: 'critical' },
		'3': { name: 'Unknown', iconClass: 'fa fa-question', priority: 2, summaryClass: 'unknown' }
	};
	
	function serviceAcronym(serviceName) {
		if(serviceName.indexOf('Provider ') === 0) {
			serviceName = serviceName.substring(8);
		}

		var splitName = serviceName.split(' ');
		var acronym = _.map(splitName, function(nameSection) {
			var lowerCasedName = nameSection.toLowerCase();
			if(lowerCasedName === 'elasticsearch' || lowerCasedName === 'es') {
				return;
			}

			return nameSection[0];
		}).join('');

		return acronym;
	}

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
					}).map(function(services, provider, i) {
						var ordererdStates = _.sortBy(services, function(check) {
							return checkStates[check.attrs.last_check_result.state].priority;
						});

						var order = i;

						if(_.first(services).joins.host.vars && typeof _.first(services).joins.host.vars.providerOrder !== 'undefined') {
							order = _.first(services).joins.host.vars.providerOrder;
						}

						return {
							provider: provider,
							order: order,
							displayName: _.first(services).joins.host.display_name,
							worstCheckState: _.chain(ordererdStates).map(function(check) {
								return check.attrs.last_check_result.state;
							}).first().value(),
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
						}).first().value(),
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

	function problemText(viewModel) {
		var template = '{{affectedProvidersText}} {{providerText}} warning that they have an issue, but not critical, suggest these providers are monitored';

		var affectedTiers = _.filter(viewModel.tiers, function(tier) {
			return tier.worstCheckState == viewModel.worstCheckState;
		});

		var totalProviderCount = 0;
		var affectedProvidersText = _.map(affectedTiers, function(tier, x) {
				var providers = _.filter(tier.providers, function(provider) {
					return viewModel.worstCheckState == provider.worstCheckState;
				});

				totalProviderCount += providers.length;

				var suffix = ',';

				if(x === (affectedTiers.length - 2)) {
					suffix = ' and';
				}
				else if (x === (affectedTiers.length - 1)) {
					suffix = ''
				} 

				return Mustache.render('{{providers}} {{tier}}{{suffix}} ', {
					tier: tier.tier.split(' ')[0],
					providers: providers.length,
					suffix: suffix
				});
			})
			.join('');

		if(viewModel.worstCheckState == 2) {
			template = '{{affectedProvidersText}} {{providerText}} indicating that they are <b>critical</b>';
		}

		var text = Mustache.render(template, {
			affectedProvidersText: affectedProvidersText,
			providerText: totalProviderCount === 1 ? 'provider is' : 'providers are'
		});

		return text;
	}

	function summaryDescription(configuration, viewModel) {
		if(viewModel.worstCheckState == 0) {
			return {
				title: 'Everything ok',
				text: 'No known issues with any provider.'
			};
		}

		if(viewModel.worstCheckState == 1) {
			return {
				title: 'Warning',
				text: problemText(viewModel)
			};
		}

		if(viewModel.worstCheckState == 2) {
			return {
				title: 'Critical',
				text: problemText(viewModel)
			};
		}

		return {
			title: 'Issue in monitoring, or misconfiguration',
			text: 'Some checks are in an unknown state, generally this indicates an issue with Icinga 2, <a href="http://badger.laterooms.com/Status/ELK">Elasticsearch</a> or the check configuration, suggest contacting IO or OOH team.'
		};
	}

	function buildSummaryViewModel(configuration, groupedData) {
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
			}).first().value();

			var viewModel = {
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
					}).first().value();

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
			};

			viewModel.description = summaryDescription(configuration, {
				tiers: groupedData,
				worstCheckState: worstState
			});

			resolve(viewModel);
		});
	}

	function buildTierStatusViewModel(configuration, groupedData) {
		var tiers = configuration.tier;

		return new Promise(function(resolve) {
			var tierData = _.filter(groupedData, function(tier) {
				if(typeof tiers === 'string') {
					return tier.tier === tiers;
				}

				return _.contains(tiers, tier.tier);
			});

			var worstCheckState;

			if(tierData.length === 1) {
				worstCheckState = _.first(tierData).worstCheckState;
			}

			resolve({
				worstCheckState: worstCheckState,
				providers: _.chain(tierData)
					.reduce(function(allProviders, tier) {
						return allProviders.concat(_.map(tier.providers, function(provider) {
							provider.tier = tier.tier;

							return provider;
						}));
					}, [])
					.filter(function(provider) {
						return configuration.showAllStates || provider.worstCheckState != 0;
					})
					.sortBy(function(provider) {
						if(configuration.orderBy === 'provider') {
							return tierOrder[provider.tier] + ':' + provider.order;
						}
						return tierOrder[provider.tier] + ':' + checkStates[provider.worstCheckState].priority;
					})
					.map(function(provider) {
						var titleSizeClass = '';

						if((provider.displayName.length > 10 && provider.displayName.indexOf(' ') < 0) || provider.displayName.length > 17) {
							titleSizeClass = ' small-text';
						}

						var liClass = "provider-tier-provider-list-item " + checkStates[provider.worstCheckState].name.toLowerCase();
						var divClass = '';

						if(typeof tiers !== 'string') {
							liClass += ' with-inner ' + provider.tier.split(' ')[0].toLowerCase();
							divClass = 'provider-tier-provider-list-inner ' + checkStates[provider.worstCheckState].name.toLowerCase();
						}

						return {
							displayName: provider.displayName,
							name: provider.provider,
							titleSizeClass: titleSizeClass,
							liClass: liClass,
							innerDivClass: divClass,
							services: _.map(provider.services, function(service) {
								return {
									name: serviceAcronym(service.attrs.name),
									fullName: service.attrs.name,
									stateClass: checkStates[service.attrs.last_check_result.state].name.toLowerCase()
								}
							})
						};
					}).value()
			});
		});
	}


	TLRGRP.BADGER.Dashboard.Components.ProviderSummaryViewModels = {
		groupData: groupData,
		buildSummaryViewModel: buildSummaryViewModel,
		buildTierStatusViewModel: buildTierStatusViewModel
	};
})();