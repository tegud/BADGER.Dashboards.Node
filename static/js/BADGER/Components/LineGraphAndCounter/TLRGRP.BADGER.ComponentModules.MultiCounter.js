(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    TLRGRP.BADGER.Dashboard.ComponentModules.MultiCounter = function (configuration) {
        var containerElement = $('<div class="v2-graph-counter multi-counter' + (configuration.className ? ' ' + configuration.className : '') + '"></div>');

        _.each(configuration.counters, function(counterConfig) {
            containerElement.append('<div class="multi-counter-item"><div class="multi-counter-item-dot" style="background-color: ' + counterConfig.color + '"></div><div class="multi-counter-item-label">' + counterConfig.text + '</div>' 
                + (counterConfig.value ? '<div class="multi-counter-item-value" id="' + counterConfig.id + '-value">-</div>' : '')
                + '</div>');
        });

        var lastValue;
        var thresholds = configuration.thresholds || [];
        var windowSettings = _.extend({}, {
            take: 10,
            skip: 0
        }, configuration.window);

        return {
            appendTo: function (container) {
                containerElement.append(_.map(thresholds, function (threshold, i) {
                    var audioElement = $('<audio />', {
                        src: threshold.sound,
                        preload: true
                    });

                    thresholds[i].element = audioElement[0];

                    return audioElement;
                }));
                
                container.append(containerElement);
            },
            appendToLocation: function () {
                return 'content';
            },
            setValue: function (data) {
                var relevantValues = data.slice(0).reverse().slice(windowSettings.skip, windowSettings.take + windowSettings.skip);
                
                _.each(configuration.counters, function(counterConfig) {
                    if(!counterConfig.value) {
                        return;
                    }

                    var value = _(relevantValues).reduce(function (total, item) {
                        return total + item.value[counterConfig.value];
                    }, 0);

                    if(configuration.type === 'average') {
                        value = value / relevantValues.length;
                    } 

                    if (configuration.precision === 0) {
                        value = Math.floor(value);
                    }
                    else if(configuration.precision) {
                        value = value.toFixed(configuration.precision);
                    }

                    if(isNaN(value)){
                        value = "?";
                    }
                    
                    if(value > 999999) {
                        value = (value / 1000000).toFixed(1) + 'm';
                    }
                    else if(value > 99999) {
                        value = (value / 1000).toFixed(1) + 'k';
                    }

                    $('#' + counterConfig.id + '-value').text((configuration.prefix || '') + value + (configuration.suffix || ''));

                });
            }
        };
    };
})();

