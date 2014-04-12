var socket;

var collectEvents = function collectEvents(query) {

    if (socket) {
        socket.close();
        socket = undefined;
        $('.eventstable tbody').html("");
    }

    socket = new WebSocket("ws://10.44.35.20:1081/1.0/event/get");

    socket.onopen = function() {
        socket.send(JSON.stringify({
            "expression": query,
            "start": "2014-03-17",
            "limit": 200
        }));
    };

    var firstTime = true;
    var fieldNames = new Array();

    var flattenObject = function(ob) {
        var toReturn = {};

        for (var i in ob) {
            if (!ob.hasOwnProperty(i)) continue;

            if ((typeof ob[i]) == 'object') {
                var flatObject = flattenObject(ob[i]);
                for (var x in flatObject) {
                    if (!flatObject.hasOwnProperty(x)) continue;

                    toReturn[i + '.' + x] = flatObject[x];
                }
            } else {
                toReturn[i] = ob[i];
            }
        }
        return toReturn;
    };

    var MAP = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };

    var escapeHTML = function escapeHTML(s) {
        return s.replace(/[&<>]/g, function(c) {
            return MAP[c];
        });
    };

    var setupTableHeader = function setupTableHeader(messageBody) {
        if (firstTime) {
            firstTime = false;
            var tableHeaders = new Array();

            for (field in messageBody) {
                fieldNames.push(field);
                tableHeaders.push('<th>' + escapeHTML(field) + '</th>');
            }

            $('.eventstable thead').html(tableHeaders.join());
        }
    };

    var formatValue = function formatValue(obj) {
        if (obj == undefined) {
            return "undefined";
        }
        return escapeHTML(JSON.stringify(obj));
    };

    var collectFields = function collectFields(messageBody) {
        var data = new Array();

        for (field in fieldNames) {
            data.push('<td>' + formatValue(messageBody[fieldNames[field]]) + '</td>');
        }

        return data.join();
    };

    var addEventToTable = function addEventToTable(messageBody) {
        var tableRow = collectFields(messageBody);

        $('.eventstable tbody').prepend('<tr>' + tableRow + '</tr>');

        if ($('.eventstable tbody tr').length > 200) {
            $('.eventstable tbody tr:last-child').remove();
        }
    };

    socket.onmessage = function(message) {
        var messageBody = flattenObject(JSON.parse(message.data));

        setupTableHeader(messageBody);
        addEventToTable(messageBody);
    };
};

$(function() {
    $("#queryoptions").submit(function() {
        collectEvents($("input:first").val());
        return false;
    });
});
