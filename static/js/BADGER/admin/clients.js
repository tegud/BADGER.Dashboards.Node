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

    function connectionIsNamed(name) {
        return !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.exec(name) &&
            !/^(\d\d?)|(1\d\d)|(0\d\d)|(2[0-4]\d)|(2[0-5])\.(\d\d?)|(1\d\d)|(0\d\d)|(2[0-4]\d)|(2[0-5])\.(\d\d?)|(1\d\d)|(0\d\d)|(2[0-4]\d)|(2[0-5])$/.exec(name);
    }

    var getConnections = function() {
        clearTimeout(refreshTimer);

        $.get('/admin/connections', function(data) {
            var groupedConnections = _.groupBy(data.connections, function(connection) {
                var isNamed = connectionIsNamed(connection.name);
                
                return isNamed ? connection.name : connection.ip;
            });

            var sortedConnectionNames = _.chain(groupedConnections).map(function(item, key) {
                return key;
            }).sortBy(function(item) {
                var isNamed = connectionIsNamed(item);

                return isNamed ? item : 'zzzzzzz' + item;
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
                    var newItem = $(Mustache.render('<li id="{{connectionGroupId}}">'
                         + '<span class="view">'
                             + '<button class="change-name">Change Name</button>'
                             + '{{connectionGroupName}} ({{connections.0.ip}})'
                         + '</span>'
                         + '<span class="edit hidden">'
                             + '<button class="set-name">Set Name</button>'
                             + '<button class="cancel-change-name">Cancel</button>'
                             + '<input type="text" value="{{connectionGroupName}}" />'
                         + '</span>'
                         + '<ul class="connection-list">{{#connections}}<li data-session-id="{{sessionId}}">'
                         + '<div>{{sessionId}} ({{ip}})<button class="reload">Reload</button></div>'
                         + '<div>Url: {{currentView.url}}<button class="set-url">Set Url</button></div>'
                         + '</li></li>{{/connections}}</ul>'
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