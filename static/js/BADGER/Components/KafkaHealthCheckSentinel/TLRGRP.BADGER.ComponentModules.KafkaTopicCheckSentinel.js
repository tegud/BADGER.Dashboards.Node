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


    function KAFCONlevel(levelDescription, level, alert)
    {
        this.levelDescription = levelDescription
        this.level = level;
        if(alert){
            this.alertState = 'critical';    
        }        
    }

    function buildViewModel(kafkaData, environment) {

        var kafconData = [];
        var kafconLevel = 5;

        var metric = _.first(_(kafkaData).where({ metricName: environment + ".kafka.healthcheck" }));
        if(metric.code < 3){
            if(metric.code == 1)
            {
                kafconData.push(new KAFCONlevel("Unable to produce or consume to all partitions", 1, true));
            }
            else
            {
                kafconData.push(new KAFCONlevel("Unable to consume from all partitions", 1, true));
            }

            kafconLevel = 4;
        }
        else
        {
            kafconData.push(new KAFCONlevel("Producing and consuming from all partitions", 4, false));
        }

        metric = _.first(_(kafkaData).where({ metricName: environment + ".kafka.zookeepers" }));
        if(_(metric.status).find({ "alive" : false }))
        {
            kafconData.push(new KAFCONlevel("Zookeeper operating under reduced capacity", 3, true));
            kafconLevel = 3;
        }
        else
        {
            kafconData.push(new KAFCONlevel("All Zookeeper instances operating OK", 3, false));
        }

        metric = _.first(_(kafkaData).where({ metricName: environment + ".kafka.brokers" }));
        if(_(metric.status).find({ "alive" : false }))
        {
            kafconData.push(new KAFCONlevel("Kafka operating under reduced capacity", 2, true));
            kafconLevel = 2;
        }
        else
        {
            kafconData.push(new KAFCONlevel("All Kafka brokers operating OK", 2, false));
        }

        metric = _.first(_(kafkaData).where({ metricName: environment + ".kafka.replicated_healthcheck" }));
        if(metric.code < 3){
            if(metric.code == 1)
            {
                kafconData.push(new KAFCONlevel("Unable to produce or consume topics", 1, true));
            }
            else
            {
                kafconData.push(new KAFCONlevel("Unable to consume from topics", 1, true));
            }
            
            kafconLevel = 1;
        }
        else
        {
            kafconData.push(new KAFCONlevel("Producing and consuming OK", 1, false));
        }

        return 
        {
            kafconData,
            kafconLevel
        };
    }
    
    TLRGRP.BADGER.Dashboard.ComponentModules.KafkaTopicCheckSentinel = function () {
        var containerElement = $('<div class="health-check-server-groups-container"></div>');

        return {
            appendTo: function(componentElement) {
                componentElement.append(containerElement);
            },
            appendToLocation: function() {
                return 'content';
            },
            updateStatus: function (kafkaData, environment) {
                var viewModel = buildViewModel(kafkaData, environment);

                containerElement.html($(Mustache.render(
                    '<h3>Current level : {{kafconLevel}}</h3>' +
                    '<div class="health-check-error hidden">'+
                        '<div class="health-check-error-text-container">'+
                            '<h3>Warning</h3>'+
                            '<div class="health-check-error-text">'+
                            '</div>'+
                        '</div>'+
                    '</div>'+                                    
                    '<ul class="health-check-groups">'+                      
                        '<li class="health-check-group-item">'+
                            '{{#kafconData}}'+
                                '<div class="alert-state-info alert-state-{{alertState}}" style="margin-right:5px; margin-bottom:5px; font-weight:bold">'+
                                    '{{levelDescription}}'+  
                                '</div>' +                       
                            '{{/kafconData}}' +
                        '</li>' +                       
                    '</ul>', viewModel)));
            }
        };
    };
})();

