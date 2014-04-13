var express = require('express');
var hbs = require('hbs');
var http = require('http');
var async = require('async');
var socketIo = require('socket.io');
var uuid = require('node-uuid');
var _ = require('lodash');

var SyncServer = function() {
    var connections = {};

    return {
        getListOfConnections: function() {
            return _.map(connections, function(connection, key) {

            });
        },
        start: function(socket, callback) {
            socket.sockets.on('connection', function(socket) {
                var sessionId = uuid.v1();

                connections[sessionId] = {
                    name: sessionId
                };

                socket.emit('connectionHandshake', {
                    sessionId: uuid.v1()
                });

                /*socket.emit('clientCommand', {
                    command: 'reload'
                });*/
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
    app.engine('html', hbs.__express);

    app.use("/static", express.static(__dirname + '/static'));

    app.get('/admin', function(req, res) {
        res.render('admin.hbs');
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
                        new SyncServer().start(socket, callback);
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