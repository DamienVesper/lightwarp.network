const http = require(`http`);
const server = http.createServer();
const { Server } = require("socket.io");
const log = require(`./utils/log.js`)

const io = new Server(server, {
    cors: {
        origin: process.env.URL,
        methods: [`GET`, `POST`],
        credentials: true
    }
});

server.listen(4550, () => {
    log(`magenta`, `Socket.IO listening on Port 4550`);
});

io.on(`connection`, async (socket) => {
    log(`yellow`, `Widget Connection | IP: ${socket.handshake.address}.`);
    socket.emit(`handshake`)
})

const broadcast = (type, name, arg) => {
    if (type === `clearall`) io.sockets.emit(`clearall`);
    io.sockets.emit(type, { name, arg });
}

module.exports = broadcast;