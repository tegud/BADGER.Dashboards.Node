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

    TLRGRP.BADGER.Dashboard.ComponentModules.BarGraph = function (options) {
        var currentOptions = $.extend(true, {}, defaultOptions, options);
        var element = $('<div class="v2-graph-container' + (currentOptions.className ? ' ' + currentOptions.className : '') + '"></div>');
        var graphReady = jQuery.Deferred();
        var axis;
        var graph;
        var lastDataSet;
        var toolTipIsOnGraph;

        var stack = d3.layout.stack();
        var lines = currentOptions.lines || [
            { id: 'error-line', color: currentOptions.lineColor || 'red' }
        ];

        var counterWindow = _.extend({}, {
            take: 10,
            skip: 0
        }, currentOptions.counterWindow);

        var toolTipContentFactory = (function ToolTipContentFactory() {
            var hideDate;
            var step;
            var stepDuration;
            var firstEntry;
            var lastMousePos;
            var index;

            return {
                setData: function(lastDataSet) {
                    var firstEntryMoment = moment(lastDataSet[0].time);
                    var lastEntryMoment = moment(lastDataSet[lastDataSet.length - 1].time);
                    var offset = moment(lastDataSet[1].time).diff(firstEntryMoment, 'millseconds');
                    lastEntryMoment = lastEntryMoment.add('ms', offset);
                    firstEntry = firstEntryMoment.valueOf();
                    var lastEntry = lastEntryMoment.valueOf();
                    step = (lastEntry - firstEntry) / parseFloat(lastDataSet.length);
                    stepDuration = moment.duration(step, 'ms');
                    hideDate = firstEntryMoment.format('DDMMYYYY') == lastEntryMoment.format('DDMMYYYY');
                },
                setCurrentIndex: function(mousePos) {
                    var hoverDateTime = graph.axisFunctions().x.invert(mousePos[0]);
                    var hoverTime = moment(hoverDateTime).valueOf() - firstEntry;
                    var oldIndex = index;

                    index = Math.round(hoverTime / parseFloat(step));

                    return oldIndex !== index;
                },
                setLineCircles: function() {
                    if(!lastDataSet[index] || !toolTipIsOnGraph) {
                        return;
                    }

                    _.each(lines, function(line) {
                        if(!line.circle) {
                            return;
                        }

                        var lineValue = 0;

                        var values = lastDataSet[index].values;

                        var relaventValue = _.chain(values).filter(function(item) {
                            return line.id === item.name;
                        }).first().value();

                        if(relaventValue && relaventValue.value) {
                            lineValue = relaventValue.y1;
                        }

                        line.circle
                            .attr('cx', graph.axisFunctions().x(lastDataSet[index].time))
                            .attr('cy', graph.axisFunctions().y(lineValue || 0) );

                        if(lineValue) {
                            line.circle.classed('has-value', true);
                            line.circle.classed('hidden', false);
                        }
                        else {
                            line.circle.classed('has-value', false);
                            line.circle.classed('hidden', true);
                        }
                    });
                }
            };
        })();

        function showHoverLine(mousePos) {
            toolTipIsOnGraph = true;

            _.each(lines, function(line) {
                line.circle.classed('hidden', !line.circle.classed('has-value'));
            });

            var updateRequired = toolTipContentFactory.setCurrentIndex(mousePos);

            if(updateRequired) {
                toolTipContentFactory.setLineCircles();
            }
        }

        function hideHoverLine() {
            toolTipIsOnGraph = false;

            _.each(lines, function(line) {
                line.circle.classed('hidden', true);
            });
        }

        return {
            appendTo: function (container) {
                element.appendTo(container);

                setTimeout(function () {
                    if(!currentOptions.extentProperties) {
                        currentOptions.extentProperties = {
                            "y": currentOptions.lines.length === 1 ? currentOptions.lines[0].value : _.map(currentOptions.lines, function(line) {
                                return line.value;
                            })
                        }
                    }

                    graph = new TLRGRP.BADGER.Dashboard.ComponentModules.GraphCanvas(element, currentOptions);
                    
                    _.each(lines, function(line) {
                        line.circle = graph.insert("circle", ".insert-before-marker")
                            .attr('class', 'hidden hover-circle-' + line.id)
                            .attr("cx", 30)
                            .attr("cy", 30)
                            .attr("r", 3)
                            .attr("style", "fill: " + line.color + ";stroke: " + line.color + ";stroke-width: 2px");
                    });
                        
                    graph.on('mousemove', function(event) {
                        var mousePos = d3.mouse(this);

                        if(mousePos[0] > 0 && mousePos[0] < currentOptions.dimensions.width && mousePos[1] < currentOptions.dimensions.height && lastDataSet) {
                            showHoverLine(mousePos);
                        }
                        else {
                            hideHoverLine();
                        }
                    });

                    graph.on('mouseout', function(event) {
                        hideHoverLine();
                    });

                    graphReady.resolve();
                }, 0);
            },
            appendToLocation: function () {
                return 'content';
            },
            setData: function (data, showData) {
                if(currentOptions.window) {
                    data = data.reverse().slice(currentOptions.window.skip, currentOptions.window.take + currentOptions.window.skip).reverse();
                }

                var specificData = _.map(data, function(item) {
                    var y0 = 0;
                    var values = _.chain(lines).filter(function(currentLine) {
                        return _.contains(showData , currentLine.id);
                    }).map(function(currentLine) {
                        var valueForLine = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(item, currentLine.value) || 0;

                        return {
                            name: currentLine.id,
                            color: currentLine.color,
                            value: valueForLine,
                            y0: y0,
                            y1: y0 += valueForLine
                        };
                    }).value();

                    item.values = values;
                    item.total = values[values.length - 1].y1;

                    return item;
                });

                lastDataSet = specificData;
                toolTipContentFactory.setData(specificData);

                $.when(graphReady).then(function() {
                    for (var m = 0; m < data.length; m++) {
                        data[m].time = new Date(data[m].time);
                    }

                    var maxValue = _.max(specificData, function(item) {
                        return item.total;
                    }).total;

                    graph.setExtents(_.pluck(specificData, 'time'), [0, maxValue]);

                    var barWidth;
                    var barOffset = 0;
                    if(specificData.length > 2) {
                        var firstLocation = graph.axisFunctions().x(specificData[0].time);
                        var secondLocation = graph.axisFunctions().x(specificData[1].time);
                        var diff = secondLocation - firstLocation;
                        barWidth = (currentOptions.dimensions.width / specificData.length) - 2;

                        barOffset = diff / 2;
                    }

                    graph.svg.selectAll(".state").remove();

                    var state = graph.svg.selectAll(".state")
                        .data(specificData)
                    .enter().insert("g", ".insert-before-marker")
                        .attr("class", "state")
                        .attr("transform", function(d, x) { 
                            var xPos = (graph.axisFunctions().x(d.time) - barOffset + 1);

                            if(!x) {
                                xPos += (barWidth / 2) + 1;
                            }

                            return "translate(" + xPos + ",0)"; 
                        });

                    state.selectAll("rect")
                        .data(function(d) { return d.values; })
                    .enter().append("rect")
                        .attr("width", function(d, i, x) {
                            if(!x) {
                                return (barWidth / 2) - 2;
                            }
                            return barWidth;
                        })
                        .attr("y", function(d) { return graph.axisFunctions().y(d.y1); })
                        .attr("height", function(d) { return graph.axisFunctions().y(d.y0) - graph.axisFunctions().y(d.y1); })
                        .style("fill", function(d) { return d.color; });

                    toolTipContentFactory.setLineCircles();
                    graph.triggerData(specificData);
                });
            }
        };
    };
})();

