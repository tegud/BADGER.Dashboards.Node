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

    var HoverLine = function(graphCanvas, dimensions) {
        var hoverLine = graphCanvas.append("line")
            .attr("class", "hover-line hidden")
            .attr("style", "stroke: black;")
            .attr('x1', 10)
            .attr('x2', 10)
            .attr('y1', -dimensions.margin.top)
            .attr('y2', dimensions.height);

        graphCanvas
            .on('mousemove', function() {
                var mousePos = d3.mouse(this);

                if(mousePos[0] > 0 && mousePos[0] < dimensions.width && mousePos[1] < dimensions.height) {
                    hoverLine.classed('hidden', false);
                    
                    hoverLine
                        .attr('x1', mousePos[0])
                        .attr('x2', mousePos[0]);
                }
                else {
                    hoverLine.classed('hidden', true);
                }
            })
            .on('mouseout', function() {
                hoverLine.classed('hidden', true);
            });
    };


    TLRGRP.BADGER.Dashboard.ComponentModules.GraphCanvas =  function(element, options) {
        var dimensions = options.dimensions;

        if (!dimensions.width) {
            dimensions.width = element.innerWidth() - (dimensions.margin.left + dimensions.margin.right);
        }

        if (!dimensions.height) {
            dimensions.height = element.innerHeight() - (dimensions.margin.top + dimensions.margin.bottom);
        }

        var graphCanvas = {
            append: function(element) {
                return svg.append(element);
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

                return svg.on(event, handler);
            },
            setData: function(data) {
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
            },
            axisFunctions: function() {
                return axis;
            }
        };

        var svg = d3.select(element[0]).append("svg")
            .attr("width", dimensions.width + dimensions.margin.left + dimensions.margin.right)
            .attr("height", dimensions.height + dimensions.margin.top + dimensions.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + dimensions.margin.left + "," + dimensions.margin.top + ")");
    
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

        new HoverLine(graphCanvas, dimensions);

        svg
            .on('mouseout', function() {
                var thisContext = this;
                _.each(mouseOutEvents, function(handler) {
                    handler.apply(thisContext);
                });
            })
            .on('mousemove', function() {
                var thisContext = this;

                _.each(mouseOverEvents, function(handler) {
                    handler.apply(thisContext);
                });
            }); 

        return graphCanvas;
    }
})();
