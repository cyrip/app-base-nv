const { Group, User } = require('../models');

class GroupController {
    // GET /api/groups - List all groups
    async getGroups(req, res) {
        try {
            const groups = await Group.findAll();
            res.json(groups);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // POST /api/groups - Create group
    async createGroup(req, res) {
        try {
            const { name, description } = req.body;

            if (!name) {
                return res.status(400).json({ message: 'Group name is required' });
            }

            const group = await Group.create({ name, description });
            res.status(201).json(group);
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ message: 'Group already exists' });
            }
            res.status(500).json({ error: error.message });
        }
    }

    // PUT /api/groups/:id - Update group
    async updateGroup(req, res) {
        try {
            const { name, description } = req.body;
            const group = await Group.findByPk(req.params.id);

            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            if (name) group.name = name;
            if (description !== undefined) group.description = description;

            await group.save();
            res.json(group);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // DELETE /api/groups/:id - Delete group
    async deleteGroup(req, res) {
        try {
            const group = await Group.findByPk(req.params.id);

            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            await group.destroy();
            res.json({ message: 'Group deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new GroupController();
