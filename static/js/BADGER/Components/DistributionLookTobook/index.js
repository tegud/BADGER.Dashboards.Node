(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;

	TLRGRP.BADGER.Dashboard.Components.DistributionLookToBook = function (configuration) {
		var allData;
		var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading();
		var table = $('<table class="affiliate-looktobook">' 
				+ '<tr class="title-row">' 
					+ '<th class="sort-header" data-sort-by="name" data-default-direction="asc">Affiliate&nbsp;<span class="fa fa-caret-down"></span></th>' 
					+ '<th class="sort-header requests-header" data-sort-by="requests">Requests&nbsp;<span class="fa fa-caret-down"></span></th>' 
					+ '<th class="sort-header bookings-header" data-sort-by="bookings">Bookings&nbsp;<span class="fa fa-caret-down"></span></th>' 
					+ '<th class="sort-header looktobook-header" data-sort-by="lookToBookRatio">Look To Book Ratio&nbsp;<span class="fa fa-caret-down"></span></th>' 
				+ '</tr>' 
			+ '</table>')
			.on('click', '.sort-header', function() {
				var clickedCell = $(this);
				var indicator = $('.fa', clickedCell);

				if(clickedCell.hasClass('sort-by')) {

					if(indicator.hasClass('fa-caret-down')) {
						indicator[0].className = 'fa fa-caret-up';
					}
					else {
						indicator[0].className = 'fa fa-caret-down';
					}
				}
				else {
					clickedCell.addClass('sort-by').siblings().removeClass('sort-by');

					if(clickedCell.data('defaultDirection') === 'asc') {
						indicator[0].className = 'fa fa-caret-up';
					}
					else {
						indicator[0].className = 'fa fa-caret-down';
					}
				}

				renderRows();
			});

		function renderRows() {
			var titleRow = $('tr.title-row', table);
			var sortBy; 
			var ascending;
			var currentSortHeader = $('.sort-by', titleRow);

			if(currentSortHeader.length) {
				sortBy = currentSortHeader.data('sortBy');
				ascending = $('.fa-caret-up', currentSortHeader).length ? true : false;
			}
			
			if(!sortBy) {
				$('.looktobook-header', titleRow).addClass('sort-by');
				sortBy = 'lookToBookRatio';
				ascending = false;
			}

			var sortedData = _.sortBy(allData, function(affiliate) { return affiliate[sortBy]; });

			if(!ascending) {
				sortedData = sortedData.reverse();
			}


			$('tr:not(.title-row)', table).remove();
			$(_.map(sortedData, function(affiliate) {
				return '<tr>'
				+ '<td>' + affiliate.name + '</td>'
				+ '<td>' + affiliate.requests + '</td>'
				+ '<td>' + affiliate.bookings + '</td>'
				+ '<td>' + affiliate.lookToBookRatio.toFixed(0) + '</td>'
				+ '</tr>';
			}).join('')).insertAfter(titleRow);
		}

		var dataStoreConfiguration = {
			"host": "http://badger.laterooms.com:9200",
			"timeProperties": [
				"query.filtered.filter.bool.must.0.range.@timestamp"
			],
			"defaultTimeFrame": {
				"timeFrame": 0,
				"units": "daysAgo"
			},
			"queries": {
				"modifiers": {
					"today": {  }
				},
				"query": {
					"query":{
						"filtered":{
							"filter":{
								"bool":{
									"must":[
									{
										"range":{
											"@timestamp":{
												"from":"now-12h"
											}
										}
									},
									{
										"terms":{
											"type": ["domain_events", "xml_varnish"]
										}
									}
									]
								}
							}
						}
					},
					"aggs":{
						"bookings":{
						 "filter":{
						    "bool":{
						       "must":[
						          {
						             "term":{
						                "type":"domain_events"
						             }
						          },
						          {
						             "term":{
						                "isTestBooking":false
						             }
						          },
						          {
						             "exists":{
						                "field": "affiliateName"
						             }
						          }
						       ],
						       "must_not":[
						          {
						             "term":{
						                "affiliateId":0
						             }
						          }
						       ]
						    }
						 },
						 "aggs": {
						    "affiliates": {
						        "terms": {
						            "field": "affiliateName.raw",
						            "size": 1000
						        }
						    }
						 }
					},

					"requests":{
					 "filter":{
					    "bool":{
					       "must":[
					          {
					             "term":{
					                "type":"xml_varnish"
					             }
					          },
					          {
					             "exists":{
					                "field": "affiliate_name"
					             }
					          }
					       ]
					    }
					 },
					 "aggs": {
					    "affiliates": {
					        "terms": {
					            "field": "affiliate_name.raw",
					            "size": 1000
					        }
					    }
					 }
					}
					},
					"size":0
				}
			}
		};

		var dataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
			request:	new TLRGRP.BADGER.Dashboard.DataSource['elasticsearch'](dataStoreConfiguration),
			refresh: 25000,
			mappings: [
				{
					type: 'groupBy',
					root: [
						{ target: 'bookings', field: 'today.aggregations.bookings.affiliates.buckets' },
						{ target: 'requests', field: 'today.aggregations.requests.affiliates.buckets' }
					]
				}
			],
			callbacks: {
				success: function (data) {
					allData = _.map(data.requests, function(requests, affiliate) {
						var bookings = data.bookings[affiliate] || 0;
						return {
							name: affiliate,
							bookings: bookings,
							requests: requests,
							lookToBookRatio: bookings > 0 ? requests / bookings : 0
						};
					});

					renderRows();
				}
			},
			components: {
				loading: inlineLoading
			}
		});

		var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
			title: configuration.title,
			layout: configuration.layout,
			componentClass: 'conversion-status',
			modules: [
				inlineLoading,
				{
					appendTo: function (container) {
						container.append(table);
					}
				}
			]
		});

		var stateMachine = nano.Machine({
			states: {
				uninitialised: {
					initialise: function (container) {
								//inlineLoading.loading();
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