const jwt = require('jsonwebtoken');
const { User, Role, Group } = require('../models');

const verifyToken = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user with roles and groups
        const user = await User.findByPk(decoded.id, {
            include: [
                { model: Role, through: { attributes: [] } },
                { model: Group, through: { attributes: [] } }
            ]
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        req.user = user;
        req.userId = decoded.id;
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Failed to authenticate token' });
    }
};

// Middleware to require specific role
const requireRole = (roleName) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const hasRole = await req.user.hasRole(roleName);
        if (!hasRole) {
            return res.status(403).json({ message: `Requires ${roleName} role` });
        }
        next();
    };
};

// Middleware to require specific group
const requireGroup = (groupName) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const inGroup = await req.user.inGroup(groupName);
        if (!inGroup) {
            return res.status(403).json({ message: `Requires ${groupName} group membership` });
        }
        next();
    };
};

// Middleware to require specific permission
const requirePermission = (permissionName) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const can = await req.user.can(permissionName);
        if (!can) {
            return res.status(403).json({ message: `Requires ${permissionName} permission` });
        }
        next();
    };
};

module.exports = verifyToken;
module.exports.requireRole = requireRole;
module.exports.requireGroup = requireGroup;
module.exports.requirePermission = requirePermission;
