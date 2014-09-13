(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Graph.SubModules');

    TLRGRP.BADGER.Dashboard.Graph.SubModules.HoverLine = function(options) {
        var graphCanvas = options.graphCanvas;
        var dimensions = options.dimensions;
        var hoverLine = graphCanvas.append("line")
            .attr("class", "hover-line hidden")
            .attr("style", "stroke: black;")
            .attr('x1', 10)
            .attr('x2', 10)
            .attr('y1', -dimensions.margin.top)
            .attr('y2', dimensions.height);

        graphCanvas
            .on('mousemove', function(eventContext) {
                var mousePos = eventContext.mousePos;
                
                hoverLine.classed('hidden', false);
                
                hoverLine
                    .attr('x1', mousePos[0])
                    .attr('x2', mousePos[0]);
            })
            .on('mouseout', function() {
                hoverLine.classed('hidden', true);
            });
    };    
})();
