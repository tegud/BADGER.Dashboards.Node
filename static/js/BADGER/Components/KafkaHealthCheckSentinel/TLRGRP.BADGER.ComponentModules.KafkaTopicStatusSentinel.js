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
        var noLeaderMessage = "NO LEADER";

        var topics = [];

        _(topicData.topics).forEach(function(topic){

            var topicHealthData = {
                "topicName" : topic.topicName,
                "healthState" : "info",
                "partitions" : [],
                "consumers" : []
            }

            //check if the topic partitions have no leader
            if(topicLeaderData) {
                var topicHasIssues = _.filter(topicLeaderData.topicsWithNoLeader, { "topicName" : topic.topicName });
                if(topicHasIssues) {
                    _(topicHasIssues).forEach(function(partition){ 
                        var partitionWithIssues = _.find(topic.partitions, { "partitionId" : partition.partitionId });
                        if(partitionWithIssues) {
                            partitionWithIssues.leader = noLeaderMessage;
                            topicHealthData.healthState = "breach";
                            partitionWithIssues.leaderHealthState = "critical";
                            partitionWithIssues.alert = true;
                        }
                    });
                }
            }

            //find any consumers of the topic
            _(consumerData).forEach(function(consumerGroup){
                var consumingTopic = _.find(consumerGroup.topics, { "name" : topic.topicName });
                if(consumingTopic) {
                    topicHealthData.consumers.push(consumerGroup.group);
                }
            });

            topicHealthData.partitions = topic.partitions;

            //check if the topic has no leaders at all
            var somePartitionsHaveNoLeader = _.filter(topicHealthData.partitions, { "leader" : noLeaderMessage });
            if(somePartitionsHaveNoLeader) {
                if(somePartitionsHaveNoLeader.length == topicHealthData.partitions.length) {
                    topicHealthData.healthState = "critical";
                }
            }

            topics.push(topicHealthData);
        });

        topics.sort(function(a, b){
            var topicA=a.topicName.toLowerCase();
            var topicB=b.topicName.toLowerCase();

            if(a.healthState === "critical") return -1;
            if(a.healthState === "breach" && b.healthState === "critical") return 1;
            if(a.healthState === "breach") return -1;

            if(a.healthState === "info" && b.healthState === "critical") return 1;
            if(a.healthState === "info" && b.healthState === "breach") return 1;

            if(topicA < topicB) return -1;
            if(topicA > topicB) return 1;
            return 0;
        })

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
                                '<li class="node-info {{healthState}}" style="width: 300px; min-height: 200px !important">' +
                                    '<span class="fa fa-tag" style="vertical-align: top;"></span>' +
                                    '<div class="item-text" style="font-weight:bold; word-wrap: break-word; width:275px">{{topicName}}</div><br />'+  
                                    '<span class="fa fa-list-alt"></span><div class="item-text" style="font-weight:bold; margin:10px">Partitions</div>'+ 
                                    '{{#partitions}}'+
                                        '<div class="node-item {{leaderHealthState}}">' + 
                                            '<div style="display:inline-block;width:50px">' +
                                            '<span class="fa fa-slack"></span><div class="item-text">{{partitionId}}</div>' + 
                                            '</div>' + 
                                            '{{#alert}}' +
                                                '<div style="display:inline-block">' +
                                                '<span class="fa fa-exclamation-triangle"></span><div class="item-text" style="font-weight:bold">{{leader}}</div>' + 
                                                '</div>' + 
                                            '{{/alert}}' +
                                            '{{^alert}}' +
                                                '<div style="display:inline-block">' +
                                                '<span class="fa fa-smile-o"></span><div class="item-text">Leader: {{leader}}</div>' + 
                                                '</div>' + 
                                            '{{/alert}}' +
                                        '</div>' +
                                    '{{/partitions}}' +
                                    '<br /><span class="fa fa-users"></span><div class="item-text" style="font-weight:bold; margin:10px;">Consumers</div>'+
                                    '{{#consumers}}'+
                                        '<div class="node-item info"><span class="fa fa-user"></span><div class="item-text">{{.}}</div></div>' +
                                    '{{/consumers}}' +
                                '</li>' +                                
                            '{{/topics}}' +
                        '</ul>' +
                    '</div>', viewModel)));
            }
        };
    };
})();

