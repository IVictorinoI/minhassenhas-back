module.exports = function (httpServer) {
    const io = require('socket.io')(httpServer, {
        cors: { origin: '*' },
        allowEIO3: true
    })

    var nsp = io.of('api/');

    nsp.on('connection', function(socket) {
        console.log(`Socket conectado: ${socket.id}`)

        socket.on('disconnect', (reason) => {
            console.log('socket desconectado '+socket.id);
        });
    });
    return io
}
