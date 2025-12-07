# Message Debugging Guide

## Issue: Messages not appearing or not being received

### Step 1: Check if message is being saved to database

Open browser DevTools Console and check for:
1. Any errors when sending message
2. The response from the POST request to `/channels/:id/messages`

### Step 2: Check socket connection

In Console, check for:
```
Socket connected: <socket-id>
```

If you don't see this, the socket isn't connected.

### Step 3: Check if users are in the same channel

1. Log in as User 1
2. Go to chat
3. Check which channel is selected (look at the channel list)
4. Send a message
5. Log in as User 2 (different browser/incognito)
6. Go to chat
7. Select the SAME channel
8. Check if message appears

### Step 4: Check backend logs

Run:
```bash
docker-compose logs backend --tail=50
```

Look for:
- Message creation logs
- Socket broadcast logs
- Any errors

### Step 5: Manual database check

Connect to MySQL:
```bash
docker-compose exec db mysql -u root -ppassword app_db
```

Check messages:
```sql
SELECT * FROM Messages ORDER BY createdAt DESC LIMIT 10;
```

Check channels:
```sql
SELECT * FROM Channels;
```

Check channel participants:
```sql
SELECT * FROM ChannelParticipants;
```

### Common Issues:

1. **Users not in same channel**
   - Solution: Make sure both users select the same channel

2. **Socket not connected**
   - Solution: Refresh page, check backend is running

3. **Message saved but not received**
   - Solution: Check if user is in the channel room (backend logs)

4. **Message not saved at all**
   - Solution: Check backend logs for errors

### Quick Fix: Create a test channel

1. Log in as admin@codeware.cc
2. Click "New Channel"
3. Add user@codeware.cc as participant
4. Send a message
5. Log in as user@codeware.cc (different browser)
6. Select the same channel
7. Message should appear
8. Reply - admin should see it

### Debug Mode

Add this to Chat.vue to see what's happening:

```javascript
// In sendMessage function, after axios.post:
console.log('Message sent:', res.data);

// In socket listener:
socket.on('channel:message', async (msg) => {
  console.log('Received message via socket:', msg);
  // ... rest of code
});

// In loadMessages:
console.log('Loaded messages:', loadedMessages);
```
