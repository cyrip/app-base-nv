<script setup>
import { ref, onMounted, computed } from 'vue';
import { useLlmStore } from '../stores/llm';
import { useModuleStore } from '../../modules/stores/modules';
import { useAuthStore } from '../../auth/stores/auth';

const llmStore = useLlmStore();
const moduleStore = useModuleStore();
const authStore = useAuthStore();

const showAgentModal = ref(false);
const showAgentEditModal = ref(false);
const showConversationModal = ref(false);
const editingAgent = ref(null);
const showAgents = ref(false);
const showConvos = ref(false);
const selectedConversationId = ref(null);
const currentConversationId = ref(null); // mirror in store for delete cleanup
const messageText = ref('');
const initialPrompt = ref('');
const startError = ref('');
const rounds = ref(4);
const delayMs = ref(5000);

const newAgent = ref({
  name: '',
  role: '',
  instructions: '',
  provider: 'chatgpt',
  apiKey: ''
});

const newConversation = ref({
  title: '',
  agentIds: []
});

const selectedConversation = computed(() =>
  llmStore.conversations.find((c) => c.id === selectedConversationId.value)
);
const hasEnoughAgents = computed(() => (selectedConversation.value?.LLMConnectAgents || []).length >= 2);

onMounted(async () => {
  await moduleStore.fetchModules();
  await llmStore.fetchAgents();
  await llmStore.fetchConversations();
});

const openConversation = async (convoId) => {
  selectedConversationId.value = convoId;
  currentConversationId.value = convoId;
  await llmStore.fetchMessages(convoId);
};

const handleCreateAgent = async () => {
  if (!newAgent.value.name || !newAgent.value.role) return;
  await llmStore.createAgent({ ...newAgent.value });
  newAgent.value = { name: '', role: '', instructions: '', provider: 'chatgpt', apiKey: '' };
  showAgentModal.value = false;
};

const openEditAgent = (agent) => {
  editingAgent.value = { ...agent };
  showAgentEditModal.value = true;
};

const handleUpdateAgent = async () => {
  if (!editingAgent.value?.id) return;
  await llmStore.updateAgent(editingAgent.value.id, { ...editingAgent.value });
  showAgentEditModal.value = false;
  editingAgent.value = null;
};

const removeAgent = async (agentId) => {
  try {
    await llmStore.deleteAgent(agentId);
  } catch (e) {
    console.error('Failed to delete agent', e);
  }
};

const handleCreateConversation = async () => {
  if (!newConversation.value.title || newConversation.value.agentIds.length < 2) return;
  const convo = await llmStore.createConversation({ ...newConversation.value });
  newConversation.value = { title: '', agentIds: [] };
  showConversationModal.value = false;
  await openConversation(convo.id);
};

const removeConversation = async (convoId) => {
  try {
    await llmStore.deleteConversation(convoId);
    if (selectedConversationId.value === convoId) {
      selectedConversationId.value = null;
      llmStore.messages = [];
    }
  } catch (e) {
    console.error('Failed to delete conversation', e);
  }
};

const startConversation = async () => {
  if (!selectedConversationId.value) return;
  startError.value = '';
  try {
    const r = Math.max(1, Number(rounds.value) || 1);
    const delay = Math.max(0, Number(delayMs.value) || 0);
    await llmStore.startConversation(selectedConversationId.value, initialPrompt.value, r, delay);
    initialPrompt.value = '';
  } catch (e) {
    startError.value = llmStore.error || e.response?.data?.error || e.message || 'Failed to start conversation';
  }
};

const sendMessage = async () => {
  if (!selectedConversationId.value || !messageText.value.trim()) return;
  const convo = selectedConversation.value;
  const firstAgent = convo?.LLMConnectAgents?.[0];
  const agentId = firstAgent?.id || llmStore.agents[0]?.id;
  await llmStore.sendMessage(selectedConversationId.value, { agentId, content: messageText.value });
  messageText.value = '';
};
</script>

<template>
  <div class="p-6 space-y-6 text-white">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">LLM Connect</h1>
        <p class="text-sm text-gray-400">Create agents, pair them in conversations, and let them talk.</p>
      </div>
      <div class="flex items-center gap-2 text-xs text-gray-400" v-if="llmStore.error">
        <span class="text-red-400">Error:</span>
        <span>{{ llmStore.error }}</span>
      </div>
    </div>

    <div class="space-y-4">
      <div class="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col gap-3">
        <button
          class="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold bg-white/5 border border-white/10 rounded hover:border-neon-blue/60"
          @click="showAgents = !showAgents"
        >
          <span class="text-white">Agents</span>
          <span class="text-[11px] text-gray-400">{{ showAgents ? 'Hide' : 'Show' }}</span>
        </button>
        <transition name="fade">
          <div v-if="showAgents" class="space-y-2 max-h-72 overflow-y-auto">
            <div
              v-for="agent in llmStore.agents"
              :key="agent.id"
              class="p-3 rounded border border-white/10 bg-white/5"
            >
              <div class="flex items-center justify-between">
                <p class="font-semibold">{{ agent.name }}</p>
                <span class="text-[11px] text-gray-400 uppercase">{{ agent.provider }}</span>
              </div>
              <p class="text-xs text-gray-400">Role: {{ agent.role }}</p>
              <div class="flex justify-end gap-2">
                <button
                  class="text-[11px] text-blue-300 hover:text-blue-200"
                  @click="openEditAgent(agent)"
                >
                  Edit
                </button>
                <button
                  class="text-[11px] text-red-300 hover:text-red-200"
                  @click="removeAgent(agent.id)"
                >
                  Delete
                </button>
              </div>
            </div>
            <div v-if="!llmStore.agents.length" class="text-xs text-gray-500">No agents yet.</div>
          </div>
        </transition>
        <div class="flex justify-end">
          <button
            class="px-3 py-1 text-[11px] font-bold text-white bg-neon-blue/50 rounded hover:bg-neon-blue/70"
            @click="showAgentModal = true"
          >
            New Agent
          </button>
        </div>
      </div>

      <div class="bg-white/5 border border-white/10 rounded-lg p-5 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold text-white">Conversations</p>
            <p class="text-xs text-gray-400">Pair agents and start exchanges</p>
          </div>
          <button
            class="px-3 py-1 text-[11px] font-bold text-white bg-neon-purple/50 rounded hover:bg-neon-purple/70"
            @click="showConversationModal = true"
          >
            New Conversation
          </button>
        </div>

        <div class="space-y-3">
          <button
            class="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold bg-white/5 border border-white/10 rounded hover:border-neon-blue/60"
            @click="showConvos = !showConvos"
          >
            <span class="text-white">Conversation List</span>
            <span class="text-[11px] text-gray-400">{{ showConvos ? 'Hide' : 'Show' }}</span>
          </button>
          <transition name="fade">
            <div v-if="showConvos" class="space-y-3 max-h-72 overflow-y-auto">
              <div
                v-for="convo in llmStore.conversations"
                :key="convo.id"
                @click="openConversation(convo.id)"
                class="p-3 rounded border border-white/10 bg-white/5 cursor-pointer hover:border-neon-blue/70"
                :class="convo.id === selectedConversationId ? 'border-neon-blue/80 bg-neon-blue/10' : ''"
              >
                <p class="font-semibold">{{ convo.title }}</p>
                <p class="text-[11px] text-gray-400">
                  Agents: {{ (convo.LLMConnectAgents || []).map((a) => a.name).join(', ') || 'None' }}
                </p>
                <div class="flex justify-end">
                  <button
                    class="text-[11px] text-red-300 hover:text-red-200"
                    @click.stop="removeConversation(convo.id)"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div v-if="!llmStore.conversations.length" class="text-xs text-gray-500">No conversations yet.</div>
            </div>
          </transition>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold text-white">Messages</h3>
            <span class="text-xs text-gray-400">
              {{ selectedConversationId ? 'Conversation #' + selectedConversationId : 'Select a conversation' }}
            </span>
          </div>
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <input
                v-model="initialPrompt"
                placeholder="Initial prompt to kick off (from agent 1)"
                class="flex-1 min-w-[200px] px-3 py-2 bg-black/40 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-neon-blue"
              />
              <input
                v-model="rounds"
                type="number"
                min="1"
                class="w-20 px-2 py-2 bg-black/40 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-neon-blue"
                title="Number of replies to generate"
              />
              <input
                v-model="delayMs"
                type="number"
                min="0"
                step="500"
                class="w-24 px-2 py-2 bg-black/40 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-neon-blue"
                title="Delay between replies (ms)"
                placeholder="Delay ms"
              />
              <button
                class="px-3 py-2 text-xs font-bold text-white bg-neon-purple/60 rounded hover:bg-neon-purple/80 disabled:opacity-40 flex items-center gap-2"
                @click="startConversation"
                :disabled="!selectedConversationId || !hasEnoughAgents"
              >
                <span>Start</span>
                <span v-if="llmStore.loading" class="w-3 h-3 border-2 border-white/60 border-t-transparent rounded-full animate-spin"></span>
              </button>
            </div>
            <p v-if="!hasEnoughAgents && selectedConversationId" class="text-[11px] text-red-400">
              Add at least two agents to start a conversation.
            </p>
            <p v-if="startError" class="text-[11px] text-red-400">{{ startError }}</p>

            <div class="h-80 border border-white/10 rounded-lg p-3 bg-black/30 overflow-y-auto space-y-3">
              <div
                v-for="msg in llmStore.messages"
                :key="msg.id"
                class="p-3 rounded border border-white/10 bg-white/5"
              >
                <div class="flex items-center gap-2 text-sm font-semibold">
                  <span>{{ msg.Agent?.name || 'Agent' }}</span>
                  <span class="text-[11px] text-gray-400">({{ msg.role }})</span>
                </div>
                <div class="mt-1 text-sm text-gray-200 whitespace-pre-line">
                  {{ msg.content }}
                </div>
              </div>
              <div v-if="!llmStore.messages.length" class="text-xs text-gray-500">No messages yet.</div>
            </div>

            <div class="flex items-center gap-2">
              <input
                v-model="messageText"
                placeholder="Send a manual message as agent 1"
                class="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-neon-blue"
                @keyup.enter="sendMessage"
                :disabled="!selectedConversationId"
              />
              <button
                class="px-4 py-2 text-xs font-bold text-white bg-neon-blue/60 rounded hover:bg-neon-blue/80 disabled:opacity-40"
                @click="sendMessage"
                :disabled="!selectedConversationId"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Agent Modal -->
    <div
      v-if="showAgentModal"
      class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div class="w-full max-w-lg bg-black/80 border border-white/10 rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">New Agent</h3>
          <button class="text-gray-400 hover:text-white" @click="showAgentModal = false">✕</button>
        </div>
        <div class="space-y-3">
          <label class="flex flex-col gap-1 text-sm text-gray-300">
            <span>Name</span>
            <input v-model="newAgent.name" class="px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm" />
          </label>
          <label class="flex flex-col gap-1 text-sm text-gray-300">
            <span>Role</span>
            <input v-model="newAgent.role" class="px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm" />
          </label>
          <label class="flex flex-col gap-1 text-sm text-gray-300">
            <span>Instructions</span>
            <textarea
              v-model="newAgent.instructions"
              rows="3"
              class="px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm resize-y"
            ></textarea>
          </label>
          <label class="flex flex-col gap-1 text-sm text-gray-300">
            <span>Provider</span>
            <select v-model="newAgent.provider" class="px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm">
              <option value="chatgpt">ChatGPT</option>
            </select>
          </label>
          <label class="flex flex-col gap-1 text-sm text-gray-300">
            <span>API Key (optional, will fallback to server key)</span>
            <input
              v-model="newAgent.apiKey"
              type="password"
              class="px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm"
            />
          </label>
        </div>
        <div class="flex justify-end gap-2">
          <button class="px-3 py-2 text-xs font-bold text-gray-200 bg-white/10 rounded" @click="showAgentModal = false">
            Cancel
          </button>
          <button class="px-4 py-2 text-xs font-bold text-white bg-neon-blue/60 rounded hover:bg-neon-blue/80" @click="handleCreateAgent">
            Create
          </button>
        </div>
      </div>
    </div>

    <!-- Agent Edit Modal -->
    <div
      v-if="showAgentEditModal"
      class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div class="w-full max-w-lg bg-black/80 border border-white/10 rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">Edit Agent</h3>
          <button class="text-gray-400 hover:text-white" @click="showAgentEditModal = false">✕</button>
        </div>
        <div class="space-y-3" v-if="editingAgent">
          <label class="flex flex-col gap-1 text-sm text-gray-300">
            <span>Name</span>
            <input v-model="editingAgent.name" class="px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm" />
          </label>
          <label class="flex flex-col gap-1 text-sm text-gray-300">
            <span>Role</span>
            <input v-model="editingAgent.role" class="px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm" />
          </label>
          <label class="flex flex-col gap-1 text-sm text-gray-300">
            <span>Instructions</span>
            <textarea
              v-model="editingAgent.instructions"
              rows="3"
              class="px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm resize-y"
            ></textarea>
          </label>
          <label class="flex flex-col gap-1 text-sm text-gray-300">
            <span>Provider</span>
            <select v-model="editingAgent.provider" class="px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm">
              <option value="chatgpt">ChatGPT</option>
            </select>
          </label>
          <label class="flex flex-col gap-1 text-sm text-gray-300">
            <span>API Key (optional)</span>
            <input
              v-model="editingAgent.apiKey"
              type="password"
              class="px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm"
            />
          </label>
        </div>
        <div class="flex justify-end gap-2">
          <button class="px-3 py-2 text-xs font-bold text-gray-200 bg-white/10 rounded" @click="showAgentEditModal = false">
            Cancel
          </button>
          <button class="px-4 py-2 text-xs font-bold text-white bg-neon-blue/60 rounded hover:bg-neon-blue/80" @click="handleUpdateAgent">
            Save
          </button>
        </div>
      </div>
    </div>

    <!-- Conversation Modal -->
    <div
      v-if="showConversationModal"
      class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div class="w-full max-w-lg bg-black/80 border border-white/10 rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">New Conversation</h3>
          <button class="text-gray-400 hover:text-white" @click="showConversationModal = false">✕</button>
        </div>
        <div class="space-y-3">
          <label class="flex flex-col gap-1 text-sm text-gray-300">
            <span>Title</span>
            <input v-model="newConversation.title" class="px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm" />
          </label>
          <div class="flex flex-col gap-2 text-sm text-gray-300">
            <span>Participants (choose at least 2)</span>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="agent in llmStore.agents"
                :key="agent.id"
                class="flex items-center gap-2 px-3 py-2 bg-black/50 border border-white/10 rounded cursor-pointer text-white text-sm"
              >
                <input type="checkbox" :value="agent.id" v-model="newConversation.agentIds" class="accent-neon-blue" />
                <span>{{ agent.name }}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button class="px-3 py-2 text-xs font-bold text-gray-200 bg-white/10 rounded" @click="showConversationModal = false">
            Cancel
          </button>
          <button
            class="px-4 py-2 text-xs font-bold text-white bg-neon-purple/60 rounded hover:bg-neon-purple/80 disabled:opacity-40"
            @click="handleCreateConversation"
            :disabled="newConversation.agentIds.length < 2 || !newConversation.title"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
