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
        var axis;
        var graph;
        var hoverLine;
        var toolTip;
        var toolTipBottom;
        var toolTipLeftOffset;
        var lastDataSet;
        var toolTipIsOnGraph;
        var lines = currentOptions.lines || [
            { id: 'error-line', color: currentOptions.lineColor || 'red' }
        ];
        var areas = currentOptions.areas || [];
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

            function getContent() {
                if(!lastDataSet[index] || !toolTipIsOnGraph) {
                    return;
                }

                var toolTipValue = lastDataSet[index];
                var entryTime = moment(lastDataSet[index].time);
                var dateText = entryTime.format('DD/MM/YYYY');
                var timeFormatString = stepDuration.asSeconds() > 60  ? 'HH:mm' : 'HH:mm:ss';
                var timeRangeText = entryTime.format(timeFormatString) + '-' + entryTime.add('ms', step).format(timeFormatString);

                var toolTipText = '<div style="font-weight: bold;">' + (hideDate ? '': dateText+ '<br/>') + timeRangeText + '<br />(' + stepDuration.humanize() + ')' + '</div>';

                _.each(lines, function(line) {
                    var valueText = toolTipValue.value;

                    if(line.value) {
                        if(line.value.indexOf('.') > -1) {
                            valueText = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(toolTipValue, line.value);
                        }
                        else {
                            valueText = toolTipValue.value[line.value];
                        }
                    }

                    if(valueText == null || isNaN(valueText)) {
                        valueText = 0;
                    }
                    else {
                        valueText = valueText.toFixed(3);
                    }

                    toolTipText += '<div class="tooltip-item"><div class="tooltip-item-key" style="background-color: ' + line.color + '"></div><div class="toolip-item-text">' + valueText + '</div></div>';
                });

                return toolTipText;
            }

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
                getContent: getContent,
                setLineCircles: function() {
                    if(!lastDataSet[index] || !toolTipIsOnGraph) {
                        return;
                    }

                    _.each(lines, function(line) {
                        if(!line.circle) {
                            return;
                        }

                        var lineValue;

                        if(line.value) {
                            if(line.value.indexOf('.') > -1) {
                                lineValue = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(lastDataSet[index], line.value);
                            }
                            else {
                                lineValue = lastDataSet[index].value[line.value];
                            }
                        }
                        else {
                            lineValue = lastDataSet[index].value;
                        }

                        if(isNaN(lineValue)) { 
                            lineValue = 0;
                        }

                        line.circle
                            .attr('cx', graph.axisFunctions().x(lastDataSet[index].time))
                            .attr('cy', graph.axisFunctions().y(lineValue || 0) );
                    });
                }
            };
        })();

        function showHoverLine(mousePos) {
            toolTipIsOnGraph = true;
            hoverLine.classed('hidden', false);

            hoverLine
                .attr('x1', mousePos[0])
                .attr('x2', mousePos[0]);

            _.each(lines, function(line) {
                line.circle.classed('hidden', false);
            });

            toolTip
                .appendTo(element.parent())
                .css({
                    left: toolTipLeftOffset + mousePos[0] + currentOptions.dimensions.margin.left - (toolTip.width() / 2),
                    bottom: toolTipBottom
                })
                .removeClass('hidden');

            var updateRequired = toolTipContentFactory.setCurrentIndex(mousePos);

            if(updateRequired) {
                toolTipContentFactory.setLineCircles();
                toolTip.html(toolTipContentFactory.getContent());
            }
        }

        function hideHoverLine() {
            toolTipIsOnGraph = false;

            var hoverLine = graph.select('.hover-line').classed('hidden', true);
            toolTip.addClass('hidden');

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
                            "y": currentOptions.lines.length === 1 ? currentOptions.lines[0].value 
                                : _.map(currentOptions.lines, function(line) {
                                return line.value;
                            })
                        }
                    }

                    graph = new TLRGRP.BADGER.Dashboard.ComponentModules.GraphCanvas(element, currentOptions);
                    
                    var dimensions = currentOptions.dimensions;

                    _.each(areas, function(currentLine) {
                        var elementId = currentLine.id;
                        var lineElement = graph.select("#" + elementId);
                        var line = d3.svg.area()
                            .x(function(d) {
                                return graph.axisFunctions().x(d.time);
                            })
                            .y0(function(d) {
                                var value;

                                if(currentLine.start.indexOf('.') > -1) {
                                    value = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(d, currentLine.start)
                                }
                                else {
                                    value = d.value[currentLine.start];
                                }

                                if(isNaN(value)) {
                                    value = 0;
                                }

                                return graph.axisFunctions().y(value);
                            })
                            .y1(function(d) {
                                var value;

                                if(currentLine.end.indexOf('.') > -1) {
                                    value = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(d, currentLine.end)
                                }
                                else {
                                    value = d.value[currentLine.end];
                                }

                                if(isNaN(value)) {
                                    value = 0;
                                }

                                return graph.axisFunctions().y(value);
                            });

                        graph.append("path")
                            .attr('id', elementId)
                            .attr("class", "line")
                            .attr("style", "fill: " + currentLine.color + ";");
                    });

                    _.each(lines, function(currentLine) {
                        var elementId = currentLine.id;
                        var lineElement = graph.select("#" + elementId);
                        var line = d3.svg.line()
                            .x(function(d) {
                                return graph.axisFunctions().x(d.time);
                            })
                            .y(function(d) {
                                var value = d.value;

                                if(currentLine.value) {
                                    if(currentLine.value.indexOf('.') > -1) {
                                        value = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(d, currentLine.value);
                                    }
                                    else {
                                        value = value[currentLine.value];
                                    }
                                }

                                if(isNaN(value)) {
                                    value = 0;
                                }

                                return graph.axisFunctions().y(value);
                            });

                        graph.append("path")
                            .attr('id', elementId)
                            .attr("class", "line")
                            .attr("style", "stroke: " + currentLine.color + ";");
                    });

                    hoverLine = graph.append("line")
                        .attr("class", "hover-line hidden")
                        .attr("style", "stroke: black;")
                        .attr('x1', 10)
                        .attr('x2', 10)
                        .attr('y1', -currentOptions.dimensions.margin.top)
                        .attr('y2', currentOptions.dimensions.height);

                    _.each(lines, function(line) {
                        line.circle = graph.append("circle")
                            .attr('class', 'hidden hover-circle-' + line.id)
                            .attr("cx", 30)
                            .attr("cy", 30)
                            .attr("r", 3)
                            .attr("style", "fill: " + line.color + ";stroke: " + line.color + ";stroke-width: 2px");
                    });
                        
                    toolTip = $('#graph-tooltip');

                    if(!toolTip.length) {
                        toolTip = $('<div id="graph-tooltip" class="hidden"></div>').appendTo('body');
                    }
                    toolTipBottom = element.height();
                    toolTipLeftOffset = element.position().left;

                    graph.on('mousemove', function(event) {
                        var hoverLine = graph.select('.hover-line');
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
            setData: function (data) {
                if(currentOptions.window) {
                    data = data.reverse().slice(currentOptions.window.skip, currentOptions.window.take + currentOptions.window.skip).reverse();
                }

                lastDataSet = data;
                toolTipContentFactory.setData(data);

                $.when(graphReady).then(function() {
                    for (var m = 0; m < data.length; m++) {
                        data[m].time = new Date(data[m].time);
                    }
                    
                    graph.setData(data);

                    _.each(areas, function(currentLine) {
                        var elementId = currentLine.id;
                        var lineElement = graph.select("#" + elementId);
                        var lineData = data;
                        var line = d3.svg.area()
                            .x(function(d) {
                                return graph.axisFunctions().x(d.time);
                            })
                            .y0(function(d) {
                                var value;

                                if(currentLine.start.indexOf('.') > -1) {
                                    value = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(d, currentLine.start)
                                }
                                else {
                                    value = d.value[currentLine.start];
                                }

                                if(isNaN(value) || value < 0) {
                                    value = 0;
                                }

                                return graph.axisFunctions().y(value);
                            })
                            .y1(function(d) {
                                var value;

                                if(currentLine.end.indexOf('.') > -1) {
                                    value = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(d, currentLine.end)
                                }
                                else {
                                    value = d.value[currentLine.end];
                                }

                                if(isNaN(value) || value < 0) {
                                    value = 0;
                                }

                                return graph.axisFunctions().y(value);
                            });

                        if (lineElement[0][0]) {
                            lineElement
                               .datum(lineData)
                               .attr("d", line);
                        }
                        else {
                            graph.append("path")
                                .datum(lineData)
                                .attr('id', elementId)
                                .attr("class", "line")
                                .attr("style", "fill: " + currentLine.color + ";opacity: 0.7;")
                                .attr("d", line);
                        }
                    });

                    _.each(lines, function(currentLine) {
                        var elementId = currentLine.id;
                        var lineElement = graph.select("#" + elementId);
                        var lineData = data;
                        var line = d3.svg.line()
                            .x(function(d) {
                                return graph.axisFunctions().x(d.time);
                            })
                            .y(function(d) {
                                var value = d.value;

                                if(currentLine.value) {
                                    if(currentLine.value.indexOf('.') > -1) {
                                        value = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(d, currentLine.value);
                                    }
                                    else {
                                        value = value[currentLine.value];
                                    }
                                }

                                if(isNaN(value)) {
                                    value = 0;
                                }

                                return graph.axisFunctions().y(value);
                            });

                        if (lineElement[0][0]) {
                            lineElement
                               .datum(lineData)
                               .attr("d", line);
                        }
                        else {
                            graph.append("path")
                                .datum(lineData)
                                .attr('id', elementId)
                                .attr("class", "line")
                                .attr("style", "stroke: " + currentLine.color + ";")
                                .attr("d", line);
                        }
                    });


                    toolTipContentFactory.setLineCircles();
                    toolTip.html(toolTipContentFactory.getContent());
                });
            }
        };
    };
})();

