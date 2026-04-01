<template>
  <div class="messages-page">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card class="conversations-card">
          <template #header>
            <div class="card-header">
              <span>私信列表</span>
              <el-button :icon="Edit" circle size="small" @click="showNewMessageDialog = true" />
            </div>
          </template>
          <div v-if="loadingConversations" class="loading">
            <el-skeleton :rows="5" animated />
          </div>
          <div v-else-if="conversations.length === 0" class="empty">
            <el-empty description="暂无私信" />
          </div>
          <div v-else class="conversation-list">
            <div
              v-for="conversation in conversations"
              :key="conversation.id"
              class="conversation-item"
              :class="{ active: activeConversation?.id === conversation.id }"
              @click="selectConversation(conversation)"
            >
              <el-badge :value="conversation.unreadCount" :hidden="!conversation.unreadCount" class="conversation-badge">
                <el-avatar :src="conversation.user.avatar" :size="40">
                  {{ conversation.user.username?.charAt(0) }}
                </el-avatar>
              </el-badge>
              <div class="conversation-info">
                <div class="conversation-header">
                  <span class="username">{{ conversation.user.username }}</span>
                  <span class="time">{{ formatTime(conversation.lastMessageTime) }}</span>
                </div>
                <div class="last-message">{{ conversation.lastMessage }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="16">
        <el-card class="chat-card">
          <template #header>
            <div v-if="activeConversation" class="chat-header">
              <el-avatar :src="activeConversation.user.avatar" :size="32">
                {{ activeConversation.user.username?.charAt(0) }}
              </el-avatar>
              <span class="username">{{ activeConversation.user.username }}</span>
            </div>
            <div v-else class="chat-header">
              <span>选择一个对话开始聊天</span>
            </div>
          </template>
          <div v-if="!activeConversation" class="empty">
            <el-empty description="请选择一个对话" />
          </div>
          <div v-else class="chat-container">
            <div v-if="loadingMessages" class="loading">
              <el-skeleton :rows="5" animated />
            </div>
            <div v-else ref="messagesContainer" class="messages-container">
              <div
                v-for="message in messages"
                :key="message.id"
                class="message-item"
                :class="{ 'message-mine': message.sender.id === userStore.user.id }"
              >
                <el-avatar
                  :src="message.sender.avatar"
                  :size="32"
                  class="message-avatar"
                >
                  {{ message.sender.username?.charAt(0) }}
                </el-avatar>
                <div class="message-content">
                  <div class="message-bubble">{{ message.content }}</div>
                  <div class="message-time">{{ formatTime(message.createdAt) }}</div>
                </div>
              </div>
            </div>
            <div class="message-input">
              <el-input
                v-model="newMessage"
                type="textarea"
                :rows="3"
                placeholder="输入消息..."
                @keyup.enter.ctrl="sendMessage"
              />
              <el-button type="primary" @click="sendMessage" :loading="sending">
                发送
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="showNewMessageDialog" title="新私信" width="500px">
      <el-form :model="newMessageForm">
        <el-form-item label="接收者">
          <el-select
            v-model="newMessageForm.userId"
            filterable
            remote
            :remote-method="searchUsers"
            :loading="searchingUsers"
            placeholder="搜索用户"
          >
            <el-option
              v-for="user in searchResults"
              :key="user.id"
              :label="user.username"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="消息内容">
          <el-input v-model="newMessageForm.content" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showNewMessageDialog = false">取消</el-button>
        <el-button type="primary" @click="startNewConversation">发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import api from '../api'
import { ElMessage } from 'element-plus'
import { Edit } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const conversations = ref([])
const activeConversation = ref(null)
const messages = ref([])
const newMessage = ref('')
const loadingConversations = ref(false)
const loadingMessages = ref(false)
const sending = ref(false)
const messagesContainer = ref(null)

const showNewMessageDialog = ref(false)
const newMessageForm = reactive({
  userId: null,
  content: ''
})
const searchResults = ref([])
const searchingUsers = ref(false)

const formatTime = (time) => {
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  return date.toLocaleDateString()
}

const fetchConversations = async () => {
  loadingConversations.value = true
  try {
    const response = await api.get('/messages/conversations')
    conversations.value = response.conversations
  } catch (error) {
    console.error('获取对话列表失败:', error)
  } finally {
    loadingConversations.value = false
  }
}

const fetchMessages = async (userId) => {
  loadingMessages.value = true
  try {
    const response = await api.get(`/messages/${userId}`)
    messages.value = response.messages
    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('获取消息记录失败:', error)
  } finally {
    loadingMessages.value = false
  }
}

const selectConversation = (conversation) => {
  activeConversation.value = conversation
  fetchMessages(conversation.user.id)
  // 标记为已读
  if (conversation.unreadCount > 0) {
    api.put(`/messages/${conversation.user.id}/read`)
    conversation.unreadCount = 0
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || !activeConversation.value) return
  
  sending.value = true
  try {
    const response = await api.post('/messages', {
      receiverId: activeConversation.value.user.id,
      content: newMessage.value
    })
    messages.value.push(response.message)
    newMessage.value = ''
    await nextTick()
    scrollToBottom()
    
    // 更新对话列表
    const conversation = conversations.value.find(c => c.user.id === activeConversation.value.user.id)
    if (conversation) {
      conversation.lastMessage = newMessage.value
      conversation.lastMessageTime = new Date().toISOString()
    }
  } catch (error) {
    ElMessage.error('发送失败')
  } finally {
    sending.value = false
  }
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const searchUsers = async (query) => {
  if (!query) {
    searchResults.value = []
    return
  }
  
  searchingUsers.value = true
  try {
    const response = await api.get('/users/search', { params: { q: query } })
    searchResults.value = response.users.filter(u => u.id !== userStore.user.id)
  } catch (error) {
    console.error('搜索用户失败:', error)
  } finally {
    searchingUsers.value = false
  }
}

const startNewConversation = async () => {
  if (!newMessageForm.userId || !newMessageForm.content.trim()) {
    ElMessage.warning('请选择接收者并输入消息内容')
    return
  }
  
  try {
    const response = await api.post('/messages', {
      receiverId: newMessageForm.userId,
      content: newMessageForm.content
    })
    
    showNewMessageDialog.value = false
    newMessageForm.userId = null
    newMessageForm.content = ''
    
    // 刷新对话列表并选择新对话
    await fetchConversations()
    const conversation = conversations.value.find(c => c.user.id === newMessageForm.userId)
    if (conversation) {
      selectConversation(conversation)
    }
    
    ElMessage.success('发送成功')
  } catch (error) {
    ElMessage.error('发送失败')
  }
}

// 如果URL中有userId参数，自动选择该用户
watch(() => route.query.userId, async (userId) => {
  if (userId) {
    await fetchConversations()
    const conversation = conversations.value.find(c => c.user.id === parseInt(userId))
    if (conversation) {
      selectConversation(conversation)
    } else {
      // 如果没有现有对话，打开新私信对话框
      showNewMessageDialog.value = true
      newMessageForm.userId = parseInt(userId)
    }
  }
}, { immediate: true })

onMounted(() => {
  fetchConversations()
})
</script>

<style scoped>
.messages-page {
  height: calc(100vh - 200px);
}

.conversations-card,
.chat-card {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.loading,
.empty {
  padding: 20px;
}

.conversation-list {
  max-height: 500px;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.conversation-item:hover {
  background-color: #f5f7fa;
}

.conversation-item.active {
  background-color: #ecf5ff;
}

.conversation-badge {
  flex-shrink: 0;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.username {
  font-weight: bold;
}

.time {
  font-size: 12px;
  color: #909399;
}

.last-message {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 500px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.message-item {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.message-item.message-mine {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  max-width: 70%;
}

.message-bubble {
  background-color: #f5f7fa;
  padding: 10px 15px;
  border-radius: 10px;
  word-break: break-word;
}

.message-item.message-mine .message-bubble {
  background-color: #409eff;
  color: white;
}

.message-time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  text-align: right;
}

.message-input {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-top: 1px solid #ebeef5;
}

.message-input .el-textarea {
  flex: 1;
}
</style>