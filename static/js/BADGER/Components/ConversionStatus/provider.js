(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;

	var tierOrder = {
		'P': 0,
		'G': 1,
		'S': 2,
		'B': 3
	};

	function appendConfiguration(configuration) {
		var providers = [];

		_.each(configuration.tiers, function(tierProviders, tier) {
			_.each(tierProviders, function(provider) {
				if (typeof provider === 'string') {
					provider = {
						name: provider
					};
				}

				var id = provider.id || provider.name.toLowerCase();

				providers.push({
					name: provider.name,
					id: id,
					type: tier,
					values: {
						sessions: "aggregations.sessions.providers.buckets.:find(key=" + id + ").doc_count",
						bookings: "aggregations.sessions.bookings.providers.buckets.:find(key=" + id + ").doc_count",
						bookingErrors: "aggregations.bookingerrors.providers.buckets.:find(key=" + id + ").doc_count",
						connectivityErrors: "aggregations.connectivityerrors.providers.buckets.:find(key=" + id + ").doc_count"
					}
				});
			});
		});

		configuration.sites = configuration.sites.concat(providers);

		return configuration;
	}

	TLRGRP.BADGER.Dashboard.Components.ProviderConversion = function (configuration) {
		configuration = appendConfiguration(configuration);

		var table;
		var orderByProperty = 'tier';
		var orderDirection = 'asce';

		var queryModifiers = {
			"today": {  },
			"yesterday": { "timeOffset": { "days": -1 }, "limitToCurrentTime": true, "currentTimeOffset": { "m": -30 } },
			"lastWeek": { "timeOffset": { "weeks": -1 }, "limitToCurrentTime": true, "currentTimeOffset": { "m": -30 } },
			"2weeksago": { "timeOffset": { "weeks": -2 }, "limitToCurrentTime": true, "currentTimeOffset": { "m": -30 } },
			"3weeksago": { "timeOffset": { "weeks": -3 }, "limitToCurrentTime": true, "currentTimeOffset": { "m": -30 } },
			"1monthago": { "timeOffset": { "relativeInMonth": -1 }, "limitToCurrentTime": true, "currentTimeOffset": { "m": -30 } }
		};

		var daysToCompareAgainst = ['yesterday','lastWeek','2weeksago','3weeksago','1monthago'];

		var selectedQueryModifiers = _.reduce(daysToCompareAgainst, function(memo, day) {
			memo[day] = queryModifiers[day];
			return memo;
		}, {
			today: {}
		});

		var dataStoreConfiguration = {
			"host": "http://logs.laterooms.com:9200",
			"timeProperties": [
				"query.filtered.filter.bool.must.0.range.@timestamp"
			],
			"defaultTimeFrame": {
				"timeFrame": 0,
				"units": "daysAgo"
			},
			"queries": {
				"modifiers": selectedQueryModifiers,
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
									}
									]
								}
							}
						}
					},
					"aggs":{
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
								"providers": {
									"terms": {
										"field": "requests.providersEncountered",
										"exclude": "laterooms",
										"size": 100
									}
								},
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
									},
									"aggs": {
										"providers": {
											"terms": {
												"field": "provider",
												"size": 100
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
							},
							"aggs": {
								"providers": {
									"terms": {
										"field": "AdditionalLoggingInformation.ProviderName",
										"size": 100
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
							},
							"aggs": {
								"providers": {
									"terms": {
										"field": "Provider",
										"size": 100
									}
								}
							}
						}
					},
					"size":0
				}
			}
		};

		var toolTip;
		var lastData;

		var pickValues = [
			{ from: 'aggregations.sessions.doc_count', to: 'total.sessions' },
			{ from: 'aggregations.sessions.bookings.doc_count', to: 'total.bookings' },
			{ from: 'aggregations.bookingerrors.doc_count', to: 'total.bookingErrors' },
			{ from: 'aggregations.connectivityerrors.doc_count', to: 'total.connectivityErrors' }
		];

		_.each(configuration.sites, function(site) {
			_.each(site.values, function(value, key) {
				pickValues.push({
					from: value,
					to: site.id + '.' + key
				});
			});
		});


		var mappings = [
			{
				type: 'pickValues',
				multiQuery: true,
				values: pickValues,
				defaultTo: 0
			},
			{
				"type": "calculation",
				"calculation": "percentage",
				"by": { "field": "total.bookings", "over": "total.sessions" },
				"notFromHistogram": true,
				"toField": "total.commission"
			},
			{
				"type": "stats",
				"fields": daysToCompareAgainst,
				"stds": [1, 2],
				"notFromHistogram": true,
				"property": "total.commission",
				"includeZeroValues": false,
				"toField": "value.stats.commission.total"
			}
		];

		_.each(configuration.sites, function(site) {
			mappings.push({
				"type": "calculation",
				"calculation": "percentage",
				"by": { "field": site.id + ".bookings", "over": site.id + ".sessions" },
				"notFromHistogram": true,
				"toField": site.id + ".commission"
			});

			mappings.push({
				"type": "stats",
				"fields": daysToCompareAgainst,
				"stds": [1, 2],
				"notFromHistogram": true,
				"toField": 'value.stats.commission.' + site.id,
				"property": site.id + ".commission"
			});

			mappings.push({
				"type": "stats",
				"fields": daysToCompareAgainst,
				"stds": [1, 2],
				"notFromHistogram": true,
				"includeZeroValues": false,
				"toField": 'value.stats.bookings.' + site.id,
				"property": site.id + ".bookings"
			});

			mappings.push({
				"type": "stats",
				"fields": daysToCompareAgainst,
				"stds": [1, 2],
				"notFromHistogram": true,
				"includeZeroValues": false,
				"toField": 'value.stats.bookingErrors.' + site.id,
				"property": site.id + ".bookingErrors"
			});

			mappings.push({
				"type": "stats",
				"fields": daysToCompareAgainst,
				"stds": [1, 2],
				"notFromHistogram": true,
				"includeZeroValues": false,
				"toField": 'value.stats.connectivityErrors.' + site.id,
				"property": site.id + ".connectivityErrors"
			});
		});

		// _.each(configuration.dimensions, function(dimension) {
		// 	mappings.push({
		// 		"type": "calculation",
		// 		"calculation": "percentage",
		// 		"by": { "field": dimension.id + ".bookings", "over": dimension.id + ".sessions" },
		// 		"notFromHistogram": true,
		// 		"toField": dimension.id + ".commission"
		// 	});
		// 	mappings.push({
		// 		"type": "stats",
		// 		"fields": ["lastWeek", "2weeksago", "3weeksago", "1monthago"],
		// 		"stds": [1, 2],
		// 		"notFromHistogram": true,
		// 		"toField": 'value.' + dimension.id,
		// 		"property": dimension.id + ".commission"
		// 	});
		// });

		var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading();
		var dataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
			request:	new TLRGRP.BADGER.Dashboard.DataSource['elasticsearch'](dataStoreConfiguration),
			refresh: 25000,
			mappings: mappings,
			callbacks: {
				success: function (data) {
					lastData = data;

					_.each(configuration.sites, function(site) {
						_.each(configuration.dimensions, function(dimension) {
							if(!dimension.id)  {
								return;
							}

							var cell = $('#' + (configuration.idPrefix || '') + site.id + '-' + dimension.id);
							var valueCell = dimension.cellType === 'total' ?  $('span', cell) : $('.status-cell-value', cell);
							var indicatorCell = $('.status-cell-indicator', cell);
							var newCellClass = '';
							var value = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(data, 'today.' + (site.id === 'total' ? 'total.' : (site.id + '.')) + dimension.value);
							var differenceFromNorm;
							var thresholdBreach;
							var kpiDirectionIsUp = (dimension.kpiDirection || 'up') === 'up';

							if(isNaN(value)) { 
								value = 0;
							}

							var stats;
							if(dimension.value) {
								if(site.id === 'total') {
									stats = data.value.stats[dimension.value][site.id];
								}
								else if(typeof data.value.stats[dimension.value] !== 'undefined' && typeof data.value.stats[dimension.value][site.id] !== 'undefined') {
									stats = data.value.stats[dimension.value][site.id];
								}
							}

							if(typeof value !== 'undefined' && stats && stats.standardDeviations && stats.standardDeviations.length > 1) {
								if((kpiDirectionIsUp && value >= stats.mean) || (!kpiDirectionIsUp && value <= stats.mean)) {
									newCellClass = 'good';

									differenceFromNorm = Math.abs(stats.mean - value);
									thresholdBreach = -differenceFromNorm;
								}
								else if((kpiDirectionIsUp && value >= stats.standardDeviations[1].minus) || (!kpiDirectionIsUp && value <= stats.standardDeviations[1].plus)) {
									newCellClass = 'warn';
									
									if(kpiDirectionIsUp) {
										thresholdBreach = stats.mean - value;
									}
									else {
										thresholdBreach = value - stats.mean;
									}
									thresholdBreach = thresholdBreach * 1000;
									differenceFromNorm = Math.abs(stats.mean - value);
								}
								else if((kpiDirectionIsUp && value < stats.standardDeviations[1].minus) || (!kpiDirectionIsUp && value > stats.standardDeviations[1].plus)) {
									newCellClass = 'alert';
									
									if(kpiDirectionIsUp) {
										thresholdBreach = stats.mean - value;
									}
									else {
										thresholdBreach = value - stats.mean;
									}
									thresholdBreach = thresholdBreach * 10000;
									differenceFromNorm = Math.abs(stats.mean - value);
								}
							}

							(dimension.cellType === 'total' ? cell : cell.parent())
								.removeClass('warn alert good')
								.addClass(newCellClass);

							if(newCellClass) {
								indicatorCell.removeClass('hidden');
							}
							else {
								indicatorCell.addClass('hidden');
							}

							valueCell
								.text(typeof value === 'undefined' ? '?' : value.toFixed(typeof dimension.precision === 'undefined' ? 2 : dimension.precision));

							cell
								.data('differenceFromNorm', differenceFromNorm)
								.data('thresholdBreach', thresholdBreach);
						});
					});

					orderTable();
				}
			},
			components: {
				loading: inlineLoading
			}
		});

		var columnsViewModel = _.map(configuration.dimensions, function(dimension) {
			return {
				name: dimension.name,
				id: dimension.id,
				field: dimension.value,
				isTotalCell: dimension.cellType === 'total',
				showPercentage: typeof dimension.showPercentage === 'undefined' ? true : dimension.showPercentage,
				lessIsBetter: dimension.kpiDirection === 'down'
			};
		});

		var rowsViewModel = _.map(configuration.sites, function(site) {
			var idPrefix = (configuration.idPrefix || '') + site.id;
			var columns = _.map(columnsViewModel, function(column) {
				if(!column.dashboard) {
					column.dashboard = site.dashboard;
				}

				if(!column.view) {
					column.view = site.view;
				}

				column.cellId = idPrefix + '-' + column.id;
				column.dataRoot = site.id;
				column.dimensionValue = column.field;

				column.site = site.id;
				column.dimension = column.id;

				return column;
			});

			return {
				name: site.name,
				id: site.id,
				idPrefix: idPrefix,
				dashboard: site.dashboard,
				type: site.type,
				typeCode: site.type ? site.type[0].toUpperCase() : '',
				view: site.view,
				isAllRow: site.id === 'total',
				columns: Mustache.render('{{#columns}}' 
					+ '{{#isTotalCell}}'
						+ '<td class="total-cell data-cell{{#lessIsBetter}} lessIsBetter{{/lessIsBetter}}" {{#dashboard}}data-dashboard="{{dashboard}}"{{/dashboard}} {{#view}}data-view="{{view}}"{{/view}} id="{{cellId}}" data-cell-identifier="{{id}}" data-data-root="{{dataRoot}}" data-dimension-value="{{dimensionValue}}" data-dimension="{{dimension}}" data-site="{{site}}"><span>-</span>{{#showPercentage}}%{{/showPercentage}}<div class="status-cell-indicator hidden"></div></td>'
					+ '{{/isTotalCell}}'
					+ '{{^isTotalCell}}'
						+ '<td class="data-cell{{#lessIsBetter}} lessIsBetter{{/lessIsBetter}}" {{#dashboard}}data-dashboard="{{dashboard}}"{{/dashboard}} {{#view}}data-view="{{view}}"{{/view}} data-cell-identifier="{{id}}" data-data-root="{{dataRoot}}" data-dimension-value="{{dimensionValue}}" data-dimension="{{dimension}}" data-site="{{site}}"><div id="{{cellId}}" class="status-cell-container"><div class="status-cell-value">-</div><div class="status-cell-indicator hidden"></div>{{#showPercentage}}<div class="status-cell-percentage">%</div>{{/showPercentage}}</div></td>' 
					+ '{{/isTotalCell}}'
					+ '{{/columns}}', { columns: columns })
			};
		});

		var tableViewModel = {
			columns: columnsViewModel,
			rows: rowsViewModel
		};

		function orderTable() {
			var orderProperty = orderByProperty;
			var direction = orderDirection;
			var rows = $('.status-row:not(.all-row)', table);
			var selectedSortValue = $('.filter-option.selected', '#value-sort-modifier').data('filterValue');

			var newRowOrder = _.chain(rows)
				.map(function(row) {
					var value;

					if(orderProperty === 'name') {
						value = $('.provider-name', row).text();
					}
					else if(orderProperty === 'tier') {
						value = tierOrder[$('.provider-tier', row).text()];
					}
					else {
						var cell = $('#' + (configuration.idPrefix || '') + $(row).data('rowId') + '-' + orderProperty);
						var values = {
							value: parseFloat(cell.text().replace(/%/, '')),
							thresholdBreach: cell.data('thresholdBreach'),
							differenceFromNorm: cell.data('differenceFromNorm')
						};

						value = values[selectedSortValue];
					}

					return {
						value: value,
						row: row
					};
				})
				.sortBy('value')
				.pluck('row')
				.value();

			if(direction === 'desc') {
				newRowOrder = newRowOrder.reverse();
			}

			$(newRowOrder).detach().appendTo(table)
		}

var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
	title: configuration.title,
	layout: configuration.layout,
	componentClass: 'conversion-status',
	modules: [
	inlineLoading,
	{
		appendTo: function (container) {
			container.append(
				'<div>'
				+ '<table class="status-table provider-status-table">'
				+ '<tr><td colspan="2">&nbsp;</td><td colspan="8" class="value-column-sorter">'
				+ '<div><div class="filter-item" id="value-sort-modifier"><label>Sort by:</label><div class="filter-option selected" data-filter-value="value"><div class="filter-option-checkbox radio"><div class="filter-option-checkbox-inner selected"></div></div>Value</div><div class="filter-option" data-filter-value="thresholdBreach"><div class="filter-option-checkbox radio"><div class="filter-option-checkbox-inner "></div></div>Threshold Breach</div><div class="filter-option " data-filter-value="differenceFromNorm"><div class="filter-option-checkbox radio"><div class="filter-option-checkbox-inner "></div></div>Difference form Norm</div></div></div>'
				+ '</td></tr><tr class="status-header-row">'
				+ '<th class="name-cell column-header" data-order-property="name">&nbsp;<div class="order-indicator"></div></th>'
				+ '<th class="column-header tier-header" data-order-property="tier">Tier<div class="order-indicator asce"></th>'
				+ Mustache.render('{{#columns}}<th class="column-header value-header" data-order-property="{{id}}">{{name}}<div class="order-indicator"></div></th>{{/columns}}', tableViewModel)
				+ '</tr>'
				+ Mustache.render('{{#rows}}<tr class="status-row{{#isAllRow}} all-row{{/isAllRow}}" data-row-id="{{id}}">'
					+ '<th><div class="provider-name">{{name}}</div></th><th class="provider-tier">{{#type}}<div class="tier-indicator {{type}}" title="{{type}}">{{typeCode}}</div>{{/type}}</th>'
					+ '{{{columns}}}'
					+ '</tr>{{/rows}}', tableViewModel)
				+ '</table></div>');

			table = $('.provider-status-table', container);

			toolTip = $('#graph-tooltip');

			if(!toolTip.length) {
				toolTip = $('<div id="graph-tooltip" class="hidden"></div>').appendTo('body');
			}

			// var selectedSortValue = $('.filter-option.selected', '#value-sort-modifier').data('filterValue');
	 		container
	 			.on('click', '#value-sort-modifier .filter-option', function() {
	 				var selectedItem = $(this);

	 				if(selectedItem.hasClass('selected')) {
	 					return;
	 				}

	 				selectedItem.addClass('selected').siblings().removeClass('selected');

	 				orderTable();
	 			})
	 			.on('click', '.column-header', function() {
	 				var cell = $(this);
	 				var table = cell.closest('table');
	 				var orderProperty = cell.data('order-property');
	 				var rows = $('.status-row:not(.all-row)', table);
	 				var orderIndictator = cell.children('.order-indicator');
	 				
 					orderIndictator.parent().siblings().children('.order-indicator').removeClass('asce desc');

	 				if(!orderIndictator.hasClass('desc') && !orderIndictator.hasClass('asce')) {
	 					if(orderProperty === 'name' || orderProperty === 'tier') {
	 						orderIndictator.addClass('asce');
	 					}
	 					else {
	 						orderIndictator.addClass('desc');
	 					}
	 				}
	 				else if(orderIndictator.hasClass('desc')) {
	 					orderIndictator
	 						.removeClass('desc')
	 						.addClass('asce');
	 				}
	 				else {
	 					orderIndictator
	 						.removeClass('asce')
	 						.addClass('desc');
	 				}

	 				orderByProperty = orderProperty;
	 				orderDirection = orderIndictator.hasClass('desc') ? 'desc' : 'asce';

	 				orderTable();
	 			})
	// 			.on('click', '.data-cell', function() {
	// 				var cell = $(this);
	// 				var dashboard = cell.data('dashboard');
	// 				var view = cell.data('view');
	// 				var cellKey = cell.data('cellIdentifier');
	// 				var dimension = _.chain(configuration.dimensions)
	// 					.filter(function(dimension) {
	// 						return dimension.id === cellKey;
	// 					})
	// 					.first()
	// 					.value();

	// 				if(!dashboard) {
	// 					return;
	// 				}

	// 				TLRGRP.messageBus.publish('TLRGRP.BADGER.DashboardAndView.Selected', {
	// 					dashboard: dashboard,
	// 					view: view,
	// 					queryParameters: cellKey === 'total' ? false : dimension.filter
	// 				});
	// 			})
				.on('mouseover', '.data-cell', function() {
					var cell = $(this);

					toolTip.removeClass('hidden');

					var cellKey = cell.data('dataRoot');

					if(cellKey && lastData) {

						var dayOrder = {
							'today': 1,
							'yesterday': 2,
							'lastWeek': 3,
							'2weeksago': 4,
							'1monthago': 5,
							'lastmonth': 6
						};

						var niceDayNames = {
							'today': 'Today',
							'yesterday': 'Yesterday',
							'lastWeek': 'Last Week',
							'2weeksago': '2 Weeks Ago',
							'3weeksago': '3 Weeks Ago',
							'1monthago': 'Last Month'
						};

						var dimension = _.chain(configuration.dimensions)
							.filter(function(dimension) { 
								return dimension.id === cell.data('dimension'); 
							})
							.first()
							.value();
						var site = _.chain(configuration.sites)
							.filter(function(dimension) { 
								return dimension.id === cell.data('site'); 
							})
							.first()
							.value();
						var showPercentageString = typeof dimension.showPercentage === 'undefined' || dimension.showPercentage ? '%' : '';
						var precision = typeof dimension.precision === 'undefined' ? 2 : dimension.precision;

						if(dimension && site) {
							var stats = lastData.value.stats[dimension.value][cellKey];
							var thresholdBreach;
							var distanceFromMean;

							if(cell.hasClass('total-cell')) {
								thresholdBreach = typeof cell.data('thresholdBreach') !== 'undefined' ? cell.data('thresholdBreach').toFixed(2) + showPercentageString : '?';
								distanceFromMean = typeof cell.data('differenceFromNorm') !== 'undefined' ? cell.data('differenceFromNorm').toFixed(2) + showPercentageString : '?';
							}
							else {
								thresholdBreach = typeof cell.children().data('thresholdBreach') !== 'undefined' ? cell.children().data('thresholdBreach').toFixed(2) + showPercentageString : '?';
								distanceFromMean = typeof cell.children().data('differenceFromNorm') !== 'undefined' ? cell.children().data('differenceFromNorm').toFixed(2) + showPercentageString : '?';	
							}

							var toolTipModel = {
								days: _.chain(lastData).map(function(data, day) {
									if(day === 'value') {
										return;
									}
									var value = 0;
									var actualValue;

									if(data[cellKey][cell.data('dimensionValue')] === Infinity) {
										value = 'No data';
									}
									else if(data[cellKey] && data[cellKey].commission) {
										value = data[cellKey][cell.data('dimensionValue')].toFixed(precision) + showPercentageString;
									}

									return { 
										day: niceDayNames[day] || day,
										conversion: value,
										index: dayOrder[day] || 999
									};
								}).filter(function(item) {
									return item;
								}).sortBy(function(item) {
									return item.index;
								}).value(),
								average: stats.mean.toFixed(precision) + showPercentageString,
								std: stats.deviation.toFixed(precision),
								distanceFromMean: distanceFromMean,
								thresholdBreach: thresholdBreach,
								thresholds: [
									{ id: 'good', text: 'Good', value: (dimension.kpiDirection === 'down' ? '<= ' : '>= ') +  stats.mean.toFixed(precision) + showPercentageString }, 
									{ id: 'warn', text: 'Warn', value: (dimension.kpiDirection === 'down' ? '<= ' : '>= ') + stats.standardDeviations[1][dimension.kpiDirection === 'down' ? 'plus' : 'minus'].toFixed(precision) + showPercentageString }, 
									{ id: 'alert', text: 'Alert', value: (dimension.kpiDirection === 'down' ? '> ' : '< ') + stats.standardDeviations[1][dimension.kpiDirection === 'down' ? 'plus' : 'minus'].toFixed(precision) + showPercentageString } 
								]
							};

							toolTip.html(Mustache.render(
								'{{#thresholds}}<div class="tooltip-threshold-info {{id}}"><div class="tooltip-threshold-info-indicator"></div><span class="tooltip-threshold-info-title">{{text}}:</span> {{value}}</div>{{/thresholds}}'
								+ '<hr />{{#days}}<div>{{day}}: {{conversion}}</div>{{/days}}<hr/>Mean: {{average}}<br />Dist. from Mean: {{distanceFromMean}}' 
								+ '', toolTipModel));
						}
						else {
							toolTip.html('Error loading tooltip');
						}
					}

					var toolTipWidth = toolTip.width();
					var cellWidth = cell.width();
					var left = cell.offset().left + (cellWidth / 2) - (toolTipWidth / 2);
					var top = cell.offset().top + cell.height() + 10;

					if((top + toolTip.height()) - document.body.scrollTop > $(window).height()) {
						top = cell.offset().top - toolTip.height() - 15;
					}

					toolTip.css({
						top: top,
						left: left
					});
				})
	.on('mouseout', '.data-cell', function() {
		toolTip.addClass('hidden');
	});
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
};
})();
