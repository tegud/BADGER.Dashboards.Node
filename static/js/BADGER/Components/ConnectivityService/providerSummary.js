(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;

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
    	var overallBreakdown = $('<li />').appendTo(summary);
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

		var callbacks = {
			success: function (data) {
				var tiers = _.chain(data.query.results).reduce(function(allGroups, service) {
					return allGroups.concat(service.joins.host.groups);
				}, []).uniq().value();

				var providersGroupedByTier = _.groupBy(data.query.results, function(service) {
					var tier = _.intersection(service.joins.host.groups, tiers);

					return tier.length ? tier[0] : 'Unknown';
				});

				var groupedServiceStatus = _.countBy(data.query.results, function(service) {
					return service.attrs.last_check_result.state;
				});

				overallBreakdown.html('<ul class="state-checks">' + _.map(checkStates, function(state, stateId) {
					return '<li class="state-checks-item ' + state.name.toLowerCase() + '"><div class="state-checks-icon ' + state.iconClass + '"></div><div class="state-checks-counter">' + (groupedServiceStatus[stateId] || 0) + ' ' + state.name + '</div></li>';
				}).join('') + '</ul>');

				var ordererdStates = _.sortBy(Object.keys(groupedServiceStatus), function(state) {
					return checkStates[state].priority;
				});
				var worstState = _.last(ordererdStates);

				overallSummary[0].className = 'connectivity-service-status-indicator ' + (typeof worstState !== 'undefined' ? checkStates[worstState].summaryClass : 'unknown');
 
            	providerSummary.html('<ul>' + _.map(_.sortBy(tiers, function(tier) {
            		return tierOrder[tier];
            	}), function(tier) { 
            		var providers = {};

            		var providerList = _.chain(providersGroupedByTier[tier]).map(function(service) {
            			if(!providers[service.joins.host.name]) {
            				providers[service.joins.host.name] = [];
            			}

            			providers[service.joins.host.name].push(service);

            			return service.joins.host.name;
            		}).uniq().value();

       //      		<b>' + tier + ': </b>' + _.map(providerList, function(provider) {
       //      			var checksGroupedByState = _.groupBy(providers[provider], function(service) {
       //      				return service.attrs.last_check_result.state;
       //      			});

       //      			return provider + ' (' 
							// + (checksGroupedByState['0'] ? checksGroupedByState['0'].length : '0') + '/' 
							// + (checksGroupedByState['1'] ? checksGroupedByState['1'].length : '0') + '/' 
							// + (checksGroupedByState['2'] ? checksGroupedByState['2'].length : '0') + '/'
							// + (checksGroupedByState['3'] ? checksGroupedByState['3'].length : '0')
       //  				+ ')';
       //      		}).join(', ') + '

            		return '<li></li>';
        		}).join('') 
				// + (providersGroupedByTier['Unknown'] ? '<li><b>Unknown: </b>' + _.chain(providersGroupedByTier['Unknown']).map(function(service) {
				// 	return service.joins.host.name;
				// }).uniq().value().join(', ') + '</li>' : '')
				+ '</ul>');
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