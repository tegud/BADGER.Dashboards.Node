(function () {
    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    function padHour(hour) {
        if (hour < 10) {
            return '0' + hour;
        }
        return hour;
    }

    function buildHours() {
        var hours = [];

        for (var x = 0; x < 24; x++) {
            var start = padHour(x) + ':00';
            var end = x == 23 ? '23:59' : padHour(x + 1) + ':00';

            hours.push({
                start: start,
                end: end
            });
        }

        return hours;
    }

    TLRGRP.BADGER.Dashboard.ComponentModules.ErrorHourList = function() {
        var hoursList;
        
        return {
            appendTo: function(componentElement) {
                hoursList = $(Mustache.render('<ul class="errors-by-hour-list">{{#hours}}<li data-hour-start="{{start}}"><a href=""><div class="errors-by-hour-link">{{start}} - {{end}}</div><div class="errors-by-hour-counter"></div><div class="errors-by-hour-graph"></div></a></li>{{/hours}}</ul>', {
                    hours: buildHours()
                })).appendTo(componentElement);
            },
            setData: function (hourCounts) {
                $('li', hoursList).each(function () {
                    var li = $(this);
                    var hour = li.data('hourStart');
                    var count = hourCounts[hour];
                    var counterElement = $('.errors-by-hour-counter', li);
                    counterElement.text(count || 0);
                });
            }
        };
    };
})();