(function () {
    'use strict';

    function getValueFromSubProperty(value, property) {
        var valuePropertySegments = property.split('.');
        var segmentEscaper = /\|/ig;

        _.each(valuePropertySegments, function(segment) {
            value = value[segment.replace(segmentEscaper, ".")];
        });

        return value;
    }

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    TLRGRP.BADGER.Dashboard.ComponentModules.CounterV2 = function (configuration) {
        var containerElement = $('<div class="v3-graph-counter' 
            + (configuration.expandedView ? ' expanded-view' : '')
            + (configuration.className ? ' ' + configuration.className : '') + '"></div>');
        var listElement = $('<ul class="v3-graph-counter-list"></ul>');
        var windowSettings = _.extend({}, {
            take: 10,
            skip: 0
        }, configuration.window);

        var showAlert = true;
        var values;

        return {
            appendTo: function (container) {
                values = _.reduce(configuration.values, function(allValues, value, x) {
                    var alertIndicator = '<div class="v3-graph-counter-alert-indicator">'
                        + '<span class="state-indicator unknown-state fa fa-question"></span>'
                        + '<span class="hidden state-indicator ok-state fa fa-check"></span>'
                        + '<span class="hidden state-indicator warning-state fa fa-exclamation-triangle"></span>'
                        + '<span class="hidden state-indicator critical-state fa fa-bomb"></span>'
                    + '</div>';

                    allValues[value.id] =  $('<li' + (x === configuration.values.length-1 ? ' class="last-item"' : '') + '>'
                         + '<div class="v3-graph-counter-legend" style="background-color: ' + value.color + '"></div>'
                         + (showAlert ? alertIndicator : '')
                         + '<div class="v3-graph-counter-label">' + value.text + '</div>'
                         + '<div class="v3-graph-counter-value-holder">' + (value.link ? '<a href="' + value.link.link + '" class="dashboard-link"' + (value.link.newTab ? ' target="_blank"' : '') + '><span class="fa fa-external-link"></span></a>' : '') + '<span class="v3-graph-counter-value">--</span></div>'
                     + '</li>');

                    return allValues;
                }, {});

                listElement.append(_.map(values, function(item) {
                    return item; 
                })).appendTo(containerElement);

                container.append(containerElement);
            },
            appendToLocation: function () {
                return 'content';
            },
            setValue: function(data) {
                var startTotals = _.reduce(values, function(allTotals, value, key) {
                    allTotals[key] = 0;

                    return allTotals;
                }, {});

                var startAlerts = _.reduce(values, function(allAlerts, value, key) {
                    allAlerts[key] = 'unknown-state';

                    return allAlerts;
                }, {});

                var relevantValues = data.slice(0).reverse().slice(windowSettings.skip, windowSettings.take + windowSettings.skip);

                var totals = _.reduce(configuration.values, function(totals, item) {
                    var total = _.reduce(relevantValues, function (total, itemValues) {
                        total += parseInt(getValueFromSubProperty(itemValues, item.value) || 0, 10);

                        return total;
                    }, 0);
                    totals[item.id] = (configuration.prefix ? configuration.prefix : '') + total;

                    return totals;
                }, startTotals);

                var alerts = _.reduce(configuration.values, function(alerts, item) {
                    if(item.thresholds) {
                        alerts[item.id] = 'ok-state';

                        if(totals[item.id] >= item.thresholds.critical) {
                            alerts[item.id] = 'critical-state';
                        }
                        else if (totals[item.id] >= item.thresholds.warning) {
                            alerts[item.id] = 'warning-state';
                        }
                    }

                    return alerts;
                }, startAlerts);

                _.each(values, function(currentElement, key) {
                    $('.v3-graph-counter-value', currentElement).text(totals[key]);
                    var stateIndicators = $('.v3-graph-counter-alert-indicator .state-indicator', currentElement)
                        .addClass('hidden')
                        .filter('.' + alerts[key])
                            .removeClass('hidden');
                });
            }
        };
    };
})();

