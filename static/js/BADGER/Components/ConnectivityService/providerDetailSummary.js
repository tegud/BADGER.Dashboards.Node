(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;

	function buildQuery(providerName) {
		return {
		   "query":{
		      "filtered":{
		         "filter":{
		            "bool":{
		               "must":[
		                  {
		                     "range":{
		                        "@timestamp":{
		                           "from":"now-1h"
		                        }
		                     }
		                  },
		                  {
		                     "terms":{
		                        "service":[
		                           "bookingsByProvider",
		                           "connectivity"
		                        ]
		                     }
		                  },
		                  {
		                     "term":{
		                        "provider": providerName
		                     }
		                  },
		                  {
		                     "or":[
		                        {
		                           "terms":{
		                              "metric":[
		                                 "providerErrors",
		                                 "providerBookingErrors"
		                              ]
		                           }
		                        },
		                        {
		                           "term":{
		                              "service":"bookingsByProvider"
		                           }
		                        }
		                     ]
		                  }
		               ]
		            }
		         }
		      }
		   },
		   "aggs":{
		      "bytime":{
		         "date_histogram":{
		            "min_doc_count":0,
		            "extended_bounds":{
		               "min":"now-1h",
		               "max":"now"
		            },
		            "field":"@timestamp",
		            "interval":"1m"
		         },
		         "aggs":{
		            "types":{
		               "terms":{
		                  "field":"metric"
		               },
		                "aggs": {
		                    "total": {
		                        "sum": {
		                            "field": "value"
		                        }
		                    }
		                }
		            }
		         }
		      }
		   },
		   "size":0
		};
	}

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

	var checks = {
		'Provider Errors': { order: 1 },
		'Provider Bookings': { order: 0 },
		'Provider Booking Errors': { order: 2 }
	};

	function parseOutput(output) {
		if(!/Current value: (-?[0-9]+(\.[0-9]+)?), warn threshold: (-?[0-9]+(\.[0-9]+)?), crit threshold: (-?[0-9]+(\.[0-9]+)?)/.exec(output)) {
			return;
		}

		var value = /Current value: (-?[0-9]+(\.[0-9]+)?)/.exec(output)[1];
		var warn = /warn threshold: (-?[0-9]+(\.[0-9]+)?)/.exec(output)[1];
		var crit = /crit threshold: (-?[0-9]+(\.[0-9]+)?)/.exec(output)[1];

		return {
			value: value,
			warn: warn,
			crit: crit
		};
	}

	TLRGRP.BADGER.Dashboard.Components.ProviderDetailSummary = function (configuration) {
		var providerName = getParameterByName('provider');

		if(!configuration.title) {
			configuration.title = providerName + ' Summary';
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
    	var selectedCheck = getParameterByName('showCheck');

    	checkSummary.on('click', '.provider-summary-item', function(e) {
    		var clickedCheck = $(e.target).closest('.provider-summary-item');
    		var selectedCheck = clickedCheck.data('checkName');

            TLRGRP.messageBus.publish('TLRGRP.BADGER.ProviderSummary.CheckSelected', {
            	check: selectedCheck
            });
    	});

        TLRGRP.messageBus.subscribe('TLRGRP.BADGER.ProviderSummary.CheckSelected', function(data) {
        	selectedCheck = data.check;

        	$('#provider-summary-check-item-' + data.check.replace(/ /g, ''))
        		.addClass('selected')
        		.siblings()
        			.removeClass('selected');
        });

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

						overallSummary[0].className = 'connectivity-service-status-indicator ' + checkStates[provider.worstCheckState].summaryClass;

						overallDescription.html(Mustache.render('<h2>{{title}}</h2>{{{text}}}', {
							title: provider.displayName
						}));

						if(!selectedCheck) {
							selectedCheck = _.chain(provider.services)
								.sortBy(function(service) {
									return checkStates[service.attrs.last_check_result.state].priority + ':' + checks[service.attrs.name];
								})
								.first()
								.value().attrs.name;
						}

						checkSummary.html(Mustache.render('<ul class="connectivity-service-summary-tier-list">'
							+ '{{#services}}'
								+ '<li id="{{id}}" class="provider-summary-item {{itemClass}}" data-check-name="{{name}}"><div class="connectivity-service-summary-tier-emblem {{emblemClass}}">{{{checkIcon}}}</div><div class="provider-summary-check-item-value">{{value}}</div><div class="provider-summary-check-item-title">{{displayName}}</div><div class="provider-summary-selected-indicator"><i class="mega-octicon octicon-triangle-down"></i></div></li>'
							+ '{{/services}}'
						+ '</ul>', {
							services: _.chain(provider.services).sortBy(function(service) {
								return checks[service.attrs.name].order;
							}).map(function(service) {
								var checkIcons = {
									'Provider Bookings': '£',
									'Provider Booking Errors': '<span class="mega-octicon octicon-flame"></span>',
									'Provider Errors': '<span class="fa fa-exclamation"></span>',
								};

								var displayName = service.attrs.display_name.substring(9);
								var id = 'provider-summary-check-item-' + service.attrs.name.replace(/ /g, '');

								return {
									id: id,
									name: service.attrs.display_name,
									displayName: displayName,
									value: parseInt(parseOutput(service.attrs.last_check_result.output).value, 10),
									checkIcon: checkIcons[service.attrs.name],
									itemClass: checkStates[service.attrs.last_check_result.state].summaryClass + (selectedCheck === service.attrs.name ? ' selected' : '')
								};
							}).value()
						}));

						overallDescription.width(summary.innerWidth() - (13 + overallSummary.outerWidth() + checkSummary.outerWidth()));
					});
            },
            error: function (errorInfo) {
            }
        };

        configuration.query = buildQuery(providerName);
        configuration.timeProperties = [
			"query.filtered.filter.bool.must.0.range.@timestamp",
			"aggs.bytime.date_histogram.extended_bounds"
		];
		configuration.intervalProperties = [
			"aggs.bytime.date_histogram.interval"
		];

        var metricDataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
            request:  new TLRGRP.BADGER.Dashboard.DataSource.elasticsearch(configuration),
            refresh: 5000,
            mappings: configuration.mappings,
            callbacks: {
                success: function(data) {
                	var timeBuckets = data.query.aggregations.bytime.buckets;

                	var totals = _.reduce(timeBuckets, function(totals, bucket, index) {
                		_.forEach(bucket.types.buckets, function(type) {
                			if(!totals[type.key]) {
                				totals[type.key] = 0;
                			}

                			totals[type.key] += type.total.value;
                		});

                		return totals;
                	}, {});

                	_.forEach({
                		'count': 'ProviderBookings',
                		'providerBookingErrors': 'ProviderBookingErrors',
                		'providerErrors': 'ProviderErrors'
                	}, function(checkName, totalKey) {
//                		$('.provider-summary-check-item-value', '#provider-summary-check-item-' + checkName).html(totals[totalKey] || 0);
                	});
                }
            },
            components: {
                loading: inlineLoading
            }
        });

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
                        metricDataStore.start(true);
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