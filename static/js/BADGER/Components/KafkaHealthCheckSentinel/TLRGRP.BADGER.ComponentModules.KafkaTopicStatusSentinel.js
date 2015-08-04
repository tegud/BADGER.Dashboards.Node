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


    function buildViewModel(kafkaData, environment) {

        var topicData = kafkaData['kafka-check.' + environment + '.topics'];
        var topicLeaderData = kafkaData['kafka-check.' + environment + '.topicsWithNoLeaders'];
        var consumerData = kafkaData['kafka-check.' + environment + '.consumers'];

        var topics = [];

        _(topicData.topics).forEach(function(topic){

            var topicHealthData = {
                "topicName" : topic.topicName,
                "healthState" : "info",
                "partitions" : [],
                "consumers" : []
            }

            //check if the topic has no leader
            if(topicLeaderData) {
                _(topicLeaderData.topicsWithNoLeader).forEach(function(topicWithNoLeader){
                    var noLeader = _.find(topic.partitions, { "partitionId" : topicWithNoLeader.partitionId });
                    if(noLeader) {
                        noLeader.leader = "NO LEADER";
                        topicHealthData.healthState = "breach";
                        noLeader.leaderHealthState = "critical";
                    }
                });
            }

            //find any consumers of the topic
            _(consumerData).forEach(function(consumerGroup){
                var consumingTopic = _.find(consumerGroup.topics, { "name" : topic.topicName });
                if(consumingTopic) {
                    topicHealthData.consumers.push(consumerGroup.group);
                }
            });

            topicHealthData.partitions = topic.partitions;

            topics.push(topicHealthData);
        });

        return {
            "topics" : topics
        };

    }
    
    TLRGRP.BADGER.Dashboard.ComponentModules.KafkaTopicStatusSentinel = function () {
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
                    '<div class="health-check-error hidden">'+
                        '<div class="health-check-error-text-container">'+
                            '<h3>Warning</h3>'+
                            '<div class="health-check-error-text">'+
                            '</div>'+
                        '</div>'+
                    '</div>'+   
                    '<div class="dashboard-component conversion-status" style="width: 1815px; margin-right: ">' +
                        '<ul class="cluster-state-panels server-health-node-list">' +
                            '{{#topics}}'+
                                '<li class="node-info {{healthState}}" style="width: auto">' +
                                    '<span class="fa fa-tag"></span><div class="item-text"><h2>{{topicName}}</h2></div><br />'+  
                                    '<span class="fa fa-list-alt"></span><div class="item-text" style="font-weight:bold; margin:10px">Partitions</div>'+ 
                                    '{{#partitions}}'+
                                        '<div class="node-item {{leaderHealthState}}"><span class="fa fa-dot-circle-o"></span><div class="item-text">ID : {{partitionId}} Leader : {{leader}}</div></div>' +
                                    '{{/partitions}}' +
                                    '<span class="fa fa-users"></span><div class="item-text" style="font-weight:bold; margin:10px">Consumers</div>'+
                                    '{{#consumers}}'+
                                        '<div class="node-item info"><span class="fa fa-dot-circle-o"></span><div class="item-text">{{.}}</div></div>' +
                                    '{{/consumers}}' +
                                '</li>' +                                
                            '{{/topics}}' +
                        '</ul>' +
                    '</div>', viewModel)));
            }
        };
    };
})();

