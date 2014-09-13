(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.Graph.SubModules');

    TLRGRP.BADGER.Dashboard.Graph.SubModules.Tooltip = function(options) {
        var dimensions = options.dimensions;
        var element = options.element;
        var graphCanvas = options.graphCanvas;
        var toolTip = $('<div class="graph-tooltip hidden"></div>').appendTo(element);
        var series = options.series;
        var toolTipContext;
        var currentDataSet;
        var currentMousePos;

        function refreshToolTipContent() {
            var viewModel = buildViewModel(currentDataSet);

            setToolTipContent(viewModel);
        }

        function setToolTipContext(context) {
            toolTipContext = {
                mousePos: context.mousePos,
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

        function setToolTipPosition() {
            toolTip.css({
                left: (dimensions.margin.left - (toolTip.width() / 2)) + toolTipContext.mousePos[0],
                bottom: dimensions.height + dimensions.margin.top + dimensions.margin.bottom
            });
        }

        graphCanvas
            .on('mousemove', function(eventContext) {
                var mousePos = eventContext.mousePos;

                currentMousePos = mousePos;

                setToolTipContext(eventContext);
                
                if(!currentDataSet) {
                    return;
                }

                refreshToolTipContent();
                setToolTipPosition();

                toolTip.removeClass('hidden');
            })
            .on('mouseout', function() {
                toolTip.addClass('hidden');
                toolTipContext = false;
            })
            .on('data', function(data) {
                currentDataSet = data;
                
                if(!currentMousePos) {
                    return;
                }

                refreshToolTipContent();
                setToolTipPosition();
            });
    };    
})();
