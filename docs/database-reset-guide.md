# Database Reset Guide

## Overview
This guide explains how to reset the database and reseed it with fresh data.

## Quick Reset

Run this command in Docker:
```bash
docker-compose exec -T backend npm run db:reset
```

Then restart the backend:
```bash
docker-compose restart backend
```

## What the Reset Does

1. **Drops all tables** - Removes all existing data
2. **Creates fresh tables** - Recreates all tables with current schema
3. **Runs migrations** - Applies all database migrations including:
   - Language column
   - Message schema
   - User soft delete
   - Channel encryption columns
   - Message encryption columns
   - UserPublicKeys table
   - ChannelSessionKeys table
   - Null fromUserId support
4. **Seeds data** - Populates with default data:
   - Languages (English, Spanish, German, Hungarian)
   - Default users
   - Default roles (admin, user)

## Default Users Created

After reset, you can log in with:

- **Admin User**
  - Email: `admin@codeware.cc`
  - Password: `password`

- **Regular User**
  - Email: `user@codeware.cc`
  - Password: `password`

## When to Reset

Reset the database when you need to:
- Clear all test data
- Apply new schema changes
- Fix database inconsistencies
- Start fresh with clean data
- Test the application from scratch

## Manual Steps (Alternative)

If you prefer to run steps manually:

1. Connect to the backend container:
   ```bash
   docker-compose exec backend sh
   ```

2. Run the reset script:
   ```bash
   node reset-db.js
   ```

3. Exit and restart:
   ```bash
   exit
   docker-compose restart backend
   ```

## After Reset

1. **Clear browser data** - Clear localStorage and IndexedDB:
   - Open DevTools (F12)
   - Go to Application tab
   - Clear Storage → Clear site data

2. **Refresh the frontend** - Hard refresh (Ctrl+Shift+R)

3. **Log in again** - Use one of the default accounts

4. **Generate new encryption keys** - If testing E2E encryption:
   - Go to chat
   - Open key management modal
   - Generate new keys

## Troubleshooting

### Backend won't start after reset
- Check logs: `docker-compose logs backend`
- Ensure MySQL is running: `docker-compose ps`
- Try full restart: `docker-compose restart`

### Frontend shows old data
- Clear browser cache and localStorage
- Hard refresh (Ctrl+Shift+R)
- Check if you're logged in with correct user

### Encryption keys still exist
- Clear IndexedDB in browser DevTools
- Application → IndexedDB → Delete ChatEncryptionDB
- Refresh page

## Script Location

The reset script is located at:
- `backend/reset-db.js`

The npm script is defined in:
- `backend/package.json` → `"db:reset": "node reset-db.js"`
