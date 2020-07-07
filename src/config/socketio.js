module.exports = function (httpServer) {
    var allowedOrigins = "*:* *:*";

    const io = require('socket.io')(httpServer, {
        origins: allowedOrigins
    })

    var nsp = io.of('api/');

    nsp.on('connection', function(socket) {
        console.log(`Socket conectado: ${socket.id}`)

        socket.on('disconnect', (reason) => {
            console.log('socket desconectado '+socket.id);
        });
    });
}