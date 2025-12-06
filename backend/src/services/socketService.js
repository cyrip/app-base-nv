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

        // Handle private messages
        socket.on('private-message', ({ toUserId, message }) => {
            const fromUserId = socket.userId;
            const toSocketId = userSockets.get(toUserId);

            if (toSocketId) {
                io.to(toSocketId).emit('private-message', {
                    fromUserId,
                    message,
                    timestamp: new Date()
                });
                // Confirm sent
                socket.emit('private-message-sent', { toUserId, success: true });
            } else {
                // User not found or offline
                socket.emit('private-message-sent', { toUserId, success: false, error: 'User offline or not found' });
            }
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
