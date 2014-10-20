(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    function buildViewModel(groups) {
        return {
            groups: _(groups).map(function (group, groupName) {
                return {
                    name: groupName,
                    servers: _(group).map(function (server, serverName) {
                        server.id = serverName.replace(/\./ig, '_');
                        server.name = server.id;

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
            setGroups: function (groups) {
                var viewModel = buildViewModel(groups);

                containerElement.html($(Mustache.render('<div class="health-check-error hidden"><div class="health-check-error-text-container"><h3>Warning</h3><div class="health-check-error-text"></div></div></div><ul class="health-check-groups">{{#groups}}<li class="health-check-group-item"><h4>{{name}}</h4><ul class="health-check-group-server-list">{{#servers}}<li class="health-check-group-server-item" id="{{id}}">{{name}}</li>{{/servers}}</ul></li>{{/groups}}</ul>', viewModel)));
            },
            updateStatus: function (groupData) {
                for (var group in groupData) {
                    for (var server in groupData[group]) {
                        var serverId = server.replace(/\./g, '_').toLowerCase();
                        var serverStatusElement = document.getElementById(serverId);

                        serverStatusElement.className = 'health-check-group-server-item ' + groupData[group][server].status.toLowerCase();
                    }
                }
            }
        };
    };
})();

