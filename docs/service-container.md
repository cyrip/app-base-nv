# Service Container

The service container provides centralized access to application services throughout the Vue.js application.

## Available Services

### 1. Toast Service
Display toast notifications anywhere in your application.

**Methods:**
- `toast.success(message, duration?)` - Show success message
- `toast.error(message, duration?)` - Show error message
- `toast.warning(message, duration?)` - Show warning message
- `toast.info(message, duration?)` - Show info message
- `toast.show(message, type, duration?)` - Generic toast
- `toast.remove(id)` - Remove specific toast
- `toast.clear()` - Clear all toasts

### 2. Socket Service
Access WebSocket functionality.

**Properties:**
- `socket.state` - Reactive socket state (connected, messages, onlineUsers)

**Methods:**
- `socket.init(token)` - Initialize socket connection
- `socket.disconnect()` - Disconnect socket
- `socket.sendPrivateMessage(userId, message)` - Send private message

### 3. Auth Service
Access authentication store (Pinia).

**Properties:**
- `auth.user` - Current user
- `auth.token` - Auth token

**Methods:**
- `auth.login(email, password)` - Login
- `auth.logout()` - Logout

## Usage in Components

```vue
<script setup>
import { useServices } from '@/services/serviceContainer';

const { toast, socket, auth } = useServices();

// Show toast notification
const handleSuccess = () => {
  toast.success('Operation completed!');
};

const handleError = () => {
  toast.error('Something went wrong!', 10000); // 10 seconds
};

// Send private message
const sendMessage = (userId, message) => {
  socket.sendPrivateMessage(userId, message);
  toast.info('Message sent!');
};
</script>
```

## Example: UserManagement.vue

```vue
<script setup>
import { useServices } from '@/services/serviceContainer';

const { toast } = useServices();

const sendMessage = () => {
  // ... send logic
  toast.success('Message sent successfully!');
};
</script>
```

## Adding New Services

To add a new service to the container:

1. Create your service file in `src/services/`
2. Register it in `serviceContainer.js`:

```javascript
// In serviceContainer.js init() method
this.register('myService', myServiceInstance);
```

3. Add to useServices() composable:

```javascript
export function useServices() {
  return {
    toast: serviceContainer.get('toast'),
    socket: serviceContainer.get('socket'),
    auth: useAuthStore(),
    myService: serviceContainer.get('myService') // Add here
  };
}
```
