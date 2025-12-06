import { io } from "socket.io-client";
import { reactive } from "vue";

export const socketState = reactive({
    connected: false,
    messages: [],
    onlineUsers: new Set(),
});

let socket;

export const initSocket = (token) => {
    if (socket) return;

    const URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

    socket = io(URL, {
        auth: {
            token: token,
        },
        transports: ["websocket"], // Force WebSocket to avoid polling issues
    });

    socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
        socketState.connected = true;
    });

    socket.on("disconnect", () => {
        console.log("Socket disconnected");
        socketState.connected = false;
    });

    socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
        socketState.connected = false;
    });

    // Listen for global broadcast events
    socket.on("job-created", (data) => {
        console.log("Job created event:", data);
        socketState.messages.unshift({
            id: Date.now(),
            type: "info",
            content: `New Job: ${data.task} (ID: ${data.jobId})`,
            timestamp: new Date().toLocaleTimeString(),
        });
    });

    // Listen for generic messages
    socket.on("message", (data) => {
        console.log("Message received:", data);
        socketState.messages.unshift({
            id: Date.now(),
            type: "message",
            content: data,
            timestamp: new Date().toLocaleTimeString(),
        });
    });

    // Online status events
    socket.on("online-users", (users) => {
        socketState.onlineUsers = new Set(users);
    });

    socket.on("user-connected", ({ userId }) => {
        socketState.onlineUsers.add(userId);
    });

    socket.on("user-disconnected", ({ userId }) => {
        socketState.onlineUsers.delete(userId);
    });

    socket.on("private-message", (data) => {
        console.log("Private message received:", data);
        socketState.messages.unshift({
            id: Date.now(),
            type: "private",
            content: `From User ${data.fromUserId}: ${data.message}`,
            timestamp: new Date(data.timestamp).toLocaleTimeString(),
        });
    });
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
        socketState.connected = false;
    }
};

export const sendPrivateMessage = (toUserId, message) => {
    if (socket) {
        socket.emit('private-message', { toUserId, message });
    }
};

export const getSocket = () => socket;
