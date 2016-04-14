(function () {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.Dashboard.ComponentModules');

    function buildViewModel(groupName, results) {
        return {
            name: groupName,
            servers: _.map(results, function (result) {
                return {
                    state: result.last_check_state,
                    name: result.name,
                    id: result.id
                }
            })
        };
    }

    TLRGRP.BADGER.Dashboard.ComponentModules.HealthCheckIcingaServerList = function (groups) {
        var containerElement = $(
            '<div class="health-check-server-groups-container">' +
            '<div class="health-check-error hidden">' +
            '<div class="health-check-error-text-container">' +
            '<h3>Warning</h3>' +
            '<div class="health-check-error-text">' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<ul class="health-check-groups">' +
            '<li class="health-check-group-item Web">' +
            '<h4>Web</h4>' +
            '<ul class="health-check-group-server-list">' +
            '</ul>' +
            '</li>' +
            '<li class="health-check-group-item SSL">' +
            '<h4>SSL</h4>' +
            '<ul class="health-check-group-server-list">' +
            '</ul>' +
            '</li>' +
            '<li class="health-check-group-item AU">' +
            '<h4>AU</h4>' +
            '<ul class="health-check-group-server-list">' +
            '</ul>' +
            '</li>' +
            '</ul>' +
            '</div>');

        return {
            appendTo: function (componentElement) {
                componentElement.append(containerElement);
            },
            appendToLocation: function () {
                return 'content';
            },
            updateStatus: function (groupName, results) {
                var viewModel = buildViewModel(groupName, results);

                var groupElement = $('.' + groupName)
                var result = $(Mustache.render(
                    '<h4>{{name}}</h4>' +
                    '<ul class="health-check-group-server-list">' +
                    '{{#servers}}' +
                    '<li class="health-check-group-server-item" id="{{id}}">{{id}}</li>' +
                    '{{/servers}}', buildViewModel(groupName, results)))
                groupElement.html(result);

                for (var i = results.length - 1; i >= 0; i--) {
                    var serverId = results[i].id
                    var serverStatusElement = document.getElementById(serverId);

                    serverStatusElement.className = 'health-check-group-server-item ' + results[i].last_check_state.toLowerCase();
                }

            }
        };
    };
})();
