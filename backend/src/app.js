const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const groupRoutes = require('./routes/groups');
const permissionRoutes = require('./routes/permissions');
const languageRoutes = require('./routes/languages');
const messageRoutes = require('./modules/chat/routes/messages');
const channelRoutes = require('./modules/chat/routes/channels');
const moduleRoutes = require('./modules/moduleAdmin/routes/modules');

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/roles', roleRoutes);
app.use('/groups', groupRoutes);
app.use('/permissions', permissionRoutes);
app.use('/languages', languageRoutes);
app.use('/messages', messageRoutes);
app.use('/channels', channelRoutes);
app.use('/modules', moduleRoutes);

module.exports = app;
