var socketIo = require('socket.io');
var http = require('http');

module.exports = function(app, options) {
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
