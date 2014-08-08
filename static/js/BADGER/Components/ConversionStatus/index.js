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
              "yesterday": { "timeOffset": { "days": -1 } },
              "lastWeek": { "timeOffset": { "weeks": -1 } },
              "lastMonth": { "timeOffset": { "relativeInMonth": -1 } }
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
                                }
                            }
                        }
                    }
               },
               "size":0
            }
          }
        };

        var inlineLoading = new TLRGRP.BADGER.Dashboard.ComponentModules.InlineLoading();
        var dataStore = new TLRGRP.BADGER.Dashboard.DataStores.SyncAjaxDataStore({
            request:  new TLRGRP.BADGER.Dashboard.DataSource['elasticsearch'](dataStoreConfiguration),
            refresh: 25000,
            mappings: [
                {
                    type: 'pickValues',
                    multiQuery: true,
                    values: [
                        { from: 'hits.total', to: 'totalSessions' },
                        { from: 'aggregations.bookings.doc_count', to: 'totalBookings' }
                    ]
                },
                { 
                  "type": "calculation",
                  "calculation": "percentage",
                  "by": { "field": "totalBookings", "over": "totalSessions" },
                  "notFromHistogram": true,
                  "toField": "totalCommission"
                },
                {
                  "type": "stats",
                  "fields": ["yesterday", "lastWeek", "lastMonth"],
                  "stds": [1, 2],
                  "notFromHistogram": true,
                  "property": "totalCommission"
                }
            ],
            callbacks: {
                success: function (data) {
                    _.each(configuration.sites, function(site) {
                        var totalCell = $('#' + configuration.idPrefix + site.id + '-total');
                        var totalCellValue = $('span', totalCell);
                        var newCellClass;

                        totalCellValue.html(data.today.totalCommission.toFixed(2));

                        if(data.today.totalCommission >= data.value.mean) {
                            newCellClass = 'good';
                        }
                        else if(data.today.totalCommission > data.value.standardDeviations[1].minus) {
                            newCellClass = 'warn';
                        }
                        else if(data.today.totalCommission > data.value.standardDeviations[2].minus) {
                            newCellClass = 'good';
                        }

                        totalCell
                            .removeClass('warn alert good')
                            .addClass(newCellClass)
                            .find('.status-cell-indicator')
                                .removeClass('hidden');
                    });
                }
            },
            components: {
                loading: inlineLoading
            }
        });

        var columnsViewModel = _.map(configuration.dimensions, function(dimension) {
            return { name: dimension.name };
        });

        var rowsViewModel = _.map(configuration.sites, function(site) {
            return { 
                name: site.name,
                idPrefix: configuration.idPrefix + site.id 
            };
        });

        var tableViewModel = {
            columns: columnsViewModel,
            rows: rowsViewModel
        };

        var rowColumns = Mustache.render('{{#columns}}<td><div class="status-cell-container"><div class="status-cell-value">-</div><div class="status-cell-indicator hidden"></div><div class="status-cell-percentage">%</div></div></td>{{/columns}}', tableViewModel);

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
                                    + '<th>{{name}}</th><td class="total-cell" id="{{idPrefix}}-total"><span>-</span>%<div class="status-cell-indicator hidden"></div></td>'
                                    + rowColumns
                                    + '</tr>{{/rows}}', tableViewModel)
                            + '</table></div>');
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

