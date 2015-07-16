(function() {
    'use strict';

    TLRGRP.namespace('TLRGRP.BADGER.SyncClient');

    TLRGRP.BADGER.SyncClient =  function() {
        var socket = io.connect();
        var sessionId;
        var sessionName = $.cookie('boardName');
        var identifyTimeout;
        var messageTimeout;
        var lastDashboardEvent;

        function setIdentityDiv() {
            $('#identify').text(sessionName ? sessionName + (sessionId ? ' (' + sessionId.substr(0, 8) + ')' : '') : sessionId);
        }

        setIdentityDiv();

        var commands = {
            reload: function() {
                window.location = window.location;
            },
            setName: function(data) {
                sessionName = data.name;
                $.cookie('boardName', sessionName, { expires: 365 });
                setIdentityDiv();
            },
            identify: function() {
                clearTimeout(identifyTimeout);
                $('#identify').removeClass('hidden');
                identifyTimeout = setTimeout(function() {
                    $('#identify').addClass('hidden');
                }, 5000);
            },
            message: function(data) {
                clearTimeout(messageTimeout);
                $('#message').text(data.message);
                $('#message').removeClass('hidden');
                messageTimeout = setTimeout(function() {
                    $('#message').addClass('hidden');
                }, 25000);
            }
        };

        socket.on('connectionHandshake', function(connectionDetails) {
            $('#connection-indicator').addClass('connected');

            sessionId = connectionDetails.sessionId;
            setIdentityDiv();

            socket.emit('setConnectionProperties', {
                windowSize: {
                    width: $(window).width(),
                    height: $(window).height()
                },
                userAgent: window.navigator.userAgent
            });

            if(sessionName) {
                socket.emit('nameConnection', {
                    name: sessionName
                });
            }

            if(lastDashboardEvent) {
                socket.emit('viewSelected', lastDashboardEvent);
            }
        });

        TLRGRP.messageBus.subscribe('TLRGRP.BADGER.View.Selected', function(event) {
            lastDashboardEvent = event;
            socket.emit('viewSelected', event);
        });

        socket.on('clientCommand', function(commandDetails) {
            commands[commandDetails.command](commandDetails.data);
        });
    };
})();