(function() {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard');

    function setupTimeControlEvents() {
        $('#time-control-button').on('click', function(e) {
            $('#time-controls').toggleClass('hidden');
            e.stopPropagation();
        });

        $('#time-controls')
            .on('click', function(e){
                e.stopPropagation();
            })
            .on('click', '.time-control-options li', function() {
                var timeFrame = $(this).data('timeFrame');
                var timeFrameUnits = $(this).data('timeFrameUnits');
                var timeFrameText = timeFrame + ' ' + timeFrameUnits[0].toUpperCase() + timeFrameUnits.substring(1);

                if(timeFrame === 1 && timeFrameText[timeFrameText.length -1] === 's') {
                    timeFrameText = timeFrameText.substring(0, timeFrameText.length -1);
                }

                $('.time-period', '#time-control-button').text(timeFrameText);

                $(this).addClass('selected').siblings().removeClass('selected');

                $('#time-controls').addClass('hidden');

                TLRGRP.messageBus.publish('TLRGRP.BADGER.TimePeriod.Set', {
                    timeFrame: timeFrame,
                    units: timeFrameUnits,
                    text: timeFrameText
                });
            });

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