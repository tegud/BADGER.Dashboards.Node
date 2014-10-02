(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	function createDataStoreConfiguration(configuration) {
		var tierOptions = { 'All': false };
		var providerOptions = { 'All': false }

		_.each(configuration.tiers, function(tier) {
			var tierId = tier.name.toLowerCase();

			tierOptions[tierId] = { 
				'providers': _.map(tier.providers, function(provider) {
					if(typeof provider === 'string') {
						provider = {
							name: provider
						};
					}

					var providerId = provider.id || provider.name.toLowerCase();

					providerOptions[provider.name] = {
						'provider': [providerId]
					}

					return providerId;
				}) 
			};
		});

		return {
          "dataSource": "elasticsearch",
          "host": "http://logs.laterooms.com:9200",
          "timeProperties": [
            "query.filtered.filter.bool.must.0.range.@timestamp",
            "aggs.histogram.date_histogram.extended_bounds"
          ],
          "filters": [
            { 
              "id": "tier",
              "title": "Tier",
              "defaultOption": "All",
              "options": tierOptions,
              "allowMultiple": false,
              "setOnProperties": {
                "providers": [
                  "query.aggs.histogram.aggs.requests.filter.bool.must.#.terms.hotel_details_provider",
                  "query.aggs.histogram.aggs.sessions.filter.bool.must.#.terms.requests|providersEncountered",
                  "query.aggs.histogram.aggs.sessions.aggs.bookings.filter.bool.must.#.terms.provider",
                  "query.aggs.histogram.aggs.bookingerrors.filter.bool.must.#.terms.provider",
                  "query.aggs.histogram.aggs.connectivityerrors.filter.bool.must.#.terms.provider"
                ]
              }
            },
            { 
              "id": "provider",
              "title": "Provider",
              "defaultOption": "All",
              "type": "drop-down",
              "options": providerOptions,
              "allowMultiple": false,
              "setOnProperties": {
                "provider": [
                  "query.aggs.histogram.aggs.requests.filter.bool.must.#.terms.hotel_details_provider",
                  "query.aggs.histogram.aggs.sessions.filter.bool.must.#.terms.requests|providersEncountered",
                  "query.aggs.histogram.aggs.sessions.aggs.bookings.filter.bool.must.#.terms.provider",
                  "query.aggs.histogram.aggs.bookingerrors.filter.bool.must.#.terms.AdditionalLoggingInformation|ProviderName",
                  "query.aggs.histogram.aggs.connectivityerrors.filter.bool.must.#.terms.Provider"
                ]
              }
            }
          ],
          "defaultTimeFrame": {
            "timeFrame": 0,
            "units": "daysAgo"
          },
          "queries": {
            "modifiers": {
              "today": { },
              "lastWeek": { "timeOffset": { "weeks": -1 } },
              "2weeksago": { "timeOffset": { "weeks": -2 } },
              "3weeksago": { "timeOffset": { "weeks": -3 } },
              "1monthago": { "timeOffset": { "relativeInMonth": -1 } }
            },
            "query": {
              "query":{
                "filtered":{
                  "filter":{
                    "bool":{
                      "must":[
                        {
                          "range":{
                            "@timestamp":{ }
                          }
                        },
                        {
                          "terms": {
                            "type": ["session", "lr_errors", "hotel_acquisitions_errors", "lr_varnish_request"]
                          }
                        }
                      ]
                    }
                  }
                }
              },
              "aggs": {
                "histogram": {
                  "date_histogram": {
                    "min_doc_count": 0,
                    "field" : "@timestamp",
                    "interval" : "1h"
                  },
                  "aggs":{
                    "requests": {
                      "filter": {
                        "bool": {
                          "must": [
                            {
                              "term": {
                                "type": "lr_varnish_request"
                              }
                            },
                            {
                              "term": {
                                "url_page_type.raw": "hotel-details"
                              }
                            },
                            {
                              "exists": {
                                "field": "hotel_details_provider"
                              }
                            }
                          ],
                          "must_not": {
                            "term": {
                              "hotel_details_provider": "laterooms"
                            }
                          }
                        }
                      }
                    },
                    "sessions": {
                      "filter": {
                        "bool": {
                          "must": [
                          {
                            "term":{
                              "type":"session"
                            }
                          },
                          {
                            "term": {
                              "user.type": "human"
                            }
                          },
                          {
                            "exists": {
                              "field": "requests.providersEncountered"
                            }
                          }
                          ],
                          "must_not": {
                            "term": {
                              "requests.providersEncountered.raw": "LateRooms"
                            }
                          }
                        }
                      },
                      "aggs": {
                        "bookings": {
                          "filter": { 
                            "bool": {
                              "must": [
                                {
                                  "term": {
                                    "booked": true
                                  }
                                }
                              ],
                              "must_not": {
                                "term": {
                                  "provider": "laterooms"
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    "bookingerrors": {
                      "filter": {
                        "bool": {
                          "must": [
                          {
                            "term":{
                              "type":"lr_errors"
                            }
                          },
                          {
                            "term": {
                              "url_page_type": "booking"
                            }
                          },
                          {
                            "exists": {
                              "field": "AdditionalLoggingInformation.ProviderName"
                            }
                          }
                          ],
                          "must_not": {
                            "term": {
                              "AdditionalLoggingInformation.ProviderName": "laterooms"
                            }
                          }
                        }
                      }
                    },
                    "connectivityerrors": {
                      "filter": {
                        "bool": {
                          "must": [
                          {
                            "term":{
                              "type":"hotel_acquisitions_errors"
                            }
                          },
                          {
                            "range": {
                              "@timestamp": {
                                "gte": "2014-09-15T00:00:00.000Z"
                              }
                            }
                          }
                          ],
                          "must_not": [
                          {
                            "term":{
                              "tags":"noterror"
                            }
                          }
                          ]
                        }
                      }
                    }
                  }
                }
              },
              "size":0
            }
          },
          "mappings": [
            { 
              "type": "extractFromDateHistogram",
              "aggregateName": "histogram",
              "fields": {
                "requests": "requests.doc_count",
                "sessions": "sessions.doc_count",
                "bookings": "sessions.bookings.doc_count",
                "bookingerrors": "bookingerrors.doc_count",
                "connectivityerrors": "connectivityerrors.doc_count"
              }
            },
            { 
              "type": "calculation",
              "calculation": "percentage",
              "by": { "field": "bookings", "over": "sessions" },
              "toField": "commission"
            },
            {
              "type": "stats",
              "fields": ["lastWeek", "2weeksago", "3weeksago", "1monthago"],
              "stds": [1, 2],
              "property": "commission",
              "toField": "value.stats.commission"
            },
            {
              "type": "stats",
              "fields": ["lastWeek", "2weeksago", "3weeksago", "1monthago"],
              "stds": [1, 2],
              "property": "bookingerrors",
              "toField": "value.stats.bookingerrors"
            },
            {
              "type": "stats",
              "fields": ["lastWeek", "2weeksago", "3weeksago", "1monthago"],
              "stds": [1, 2],
              "property": "connectivityerrors",
              "toField": "value.stats.connectivityerrors"
            },
            {
              "type": "stats",
              "fields": ["lastWeek", "2weeksago", "3weeksago", "1monthago"],
              "stds": [1, 2],
              "property": "sessions",
              "toField": "value.stats.sessions"
            },
            {
              "type": "stats",
              "fields": ["lastWeek", "2weeksago", "3weeksago", "1monthago"],
              "stds": [1, 2],
              "property": "requests",
              "toField": "value.stats.requests"
            }
          ]
        };
	}

	function buildCompareOptions () {
		return '<div class="filter-item compare-options" data-filter-id="comparison">' 
			+ '<label>Compare</label>' 
			+ '<div class="filter-option historic selected" data-filter-value="historic"><div class="filter-icon fa fa-history"></div><div class="filter-text">Historic<br/>Averages</div></div>' 
			//+ '<div class="filter-option " data-filter-value="provider"><div class="filter-option-checkbox radio"><div class="filter-option-checkbox-inner "></div></div>By<br/>Provider</div>' 
			+ '</div>';
	}

	function buildTierOptions(configuration) {
		return Mustache.render('<div class="filter-item tier-options" data-filter-id="tier">' 
			+ '<label>Tier</label>'
			+ '<div class="filter-option all-option selected" data-filter-value="All"><div class="filter-option-checkbox radio"><div class="filter-tick fa fa-check"></div></div>All</div>' 
			+ '{{#tiers}}'
			+ '<div class="filter-option tier-option {{cssClass}}" data-filter-value="{{id}}"><div class="filter-option-checkbox radio">{{code}}</div>{{name}}</div>' 
			+ '{{/tiers}}' 
		+ '</div>', {
			tiers: _.map(configuration.tiers, function(tier) {
				var id = tier.name.toLowerCase();

				return {
					id: id,
					name: tier.name,
					code: tier.name[0],
					cssClass: tier.name.toLowerCase()
				};
			})
		});
	}

	function buildProviderOptions(configuration) {
		return Mustache.render('<div class="filter-item provider-options" data-filter-id="provider"><label>Provider</label>' 
			+ '<div class="filter-option all-option selected" data-filter-value="All"><div class="filter-option-checkbox radio"><div class="filter-tick fa fa-check"></div></div>All</div>' 
			+ '{{#providers}}'
			+ '<div class="filter-option provider-option {{cssClass}}" data-filter-value="{{name}}"><div class="filter-option-checkbox radio"><div class="filter-tick fa fa-check"></div></div>{{name}}</div>' 
			+ '{{/providers}}'
			+ '</div>',
			{
				providers: _.reduce(configuration.tiers, function(memo, tier) {
					return memo.concat(_.map(tier.providers, function(provider) {
						if(typeof provider === 'string') {
							provider = { name: provider };
						}
						var id = provider.id || provider.name.toLowerCase();
						var tierClass = 'tier-' + tier.name.toLowerCase();

						return {
							cssClass: tierClass,
							name: provider.name,
							id: id
						};
					}));
				}, [])
			});
	}

	TLRGRP.BADGER.Dashboard.Components.ProviderConversionGraph = function (configuration) {
        var subscribedComponents = new TLRGRP.BADGER.Dashboard.ComponentModules.MultiComponentBus('ProviderData');
        subscribedComponents.subscribeToEvents();

		var dataStoreConfiguration = createDataStoreConfiguration(configuration);
		var dataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
			request:	new TLRGRP.BADGER.Dashboard.DataSource['elasticsearch'](dataStoreConfiguration),
			refresh: 25000,
			mappings: dataStoreConfiguration.mappings,
			filters: dataStoreConfiguration.filters,
			components: {
                loading: {
                    loading: subscribedComponents.showLoading,
                    finished: subscribedComponents.hideLoading
                }
			},
			callbacks: {
				success: function(data) {
					subscribedComponents.refreshComplete(data);
				}
			}
		});

		var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
			title: 'LateRooms conversion by Provider',
			layout: configuration.layout,
			componentClass: 'conversion-status',
			modules: [
				{
					appendTo: function (container) {
						var filterPanel = $('<div>'
								+ buildCompareOptions()
								+ buildTierOptions(configuration)
								+ buildProviderOptions(configuration)
							+ '</div>')
							.on('click', '.tier-options .filter-option', function() {
								var selectedTierOption = $(this);
								var filterValue = selectedTierOption.data('filterValue');
								var providerOptions = $('.provider-options', filterPanel);

								selectedTierOption
									.addClass('selected')
									.siblings()
									.removeClass('selected');

								providerOptions.removeClass(_.map(configuration.tiers, function(tier) { return 'tier-' + tier.name.toLowerCase(); }).join(' '));

								if(filterValue !== 'All') {
									providerOptions.addClass('tier-' + filterValue);
								}

								dataStore.setFilterOption('tier', filterValue);
							})
							.on('click', '.provider-options .filter-option', function() {
								var selectedProviderOption = $(this);
								var filterValue = selectedProviderOption.data('filterValue');

								selectedProviderOption
									.addClass('selected')
									.siblings()
									.removeClass('selected');

								dataStore.setFilterOption('provider', filterValue);
							})
							.appendTo(container);


					}
				}
			]
		});

		var stateMachine = nano.Machine({
			states: {
				uninitialised: {
					initialise: function (container) {
							componentLayout.appendTo(container);
							this.transitionToState('initialised');
						}
					},
					initialised: {
						_onEnter: function () {
							dataStore.start(true);
						},
						stop: function() {
							dataStore.stop();
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
	};
})();

