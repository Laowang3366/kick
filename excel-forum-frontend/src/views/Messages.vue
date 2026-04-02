<template>
  <div class="messages-page">
    <div class="page-header">
      <el-button class="back-btn" @click="$router.back()" circle>
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <h1>私信</h1>
      <el-button class="new-message-btn" @click="showNewMessageDialog = true">
        <el-icon><Plus /></el-icon>
        新私信
      </el-button>
    </div>

    <div class="messages-container">
      <div class="conversations-panel">
        <div class="panel-header">
          <span class="panel-title">对话列表</span>
          <span class="conversation-count">{{ conversations.length }} 个对话</span>
        </div>
        <div v-if="loadingConversations" class="loading-state">
          <el-skeleton :rows="5" animated />
        </div>
        <div v-else-if="conversations.length === 0" class="empty-state">
          <el-empty description="暂无私信" :image-size="100" />
        </div>
        <div v-else class="conversation-list">
          <TransitionGroup name="conversation-item">
            <div
              v-for="conversation in conversations"
              :key="conversation.id"
              class="conversation-item"
              :class="{ active: activeConversation?.id === conversation.id }"
              @click="openChatDialog(conversation)"
            >
              <div class="avatar-wrapper">
                <el-avatar :src="conversation.user.avatar" :size="48">
                  {{ conversation.user.username?.charAt(0) }}
                </el-avatar>
                <span v-if="conversation.unreadCount" class="unread-badge">{{ conversation.unreadCount }}</span>
              </div>
              <div class="conversation-info">
                <div class="conversation-header">
                  <span class="username">{{ conversation.user.username }}</span>
                  <span class="time">{{ formatTime(conversation.lastMessageTime) }}</span>
                </div>
                <div class="last-message">{{ conversation.lastMessage }}</div>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="showChatDialog"
      :title="activeConversation?.user?.username || '聊天'"
      width="600px"
      class="chat-dialog"
      :close-on-click-modal="false"
      @close="closeChatDialog"
    >
      <template #header>
        <div class="dialog-header" v-if="activeConversation">
          <el-avatar :src="activeConversation.user.avatar" :size="36">
            {{ activeConversation.user.username?.charAt(0) }}
          </el-avatar>
          <div class="user-info">
            <span class="username">{{ activeConversation.user.username }}</span>
            <span class="user-status" :class="{ 'is-online': activeConversation.user.isOnline }">
              {{ activeConversation.user.isOnline ? '在线' : '离线' }}
            </span>
          </div>
        </div>
      </template>
      
      <div class="chat-body">
        <div v-if="loadingMessages" class="loading-state">
          <el-skeleton :rows="5" animated />
        </div>
        <div v-else ref="messagesContainer" class="messages-list">
          <TransitionGroup name="message">
            <div
              v-for="message in messages"
              :key="message.id"
              class="message-item"
              :class="{ 'message-mine': message.sender.id === userStore.user.id }"
            >
              <el-avatar
                :src="message.sender.avatar"
                :size="36"
                class="message-avatar"
              >
                {{ message.sender.username?.charAt(0) }}
              </el-avatar>
              <div class="message-content">
                <div class="message-bubble">{{ message.content }}</div>
                <div class="message-time">{{ formatTime(message.createdAt) }}</div>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>
      
      <div class="chat-input">
        <div class="input-wrapper">
          <el-input
            v-model="newMessage"
            type="textarea"
            :rows="2"
            placeholder="输入消息... (Ctrl+Enter 发送)"
            @keyup.enter.ctrl="sendMessage"
            resize="none"
          />
          <div class="input-actions">
            <el-popover
              placement="top"
              :width="320"
              trigger="click"
              v-model:visible="showEmojiPicker"
            >
              <template #reference>
                <el-button class="emoji-btn" circle>
                  <el-icon><SemiSelect /></el-icon>
                </el-button>
              </template>
              <div class="emoji-picker">
                <div class="emoji-grid">
                  <span
                    v-for="emoji in emojis"
                    :key="emoji"
                    class="emoji-item"
                    @click="insertEmoji(emoji)"
                  >
                    {{ emoji }}
                  </span>
                </div>
              </div>
            </el-popover>
          </div>
        </div>
        <el-button type="primary" class="send-btn" @click="sendMessage" :loading="sending">
          <el-icon><Promotion /></el-icon>
          发送
        </el-button>
      </div>
    </el-dialog>

    <el-dialog v-model="showNewMessageDialog" title="新私信" width="450px" class="new-message-dialog">
      <el-form :model="newMessageForm" label-position="top">
        <el-form-item label="接收者">
          <el-select
            v-model="newMessageForm.userId"
            filterable
            remote
            :remote-method="searchUsers"
            :loading="searchingUsers"
            placeholder="搜索用户..."
            style="width: 100%"
          >
            <el-option
              v-for="user in searchResults"
              :key="user.id"
              :label="user.username"
              :value="user.id"
            >
              <div class="user-option">
                <el-avatar :src="user.avatar" :size="24">
                  {{ user.username?.charAt(0) }}
                </el-avatar>
                <span>{{ user.username }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="消息内容">
          <el-input 
            v-model="newMessageForm.content" 
            type="textarea" 
            :rows="4" 
            placeholder="请输入消息内容..."
          />
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
import { ArrowLeft, Plus, Promotion, SemiSelect } from '@element-plus/icons-vue'

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

const showChatDialog = ref(false)
const showNewMessageDialog = ref(false)
const showEmojiPicker = ref(false)
const newMessageForm = reactive({
  userId: null,
  content: ''
})
const searchResults = ref([])
const searchingUsers = ref(false)

const emojis = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌',
  '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗',
  '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
  '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶',
  '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯',
  '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
  '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '👍', '👎', '👏', '🙌',
  '🤝', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕', '💞', '💓',
  '💗', '💖', '💘', '💝', '💟', '🎉', '🎊', '🎁', '🔥', '✨', '⭐', '🌟', '💫'
]

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

const openChatDialog = (conversation) => {
  activeConversation.value = conversation
  showChatDialog.value = true
  fetchMessages(conversation.user.id)
  if (conversation.unreadCount > 0) {
    api.put(`/messages/${conversation.user.id}/read`)
    conversation.unreadCount = 0
  }
}

const closeChatDialog = () => {
  activeConversation.value = null
  messages.value = []
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

const insertEmoji = (emoji) => {
  newMessage.value += emoji
  showEmojiPicker.value = false
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
    
    await fetchConversations()
    const conversation = conversations.value.find(c => c.user.id === newMessageForm.userId)
    if (conversation) {
      openChatDialog(conversation)
    }
    
    ElMessage.success('发送成功')
  } catch (error) {
    ElMessage.error('发送失败')
  }
}

watch(() => route.query.userId, async (userId) => {
  if (userId) {
    await fetchConversations()
    const conversation = conversations.value.find(c => c.user.id === parseInt(userId))
    if (conversation) {
      openChatDialog(conversation)
    } else {
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
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 24px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24px;
  color: white;
}

.back-btn {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  color: rgba(255, 255, 255, 0.85) !important;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.25) !important;
  border-color: rgba(255, 255, 255, 0.5) !important;
  color: white !important;
  transform: translateX(-2px);
}

.page-header h1 {
  flex: 1;
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.new-message-btn {
  background: rgba(255, 255, 255, 0.2) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  color: white !important;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.new-message-btn:hover {
  background: rgba(255, 255, 255, 0.3) !important;
  transform: translateY(-2px);
}

.messages-container {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  box-shadow: var(--card-shadow);
  overflow: hidden;
}

.conversations-panel {
  padding: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(180deg, rgba(102, 126, 234, 0.03) 0%, transparent 100%);
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.conversation-count {
  font-size: 13px;
  color: var(--text-tertiary);
  background: var(--bg-secondary);
  padding: 4px 12px;
  border-radius: 12px;
}

.loading-state,
.empty-state {
  padding: 40px 20px;
}

.conversation-list {
  max-height: calc(100vh - 300px);
  overflow-y: auto;
  padding: 12px;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 8px;
  background: var(--bg-secondary);
  border: 2px solid transparent;
}

.conversation-item:hover {
  background: var(--bg-tertiary);
  transform: translateX(4px);
  border-color: var(--primary-color);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
}

.conversation-item.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-color: var(--primary-color);
}

.avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.unread-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #f56c6c 0%, #e64545 100%);
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.4);
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.username {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 15px;
}

.time {
  font-size: 12px;
  color: var(--text-tertiary);
}

.last-message {
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-dialog :deep(.el-dialog) {
  border-radius: 20px;
  overflow: hidden;
}

.chat-dialog :deep(.el-dialog__header) {
  padding: 0;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.chat-dialog :deep(.el-dialog__headerbtn) {
  top: 16px;
  right: 16px;
}

.chat-dialog :deep(.el-dialog__headerbtn .el-dialog__close) {
  color: white;
  font-size: 18px;
}

.chat-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  padding-right: 50px;
}

.dialog-header .el-avatar {
  border: 2px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.dialog-header .user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.dialog-header .user-info .username {
  color: white;
  font-weight: 600;
  font-size: 16px;
}

.dialog-header .user-status {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  gap: 4px;
}

.dialog-header .user-status.is-online {
  color: #67c23a;
}

.dialog-header .user-status.is-online::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  background: #67c23a;
  border-radius: 50%;
}

.chat-body {
  height: 400px;
  display: flex;
  flex-direction: column;
}

.messages-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: var(--bg-secondary);
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  align-items: flex-end;
}

.message-item.message-mine {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
  border: 2px solid var(--border-color);
  transition: all 0.3s ease;
}

.message-item:hover .message-avatar {
  transform: scale(1.1);
}

.message-content {
  max-width: 70%;
}

.message-bubble {
  background: white;
  padding: 12px 16px;
  border-radius: 16px;
  border-bottom-left-radius: 4px;
  word-break: break-word;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.message-item:hover .message-bubble {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.message-item.message-mine .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 4px;
}

.message-time {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 6px;
  text-align: right;
}

.message-item.message-mine .message-time {
  text-align: left;
}

.chat-input {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  background: white;
}

.input-wrapper {
  flex: 1;
  position: relative;
  min-width: 0;
}

.input-wrapper :deep(.el-textarea) {
  display: block;
}

.input-wrapper :deep(.el-textarea__inner) {
  padding-right: 44px;
  padding-bottom: 40px;
  border-radius: 12px;
  resize: none !important;
}

.input-actions {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: flex;
  gap: 8px;
  z-index: 1;
}

.emoji-btn {
  width: 32px;
  height: 32px;
  background: var(--bg-secondary) !important;
  border: none !important;
  color: var(--text-secondary) !important;
  transition: all 0.3s ease;
}

.emoji-btn:hover {
  background: var(--bg-tertiary) !important;
  color: var(--primary-color) !important;
  transform: scale(1.1);
}

.emoji-picker {
  padding: 8px;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.emoji-item {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.emoji-item:hover {
  background: var(--bg-secondary);
  transform: scale(1.2);
}

.send-btn {
  height: 56px !important;
  min-width: 80px;
  border-radius: 12px !important;
  font-weight: 500;
}

.new-message-dialog :deep(.el-dialog) {
  border-radius: 16px;
}

.new-message-dialog :deep(.el-dialog__body) {
  padding: 20px 24px;
}

.user-option {
  display: flex;
  align-items: center;
  gap: 10px;
}

.conversation-item-enter-active,
.conversation-item-leave-active {
  transition: all 0.3s ease;
}

.conversation-item-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.conversation-item-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.message-enter-active {
  animation: message-in 0.3s ease;
}

@keyframes message-in {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .messages-page {
    padding: 16px;
  }

  .page-header {
    padding: 16px 20px;
  }

  .page-header h1 {
    font-size: 20px;
  }

  .back-btn {
    width: 36px;
    height: 36px;
  }

  .new-message-btn {
    padding: 8px 12px;
    font-size: 13px;
  }

  .conversation-list {
    max-height: calc(100vh - 250px);
  }

  .chat-dialog :deep(.el-dialog) {
    width: 95% !important;
    margin: 5vh auto !important;
  }

  .chat-body {
    height: 350px;
  }

  .chat-input {
    padding: 12px;
  }

  .send-btn {
    height: 48px !important;
    min-width: 60px;
    padding: 0 12px !important;
  }

  .send-btn .el-icon {
    display: none;
  }

  .input-wrapper :deep(.el-textarea__inner) {
    padding-bottom: 36px;
  }
}
</style>
