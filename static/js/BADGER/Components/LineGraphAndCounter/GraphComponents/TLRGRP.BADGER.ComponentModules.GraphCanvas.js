(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    TLRGRP.BADGER.Dashboard.ComponentModules.GraphCanvas =  function(element, options) {
        var dimensions = options.dimensions;

        if (!dimensions.width) {
            dimensions.width = element.innerWidth() - (dimensions.margin.left + dimensions.margin.right);
        }

        if (!dimensions.height) {
            dimensions.height = element.innerHeight() - (dimensions.margin.top + dimensions.margin.bottom);
        }

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

        var highlightedRegion = new TLRGRP.BADGER.Dashboard.ComponentModules.HighlightedRegion(svg, axis.x, {
            dimensions: dimensions,
            counterWindow: options.counterWindow 
        });

        var graphAxis = new TLRGRP.BADGER.Dashboard.ComponentModules.GraphAxis(svg, axis.x, axis.y);

        graphAxis.append({
            dimensions: dimensions
        });

        return {
            append: function(element) {
                return svg.append(element);
            },
            select: function (selector) {
                return svg.select(selector);
            },
            on: function(event, handler) {
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
    }
})();
