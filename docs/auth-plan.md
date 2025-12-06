# Authorization System Design Plan

## Overview
We will implement a robust Role-Based Access Control (RBAC) system extended with Groups to manage user permissions effectively. This system will allow users to have multiple roles and belong to multiple groups, providing granular control over access to resources.

## Database Schema

### 1. Users Table (Existing)
- `id`: Integer, PK
- `email`: String, Unique
- `password`: String (Hashed)
- `created_at`, `updated_at`
- *Remove*: `role` column (will be migrated to the pivot table).

### 2. Roles Table (New)
Defines the specific functions a user can perform.
- `id`: Integer, PK
- `name`: String, Unique (e.g., 'admin', 'editor', 'viewer')
- `description`: String
- `created_at`, `updated_at`

### 3. Groups Table (New)
Defines collections of users (e.g., 'Engineering', 'Sales', 'Project A').
- `id`: Integer, PK
- `name`: String, Unique
- `description`: String
- `created_at`, `updated_at`

### 4. Permissions Table (New)
Defines granular actions (e.g., 'create_post', 'delete_user').
- `id`: Integer, PK
- `name`: String, Unique (e.g., 'user.create', 'report.view')
- `description`: String
- `created_at`, `updated_at`

### 5. Pivot Tables

#### `user_roles`
- `user_id`: FK -> Users.id
- `role_id`: FK -> Roles.id
- Primary Key: (`user_id`, `role_id`)

#### `user_groups`
- `user_id`: FK -> Users.id
- `group_id`: FK -> Groups.id
- Primary Key: (`user_id`, `group_id`)

#### `role_permissions`
- `role_id`: FK -> Roles.id
- `permission_id`: FK -> Permissions.id
- Primary Key: (`role_id`, `permission_id`)

## Relationships

- **User** belongs to many **Roles** (`User.belongsToMany(Role)`).
- **Role** belongs to many **Users** (`Role.belongsToMany(User)`).
- **User** belongs to many **Groups** (`User.belongsToMany(Group)`).
- **Group** belongs to many **Users** (`Group.belongsToMany(User)`).

## Authorization Logic

### Middleware (`auth.js`)
We will update the authentication middleware to load the user's roles and groups into the `req.user` object.

```javascript
// Example usage in routes
router.get('/admin', requireRole('admin'), adminController.index);
router.get('/project-a', requireGroup('Project A'), projectController.index);
```

### Helper Functions
- `user.hasRole('admin')`: Checks if user has a specific role.
- `user.inGroup('engineering')`: Checks if user is in a specific group.
- `user.can('edit_post')`: Checks if user has a permission (via roles).

## Implementation Steps

1.  **Create Models**: Define `Role`, `Group`, `UserRole`, `UserGroup` models in Sequelize.
2.  **Migration**:
    - Create new tables.
    - Migrate existing `role` column data to `user_roles` table.
    - Remove `role` column from `Users` table.
3.  **Update User Model**: Define associations.
4.  **Seed Data**: Create default roles ('admin', 'user') and groups.
5.  **Middleware Update**: Enhance `verifyToken` to fetch roles/groups.
6.  **Frontend Update**: Update UI to reflect multiple roles/groups (e.g., badges in User Management).

## Future Considerations
- **Hierarchical Roles**: Roles inheriting from other roles.
- **Group Roles**: Assigning roles to a group (e.g., everyone in 'Admins' group gets 'admin' role).
