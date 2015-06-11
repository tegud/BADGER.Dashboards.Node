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

    function buildViewModel(kafkaData, enviroment) {

        var kafconData = [];
        var kafconLevel = 5;
        var alertDivState;

        var metric = _.first(_(kafkaData).where({ metricName: enviroment + ".kafka.healthcheck" }));
        if(metric.code < 3){
            if(metric.code == 1)
            {
                kafconData.push(new KAFCONlevel("Unable to produce to all partitions", 1, true));
            }
            else
            {
                kafconData.push(new KAFCONlevel("Unable to consume from all partitions", 1, true));
            }

            kafconLevel = 4;
        }
        else
        {
            kafconData.push(new KAFCONlevel("All partitions replicating", 4, false));
        }

        metric = _.first(_(kafkaData).where({ metricName: enviroment + ".kafka.zookeepers" }));
        if(_(metric.status).find({ "alive" : false }))
        {
            kafconData.push(new KAFCONlevel("Zookeeper operating under reduced capacity", 3, true));
            kafconLevel = 3;
        }
        else
        {
            kafconData.push(new KAFCONlevel("All Zookeeper instances operating OK", 3, false));
        }

        metric = _.first(_(kafkaData).where({ metricName: enviroment + ".kafka.brokers" }));
        if(_(metric.status).find({ "alive" : false }))
        {
            kafconData.push(new KAFCONlevel("Kafka operating under reduced capacity", 2, true));
            kafconLevel = 2;
        }
        else
        {
            kafconData.push(new KAFCONlevel("All Kafka brokers operating OK", 2, false));
        }

        metric = _.first(_(kafkaData).where({ metricName: enviroment + ".kafka.replicated_healthcheck" }));
        if(metric.code < 3){
            if(metric.code == 1)
            {
                kafconData.push(new KAFCONlevel("Unable to produce to any topic", 1, true));
            }
            else
            {
                kafconData.push(new KAFCONlevel("Unable to consume from any topic", 1, true));
            }
            
            kafconLevel = 1;
        }
        else
        {
            kafconData.push(new KAFCONlevel("All topics accessible", 1, false));
        }

        if(kafconLevel == 5){
            alertDivState = ' hidden';            
        }
        else {
            alertDivState = '';
        }            

        return {
            kafconData,
            kafconLevel,
            alertDivState      
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
            updateStatus: function (kafkaData, enviroment) {
                var viewModel = buildViewModel(kafkaData, enviroment);

                containerElement.html($(Mustache.render(
                    '<div class="health-check-error hidden">'+
                        '<div class="health-check-error-text-container">'+
                            '<h3>Warning</h3>'+
                            '<div class="health-check-error-text">'+
                            '</div>'+
                        '</div>'+
                    '</div>'+                 
                    '<div class="health-check-error {{alertDivState}}" style="opacity: 0.5; padding:20px">'+
                        '<div class="health-check-error-text-container">'+
                            '<h3>Warning</h3>'+
                            '<br /><br />' + 
                            '<div class="health-check-error-text">KAFCON level {{kafconLevel}}'+
                            '</div>'+
                        '</div>'+
                    '</div>' +                     
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

