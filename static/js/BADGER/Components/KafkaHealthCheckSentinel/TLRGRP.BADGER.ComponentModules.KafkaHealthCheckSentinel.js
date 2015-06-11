(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    function buildId(serverSet, group, name) {
        return serverSet.replace(/\./ig, '_').replace(/\s/ig, '_').toLowerCase()
            + group.replace(/\./ig, '_').replace(/\s/ig, '_').toLowerCase()
            + name.replace(/\./ig, '_').replace(/\s/ig, '_').toLowerCase();
    }

    function abbreviate(str, max, suffix)
    {
        if (str.length > max) {
            var words = str.split(' ');
            if (words.length > 1) {
                return _(words)
                    .reduce(function (memo, word) {
                        memo = memo + word[0];
                        return memo
                    }, '');
            }
            return str.substring(0, max);
        }
        return str;
    }

    function buildViewModel(kafkaData) {
        return {
            kafkaData: {
                metricName: kafkaData.metricName,
                statusCode: kafkaData.code,
                status: _(kafkaData.status).map(function (broker) {                
                    if(broker.alive){
                        broker.alertState = '';
                    }
                    else
                    {
                        broker.alertState = 'critical';
                    }

                    return broker;                        
                })                 
            }
        };
    }
    
    TLRGRP.BADGER.Dashboard.ComponentModules.KafkaHealthCheckSentinel = function () {
        var containerElement = $('<div class="health-check-server-groups-container"></div>');

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
                        '<li class="health-check-group-item">'+
                            '{{#kafkaData}}'+
                                '{{#status}}'+
                                    '<div class="alert-state-info alert-state-{{alertState}}" style="float:left; margin-right:5px; font-weight:bold">'+
                                        '{{endpoint}}'+  
                                    '</div>' +
                                '{{/status}}'+
                                '{{^status}}'+
                                '{{/status}}'+                            
                            '{{/kafkaData}}' +
                        '</li>' +                       
                    '</ul>' +
                    '<br />', viewModel)));
            }
        };
    };
})();

