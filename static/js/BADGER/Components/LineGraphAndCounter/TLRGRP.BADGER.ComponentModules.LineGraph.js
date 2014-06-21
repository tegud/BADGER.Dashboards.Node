(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    var defaultOptions = {
        dimensions: {
            margin: {
                left: 60,
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

                var lines = currentOptions.lines || [
                    { id: 'error-line', color: currentOptions.lineColor || 'red' }
                ];

                $.when(graphReady).then(function() {
                    for (var m = 0; m < data.length; m++) {
                        data[m].time = new Date(data[m].time);
                    }

                    var dsXExtent = d3.extent(data, function (d) { return d.time; });
                    var dsYExtent;

                    if(lines.length > 1 || lines[0].value) {
                        var totalExtent;
                        var allExtents = _.each(lines, function(currentLine) {
                            var currentExtent = d3.extent(data, function (d) { return d.value[currentLine.value]; });

                            if(!totalExtent) {
                                totalExtent = currentExtent;
                            }
                            else {
                                if(currentExtent[0] < totalExtent[0]) {
                                    totalExtent[0] = currentExtent[0];
                                }

                                if(currentExtent[1] > totalExtent[1]) {
                                    totalExtent[1] = currentExtent[1];
                                }
                            }
                        });

                        dsYExtent = totalExtent;
                    }
                    else {
                        dsYExtent = d3.extent(data, function (d) { return d.value; });
                    }


                    x.domain(dsXExtent);
                    y.domain(dsYExtent);

                    svg.select(".x.axis").call(xAxis);
                    svg.select(".y.axis").call(yAxis);

                    _.each(lines, function(currentLine) {
                        var elementId = currentLine.id;
                        var lineElement = svg.select("#" + elementId);
                        var lineData = data;
                        var line = d3.svg.line()
                            .x(function(d) {
                                return x(d.time);
                            })
                            .y(function(d) {
                                var value = d.value;

                                if(currentLine.value) {
                                    value = value[currentLine.value];
                                }

                                return y(value);
                            });

                        if (lineElement[0][0]) {
                            lineElement
                               .datum(lineData)
                               .attr("d", line);
                        }
                        else {
                            svg.append("path")
                                .datum(lineData)
                                .attr('id', elementId)
                                .attr("class", "line")
                                .attr("style", "stroke: " + currentLine.color + ";")
                                .attr("d", line);
                        }
                    });

                    var highlightedRegion = svg.select('#highlight-region');
                    var endOfHighlightedRegion = moment(data[data.length - (1 + counterWindow.skip)].time).toDate().getTime();//moment(data[data.length - 1].time).subtract('minutes', counterWindow.skip).toDate().getTime();
                    var startOfHighlightedRegion = moment(data[data.length - (1 + counterWindow.take + counterWindow.skip)].time).toDate().getTime();//moment(data[data.length - 1].time).subtract('minutes', counterWindow.take + counterWindow.skip).toDate().getTime();
                        
                    if (highlightedRegion[0][0]) {
                        highlightedRegion
                            .attr('x', x(startOfHighlightedRegion))
                            .attr('y', -currentOptions.dimensions.margin.top)
                            .attr('width', x(endOfHighlightedRegion) - x(startOfHighlightedRegion));
                    }
                    else {
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

