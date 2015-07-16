(function() {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard');

    function setupTimeControlEvents() {
        $('#time-control-button').on('click', function(e) {
            $('#time-controls').toggleClass('hidden');
            e.stopPropagation();
        });

        var dayNiceText = ['Today', 'Yesterday'];

        var container = $('#time-controls')
            .on('click', function(e){
                e.stopPropagation();
            })
            .on('click', '.time-control-options li', function() {
                var timeFrame = $(this).data('timeFrame');
                var timeFrameUnits = $(this).data('timeFrameUnits');

                $(this)
                    .addClass('selected')
                    .siblings()
                        .removeClass('selected')
                        .closest('ul')
                            .siblings('ul').find('li').removeClass('selected');

                $('#time-controls').addClass('hidden');

                TLRGRP.messageBus.publish('TLRGRP.BADGER.TimePeriod.Selected', {
                    timeFrame: timeFrame,
                    units: timeFrameUnits,
                    userSet: true
                });

                TLRGRP.messageBus.publish('TLRGRP.BADGER.TimePeriod.Set', {
                    timeFrame: timeFrame,
                    units: timeFrameUnits,
                    userSet: true
                });
            });

        TLRGRP.messageBus.subscribe('TLRGRP.BADGER.TimePeriod.Set', function(data) {
            var timeFrameText = data.timeFrame + ' ' + data.units[0].toUpperCase() + data.units.substring(1);
            var timeFrameEndingText;

            if(data.units === 'daysAgo') {
                var day = moment().add('d', -data.timeFrame);
                timeFrameText = dayNiceText[data.timeFrame] || day.format('dddd');
                timeFrameEndingText = day.format('DD MMM YYYY');
            } else {
                timeFrameEndingText = 'Ending now';
                if (data.timeFrame === 1 && timeFrameText[timeFrameText.length -1] === 's') {
                    timeFrameText = timeFrameText.substring(0, timeFrameText.length -1);
                }
            }

            $('.time-control-options li', container).removeClass('selected');
            $('#time-control-' + data.timeFrame + '-' + data.units).addClass('selected');

            $('.time-period', '#time-control-button').text(timeFrameText);
            $('.time-period-end-point', '#time-control-button').text(timeFrameEndingText);
        });

        var currentDate = moment().add('d', -2);
        var thisWeeksDays = '';

        for(var x = 2; x < 7; x++) {
            thisWeeksDays += '<li id="time-control-' + x + '-daysAgo" data-time-frame="' + x + '" data-time-frame-units="daysAgo">' + currentDate.format('ddd') + '</li>';
            currentDate.add('d', -1);
        }

        $('.time-control-options.days', container).append(thisWeeksDays);

        $('body').on('click', function() {
            $('#time-controls').addClass('hidden');
        });
    }
 
    (function() {
        TLRGRP.BADGER.Dashboard.Dashboard = function(options) {
            var name = options.name || options.id;
            var views = {};
            var isFirst = true;

            _(options.views).forEach(function(view) {
                view.isDefault = isFirst;
                if(isFirst) {
                    isFirst = false;
                }

                views[view.id] = view;
            });

            return {
                id: options.id,
                name: name,
                views: views
            };
        };

        var dashboards = {};

        setupTimeControlEvents();

        var menu = new TLRGRP.BADGER.Dashboard.Menu();

        TLRGRP.BADGER.Dashboard.clear = function () {
            dashboards = {};
        };

        TLRGRP.BADGER.Dashboard.register = function(dashboard) {
            dashboards[dashboard.id] = new TLRGRP.BADGER.Dashboard.Dashboard(dashboard);
        };

        TLRGRP.BADGER.Dashboard.getAll = function() {
            return _(dashboards).map(function(item) {
                return item;
            });
        };

        TLRGRP.BADGER.Dashboard.getById = function(id) {
            return _.extend({}, dashboards[id]);
        };
    })();
})();