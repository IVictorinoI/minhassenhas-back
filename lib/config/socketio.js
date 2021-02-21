module.exports = function (httpServer) {
    var allowedOrigins = "*:* *:*";
    var io = require('socket.io')(httpServer, {
        origins: allowedOrigins
    });
    var nsp = io.of('api/');
    nsp.on('connection', function (socket) {
        console.log("Socket conectado: " + socket.id);
        socket.on('disconnect', function (reason) {
            console.log('socket desconectado ' + socket.id);
        });
    });
};
