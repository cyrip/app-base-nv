import { toastService } from './toastService';
import { socketState, initSocket, disconnectSocket, sendPrivateMessage } from './socket';
import { useAuthStore } from '../modules/auth/stores/auth';

/**
 * Service Container
 * Centralized access point for all application services
 */
class ServiceContainer {
    constructor() {
        this._services = new Map();
        this._initialized = false;
    }

    /**
     * Initialize the service container
     * Should be called once during app setup
     */
    init() {
        if (this._initialized) {
            console.warn('ServiceContainer already initialized');
            return;
        }

        // Register core services
        this.register('toast', toastService);
        this.register('socket', {
            state: socketState,
            init: initSocket,
            disconnect: disconnectSocket,
            sendPrivateMessage
        });

        this._initialized = true;
    }

    /**
     * Register a service
     * @param {string} name - Service name
     * @param {any} service - Service instance or object
     */
    register(name, service) {
        if (this._services.has(name)) {
            console.warn(`Service '${name}' is already registered. Overwriting.`);
        }
        this._services.set(name, service);
    }

    /**
     * Get a service by name
     * @param {string} name - Service name
     * @returns {any} Service instance
     */
    get(name) {
        if (!this._services.has(name)) {
            throw new Error(`Service '${name}' not found in container`);
        }
        return this._services.get(name);
    }

    /**
     * Check if a service exists
     * @param {string} name - Service name
     * @returns {boolean}
     */
    has(name) {
        return this._services.has(name);
    }

    /**
     * Get all registered service names
     * @returns {string[]}
     */
    getServiceNames() {
        return Array.from(this._services.keys());
    }
}

// Create singleton instance
export const serviceContainer = new ServiceContainer();

/**
 * Vue composable to access services
 * Usage in components:
 * 
 * import { useServices } from '@/services/serviceContainer';
 * 
 * const { toast, socket } = useServices();
 * toast.success('Hello!');
 */
export function useServices() {
    return {
        toast: serviceContainer.get('toast'),
        socket: serviceContainer.get('socket'),
        auth: useAuthStore()
    };
}
