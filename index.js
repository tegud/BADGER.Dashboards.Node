var express = require('express');
var hbs = require('hbs');
var http = require('http');
var async = require('async');
var _ = require('lodash');
var AppServer = require('./lib/AppServer');
var SyncServer = require('./lib/SyncServer');

var server = function() {
    var app = express();
    var httpServer;
    var sync;
    var applicationRoot = __dirname + (process.env.NODE_ENV === 'dev' ? '/' : '/dist/');

    app.set('view engine', 'html');
    app.set('views', applicationRoot + 'views');
    app.engine('html', hbs.__express);
    app.use("/static", express.static(applicationRoot + 'static'));

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
        if(req.originalUrl.indexOf('.') === -1) {
            return res.render('index.hbs');
        }

        next();
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
