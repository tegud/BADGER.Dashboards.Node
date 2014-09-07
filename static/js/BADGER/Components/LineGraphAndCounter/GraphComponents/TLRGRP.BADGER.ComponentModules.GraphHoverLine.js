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

    TLRGRP.BADGER.Dashboard.Graph.SubModules.Tooltip = function(options) {
        var dimensions = options.dimensions;
        var element = options.element;
        var graphCanvas = options.graphCanvas;
        var toolTip = $('<div class="graph-tooltip hidden"></div>').appendTo(element);
        var series = options.series;
        var toolTipContext;

        function setToolTipContext(context) {
            toolTipContext = {
                stepDuration: context.stepDuration,
                index: context.index
            };
        }

        function buildViewModel(dataset) {
            var data = dataset[toolTipContext.index];
            var dateForData = moment(data.time);
            var dateFormat = 'HH:mm';
            var endDateForData = moment(dateForData).add(toolTipContext.stepDuration);
            var dayPrefix;

            if(endDateForData.seconds() || dateForData.seconds()) {
                dateFormat += ':ss';
            }

            if(moment(dataset[0].time).format('YYYYMMDD') !== moment(dataset[dataset.length - 1].time).format('YYYYMMDD')) {
                dayPrefix = dateForData.format('ddd DD MMM YYYY') + '<br />'
            }
            
            return {
                dayPrefix: dayPrefix,
                date: dateForData.format(dateFormat) + ' - ' + endDateForData.format(dateFormat),
                step: toolTipContext.stepDuration.humanize(),
                series: _.map(series, function(entry) {
                    var value = TLRGRP.BADGER.Utilities.object.getValueFromSubProperty(data, entry.value);
                    
                    if(!value || isNaN(value)) {
                        value = 0;
                    }
                    else {
                        value = value.toFixed(2);
                    }

                    return {
                        color: entry.color,
                        value: value
                    };
                })
            };
        }

        function setToolTipContent(viewModel) {
            toolTip
                .html(Mustache.render('<div style="font-weight: bold;">{{{dayPrefix}}}{{date}}<br />({{step}})' + '</div>'
                    + '{{#series}}<div class="tooltip-item"><div class="tooltip-item-key" style="background-color: {{color}}"></div><div class="toolip-item-text">{{value}}</div></div>{{/series}}', viewModel));
        }

        var currentDataSet;

        function refreshToolTipContent() {
            var viewModel = buildViewModel(currentDataSet);

            setToolTipContent(viewModel);
        }

        graphCanvas
            .on('mousemove', function(eventContext) {
                if(!eventContext.data) {
                    return;
                }

                var mousePos = eventContext.mousePos;

                setToolTipContext(eventContext);

                refreshToolTipContent();

                toolTip
                    .removeClass('hidden')
                    .css({
                        left: (dimensions.margin.left - (toolTip.width() / 2)) + mousePos[0],
                        bottom: dimensions.height + dimensions.margin.top + dimensions.margin.bottom
                    });
            })
            .on('mouseout', function() {
                toolTip.addClass('hidden');
            })
            .on('data', function(data) {
                currentDataSet = data;
                
                if(toolTip.hasClass('hidden')) {
                    return;
                }

                refreshToolTipContent();
            });
    };    
})();
