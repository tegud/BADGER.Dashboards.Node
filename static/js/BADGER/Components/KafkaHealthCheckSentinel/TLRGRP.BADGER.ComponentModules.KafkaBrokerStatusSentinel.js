(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    var brokerList = [];

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

        var broker = kafkaData.brokers[0];
        var brokerIsAnObject = typeof(broker) === 'object' ? true : false;

        if(brokerIsAnObject) {
            //Return an error
            return {
                "errorBroker" : {
                    "errorMessage" : JSON.stringify(broker.errorMessage)
                }
            };
        }

        _(kafkaData.brokers).forEach(function(broker){

            //Look for the broker in the brokerList array
            //If its there update the lastSeen date
            var existingRegisteredBroker = _.first(_(brokerList).where({ brokerId : broker }));
            if(typeof existingRegisteredBroker != 'undefined'){
                existingRegisteredBroker.lastSeen = Date.now();                
                existingRegisteredBroker.lastSeenDescription = moment().fromNow();
                existingRegisteredBroker.alertState = 'info';
                existingRegisteredBroker.checked = true;
            }
            else {
                //If its not there add it
                var newRegisteredBroker = {
                    "brokerId" : broker,
                    "lastSeen" : Date.now(),
                    "lastSeenDescription" : moment().fromNow(),
                    "alertState" : "info",
                    "checked" : true
                };

                brokerList.push(newRegisteredBroker);
            }
        });

        //Check any brokers where checked = false
        //and look at when they were last seen and alert if older than
        //5 mins (eventually this will be configurable)
        var uncheckedBrokers = _(brokerList).where({ checked : false });
        uncheckedBrokers.forEach(function(broker){
            broker.lastSeenDescription = moment(broker.lastSeen).fromNow();

            var lastSeenDiff = Date.now() - broker.lastSeen;
            var lastSeenMins = Math.round(((lastSeenDiff % 86400000) % 3600000) / 60000);

            if(lastSeenMins >= 1 && lastSeenMins <= 5){
                broker.alertState = 'breach';
            };

            if(lastSeenMins >= 5){
                broker.alertState = 'critical';
            };
        });

        //Reset all checked flags to false
        _(brokerList).forEach(function(broker){
            broker.checked = false;
        });

        return {
            "registeredBrokers" : brokerList
        }        
    }
    
    TLRGRP.BADGER.Dashboard.ComponentModules.KafkaBrokerStatusSentinel = function () {
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
                            '{{#errorBroker}}' +
                                '<div class="alert-state-info alert-state-critical" style="margin-right:5px; margin-bottom:5px; font-weight:bold">'+
                                    'Error checking broker IDs : {{errorMessage}}'+ 
                                '</div>' + 
                            '{{/errorBroker}}' +
                            '{{#registeredBrokers}}'+
                                '<div class="alert-state-info alert-state-{{alertState}}" style="margin-right:5px; margin-bottom:5px; font-weight:bold">'+
                                    'Broker ID : {{brokerId}}'+ 
                                    ' - last seen {{lastSeenDescription}}' +
                                '</div>' +                           
                            '{{/registeredBrokers}}' +
                        '</li>' +                       
                    '</ul>' +
                    '<br />', viewModel)));
            }
        };
    };
})();

