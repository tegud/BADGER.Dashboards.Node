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

    TLRGRP.BADGER.Dashboard.ComponentModules.Counter = function (configuration) {
        var containerElement = $('<div class="v2-graph-counter' + (configuration.className ? ' ' + configuration.className : '') + '">' + configuration.title + '</div>');
        var indicatorElement = $('<div class="v2-graph-counter-indicator hidden"></div>').appendTo(containerElement);
        var counterValueElement = $('<strong class="v2-graph-counter-value">-</strong>').appendTo(containerElement);
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
                var value = _(relevantValues).reduce(function (total, item) {
                        var value = item;

                        if(configuration.value && configuration.value.indexOf('.') < 0) {
                            value = value.value;
                        }
                        else if(configuration.value) {
                            value = getValueFromSubProperty(value, configuration.value);
                        }

                        return total + value;
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

                counterValueElement.text((configuration.prefix || '') + value + (configuration.suffix || ''));

                if (lastValue && lastValue !== value) {
                    indicatorElement.removeClass('hidden');
                    
                    if (value > lastValue) {
                        indicatorElement
                            .addClass(configuration.upClass || '')
                            .removeClass(configuration.downClass || '')
                            .removeClass('down');
                    } else {
                        indicatorElement
                            .removeClass(configuration.upClass || '')
                            .addClass(configuration.downClass || '')
                            .addClass('down');
                    }
                }

                lastValue = value;
            }
        };
    };
})();

