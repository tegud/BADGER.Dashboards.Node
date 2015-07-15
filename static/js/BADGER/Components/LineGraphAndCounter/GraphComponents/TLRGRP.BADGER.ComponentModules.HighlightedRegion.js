(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    function calculateHighlightedRegion(counterWindow, x, data) {
        var endOfHighlightedRegion = moment(data[data.length - (1 + counterWindow.skip)].time).toDate().getTime();
        var startOfHighlightedRegion = moment(data[data.length - (1 + counterWindow.take + counterWindow.skip)].time).toDate().getTime();
        var xStart = x(startOfHighlightedRegion);
        var xEnd = x(endOfHighlightedRegion);

        return {
            xStart: xStart,
            width: xEnd - xStart
        };
    }

    TLRGRP.BADGER.Dashboard.ComponentModules.HighlightedRegion = function(svg, x, configuration) {
        var highlightedRegion;
        var dimensions = configuration.dimensions;
        var counterWindow = configuration.counterWindow || {
            skip: 0,
            take: 10
        };

        var setHighlightedRegion = calculateHighlightedRegion.bind(undefined,  counterWindow, x);

        function append() {
            if(highlightedRegion) {
                return;
            }

            highlightedRegion = svg
                .insert('rect', ':first-child')
                .attr('class', 'insert-before-marker')
                .attr('height', 0);

            highlightedRegion = svg
                .insert('rect', ':first-child')
                .attr('class', 'highlighted-region')
                .attr('height', dimensions.height + dimensions.margin.top + dimensions.margin.bottom);
        }

        return {
            setData: function(data) {
                append();

                var regionDimensions = setHighlightedRegion(data);

                highlightedRegion
                    .attr('x', regionDimensions.xStart)
                    .attr('y', -dimensions.margin.top)
                    .attr('width', regionDimensions.width);
            }
        };
    };
})();
