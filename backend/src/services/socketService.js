const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

let io;
const userSockets = new Map(); // Map<userId, socketId>

const init = (server) => {
    io = socketIo(server, {
        cors: {
            origin: process.env.CLIENT_URL || '*',
            methods: ['GET', 'POST']
        }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return next(new Error('Authentication error'));
            }
            socket.userId = decoded.id;
            next();
        });
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.userId}`);
        userSockets.set(socket.userId, socket.id);

        // Broadcast user connected event
        io.emit('user-connected', { userId: socket.userId });

        // Send current online users to the new connection
        const onlineUsers = Array.from(userSockets.keys());
        socket.emit('online-users', onlineUsers);

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.userId}`);
            userSockets.delete(socket.userId);
            // Broadcast user disconnected event
            io.emit('user-disconnected', { userId: socket.userId });
        });
    });
};

const sendToUser = (userId, event, data) => {
    const socketId = userSockets.get(userId);
    if (socketId && io) {
        io.to(socketId).emit(event, data);
        return true;
    }
    return false;
};

const broadcast = (event, data) => {
    if (io) {
        io.emit(event, data);
        return true;
    }
    return false;
};

module.exports = {
    init,
    sendToUser,
    broadcast
};
