(function() {
    var listOfConnections = $('#connections');
    var refreshTimer;

    $('#identify-screens').on('click', function() {
        $.get('/admin/command/identify');
    });

    listOfConnections
        .on('click', '.set-name', function() {
            var li = $(this).parent();
            var input = $('input', li);

            $.get('/admin/command/setName/' + li.data('sessionId') + '/' + input.val(), function() {
                setTimeout(getConnections, 1500);
            });
        })
        .on('click', '.change-name', function() {
            $(this).closest('.view').addClass('hidden').siblings('.edit').removeClass('hidden');
        })
        .on('click', '.cancel-change-name', function() {
            $(this).closest('.edit').addClass('hidden').siblings('.view').removeClass('hidden');
        })
        .on('click', '.reload', function() {
            $.get('/admin/command/reload/' + $(this).parent().data('sessionId'), function() {
                setTimeout(getConnections, 1500);
            });
        });

    var getConnections = function() {
        clearTimeout(refreshTimer);

        $.get('/admin/connections', function(data) {
            var groupedConnections = _.groupBy(data.connections, function(connection) {
                return connection.name;
            });

            var sortedConnectionNames = _.chain(groupedConnections).map(function(item, key) {
                return key;
            }).sortBy(function(item) {
                var isNamed = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.exec(item);

                return isNamed ? item : '0' + item;
            }).reduce(function(memo, connectionName) {
                memo[connectionName] = groupedConnections[connectionName];

                return memo;
            }, {}).value();

            listOfConnections.children('li').addClass('to-delete');

            var lastItem;
            _.each(groupedConnections, function(item, key) {
                var id = key.toLowerCase().replace(/[\W]/g, "");
                var elementId = 'session-' + id;
                var existingItem = $('#' + elementId, listOfConnections).removeClass('to-delete');

                if(!existingItem.length) {
                    // var newItem = $('<li data-session-id="' + item.sessionId + '" id="session-' + item.sessionId + '"><input type="text" value="' + item.name + '" /> <button class="set-name">set name</button> <button class="reload">reload</button></li>');

                    var newItem = $(Mustache.render('<li id="{{connectionGroupId}}">'
                         + '<span class="view">'
                             + '<button class="change-name">change name</button>'
                             + '{{connectionGroupName}}'
                         + '</span>'
                         + '<span class="edit hidden">'
                             + '<button class="set-name">set name</button>'
                             + '<button class="cancel-change-name">cancel</button>'
                             + '<input type="text" value="{{connectionGroupName}}" />'
                         + '</span>'
                         + '<ul class="connection-list">{{#connections}}<li data-session-id="{{sessionId}}">{{sessionId}}<button class="reload">reload</button></li></li>{{/connections}}</ul>'
                         + '</li>', {
                        connectionGroupId: elementId,
                        connectionGroupName: key,
                        connections: groupedConnections[key]
                    }));

                    if(lastItem) {
                        newItem.insertAfter(lastItem);
                    }
                    else {
                        newItem.appendTo(listOfConnections);
                    }

                    lastItem = newItem;
                }
                else {

                    lastItem = existingItem;
                }

            });

            $('.to-delete', listOfConnections).remove();

            refreshTimer = setTimeout(getConnections, 10000);
        });
    };

    getConnections();
})();