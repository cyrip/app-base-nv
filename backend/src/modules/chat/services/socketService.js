const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const messageService = require('./messageService');
const chatService = require('./chatService');

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

    io.on('connection', async (socket) => {
        console.log(`User connected: ${socket.userId}`);
        userSockets.set(socket.userId, socket.id);

        // Broadcast user connected event
        io.emit('user-connected', { userId: socket.userId });

        // Send current online users to the new connection
        const onlineUsers = Array.from(userSockets.keys());
        socket.emit('online-users', onlineUsers);

        // Join channel rooms
        try {
            const channelIds = await chatService.listChannelIdsForUser(socket.userId);
            channelIds.forEach(id => socket.join(`channel-${id}`));
        } catch (error) {
            console.error('Failed to join channel rooms', error);
        }

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.userId}`);
            userSockets.delete(socket.userId);
            // Broadcast user disconnected event
            io.emit('user-disconnected', { userId: socket.userId });
        });

        // Handle private messages
        socket.on('private-message', async ({ toUserId, message }) => {
            const fromUserId = socket.userId;
            const toSocketId = userSockets.get(toUserId);

            const saved = await messageService.sendMessage(fromUserId, toUserId, message);

            if (toSocketId) {
                io.to(toSocketId).emit('private-message', saved);
            }
            socket.emit('private-message', saved);
            socket.emit('private-message-sent', { toUserId, success: true });
        });

        socket.on('channel:message', async ({ channelId, content }) => {
            try {
                const msg = await chatService.sendMessage(channelId, socket.userId, content);
                socket.join(`channel-${channelId}`);
                broadcastToChannel(channelId, 'channel:message', msg);
            } catch (error) {
                socket.emit('channel:error', { channelId, error: error.message });
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

const broadcastToChannel = (channelId, event, data) => {
    if (io) {
        io.to(`channel-${channelId}`).emit(event, data);
        return true;
    }
    return false;
};

module.exports = {
    init,
    sendToUser,
    broadcast,
    broadcastToChannel
};
