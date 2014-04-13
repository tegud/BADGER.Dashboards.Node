var express = require('express');
var http = require('http');
var async = require('async');
var fs = require('fs');
var socketIo = require('socket.io');

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

    app.use("/static", express.static(__dirname + '/static'));

    app.get(/^(.*)$/, function(req, res, next){
        if(req.url.indexOf('/static') === 0) {
            next();
        }

        res.send(fs.readFileSync(__dirname + '/static/index.html', { encoding: 'utf-8' }));
    });


    return {
        start: function(options, callback) {
            httpServer = new AppServer(app, options);

            async.waterfall([
                    httpServer.start,
                    function(http, socket) {
                        sync = socket;

                        socket.sockets.on('connection', function(socket) {
                            console.log('client connected...');
                        });
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