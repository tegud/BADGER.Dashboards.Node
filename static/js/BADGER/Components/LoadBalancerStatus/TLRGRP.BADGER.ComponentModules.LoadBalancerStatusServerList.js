(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    function buildId(serverSet, group, name) {
        return serverSet.replace(/\./ig, '_').replace(/\s/ig, '_').toLowerCase()
            + group.replace(/\./ig, '_').replace(/\s/ig, '_').toLowerCase()
            + name.replace(/\./ig, '_').replace(/\s/ig, '_').replace(/:/ig, '_').toLowerCase();
    }

    function abbreviate(str, max, suffix)
    {
        if (str.match(/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]/ig)) {
            return str.split('.')[3].split(':')[0];
        }

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

    function buildViewModel(serverSet, pools) {
        return {
            pools: _(pools).map(function (pool, poolName) {
                var pool = {
                    name: poolName,
                    servers: _(pool.nodes).map(function (server, serverName) {
                        server.id = buildId(serverSet, poolName, server.node);
                        server.name = abbreviate(server.node, 3);

                        return server;
                    })
                };
                pool.servers.sort(function (a,b) { return a.name.localeCompare(b.name); });
                return pool;
            })
        };
    }
    
    TLRGRP.BADGER.Dashboard.ComponentModules.LoadBalancerStatusServerList = function () {
        var containerElement = $('<div class="health-check-server-groups-container"></div>');

        return {
            appendTo: function(componentElement) {
                componentElement.append(containerElement);
            },
            appendToLocation: function() {
                return 'content';
            },
            updateStatus: function (serverSet, poolStatus) {
                var viewModel = buildViewModel(serverSet, poolStatus);

                containerElement.html($(Mustache.render(
                    '<div class="health-check-error hidden">'+
                        '<div class="health-check-error-text-container">'+
                            '<h3>Warning</h3>'+
                            '<div class="health-check-error-text">'+
                            '</div>'+
                        '</div>'+
                    '</div>'+
                    '<ul class="health-check-groups">'+
                        '{{#pools}}'+
                            '<li class="health-check-group-item">'+
                                '<ul class="health-check-group-server-list">'+
                                    '{{#servers}}'+
                                        '<li class="health-check-group-server-item" id="{{id}}">{{name}}</li>'+
                                    '{{/servers}}'+
                                '</ul>'+
                            '</li>'+
                        '{{/pools}}'+
                    '</ul>', viewModel)));

                for (var group in poolStatus) {
                    var nodes = poolStatus[group].nodes;
                    for (var server in nodes) {
                        var serverId = buildId(serverSet, group, nodes[server].node);
                        var serverStatusElement = document.getElementById(serverId);

                        serverStatusElement.className = 'load-balancer-node-item ' + (nodes[server].status === undefined ? 'disabled' : nodes[server].status.toLowerCase());
                    }
                }
            }
        };
    };
})();

