import { defineStore } from 'pinia';
import axios from 'axios';
import { useAuthStore } from '../../auth/stores/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useLlmStore = defineStore('llm', {
  state: () => ({
    agents: [],
    conversations: [],
    messages: [],
    loading: false,
    error: ''
  }),
  actions: {
    authHeaders() {
      const authStore = useAuthStore();
      const token = authStore.token || localStorage.getItem('token');
      return token ? { Authorization: `Bearer ${token}` } : {};
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
      if (this.messages.length && id === this.currentConversationId) {
        this.messages = [];
      }
    },
    async fetchMessages(conversationId) {
      this.loading = true;
      this.error = '';
      try {
        const res = await axios.get(`${API_URL}/llm/conversations/${conversationId}/messages`, { headers: this.authHeaders() });
        this.messages = res.data || [];
      } catch (e) {
        this.error = e.response?.data?.error || e.message;
      } finally {
        this.loading = false;
      }
    },
    async startConversation(conversationId, initialPrompt, rounds = 1, delayMs = 0) {
      this.error = '';
      try {
        const res = await axios.post(
          `${API_URL}/llm/conversations/${conversationId}/start`,
          { initialPrompt, rounds, delayMs },
          { headers: this.authHeaders() }
        );
        // Refresh to get full agent info
        await this.fetchMessages(conversationId);
        return res.data?.messages || [];
      } catch (e) {
        this.error = e.response?.data?.error || e.message;
        throw e;
      }
    },
    async sendMessage(conversationId, payload) {
      this.error = '';
      const res = await axios.post(`${API_URL}/llm/conversations/${conversationId}/messages`, payload, { headers: this.authHeaders() });
      if (res.data?.userMsg) this.messages.push(res.data.userMsg);
      if (res.data?.llmMsg) this.messages.push(res.data.llmMsg);
      return res.data;
    },
    async deleteAgent(id) {
      this.error = '';
      await axios.delete(`${API_URL}/llm/agents/${id}`, { headers: this.authHeaders() });
      this.agents = this.agents.filter((a) => a.id !== id);
    }
  }
});
