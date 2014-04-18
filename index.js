var express = require('express');
var hbs = require('hbs');
var http = require('http');
var async = require('async');
var socketIo = require('socket.io');
var uuid = require('node-uuid');
var _ = require('lodash');

var SyncServer = function() {
    var connections = {};
    var sockets = {};

    return {
        getListOfConnections: function() {
            return _.map(connections, function(connection, key) {
                return _.clone(connection);
            });
        },
        setSessionName: function(sessionId, name) {
            connections[sessionId].name = name;

            sockets[sessionId].emit('clientCommand', {
                command: 'setName',
                data: {
                    name: name
                }
            });
        },
        reloadScreen: function(sessionId) {
            sockets[sessionId].emit('clientCommand', {
                command: 'reload'
            });
        },
        identify: function() {
            _.each(sockets, function(socket) {
                socket.emit('clientCommand', {
                    command: 'identify'
                });
            });
        },
        start: function(socket, callback) {
            socket.sockets.on('connection', function(socket) {
                var sessionId = uuid.v4();

                sockets[sessionId] = socket;

                connections[sessionId] = {
                    name: sessionId,
                    sessionId: sessionId
                };

                socket.emit('connectionHandshake', {
                    sessionId: sessionId
                });

                socket.on('nameConnection', function(data) {
                    connections[sessionId].name = data.name;
                });

                socket.on('disconnect', function() {
                    delete connections[sessionId];
                    delete sockets[sessionId];
                });
            });

            callback();
        }
    };
};

var AppServer = function(app, options) {
    var httpServer = http.createServer(app);
    var sync = socketIo.listen(httpServer);

    return {
        start: function(callback) {
            httpServer.listen(options.port, function(err) {
                callback(err, httpServer, sync);
            });
        },
        stop: function(callback) {
            httpServer.close(callback);
        }
    };
};

var server = function() {
    var app = express();
    var httpServer;
    var sync;

    app.set('view engine', 'html');
    app.set('views', __dirname + '/dist/views');
    app.engine('html', hbs.__express);

    app.use("/static", express.static(__dirname + '/dist/static'));

    app.get('/admin', function(req, res) {
        res.render('admin.hbs');
    });

    app.get('/admin/connections', function(req, res) {
        res.send({
            connections: sync.getListOfConnections()
        });
    });

    app.get('/admin/command/setName/:session/:name', function(req, res) {
        sync.setSessionName(req.params.session, req.params.name);
        res.send();
    });

    app.get('/admin/command/reload/:session', function(req, res) {
        sync.reloadScreen(req.params.session);
        res.send();
    });

    app.get('/admin/command/identify', function(req, res) {
        sync.identify();
        res.send();
    });

    app.get(/^(.*)$/, function(req, res, next){
        if(req.url.indexOf('/static') === 0) {
            next();
        }
        res.render('index.hbs');
    });

    return {
        start: function(options, callback) {
            httpServer = new AppServer(app, options);

            async.waterfall([
                    httpServer.start,
                    function(http, socket, callback) {
                        sync = new SyncServer();
                        sync.start(socket, callback);
                    }
                ],
                function(err, http, socket) {
                    (callback || function() {})(err);
                });
        },
        stop: function(callback) {
            httpServer.stop(callback);
        }
    };
};

if(require.main === module) {
    new server().start({
        port: 1234
    });
}

module.exports = server;