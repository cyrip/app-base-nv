import { defineStore } from 'pinia';
import axios from 'axios';
import { useAuthStore } from '../../auth/stores/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const applyThemeConfig = (config, key = '') => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = key || '';
  Object.entries(config || {}).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });
};

export const useThemeStore = defineStore('theme', {
  state: () => ({
    themes: [],
    activeTheme: null,
    loading: false,
    error: ''
  }),
  actions: {
    async fetchThemes() {
      const authStore = useAuthStore();
      const token = authStore.token || localStorage.getItem('token');
      if (!token) return;
      this.loading = true;
      this.error = '';
      try {
        const res = await axios.get(`${API_URL}/themes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        this.themes = res.data || [];
        this.activeTheme = this.themes.find((t) => t.isActive) || null;
        if (this.activeTheme?.config) {
          applyThemeConfig(this.activeTheme.config, this.activeTheme.key);
        }
      } catch (e) {
        this.error = e.response?.data?.message || e.message;
      } finally {
        this.loading = false;
      }
    },
    async activateTheme(id) {
      const authStore = useAuthStore();
      const token = authStore.token || localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const res = await axios.put(
        `${API_URL}/themes/${id}/activate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      this.themes = this.themes.map((t) => ({ ...t, isActive: t.id === id }));
      this.activeTheme = res.data;
      if (res.data?.config) {
        applyThemeConfig(res.data.config, res.data.key);
      }
      return res.data;
    }
  }
});
