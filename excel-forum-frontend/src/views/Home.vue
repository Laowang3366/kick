<template>
  <div class="home">
    <div class="welcome-section">
      <h1>欢迎来到Excel论坛</h1>
      <p>分享Excel技巧，交流VBA、Power Query、函数公式等经验</p>
    </div>
    
    <el-row :gutter="20" class="content-section">
      <el-col :xs="24" :sm="24" :md="10" :lg="10" :xl="10">
        <el-card class="feature-card chat-card">
          <template #header>
            <div class="card-header">
              <span>在线聊天</span>
              <span class="online-status">
                <el-badge :value="onlineUsers" class="online-badge" type="success">
                  <el-icon><ChatDotRound /></el-icon>
                </el-badge>
              </span>
            </div>
          </template>
          <div class="chat-container">
            <div class="chat-messages" ref="chatMessagesRef">
              <div 
                v-for="(msg, index) in chatMessages" 
                :key="index" 
                :class="['chat-message', msg.isSelf ? 'self' : 'other']"
              >
                <el-avatar v-if="!msg.isSelf" :src="msg.avatar" :size="32">
                  {{ msg.username?.charAt(0) }}
                </el-avatar>
                <div class="message-content">
                  <div v-if="!msg.isSelf" class="message-username">{{ msg.username }}</div>
                  <div class="message-bubble" v-html="renderMessageContent(msg.content)"></div>
                  <div class="message-time">{{ msg.time }}</div>
                </div>
                <el-avatar v-if="msg.isSelf" :src="msg.avatar" :size="32">
                  {{ msg.username?.charAt(0) }}
                </el-avatar>
              </div>
            </div>
            <div class="chat-input-wrapper">
              <div class="chat-toolbar">
                <el-popover
                  placement="top"
                  :width="320"
                  trigger="click"
                  v-model:visible="showEmojiPicker"
                >
                  <template #reference>
                    <el-button type="text" class="toolbar-btn">
                      <span class="emoji-icon">😊</span>
                    </el-button>
                  </template>
                  <div class="emoji-grid">
                    <span 
                      v-for="emoji in emojiList" 
                      :key="emoji" 
                      class="emoji-item"
                      @click="insertEmoji(emoji)"
                    >
                      {{ emoji }}
                    </span>
                  </div>
                </el-popover>
                <el-popover
                  placement="top"
                  :width="250"
                  trigger="click"
                  v-model:visible="showMentionPicker"
                >
                  <template #reference>
                    <el-button type="text" class="toolbar-btn" @click="openMentionPicker">
                      @
                    </el-button>
                  </template>
                  <div class="mention-list">
                    <el-input 
                      v-model="mentionSearch" 
                      placeholder="搜索用户" 
                      size="small"
                      clearable
                      class="mention-search"
                    />
                    <div class="mention-users">
                      <div 
                        v-for="user in filteredMentionUsers" 
                        :key="user.id" 
                        class="mention-user-item"
                        @click="insertMention(user)"
                      >
                        <el-avatar :src="user.avatar" :size="28">
                          {{ user.username?.charAt(0) }}
                        </el-avatar>
                        <span class="mention-username">{{ user.username }}</span>
                      </div>
                    </div>
                  </div>
                </el-popover>
              </div>
              <div class="input-row">
                <el-input
                  v-model="chatInput"
                  type="textarea"
                  :rows="1"
                  placeholder="输入消息... (@提及用户)"
                  @keyup.ctrl.enter="sendMessage"
                  class="chat-textarea"
                />
                <el-button type="primary" @click="sendMessage" class="send-btn">
                  发送
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="24" :md="14" :lg="14" :xl="14">
        <div class="top-cards-row">
          <el-card class="feature-card hot-forums-card">
            <template #header>
              <div class="card-header">
                <span>热门版块</span>
              </div>
            </template>
            <div v-if="hotForumsLoading" class="card-loading">
              <el-skeleton :rows="3" animated />
            </div>
            <div v-else class="forum-list">
              <div 
                v-for="forum in hotForums" 
                :key="forum.id" 
                class="forum-item"
                @click="$router.push(`/forum/${forum.id}`)"
              >
                <div class="forum-info">
                  <div class="forum-name">{{ forum.name }}</div>
                  <div class="forum-stats">
                    <span><el-icon><Document /></el-icon> {{ forum.postCount || 0 }} 帖子</span>
                    <span><el-icon><ChatDotRound /></el-icon> {{ forum.replyCount || 0 }} 回复</span>
                  </div>
                </div>
                <el-icon class="forum-arrow"><ArrowRight /></el-icon>
              </div>
            </div>
          </el-card>
          
          <el-card class="feature-card online-users-card">
            <template #header>
              <div class="card-header">
                <span>在线用户</span>
                <el-badge :value="onlineUsers" type="success" class="online-count" />
              </div>
            </template>
            <div class="online-users-list">
              <div 
                v-for="user in onlineUsersList" 
                :key="user.id" 
                class="online-user-item"
              >
                <el-avatar :src="user.avatar" :size="36" @click="$router.push(`/user/${user.id}`)">
                  {{ user.username?.charAt(0) }}
                </el-avatar>
                <div class="online-user-info" @click="$router.push(`/user/${user.id}`)">
                  <div class="online-username-row">
                    <span class="online-username">{{ user.username }}</span>
                    <LevelTag v-if="user.level" :level="user.level" :points="user.points" :role="user.role" />
                  </div>
                  <div class="online-dot">
                    <span class="dot"></span>
                    <span>在线</span>
                  </div>
                </div>
                <el-tooltip content="发送私信" placement="top" v-if="userStore.isAuthenticated && user.id !== userStore.user.id">
                  <el-button 
                    type="primary" 
                    :icon="ChatLineRound" 
                    circle 
                    size="small"
                    class="pm-btn"
                    @click.stop="sendPrivateMessage(user.id)"
                  />
                </el-tooltip>
              </div>
            </div>
          </el-card>
        </div>
        
        <el-card class="latest-posts">
          <template #header>
            <div class="card-header">
              <span>最新帖子</span>
              <el-button type="primary" size="small" @click="$router.push('/post/create')">
                发布新帖
              </el-button>
            </div>
          </template>
          <div class="posts-scroll-container">
            <PostList :posts="displayPosts" :loading="loading" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog 
      v-model="showPrivateMessageDialog" 
      title="发送私信" 
      width="450px"
      class="pm-dialog"
      :close-on-click-modal="false"
    >
      <div class="pm-dialog-content">
        <div class="pm-user-info">
          <el-avatar :src="targetUser?.avatar" :size="48">
            {{ targetUser?.username?.charAt(0) }}
          </el-avatar>
          <div class="pm-user-detail">
            <div class="pm-username">{{ targetUser?.username }}</div>
            <div class="pm-user-level">
              <LevelTag v-if="targetUser?.level" :level="targetUser.level" :points="targetUser.points" :role="targetUser.role" />
            </div>
          </div>
        </div>
        <el-input
          v-model="privateMessageContent"
          type="textarea"
          :rows="4"
          placeholder="输入私信内容..."
          maxlength="500"
          show-word-limit
        />
      </div>
      <template #footer>
        <el-button @click="showPrivateMessageDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmSendPrivateMessage" :loading="sendingPrivateMessage">
          发送
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import PostList from '../components/PostList.vue'
import LevelTag from '../components/LevelTag.vue'
import { Document, ChatDotRound, ArrowRight, ChatLineRound } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'
import { useForumEvents } from '../composables/useForumEvents'
import api from '../api'

const router = useRouter()
const userStore = useUserStore()
const latestPosts = ref([])
const hotForums = ref([])
const loading = ref(false)
const hotForumsLoading = ref(true)
const currentPage = ref(1)
const totalPosts = ref(0)

const chatMessages = ref([])
const chatInput = ref('')
const chatMessagesRef = ref(null)
const onlineUsers = ref(0)
const onlineUsersList = ref([])
const heartbeatInterval = ref(null)
const onlineUsersInterval = ref(null)

const showPrivateMessageDialog = ref(false)
const targetUser = ref(null)
const privateMessageContent = ref('')
const sendingPrivateMessage = ref(false)

const showEmojiPicker = ref(false)
const showMentionPicker = ref(false)
const mentionSearch = ref('')
const mentionUsers = ref([])

const emojiList = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
  '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛',
  '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
  '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔',
  '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵',
  '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '👍',
  '👎', '👏', '🙌', '🤝', '🙏', '💪', '🎉', '🎊', '🎁', '🔥',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '💕', '💖'
]

const filteredMentionUsers = computed(() => {
  if (!mentionSearch.value) {
    return mentionUsers.value.slice(0, 10)
  }
  return mentionUsers.value
    .filter(u => u.username.toLowerCase().includes(mentionSearch.value.toLowerCase()))
    .slice(0, 10)
})

const displayPosts = computed(() => {
  return latestPosts.value.slice(0, 3)
})

const fetchLatestPosts = async () => {
  loading.value = true
  try {
    const response = await api.get('/posts', {
      params: {
        page: currentPage.value,
        limit: 10,
        sort: 'latest'
      }
    })
    latestPosts.value = response.records
    totalPosts.value = response.total
  } catch (error) {
    console.error('获取最新帖子失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchHotForums = async () => {
  hotForumsLoading.value = true
  try {
    const response = await api.get('/categories/hot', {
      params: { limit: 5 }
    })
    hotForums.value = response
  } catch (error) {
    console.error('获取热门版块失败:', error)
  } finally {
    hotForumsLoading.value = false
  }
}

const fetchOnlineUsers = async () => {
  try {
    const response = await api.get('/users/online', {
      params: { limit: 10 }
    })
    onlineUsersList.value = response.users || []
    onlineUsers.value = response.total || 0
  } catch (error) {
    console.error('获取在线用户失败:', error)
  }
}

const sendHeartbeat = async () => {
  if (!userStore.isAuthenticated) return
  try {
    await api.post('/users/heartbeat')
  } catch (error) {
    console.error('发送心跳失败:', error)
  }
}

const fetchChatMessages = async () => {
  if (!userStore.isAuthenticated) return
  try {
    const response = await api.get('/chat/messages', {
      params: { limit: 50 }
    })
    chatMessages.value = response.map(msg => ({
      id: msg.id,
      username: msg.username || '游客',
      avatar: msg.avatar || '',
      content: msg.content,
      time: new Date(msg.createTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      isSelf: userStore.isAuthenticated && msg.userId === userStore.user.id
    }))
    scrollToBottom()
  } catch (error) {
    console.error('获取聊天消息失败:', error)
  }
}

const getCurrentTime = () => {
  const now = new Date()
  return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatMessagesRef.value) {
      chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
    }
  })
}

const insertEmoji = (emoji) => {
  chatInput.value += emoji
  showEmojiPicker.value = false
}

const openMentionPicker = async () => {
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录后再使用@提及功能')
    return
  }
  
  mentionSearch.value = ''
  if (mentionUsers.value.length === 0) {
    try {
      const response = await api.get('/users/search', { params: { q: '' } })
      mentionUsers.value = response.users || []
    } catch (error) {
      console.error('获取用户列表失败:', error)
    }
  }
}

const insertMention = (user) => {
  const mention = `@${user.username} `
  chatInput.value += mention
  showMentionPicker.value = false
  mentionSearch.value = ''
}

const renderMessageContent = (content) => {
  if (!content) return ''
  let rendered = content
  const mentionRegex = /@(\S+)/g
  rendered = rendered.replace(mentionRegex, '<span class="mention-highlight">@$1</span>')
  return rendered
}

const extractMentions = (content) => {
  if (!content) return []
  const mentionRegex = /@(\S+)/g
  const mentions = []
  let match
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1])
  }
  return [...new Set(mentions)]
}

const sendMessage = async () => {
  if (!chatInput.value.trim()) return
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录后再发送消息')
    return
  }
  
  const content = chatInput.value.trim()
  chatInput.value = ''
  
  try {
    const response = await api.post('/chat/send', { content })
    const newMessage = {
      id: response.id,
      username: response.username,
      avatar: response.avatar,
      content: response.content,
      time: new Date(response.createTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      isSelf: true
    }
    chatMessages.value.push(newMessage)
    scrollToBottom()
  } catch (error) {
    console.error('发送消息失败:', error)
    ElMessage.error('发送消息失败')
  }
}

const sendPrivateMessage = (userId) => {
  const user = onlineUsersList.value.find(u => u.id === userId)
  if (user) {
    targetUser.value = user
    privateMessageContent.value = ''
    showPrivateMessageDialog.value = true
  }
}

const confirmSendPrivateMessage = async () => {
  if (!privateMessageContent.value.trim()) {
    ElMessage.warning('请输入私信内容')
    return
  }
  
  sendingPrivateMessage.value = true
  try {
    await api.post('/messages', {
      receiverId: targetUser.value.id,
      content: privateMessageContent.value.trim()
    })
    ElMessage.success('私信发送成功')
    showPrivateMessageDialog.value = false
    privateMessageContent.value = ''
    targetUser.value = null
  } catch (error) {
    console.error('发送私信失败:', error)
    ElMessage.error('发送私信失败')
  } finally {
    sendingPrivateMessage.value = false
  }
}

const initChat = async () => {
  if (!userStore.isAuthenticated) return
  await fetchChatMessages()
}

const startHeartbeat = async () => {
  await sendHeartbeat()
  heartbeatInterval.value = setInterval(sendHeartbeat, 120000)
}

const startOnlineUsersUpdate = () => {
  fetchOnlineUsers()
  onlineUsersInterval.value = setInterval(fetchOnlineUsers, 30000)
}

let chatInterval = null
const startChatMessagesUpdate = () => {
  if (!userStore.isAuthenticated) return
  chatInterval = setInterval(() => {
    fetchChatMessages()
  }, 5000)
}

useForumEvents((event) => {
  console.log('Received forum event:', event)
  if (event.type === 'POST_UPDATED' || event.type === 'POST_DELETED') {
    fetchLatestPosts()
  }
  if (event.type === 'CATEGORY_UPDATED') {
    fetchHotForums()
  }
})

onMounted(async () => {
  fetchLatestPosts()
  fetchHotForums()
  await initChat()
  await startHeartbeat()
  startOnlineUsersUpdate()
  startChatMessagesUpdate()
})

onUnmounted(() => {
  if (heartbeatInterval.value) {
    clearInterval(heartbeatInterval.value)
  }
  if (onlineUsersInterval.value) {
    clearInterval(onlineUsersInterval.value)
  }
  if (chatInterval) {
    clearInterval(chatInterval)
  }
})
</script>

<style scoped>
.home {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 28px;
  min-height: 100%;
}

.welcome-section {
  text-align: center;
  padding: 60px 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 24px;
  margin-bottom: 24px;
  box-shadow: 0 10px 40px rgba(102, 126, 234, 0.35);
  position: relative;
  overflow: hidden;
}

.welcome-section::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  animation: pulse 15s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 0.3; }
}

.welcome-section h1 {
  margin: 0 0 16px;
  font-size: 36px;
  font-weight: 700;
  position: relative;
  z-index: 1;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

.welcome-section p {
  margin: 0;
  font-size: 17px;
  opacity: 0.95;
  position: relative;
  z-index: 1;
}

.content-section {
  margin-top: 24px;
}

.latest-posts,
.feature-card {
  margin-bottom: 20px;
  border: 2px solid rgba(102, 126, 234, 0.2);
  border-radius: 24px;
  box-shadow: 0 6px 30px rgba(102, 126, 234, 0.15);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100%;
  background: linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
  overflow: hidden;
}

.latest-posts:hover,
.feature-card:hover {
  border-color: rgba(102, 126, 234, 0.4);
  box-shadow: 0 12px 50px rgba(102, 126, 234, 0.25);
  transform: translateY(-6px);
}

.latest-posts :deep(.el-card__header),
.feature-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border-bottom: 2px solid rgba(102, 126, 234, 0.1);
  padding: 20px 24px;
  position: relative;
  z-index: 2;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header span {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  position: relative;
  padding-left: 16px;
}

.card-header span::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 5px;
  height: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 3px;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.card-loading {
  padding: 10px 0;
}

.forum-list,
.user-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.forum-item,
.user-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
  border: 2px solid rgba(102, 126, 234, 0.1);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.06);
}

.forum-item:hover,
.user-item:hover {
  background: linear-gradient(135deg, #f0f2ff 0%, #e8ebff 100%);
  border-color: rgba(102, 126, 234, 0.4);
  transform: translateX(8px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.18);
}

.forum-info {
  flex: 1;
}

.forum-name,
.username {
  font-weight: 600;
  font-size: 16px;
  color: #2c3e50;
  margin-bottom: 8px;
}

.forum-stats {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #666;
}

.forum-stats span {
  display: flex;
  align-items: center;
  gap: 8px;
}

.forum-stats .el-icon {
  color: #667eea;
  font-size: 16px;
}

.forum-arrow,
.user-arrow {
  color: #999;
  font-size: 18px;
  transition: transform 0.3s ease, color 0.3s ease;
}

.forum-item:hover .forum-arrow,
.user-item:hover .user-arrow {
  color: #667eea;
  transform: translateX(6px);
}

.user-info {
  flex: 1;
  margin-left: 12px;
}

.top-cards-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.top-cards-row .feature-card {
  margin-bottom: 0;
  height: 320px;
  border: 2px solid rgba(102, 126, 234, 0.2);
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
  box-shadow: 0 6px 30px rgba(102, 126, 234, 0.15);
  position: relative;
  overflow: hidden;
}

.top-cards-row .feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
  background-size: 200% 100%;
  animation: gradient-flow 3s ease infinite;
}

@keyframes gradient-flow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.top-cards-row .feature-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 80px;
  height: 80px;
  background: radial-gradient(circle at bottom right, rgba(102, 126, 234, 0.08) 0%, transparent 70%);
  pointer-events: none;
}

.top-cards-row .feature-card :deep(.el-card__header) {
  position: relative;
  z-index: 2;
}

.top-cards-row .feature-card :deep(.el-card__body) {
  height: calc(100% - 65px);
  overflow-y: auto;
  padding: 20px;
  scrollbar-width: thin;
  scrollbar-color: #667eea #f0f2ff;
}

.top-cards-row .feature-card :deep(.el-card__body)::-webkit-scrollbar {
  width: 10px;
}

.top-cards-row .feature-card :deep(.el-card__body)::-webkit-scrollbar-track {
  background: #f0f2ff;
  border-radius: 5px;
  border: 1px solid rgba(102, 126, 234, 0.1);
}

.top-cards-row .feature-card :deep(.el-card__body)::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 5px;
  border: 2px solid #f0f2ff;
}

.top-cards-row .feature-card :deep(.el-card__body)::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%);
}

.latest-posts {
  height: calc(100vh - 680px);
  min-height: 300px;
  max-height: 500px;
  border: 2px solid rgba(102, 126, 234, 0.2);
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
  box-shadow: 0 6px 30px rgba(102, 126, 234, 0.15);
  position: relative;
  overflow: hidden;
}

.latest-posts::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
  background-size: 200% 100%;
  animation: gradient-flow 3s ease infinite;
}

.latest-posts::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 80px;
  height: 80px;
  background: radial-gradient(circle at bottom right, rgba(102, 126, 234, 0.08) 0%, transparent 70%);
  pointer-events: none;
}

.latest-posts :deep(.el-card__header) {
  position: relative;
  z-index: 2;
}

.latest-posts :deep(.el-card__body) {
  height: calc(100% - 65px);
  padding: 0;
  overflow: hidden;
}

.posts-scroll-container {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
  scrollbar-width: thin;
  scrollbar-color: #667eea #f0f2ff;
  position: relative;
  z-index: 1;
}

.posts-scroll-container::-webkit-scrollbar {
  width: 10px;
}

.posts-scroll-container::-webkit-scrollbar-track {
  background: #f0f2ff;
  border-radius: 5px;
  border: 1px solid rgba(102, 126, 234, 0.1);
}

.posts-scroll-container::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 5px;
  border: 2px solid #f0f2ff;
}

.posts-scroll-container::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%);
}

.chat-card {
  height: calc(100vh - 280px);
  min-height: 500px;
  max-height: 900px;
  border: 2px solid rgba(102, 126, 234, 0.2);
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
  box-shadow: 0 6px 30px rgba(102, 126, 234, 0.15);
  position: relative;
  overflow: hidden;
}

.chat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
  background-size: 200% 100%;
  animation: gradient-flow 3s ease infinite;
  z-index: 1;
}

.chat-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle at bottom right, rgba(102, 126, 234, 0.08) 0%, transparent 70%);
  pointer-events: none;
}

.chat-card :deep(.el-card__header) {
  position: relative;
  z-index: 2;
}

.chat-card :deep(.el-card__body) {
  height: calc(100% - 65px);
  padding: 0;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  background: linear-gradient(180deg, #fafbff 0%, #f5f7ff 100%);
  scrollbar-width: thin;
  scrollbar-color: #667eea #f0f2ff;
  position: relative;
  z-index: 1;
}

.chat-messages::-webkit-scrollbar {
  width: 10px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #f0f2ff;
  border-radius: 5px;
  border: 1px solid rgba(102, 126, 234, 0.1);
}

.chat-messages::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 5px;
  border: 2px solid #f0f2ff;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%);
}

.chat-message {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.chat-message.self {
  justify-content: flex-end;
}

.message-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  animation: messageFadeIn 0.3s ease;
}

@keyframes messageFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-message.self .message-content {
  align-items: flex-end;
}

.message-username {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.message-bubble {
  padding: 14px 20px;
  border-radius: 20px;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;
}

.chat-message.other .message-bubble {
  background: #ffffff;
  color: #333;
  border-top-left-radius: 8px;
  box-shadow: 0 3px 15px rgba(0, 0, 0, 0.08);
}

.chat-message.self .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-top-right-radius: 8px;
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.35);
}

.message-time {
  font-size: 12px;
  color: #aaa;
  margin-top: 8px;
}

.chat-input-wrapper {
  padding: 0;
  border-top: none;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  position: relative;
  z-index: 1;
}

.chat-input-wrapper .input-row {
  padding: 16px 20px;
  display: flex;
  gap: 14px;
  align-items: stretch;
  border-top: 2px solid rgba(102, 126, 234, 0.1);
}

.chat-input-wrapper .input-row :deep(.el-textarea__inner) {
  resize: none;
  border-radius: 16px;
  border: 2px solid rgba(102, 126, 234, 0.15);
  transition: all 0.3s ease;
  min-height: 48px !important;
  height: 48px !important;
  line-height: 24px;
  padding: 12px 18px;
}

.chat-input-wrapper .input-row :deep(.el-textarea__inner:focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.chat-input-wrapper .input-row :deep(.el-textarea) {
  flex: 1;
}

.chat-input-wrapper .input-row :deep(.el-button) {
  height: 48px !important;
  min-height: 48px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  padding: 0 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-weight: 600;
  font-size: 15px;
}

.chat-input-wrapper .input-row :deep(.el-button:hover) {
  opacity: 0.9;
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
}

.online-status {
  display: flex;
  align-items: center;
}

.online-badge {
  margin-left: 10px;
}

.online-badge :deep(.el-badge__content) {
  background: linear-gradient(135deg, #67c23a 0%, #4caf50 100%);
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.4);
}

.online-count {
  margin-left: 10px;
}

.online-count :deep(.el-badge__content) {
  background: linear-gradient(135deg, #67c23a 0%, #4caf50 100%);
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.4);
}

.online-users-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.online-user-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
  border: 2px solid rgba(102, 126, 234, 0.1);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.06);
}

.online-user-item:hover {
  background: linear-gradient(135deg, #f0f2ff 0%, #e8ebff 100%);
  border-color: rgba(102, 126, 234, 0.4);
  transform: translateX(8px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.18);
}

.online-user-item :deep(.el-avatar) {
  border: 2px solid rgba(102, 126, 234, 0.2);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
  transition: all 0.3s ease;
  cursor: pointer;
}

.online-user-item:hover :deep(.el-avatar) {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.25);
}

.pm-btn {
  flex-shrink: 0;
  margin-left: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
}

.pm-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.online-user-info {
  flex: 1;
  margin-left: 16px;
}

.online-username-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.online-username {
  font-weight: 600;
  font-size: 16px;
  color: #2c3e50;
}

.online-dot {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #666;
}

.dot {
  width: 12px;
  height: 12px;
  background: linear-gradient(135deg, #67c23a 0%, #4caf50 100%);
  border-radius: 50%;
  animation: pulse-dot 2s ease-in-out infinite;
  box-shadow: 0 0 12px rgba(103, 194, 58, 0.6);
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(0.9); }
}

@media (max-width: 768px) {
  .home {
    padding: 20px;
  }

  .welcome-section {
    padding: 40px 24px;
    border-radius: 20px;
    min-height: 180px;
  }

  .welcome-section h1 {
    font-size: 28px;
    margin-bottom: 12px;
  }

  .welcome-section p {
    font-size: 15px;
    padding: 0 10px;
    line-height: 1.5;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }

  .card-header .el-button {
    width: 100%;
  }

  .top-cards-row {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .top-cards-row .feature-card {
    height: auto;
    border-radius: 20px;
  }

  .top-cards-row .feature-card :deep(.el-card__body) {
    height: auto;
    max-height: 450px;
  }

  .latest-posts {
    height: auto;
    border-radius: 20px;
  }

  .latest-posts :deep(.el-card__body) {
    height: auto;
    max-height: 450px;
  }

  .chat-card {
    height: 450px;
    border-radius: 20px;
  }

  .chat-card :deep(.el-card__body) {
    height: calc(100% - 65px);
  }
}

@media (max-width: 480px) {
  .home {
    padding: 16px;
  }

  .welcome-section {
    padding: 32px 20px;
    border-radius: 16px;
    min-height: 160px;
  }

  .welcome-section h1 {
    font-size: 24px;
    margin-bottom: 10px;
  }

  .welcome-section p {
    font-size: 14px;
    padding: 0;
    line-height: 1.5;
  }
  
  .chat-card {
    height: 380px;
    border-radius: 16px;
  }

  .chat-card :deep(.el-card__body) {
    height: calc(100% - 65px);
  }

  .top-cards-row .feature-card :deep(.el-card__body) {
    max-height: 320px;
  }

  .latest-posts :deep(.el-card__body) {
    max-height: 320px;
  }

  .top-cards-row .feature-card,
  .latest-posts {
    border-radius: 16px;
  }
}

.pm-dialog :deep(.el-dialog__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
}

.pm-dialog :deep(.el-dialog__body) {
  padding: 20px;
}

.pm-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pm-user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border-radius: 12px;
  border: 1px solid rgba(102, 126, 234, 0.1);
}

.pm-user-detail {
  flex: 1;
}

.pm-username {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.pm-user-level {
  display: flex;
  align-items: center;
}

.pm-dialog :deep(.el-textarea__inner) {
  border-radius: 12px;
  border: 2px solid rgba(102, 126, 234, 0.15);
  transition: all 0.3s ease;
}

.pm-dialog :deep(.el-textarea__inner:focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.chat-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
  background: #fafbff;
}

.toolbar-btn {
  padding: 4px 8px;
  font-size: 16px;
  color: #667eea;
  min-width: 32px;
}

.toolbar-btn:hover {
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
}

.emoji-icon {
  font-size: 18px;
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
  cursor: pointer;
  border-radius: 6px;
  font-size: 18px;
  transition: all 0.2s ease;
}

.emoji-item:hover {
  background: #f0f2ff;
  transform: scale(1.2);
}

.mention-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mention-search {
  margin-bottom: 8px;
}

.mention-users {
  max-height: 200px;
  overflow-y: auto;
}

.mention-user-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.mention-user-item:hover {
  background: #f0f2ff;
}

.mention-username {
  font-size: 14px;
  color: #2c3e50;
}

.mention-highlight {
  color: #667eea;
  font-weight: 600;
  background: rgba(102, 126, 234, 0.1);
  padding: 0 4px;
  border-radius: 4px;
}
</style>
