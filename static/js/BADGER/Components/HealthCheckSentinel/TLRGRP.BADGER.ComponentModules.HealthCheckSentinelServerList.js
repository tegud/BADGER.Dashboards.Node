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

    function buildViewModel(serverSet, groups) {
        return {
            groups: _(groups).map(function (group, groupName) {
                return {
                    name: groupName,
                    servers: _(group).map(function (server, serverName) {
                        server.id = buildId(serverSet, groupName, serverName);
                        server.name = abbreviate(serverName, 3);

                        return server;
                    })
                };
            })
        };
    }
    
    TLRGRP.BADGER.Dashboard.ComponentModules.HealthCheckSentinelServerList = function () {
        var containerElement = $('<div class="health-check-server-groups-container"></div>');

        return {
            appendTo: function(componentElement) {
                componentElement.append(containerElement);
            },
            appendToLocation: function() {
                return 'content';
            },
            updateStatus: function (serverSet, groupData) {
                var viewModel = buildViewModel(serverSet, groupData);

                containerElement.html($(Mustache.render(
                    '<div class="health-check-error hidden">'+
                        '<div class="health-check-error-text-container">'+
                            '<h3>Warning</h3>'+
                            '<div class="health-check-error-text">'+
                            '</div>'+
                        '</div>'+
                    '</div>'+
                    '<ul class="health-check-groups">'+
                        '{{#groups}}'+
                            '<li class="health-check-group-item">'+
                                '<h4>{{name}}</h4>'+
                                '<ul class="health-check-group-server-list">'+
                                    '{{#servers}}'+
                                        '<li class="health-check-group-server-item" id="{{id}}">{{name}}</li>'+
                                    '{{/servers}}'+
                                '</ul>'+
                            '</li>'+
                        '{{/groups}}'+
                    '</ul>', viewModel)));

                for (var group in groupData) {
                    for (var server in groupData[group]) {
                        var serverId = buildId(serverSet, group, server);
                        var serverStatusElement = document.getElementById(serverId);

                        serverStatusElement.className = 'health-check-group-server-item ' + groupData[group][server].status.toLowerCase();
                    }
                }
            }
        };
    };
})();

