import { defineStore } from 'pinia';
import axios from 'axios';
import { useAuthStore } from '../../auth/stores/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useModuleStore = defineStore('modules', {
  state: () => ({
    modules: [],
    loading: false,
    error: ''
  }),
  getters: {
    isEnabled: (state) => (key) => {
      if (!key) return true;
      const mod = state.modules.find((m) => m.key === key);
      return mod ? !!mod.enabled : true;
    },
    hasAccess: (state) => (key, userPermissions = []) => {
      const mod = state.modules.find((m) => m.key === key);
      if (!mod) return true;
      if (mod.Permissions && mod.Permissions.length > 0) {
        return mod.Permissions.some((p) => userPermissions.includes(p.name));
      }
      // If module has no explicit permission requirements, allow
      return true;
    }
  },
  actions: {
    async fetchModules() {
      const authStore = useAuthStore();
      const token = authStore.token || localStorage.getItem('token');
      if (!token) return;
      this.loading = true;
      this.error = '';
      try {
        const res = await axios.get(`${API_URL}/modules`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        this.modules = res.data || [];
      } catch (e) {
        this.error = e.response?.data?.message || e.message;
      } finally {
        this.loading = false;
      }
    },
    async updateModule(id, payload) {
      const authStore = useAuthStore();
      const token = authStore.token || localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const res = await axios.put(`${API_URL}/modules/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const idx = this.modules.findIndex((m) => m.id === id);
      if (idx !== -1) {
        this.modules[idx] = res.data;
      } else {
        this.modules.push(res.data);
      }
      return res.data;
    }
  }
});
