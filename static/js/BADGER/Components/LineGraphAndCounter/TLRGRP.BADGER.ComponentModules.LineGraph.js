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
        var hoverLine;
        var toolTip;
        var toolTipBottom;
        var toolTipLeftOffset;
        var lastDataSet;
        var toolTipIsOnGraph;
        var lines = currentOptions.lines || [
            { id: 'error-line', color: currentOptions.lineColor || 'red' }
        ];
        var counterWindow = _.extend({}, {
            take: 10,
            skip: 0
        }, currentOptions.counterWindow);

        function showHoverLine(mousePos) {
            toolTipIsOnGraph = true;
            hoverLine.classed('hidden', false);

            hoverLine
                .attr('x1', mousePos[0])
                .attr('x2', mousePos[0]);

            toolTip
                .appendTo(element.parent())
                .css({
                    left: toolTipLeftOffset + mousePos[0] + currentOptions.dimensions.margin.left - (toolTip.width() / 2),
                    bottom: toolTipBottom
                })
                .removeClass('hidden');

            var firstEntryMoment = moment(lastDataSet[0].time);
            var lastEntryMoment = moment(lastDataSet[lastDataSet.length - 1].time);
            var firstEntry = lastDataSet[0].time.getTime();
            var lastEntry = lastDataSet[lastDataSet.length - 1].time.getTime();
            var hoverDateTime = x.invert(mousePos[0]);
            var hoverTime = hoverDateTime.getTime() - firstEntry;
            var step = (lastEntry - firstEntry) / parseFloat(lastDataSet.length);
            var stepDuration = moment.duration(step, 'ms');
            var index = (hoverTime / parseFloat(step)).toFixed(0);
            var toolTipValue = lastDataSet[index].value;
            var hoverMoment = moment(hoverDateTime); 
            var dateText = hoverMoment.format('DD/MM/YYYY');
            var timeFormatString = stepDuration.seconds > 60  ? 'HH:mm' : 'HH:mm:ss';
            var timeRangeText = hoverMoment.format(timeFormatString) + '-' + hoverMoment.add('ms', step).format(timeFormatString);
            var hideDate = firstEntryMoment.format('DDMMYYYY') == lastEntryMoment.format('DDMMYYYY');

            var toolTipText = '<div style="font-weight: bold;">(' + index + ')' + (hideDate ? '': dateText+ '<br/>') + timeRangeText + '<br />(' + stepDuration.humanize() + ')' + '</div>';

            _.each(lines, function(line) {
                var valueText = toolTipValue;

                if(line.value) {
                    valueText = valueText[line.value];
                }

                if(isNaN(valueText)) {
                    valueText = 0;
                }
                else {
                    valueText = valueText.toFixed(2);
                }

                toolTipText += '<div class="tooltip-item"><div class="tooltip-item-key" style="background-color: ' + line.color + '"></div><div class="toolip-item-text">' + valueText + '</div></div>';
            });

            toolTip.html(toolTipText);
        }

        function hideHoverLine() {
            toolTipIsOnGraph = false;

            var hoverLine = svg.select('.hover-line').classed('hidden', true);
            toolTip.addClass('hidden');
        }

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

                    var highlightRegion = svg
                        .append("rect")
                        .attr('style', 'fill: transparent; z-index:-1')
                        .attr('x', 0)
                        .attr('y', 0)
                        .attr('width', currentOptions.dimensions.width)
                        .attr('height', currentOptions.dimensions.height);

                    hoverLine = svg.append("line")
                        .attr("class", "hover-line hidden")
                        .attr("style", "stroke: black;")
                        .attr('x1', 10)
                        .attr('x2', 10)
                        .attr('y1', -currentOptions.dimensions.margin.top)
                        .attr('y2', currentOptions.dimensions.height);

                    toolTip = $('#graph-tooltip');

                    if(!toolTip.length) {
                        toolTip = $('<div id="graph-tooltip" class="hidden"></div>').appendTo('body');
                    }
                    toolTipBottom = element.height();
                    toolTipLeftOffset = element.position().left;

                    svg.on('mousemove', function(event) {
                        var hoverLine = svg.select('.hover-line');
                        var mousePos = d3.mouse(this);

                        if(mousePos[0] > 0 && mousePos[0] < currentOptions.dimensions.width && mousePos[1] < currentOptions.dimensions.height) {
                            showHoverLine(mousePos);
                        }
                        else {
                            hideHoverLine();
                        }
                    });

                    svg.on('mouseout', function(event) {
                        hideHoverLine();
                    });

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

                lastDataSet = data;

                $.when(graphReady).then(function() {
                    for (var m = 0; m < data.length; m++) {
                        data[m].time = new Date(data[m].time);
                    }

                    var dsXExtent = d3.extent(data, function (d) { return d.time; });
                    var dsYExtent;

                    if(lines.length > 1 || lines[0].value) {
                        var totalExtent;
                        var allExtents = _.each(lines, function(currentLine) {
                            var currentExtent = d3.extent(data, function (d) { return isNaN(d.value[currentLine.value]) ? 0 : d.value[currentLine.value]; });

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
                        dsYExtent = d3.extent(data, function (d) {
                                var value = d.value;

                                if(isNaN(value)) {
                                    value = 0;
                                }

                                return value; 
                            });
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

                                if(isNaN(value)) {
                                    value = 0;
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

