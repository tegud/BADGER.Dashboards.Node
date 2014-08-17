(function () {
	'use strict';

	TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Components');

	var idIncrementor = 0;

	TLRGRP.BADGER.Dashboard.Components.ConversionStatus = function (configuration) {
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
				"modifiers": {
					"today": { },
					"yesterday": { "timeOffset": { "days": -1 }, "limitToCurrentTime": true },
					"lastWeek": { "timeOffset": { "weeks": -1 }, "limitToCurrentTime": true },
					"2weeksago": { "timeOffset": { "weeks": -2 }, "limitToCurrentTime": true }
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
										"term":{
											"type":"session"
										}
									},
									{
										"term": {
											"user.type": "human"
										}
									}
									]
								}
							}
						}
					},
					"aggs":{
						"useragents": {
							"terms": {
								"field": "user.userAgent.name.raw"
							},
							"aggs": {
								"mobilesafari": {
									"terms": {
										"field": "user.userAgent.device.raw"
									}
								}
							}
						},
						"bookings": {
							"filter": {
								"term": {
									"booked": true
								}
							},
							"aggs": {
								"useragents": {
									"terms": {
										"field": "user.userAgent.name.raw"
									},
									"aggs": {
										"mobilesafari": {
											"terms": {
												"field": "user.userAgent.device.raw"
											}
										}
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
			{ from: 'hits.total', to: 'total.sessions' },
			{ from: 'aggregations.bookings.doc_count', to: 'total.bookings' }
		];

		_.each(configuration.dimensions, function(dimension) {
			_.each(dimension.values, function(value, key) {
				pickValues.push({
					from: value,
					to: dimension.id + '.' + key
				});
			});
		});

		var mappings = [
		{
			type: 'pickValues',
			multiQuery: true,
			values: pickValues
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
			"fields": ["yesterday", "lastWeek", "2weeksago"],
			"stds": [1, 2],
			"notFromHistogram": true,
			"property": "total.commission"
		}
		];

		_.each(configuration.dimensions, function(dimension) {
			mappings.push({
				"type": "calculation",
				"calculation": "percentage",
				"by": { "field": dimension.id + ".bookings", "over": dimension.id + ".sessions" },
				"notFromHistogram": true,
				"toField": dimension.id + ".commission"
			});
			mappings.push({
				"type": "stats",
				"fields": ["yesterday", "lastWeek", "2weeksago"],
				"stds": [1, 2],
				"notFromHistogram": true,
				"toField": 'value.' + dimension.id,
				"property": dimension.id + ".commission"
			});
		});

		var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading();
		var dataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
			request:	new TLRGRP.BADGER.Dashboard.DataSource['elasticsearch'](dataStoreConfiguration),
			refresh: 25000,
			mappings: mappings,
			callbacks: {
				success: function (data) {
					lastData = data;

					_.each(configuration.sites, function(site) {
						var totalCell = $('#' + (configuration.idPrefix || '') + site.id + '-total');
						var totalCellValue = $('span', totalCell);
						var newCellClass;

						totalCellValue.html(data.today.total.commission.toFixed(2));

						if(data.today.total.commission >= data.value.mean) {
							newCellClass = 'good';
						}
						else if(data.today.total.commission >= data.value.standardDeviations[1].minus) {
							newCellClass = 'warn';
						}
						else if(data.today.total.commission < data.value.standardDeviations[1].minus) {
							newCellClass = 'alert';
						}

						totalCell
						.removeClass('warn alert good')
						.addClass(newCellClass);

						if(newCellClass) {
							$('.status-cell-indicator', totalCell).removeClass('hidden');
						}
						else {
							$('.status-cell-indicator', totalCell).addClass('hidden');
						}

						_.each(configuration.dimensions, function(dimension) {
							if(dimension.id) {
								var cell = $('#' + (configuration.idPrefix || '') + site.id + '-' + dimension.id);
								var valueCell = $('.status-cell-value', cell);
								var indicatorCell = $('.status-cell-indicator', cell);
								var newCellClass = '';

								valueCell.text(data.today[dimension.id].commission.toFixed(2));

								if(data.today[dimension.id]) {
									if(data.today[dimension.id].commission >= data.value[dimension.id].mean) {
										newCellClass = 'good';
									}
									else if(data.today[dimension.id].commission >= data.value[dimension.id].standardDeviations[1].minus) {
										newCellClass = 'warn';
									}
									else if(data.today[dimension.id].commission < data.value[dimension.id].standardDeviations[1].minus) {
										newCellClass = 'alert';
									}
								}

								cell.parent()
									.removeClass('warn alert good')
									.addClass(newCellClass);

								if(newCellClass) {
									indicatorCell.removeClass('hidden');
								}
								else {
									indicatorCell.addClass('hidden');
								}
							}
						});
});
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
		linkToDashboard: dimension.linkToDashboard,
		linkParameters: dimension.linkParameters
	};
});

var rowsViewModel = _.map(configuration.sites, function(site) {
	var idPrefix = (configuration.idPrefix || '') + site.id;
	var columns = _.map(columnsViewModel, function(column) {
		if(typeof column.linkToDashboard === 'undefined' || column.linkToDashboard) {
			column.dashboardLink = column.linkToDashboard || site.linkToDashboard 
			+ (column.linkParameters ? '?' : '')
			+ _.map(column.linkParameters, function(value, name) {
				return name + '=' + value;
			}).join('&');
		}
		else {
			column.dashboardLink = false;
		}

		column.cellId = idPrefix + '-' + column.id;

		return column;
	});

	return {
		name: site.name,
		idPrefix: idPrefix,
		link: site.linkToDashboard,
		columns: Mustache.render('{{#columns}}<td class="data-cell" data-dashboard-link="{{dashboardLink}}" data-cell-identifier="{{id}}"><div id="{{cellId}}" class="status-cell-container"><div class="status-cell-value">-</div><div class="status-cell-indicator hidden"></div><div class="status-cell-percentage">%</div></div></td>{{/columns}}', { columns: columns })
	};
});

var tableViewModel = {
	columns: columnsViewModel,
	rows: rowsViewModel
};

var componentLayout = new TLRGRP.BADGER.Dashboard.ComponentModules.ComponentLayout({
	title: configuration.title,
	layout: configuration.layout,
	componentClass: 'conversion-status',
	modules: [
	inlineLoading,
	{
		appendTo: function (container) {
			container.append(
				'<div><table class="status-table">'
				+ '<tr class="status-header-row">'
				+ '<th>&nbsp;</th><th class="total-cell">Total</th>'
				+ Mustache.render('{{#columns}}<th>{{name}}</th>{{/columns}}', tableViewModel)
				+ '</tr>'
				+ Mustache.render('{{#rows}}<tr class="status-row">'
					+ '<th>{{name}}</th><td class="total-cell data-cell" data-dashboard-link="{{link}}" id="{{idPrefix}}-total" data-cell-identifier="total"><span>-</span>%<div class="status-cell-indicator hidden"></div></td>'
					+ '{{{columns}}}'
					+ '</tr>{{/rows}}', tableViewModel)
				+ '</table></div>');

			toolTip = $('#graph-tooltip');

			if(!toolTip.length) {
				toolTip = $('<div id="graph-tooltip" class="hidden"></div>').appendTo('body');
			}

			container
				.on('click', '.data-cell', function() {
					var link = $(this).data('dashboardLink');

					if(link && link != "false") {
						var urlSegments = window.location.pathname.split('/');

						if(urlSegments.length > 3) {
							var splitLink = link.split('?');

							link = splitLink[0] + '/' + urlSegments[3];

							if(splitLink.length > 1) {
								link += '?' + splitLink[1];
							}
						}

						window.location.href = link;
					}
				})
				.on('mouseover', '.data-cell', function() {
					var cell = $(this);

					toolTip.removeClass('hidden');

					var toolTipWidth = toolTip.width();
					var cellWidth = cell.width();
					var left = cell.offset().left + (cellWidth / 2) - (toolTipWidth / 2);

					toolTip.css({
						top: cell.offset().top + cell.height() + 10,
						left: left
					});

					var cellKey = cell.data('cellIdentifier');

					if(cellKey && lastData) {
						var rootStatsObject = lastData.value;

						if(cellKey !== 'total') {
							rootStatsObject = rootStatsObject[cellKey];
						}

						var dayOrder = {
							'yesterday': 1,
							'lastWeek': 2,
							'2weeksago': 3,
							'lastmonth': 4
						};

						var niceDayNames = {
							'yesterday': 'Yesterday',
							'lastWeek': 'Last Week',
							'2weeksago': '2 Weeks Ago',
							'lastmonth': 'Last Month'
						};

						var toolTipModel = {
							days: _.chain(lastData).map(function(data, day) {
								if(day === 'today' || day === 'value') {
									return;
								}
								var conversion = 0;

								if(data[cellKey] && data[cellKey].commission) {
									conversion = data[cellKey].commission.toFixed(2) + '%';
								}

								return { 
									day: niceDayNames[day] || day,
									conversion: conversion,
									index: dayOrder[day] || 999
								};
							}).filter(function(item) {
								return item;
							}).sortBy(function(item) {
								return item.index;
							}).value(),
							average: rootStatsObject.mean.toFixed(2),
							std: rootStatsObject.deviation.toFixed(2),
							thresholds: [
								{ id: 'good', text: 'Good', value: '>= ' + rootStatsObject.mean.toFixed(2) + '%' }, 
								{ id: 'warn', text: 'Warn', value: '>= ' + rootStatsObject.standardDeviations[1].minus.toFixed(2) + '%' }, 
								{ id: 'alert', text: 'Alert', value: '< ' + rootStatsObject.standardDeviations[1].minus.toFixed(2) + '%' } 
							]
						};

						toolTip.html(Mustache.render(
							'{{#thresholds}}<div class="tooltip-threshold-info {{id}}"><div class="tooltip-threshold-info-indicator"></div><span class="tooltip-threshold-info-title">{{text}}:</span> {{value}}</div>{{/thresholds}}'
							+ '<hr />{{#days}}<div>{{day}}: {{conversion}}</div>{{/days}}' 
							+ '', toolTipModel));
					}
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
