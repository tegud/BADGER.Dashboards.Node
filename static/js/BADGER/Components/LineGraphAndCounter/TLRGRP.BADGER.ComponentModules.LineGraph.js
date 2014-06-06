(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    var defaultOptions = {
        dimensions: {
            margin: {
                left: 40,
                right: 20,
                bottom: 22,
                top: 10
            }
        }
    };

    TLRGRP.BADGER.Dashboard.ComponentModules.LineGraph = function (options) {
        var currentOptions = $.extend(true, {}, defaultOptions, options);
        var element = $('<div class="v2-graph-container' + (currentOptions.className ? ' ' + currentOptions.className : '') + '"></div>');
        var graphReady = jQuery.Deferred();
        var svg;
        var x;
        var y;
        var xAxis;
        var yAxis;
        var xAxisElement;
        var line = d3.svg.line()
            .x(function(d) {
                return x(d.time);
            })
            .y(function(d) {
                return y(d.value);
            });
        var counterWindow = _.extend({}, {
            take: 10,
            skip: 0
        }, currentOptions.counterWindow);

        function calculateDimensionsFromElement() {
            var dimensions = currentOptions.dimensions;
            
            if (!dimensions.width) {
                dimensions.width = element.innerWidth() - (dimensions.margin.left + dimensions.margin.right);
            }

            if (!dimensions.height) {
                dimensions.height = element.innerHeight() - (dimensions.margin.top + dimensions.margin.bottom);
            }
        }

        function appendCanvas() {
            var dimensions = currentOptions.dimensions;
            
            svg = d3.select(element[0]).append("svg")
                        .attr("width", dimensions.width + dimensions.margin.left + dimensions.margin.right)
                        .attr("height", dimensions.height + dimensions.margin.top + dimensions.margin.bottom)
                        .append("g")
                        .attr("transform", "translate(" + dimensions.margin.left + "," + dimensions.margin.top + ")");
        }

        function appendAxis() {
            var dimensions = currentOptions.dimensions;
            
            x = d3.time.scale().range([0, dimensions.width]);
            y = d3.scale.linear().range([dimensions.height, 0]);
            xAxis = d3.svg.axis().scale(x).orient("bottom");
            yAxis = d3.svg.axis().scale(y).orient("left");

            xAxisElement = svg.append("g")
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
        }

        return {
            appendTo: function (container) {
                element.appendTo(container);

                setTimeout(function () {
                    if (!currentOptions.dimensions.width || !currentOptions.dimensions.height) {
                        calculateDimensionsFromElement();
                    }
                    
                    appendCanvas();
                    appendAxis();
                    graphReady.resolve();
                }, 0);
            },
            appendToLocation: function () {
                return 'content';
            },
            setData: function (data) {
                if(currentOptions.window) {
                    data = data.reverse().slice(currentOptions.window.skip, currentOptions.window.take + currentOptions.window.skip).reverse();
                }

                $.when(graphReady).then(function() {
                    for (var m = 0; m < data.length; m++) {
                        data[m].time = new Date(data[m].time);
                    }

                    var dsXExtent = d3.extent(data, function (d) { return d.time; });
                    var dsYExtent = d3.extent(data, function (d) { return d.value; });

                    x.domain(dsXExtent);
                    y.domain(dsYExtent);

                    svg.select(".x.axis").call(xAxis);
                    svg.select(".y.axis").call(yAxis);

                    var elementId = 'error-line',
                        lineElement = svg.select("#" + elementId),
                        highlightedRegion = svg.select('#highlight-region'),
                        endOfHighlightedRegion = moment(data[data.length - 1].time).subtract('minutes', counterWindow.skip).toDate().getTime(),
                        startOfHighlightedRegion = moment(data[data.length - 1].time).subtract('minutes', counterWindow.take + counterWindow.skip).toDate().getTime();

                    if (lineElement[0][0]) {
                        lineElement
                           .datum(data)
                           .attr("d", line);
                        
                        if (highlightedRegion[0][0]) {
                            highlightedRegion
                                .attr('x', x(startOfHighlightedRegion))
                                .attr('y', -currentOptions.dimensions.margin.top)
                                .attr('width', x(endOfHighlightedRegion) - x(startOfHighlightedRegion));
                        }
                    }
                    else {
                        svg.append("path")
                            .datum(data)
                            .attr('id', 'error-line')
                            .attr("class", "line")
                            .attr("style", "stroke: " + (currentOptions.lineColor || 'red') + ";")
                            .attr("d", line);

                        var highlightRegion = svg
                            .append("rect")
                            .attr('id', 'highlight-region')
                            .attr('x', x(startOfHighlightedRegion))
                            .attr('y', -currentOptions.dimensions.margin.top)
                            .attr('width', x(endOfHighlightedRegion) - x(startOfHighlightedRegion))
                            .attr('height', currentOptions.dimensions.height + currentOptions.dimensions.margin.bottom + currentOptions.dimensions.margin.top)
                            .attr('class', 'highlighted-region');
                        
                        svg[0][0].insertBefore(highlightRegion[0][0], svg[0][0].firstChild);
                    }
                });
            }
        };
    };
})();

