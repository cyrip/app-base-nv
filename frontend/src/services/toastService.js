import { reactive } from 'vue';

/**
 * Toast Service
 * Provides toast notification functionality across the application
 */
class ToastService {
    constructor() {
        this.state = reactive({
            toasts: []
        });
        this.nextId = 1;
    }

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - Type of toast: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in milliseconds (default: 5000)
     */
    show(message, type = 'info', duration = 5000) {
        const id = this.nextId++;
        const toast = {
            id,
            message,
            type,
            timestamp: new Date().toLocaleTimeString()
        };

        this.state.toasts.unshift(toast);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }

        return id;
    }

    success(message, duration = 5000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 5000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }

    remove(id) {
        const index = this.state.toasts.findIndex(t => t.id === id);
        if (index > -1) {
            this.state.toasts.splice(index, 1);
        }
    }

    clear() {
        this.state.toasts = [];
    }
}

export const toastService = new ToastService();
