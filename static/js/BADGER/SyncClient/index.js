(function() {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.SyncClient');

    var commands = {
        reload: function() {
            window.location = window.location;
        },
        setName: function(name) {

        }
    };

    TLRGRP.BADGER.SyncClient =  function() {
        var socket = io.connect();
        var sessionId;
        var sessionName;

        socket.on('connectionHandshake', function(connectionDetails) {
            sessionId = connectionDetails.sessionId;

            socket.emit('nameConnection', {
                name: sessionName || sessionId
            });
        });

        socket.on('clientCommand', function(commandDetails) {
            commands[commandDetails.command]();
        });
    };
})();