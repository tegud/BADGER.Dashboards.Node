(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    function buildId(group, name) {
        return group.replace(/\./ig, '_').replace(/\s/ig, '_').toLowerCase()
            + name.replace(/\./ig, '_').replace(/\s/ig, '_').toLowerCase();
    }

    function buildViewModel(groups) {
        return {
            groups: _(groups).map(function (group, groupName) {
                return {
                    name: groupName,
                    servers: _(group).map(function (server, serverName) {
                        server.id = buildId(groupName, serverName);
                        server.name = serverName;

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
            updateStatus: function (groupData) {
                var viewModel = buildViewModel(groupData);

                containerElement.html($(Mustache.render('<div class="health-check-error hidden"><div class="health-check-error-text-container"><h3>Warning</h3><div class="health-check-error-text"></div></div></div><ul class="health-check-groups">{{#groups}}<li class="health-check-group-item"><h4>{{name}}</h4><ul class="health-check-group-server-list">{{#servers}}<li class="health-check-group-server-item" id="{{id}}">{{name}}</li>{{/servers}}</ul></li>{{/groups}}</ul>', viewModel)));

                for (var group in groupData) {
                    for (var server in groupData[group]) {
                        var serverId = buildId(group, server);
                        var serverStatusElement = document.getElementById(serverId);

                        serverStatusElement.className = 'health-check-group-server-item ' + groupData[group][server].status.toLowerCase();
                    }
                }
            }
        };
    };
})();

