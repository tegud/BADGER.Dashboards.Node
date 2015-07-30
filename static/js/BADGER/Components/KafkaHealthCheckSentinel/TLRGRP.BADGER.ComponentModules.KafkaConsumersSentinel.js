(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    TLRGRP.BADGER.Dashboard.ComponentModules.KafkaHealthCheckSentinel = function () {
        var containerElement = $('<div class="health-check-server-groups-container"></div>');

        function buildViewModel(data) {
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
                    '<ul class="health-check-groups">'+
                        '{{#.}}'+
                            '<li class="health-check-group-item">'+
                                '<h4>{{group}}</h4>'+
                                '<ul>'+
                                    '{{#topics}}'+
                                        '<li><h5>{{name}}</h5>'+
                                            '<h6>Partitions</h6>'+
                                            '<ul>'+
                                                '{{#partitions}}'+
                                                    '<li>{{id}} (lag {{lag}})</li>'+
                                                '{{/partitions}}'+
                                            '</ul>'+
                                        '</li>'+
                                    '{{/topics}}'+
                                    '{{^topics}}<li>none</li>{{/topics}}'+
                                '</ul>'+
                            '</li>'+
                        '{{/.}}'+
                    '</ul>'+
                    '<br />', viewModel)));
            }
        };
    };
})();
