import { defineStore } from 'pinia';
import axios from 'axios';
import { useAuthStore } from '../../auth/stores/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useLlmStore = defineStore('llm', {
  state: () => ({
    agents: [],
    conversations: [],
    messages: [],
    currentConversationId: null,
    pollIntervalId: null,
    pollTimeoutId: null,
    loading: false,
    error: ''
  }),
  actions: {
    authHeaders() {
      const authStore = useAuthStore();
      const token = authStore.token || localStorage.getItem('token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
    stopPolling() {
      if (this.pollIntervalId) {
        clearInterval(this.pollIntervalId);
        this.pollIntervalId = null;
      }
      if (this.pollTimeoutId) {
        clearTimeout(this.pollTimeoutId);
        this.pollTimeoutId = null;
      }
    },
    startPolling(conversationId, durationMs = 15000, intervalMs = 1500) {
      this.stopPolling();
      if (!conversationId) return;
      this.pollIntervalId = setInterval(() => {
        this.fetchMessages(conversationId);
      }, intervalMs);
      this.pollTimeoutId = setTimeout(() => {
        this.stopPolling();
      }, durationMs);
    },
    async fetchAgents() {
      this.loading = true;
      this.error = '';
      try {
        const res = await axios.get(`${API_URL}/llm/agents`, { headers: this.authHeaders() });
        this.agents = res.data || [];
      } catch (e) {
        this.error = e.response?.data?.error || e.message;
      } finally {
        this.loading = false;
      }
    },
    async createAgent(payload) {
      this.error = '';
      const res = await axios.post(`${API_URL}/llm/agents`, payload, { headers: this.authHeaders() });
      this.agents.push(res.data);
      return res.data;
    },
    async updateAgent(id, payload) {
      this.error = '';
      const res = await axios.put(`${API_URL}/llm/agents/${id}`, payload, { headers: this.authHeaders() });
      this.agents = this.agents.map((a) => (a.id === id ? res.data : a));
      return res.data;
    },
    async fetchConversations() {
      this.loading = true;
      this.error = '';
      try {
        const res = await axios.get(`${API_URL}/llm/conversations`, { headers: this.authHeaders() });
        this.conversations = res.data || [];
      } catch (e) {
        this.error = e.response?.data?.error || e.message;
      } finally {
        this.loading = false;
      }
    },
    async createConversation(payload) {
      this.error = '';
      const res = await axios.post(`${API_URL}/llm/conversations`, payload, { headers: this.authHeaders() });
      this.conversations.unshift(res.data);
      return res.data;
    },
    async deleteConversation(id) {
      this.error = '';
      await axios.delete(`${API_URL}/llm/conversations/${id}`, { headers: this.authHeaders() });
      this.conversations = this.conversations.filter((c) => c.id !== id);
      if (this.messages.length && this.currentConversationId === id) {
        this.messages = [];
      }
      this.currentConversationId = this.currentConversationId === id ? null : this.currentConversationId;
    },
    async fetchMessages(conversationId) {
      this.loading = true;
      this.error = '';
      try {
        const res = await axios.get(`${API_URL}/llm/conversations/${conversationId}/messages`, { headers: this.authHeaders() });
        this.messages = res.data || [];
        this.currentConversationId = conversationId;
      } catch (e) {
        this.error = e.response?.data?.error || e.message;
      } finally {
        this.loading = false;
      }
    },
    async startConversation(conversationId, initialPrompt, rounds = 1, delayMs = 0) {
      this.error = '';
      this.loading = true;
      // Begin polling immediately so replies show as they are written
      const extraDelay = Math.max(0, Number(delayMs) || 0) + 1000;
      this.startPolling(conversationId, extraDelay + 8000, 1200);
      try {
        const res = await axios.post(
          `${API_URL}/llm/conversations/${conversationId}/start`,
          { initialPrompt, rounds, delayMs },
          { headers: this.authHeaders() }
        );
        // Optimistically append returned messages (if any), then refresh
        const newMsgs = res.data?.messages || [];
        if (newMsgs.length) {
          this.messages.push(...newMsgs);
        }
        await this.fetchMessages(conversationId);
        // Follow-up refresh after delay window to ensure all turns show
        setTimeout(() => this.fetchMessages(conversationId), extraDelay);
        return newMsgs;
      } catch (e) {
        this.error = e.response?.data?.error || e.message;
        throw e;
      } finally {
        this.loading = false;
      }
    },
    async sendMessage(conversationId, payload) {
      this.error = '';
      const res = await axios.post(`${API_URL}/llm/conversations/${conversationId}/messages`, payload, { headers: this.authHeaders() });
      if (res.data?.userMsg) this.messages.push(res.data.userMsg);
      if (res.data?.llmMsg) this.messages.push(res.data.llmMsg);
       // Ensure synced with backend ordering
       await this.fetchMessages(conversationId);
       this.startPolling(conversationId);
      return res.data;
    },
    async deleteAgent(id) {
      this.error = '';
      await axios.delete(`${API_URL}/llm/agents/${id}`, { headers: this.authHeaders() });
      this.agents = this.agents.filter((a) => a.id !== id);
    }
  }
});
