(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    TLRGRP.BADGER.Dashboard.ComponentModules.GraphAxis = function(svg, x, y) {
        var xAxis;
        var yAxis;

        return {
            append: function appendAxis(currentOptions) {
                var dimensions = currentOptions.dimensions;

                xAxis = d3.svg.axis().scale(x).orient("bottom");
                yAxis = d3.svg.axis().scale(y).orient("left");

                svg.append("g")
                   .attr("class", "x axis")
                   .attr("transform", "translate(0," + dimensions.height + ")")
                   .call(xAxis);

                svg.append("g")
                   .attr("class", "y axis")
                   .call(yAxis)
                   .append("text")
                   .attr("transform", "rotate(-90)")
                   .attr("y", 6)
                   .attr("dy", ".71em")
                   .style("text-anchor", "end")
                   .text('');
            },
            call: function() {
                svg.select(".x.axis").call(xAxis);
                svg.select(".y.axis").call(yAxis);
            }
        };
    };
})();
