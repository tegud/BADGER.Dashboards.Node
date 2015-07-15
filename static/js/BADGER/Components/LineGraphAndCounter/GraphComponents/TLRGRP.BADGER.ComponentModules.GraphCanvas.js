(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    function setXExtent(data, property, axis) {
        var extent = d3.extent(data, function (d) { 
            return TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(d, property); 
        });
        
        axis.domain(extent);
    }

    function setYExtent(data, property, axis) {
        if(!_.isArray(property)) {
            property = [property];
        }

        var totalExtent;

        _.each(property, function(currentProperty) {
            var currentExtent = d3.extent(data, function (d) { 
                var value = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(d, currentProperty);

                if(isNaN(value)) {
                    value = 0;
                }

                return value; 
            });

            if(totalExtent) {
                if(currentExtent[0] < totalExtent[0]) {
                    totalExtent[0] = currentExtent[0];
                }

                if(currentExtent[1] > totalExtent[1]) {
                    totalExtent[1] = currentExtent[1];
                }
            }
            else {
                totalExtent = currentExtent;
            }
        });

        if(totalExtent) {
            axis.domain(totalExtent);
        }
    }

    TLRGRP.BADGER.Dashboard.ComponentModules.GraphCanvas =  function(element, options) {
        var dimensions = options.dimensions;

        if (!dimensions.width) {
            dimensions.width = element.innerWidth() - (dimensions.margin.left + dimensions.margin.right);
        }

        if (!dimensions.height) {
            dimensions.height = element.innerHeight() - (dimensions.margin.top + dimensions.margin.bottom);
        }

        var lastData;

        var svg = d3.select(element[0]).append("svg")
            .attr("width", dimensions.width + dimensions.margin.left + dimensions.margin.right)
            .attr("height", dimensions.height + dimensions.margin.top + dimensions.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + dimensions.margin.left + "," + dimensions.margin.top + ")");
    

        var graphCanvas = {
            append: function(element) {
                return svg.append(element);
            },
            insert: function(element, insert) {
                return svg.insert(element, insert);
            },
            select: function (selector) {
                return svg.select(selector);
            },
            on: function(event, handler) {
                if(event === 'mousemove') {
                    mouseOverEvents.push(handler);
                    return graphCanvas;
                }
                else if(event === 'mouseout') {
                    mouseOutEvents.push(handler);
                    return graphCanvas;
                }
                else if(event === 'data') {
                    dataEvents.push(handler);
                    return graphCanvas;
                }

                return svg.on(event, handler);
            },
            triggerData: function(data) {
                lastData = data;

                highlightedRegion.setData(data);

                _.each(dataEvents, function(handler) {
                    handler(data);
                });
            },
            setData: function(data) {
                lastData = data;

                _.each(axis, function(eachAxis, label) {
                    if(label === 'x') {
                        setXExtent(data, options.extentProperties[label] || 'time', eachAxis);
                    }
                    else {
                        setYExtent(data, options.extentProperties[label], eachAxis);
                    }
                });
                
                graphAxis.call();

                highlightedRegion.setData(data);

                _.each(dataEvents, function(handler) {
                    handler(data);
                });
            },
            axisFunctions: function() {
                return axis;
            },
            setExtents: function(timeData, y) {
                _.each(axis, function(eachAxis, label) {
                    if(label === 'x') {
                        var extent = d3.extent(timeData, function (d) { return d; });

                        eachAxis.domain(extent);
                    }
                    else {
                        eachAxis.domain(y);
                    }
                });

                graphAxis.call();
            },
            svg: svg
        };

        svg
            .append("rect")
            .attr('style', 'fill: transparent; z-index:-1')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', dimensions.width)
            .attr('height', dimensions.height);

        var axis = {
            x: d3.time.scale().range([0, dimensions.width]),
            y: d3.scale.linear().range([dimensions.height, 0])
        };

        var highlightedRegion = new TLRGRP.BADGER.Dashboard.ComponentModules.HighlightedRegion(svg, axis.x, {
            dimensions: dimensions,
            counterWindow: options.counterWindow 
        });

        var graphAxis = new TLRGRP.BADGER.Dashboard.ComponentModules.GraphAxis(svg, axis.x, axis.y);

        graphAxis.append({
            dimensions: dimensions
        });

        var mouseOverEvents = [];
        var mouseOutEvents = [];
        var dataEvents = [];

        new TLRGRP.BADGER.Dashboard.Graph.SubModules.HoverLine({
            graphCanvas: graphCanvas,
            element: element, 
            dimensions: dimensions,
            series: options.lines
        });
        new TLRGRP.BADGER.Dashboard.Graph.SubModules.Tooltip({
            graphCanvas: graphCanvas,
            element: element, 
            dimensions: dimensions,
            series: options.lines
        });

        svg
            .on('mouseout', function() {
                var thisContext = this;
                _.each(mouseOutEvents, function(handler) {
                    handler.call(thisContext);
                });
            })
            .on('mousemove', function() {
                var mousePos = d3.mouse(this);
                var thisContext = this;

                if(mousePos[0] > 0 && mousePos[0] < dimensions.width && mousePos[1] < dimensions.height) {
                    var index;
                    var indexData;
                    var eventContext;
                    var stepDuration;
                    var lastEntryMoment;
                    var firstEntryMoment;

                    if(lastData) {
                        firstEntryMoment = moment(lastData[0].time);
                        lastEntryMoment = moment(lastData[lastData.length - 1].time);
                        var offset = moment(lastData[1].time).diff(firstEntryMoment, 'millseconds');
                        lastEntryMoment = lastEntryMoment.add('ms', offset);
                        var firstEntry = firstEntryMoment.valueOf();
                        var lastEntry = lastEntryMoment.valueOf();
                        var step = (lastEntry - firstEntry) / parseFloat(lastData.length);
                        stepDuration = moment.duration(step, 'ms');

                        var hoverDateTime = axis.x.invert(mousePos[0]);
                        var hoverTime = moment(hoverDateTime).valueOf() - firstEntry;

                        index = Math.round(hoverTime / parseFloat(step));
                        indexData = lastData[index];
                    }

                    eventContext = {
                        mousePos: mousePos,
                        index: index,
                        data: indexData,
                        stepDuration: stepDuration
                    };

                    _.each(mouseOverEvents, function(handler) {
                        handler.call(thisContext, eventContext);
                    });
                }
                else {
                    _.each(mouseOutEvents, function(handler) {
                        handler.call(thisContext, mousePos);
                    });
                }

            }); 

        return graphCanvas;
    }
})();
