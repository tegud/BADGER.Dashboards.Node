(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    TLRGRP.BADGER.Dashboard.ComponentModules.KafkaHealthCheckSentinel = function () {
        var containerElement = $('<div class="health-check-server-groups-container"></div>');

        function buildViewModel(data) {
            _(data).forEach(function (consumer) {
                _(consumer.topics).forEach(function (topic) {
                    _(topic.partitions).forEach(function (part) {
                        part.lagging = part.lag > 0;
                        topic.lagging = (topic.lagging || part.lagging);
                    });
                    consumer.lagging = (consumer.lagging || topic.lagging);
console.log("lag: ", consumer.group, topic.name, consumer.lagging);
                });
            });
            return data;
        }

        return {
            appendTo: function(componentElement) {
                componentElement.append(containerElement);
            },
            appendToLocation: function() {
                return 'content';
            },
            updateStatus: function (kafkaData) {
                var viewModel = buildViewModel(kafkaData);                

                containerElement.html($(Mustache.render(
                    '<div class="health-check-error hidden">'+
                        '<div class="health-check-error-text-container">'+
                            '<h3>Warning</h3>'+
                            '<div class="health-check-error-text">'+
                            '</div>'+
                        '</div>'+
                    '</div>'+
                    '<div class="dashboard-component conversion-status" style="width: 1815px; margin-right: ">' +
                        '<ul class="cluster-state-panels server-health-node-list">' +
                        '{{#.}}'+
                            '<li class="node-info {{#lagging}}breach{{/lagging}}" style="width: auto">' +
                                '<span class="fa fa-tag"></span><div class="item-text"><h4>{{group}}</h4></div>'+
                                '<ul style="list-style-type: none; padding-left: 0; margin-left: 0;">'+
                                '{{#topics}}'+
                                    '<li style="padding-left: 0;">'+
                                        '<span class="fa fa-list-alt"></span><div class="item-text"><h5 style="margin: 1em 0;">{{name}}</h5></div>'+
                                        '<ul style="list-style-type: none; padding-left: 0.5em;">'+
                                            '{{#partitions}}'+
                                                '<li><span class="fa fa-dot-circle-o"></span><div class="item-text" style="margin-left: 0.5em;">{{id}} (lag {{lag}})</div></li>'+
                                            '{{/partitions}}'+
                                        '</ul>'+
                                    '</li>'+
                                '{{/topics}}'+
                                '{{^topics}}<li>none</li>{{/topics}}'+
                                '</ul>'+
                            '</li>'+
                        '{{/.}}'+
                    '</ul>'+
                    '</div>', viewModel)));
            }
        };
    };
})();
