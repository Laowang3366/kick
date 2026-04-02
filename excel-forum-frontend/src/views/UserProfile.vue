<template>
  <div class="user-profile">
    <div class="profile-card">
      <div class="profile-cover">
        <div class="cover-overlay"></div>
        <div class="cover-pattern"></div>
      </div>
      <div class="profile-body">
        <div class="avatar-wrapper">
          <el-avatar :src="user.avatar" :size="120" class="user-avatar">
            {{ user.username?.charAt(0) }}
          </el-avatar>
          <div class="avatar-ring"></div>
        </div>
        <div class="user-main-info">
          <div class="name-section">
            <h1 class="username">{{ user.username }}</h1>
            <div class="level-badge">
              <LevelTag v-if="user.level" :level="user.level" :points="user.points" :role="user.role" />
              <span v-else class="level-tag">Lv.1 新手</span>
            </div>
          </div>
          <p class="user-bio">{{ user.bio || '这个人很懒，什么都没留下' }}</p>
          <div class="expertise-tags" v-if="user.expertise?.length">
            <el-tag v-for="tag in user.expertise" :key="tag" size="small" effect="plain">
              {{ tag }}
            </el-tag>
          </div>
        </div>
        <div class="action-area">
          <div v-if="isCurrentUser" class="action-buttons">
            <el-button type="primary" @click="showEditDialog = true">
              <el-icon><Edit /></el-icon>
              编辑资料
            </el-button>
          </div>
          <div v-else-if="userStore.isAuthenticated" class="action-buttons">
            <el-button
              v-if="!isFollowing"
              type="primary"
              :loading="followLoading"
              @click="handleFollow"
            >
              <el-icon><Plus /></el-icon>
              关注
            </el-button>
            <el-button
              v-else
              :loading="followLoading"
              @click="handleUnfollow"
            >
              <el-icon><Check /></el-icon>
              已关注
            </el-button>
            <el-button @click="sendMessage">
              <el-icon><ChatDotRound /></el-icon>
              私信
            </el-button>
          </div>
        </div>
      </div>
      <div class="profile-stats">
        <div class="stat-item" @click="activeTab = 'posts'">
          <div class="stat-num">{{ user.postCount || 0 }}</div>
          <div class="stat-text">帖子</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item" @click="activeTab = 'replies'">
          <div class="stat-num">{{ user.replyCount || 0 }}</div>
          <div class="stat-text">回复</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item" @click="activeTab = 'followers'">
          <div class="stat-num">{{ followerCount }}</div>
          <div class="stat-text">粉丝</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item" @click="activeTab = 'following'">
          <div class="stat-num">{{ followingCount }}</div>
          <div class="stat-text">关注</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item points-item">
          <div class="stat-num">{{ user.points || 0 }}</div>
          <div class="stat-text">积分</div>
        </div>
      </div>
    </div>

    <el-card class="content-card">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="我的帖子" name="posts">
          <PostList :posts="posts" :loading="postsLoading" />
          <div class="pagination">
            <el-pagination
              v-model:current-page="postsPage"
              :page-size="10"
              :total="totalPosts"
              layout="prev, pager, next"
              @current-change="fetchUserPosts"
            />
          </div>
        </el-tab-pane>
        <el-tab-pane label="我的回复" name="replies">
          <div v-if="repliesLoading" class="loading">
            <el-skeleton :rows="5" animated />
          </div>
          <div v-else-if="replies.length === 0" class="empty">
            <el-empty description="暂无回复" />
          </div>
          <div v-else>
            <div v-for="reply in replies" :key="reply.id" class="reply-item">
              <div class="reply-info">
                <router-link :to="`/post/${reply.post.id}`" class="post-title">
                  {{ reply.post.title }}
                </router-link>
                <div class="reply-time">{{ formatTime(reply.createdAt) }}</div>
              </div>
              <div class="reply-content" v-html="reply.content"></div>
            </div>
            <div class="pagination">
              <el-pagination
                v-model:current-page="repliesPage"
                :page-size="10"
                :total="totalReplies"
                layout="prev, pager, next"
                @current-change="fetchUserReplies"
              />
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane v-if="isCurrentUser" label="我的收藏" name="favorites">
          <PostList :posts="favorites" :loading="favoritesLoading" />
          <div class="pagination">
            <el-pagination
              v-model:current-page="favoritesPage"
              :page-size="10"
              :total="totalFavorites"
              layout="prev, pager, next"
              @current-change="fetchUserFavorites"
            />
          </div>
        </el-tab-pane>
        <el-tab-pane v-if="isCurrentUser" label="浏览历史" name="history">
          <PostList :posts="viewHistory" :loading="historyLoading" />
          <div class="pagination">
            <el-pagination
              v-model:current-page="historyPage"
              :page-size="10"
              :total="totalHistory"
              layout="prev, pager, next"
              @current-change="fetchViewHistory"
            />
          </div>
        </el-tab-pane>
        <el-tab-pane label="关注" name="following">
          <div v-if="followingLoading" class="loading">
            <el-skeleton :rows="5" animated />
          </div>
          <div v-else-if="following.length === 0" class="empty">
            <el-empty description="暂无关注" />
          </div>
          <div v-else>
            <div class="user-list">
              <div v-for="user in following" :key="user.id" class="user-item" @click="router.push(`/user/${user.id}`)">
                <el-avatar :src="user.avatar" :size="40">
                  {{ user.username?.charAt(0) }}
                </el-avatar>
                <div class="user-info">
                  <div class="username">{{ user.username }}</div>
                  <div class="bio">{{ user.bio }}</div>
                </div>
              </div>
            </div>
            <div class="pagination">
              <el-pagination
                v-model:current-page="followingPage"
                :page-size="10"
                :total="totalFollowing"
                layout="prev, pager, next"
                @current-change="fetchUserFollowing"
              />
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="粉丝" name="followers">
          <div v-if="followersLoading" class="loading">
            <el-skeleton :rows="5" animated />
          </div>
          <div v-else-if="followers.length === 0" class="empty">
            <el-empty description="暂无粉丝" />
          </div>
          <div v-else>
            <div class="user-list">
              <div v-for="user in followers" :key="user.id" class="user-item" @click="router.push(`/user/${user.id}`)">
                <el-avatar :src="user.avatar" :size="40">
                  {{ user.username?.charAt(0) }}
                </el-avatar>
                <div class="user-info">
                  <div class="username">{{ user.username }}</div>
                  <div class="bio">{{ user.bio }}</div>
                </div>
              </div>
            </div>
            <div class="pagination">
              <el-pagination
                v-model:current-page="followersPage"
                :page-size="10"
                :total="totalFollowers"
                layout="prev, pager, next"
                @current-change="fetchUserFollowers"
              />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="showEditDialog" title="编辑个人资料" width="500px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="头像">
          <div class="avatar-edit-wrapper">
            <div class="avatar-preview" @click="handleAvatarPreview">
              <img v-if="editForm.avatar" :src="editForm.avatar" alt="头像" />
              <div v-else class="avatar-fallback">
                {{ editForm.username?.charAt(0) }}
              </div>
            </div>
            <el-upload
              ref="avatarUploadRef"
              class="avatar-upload-hidden"
              action="/api/upload"
              name="file"
              :headers="uploadHeaders"
              :show-file-list="false"
              :on-success="handleAvatarSuccess"
              :on-error="handleAvatarError"
              :before-upload="beforeAvatarUpload"
              :auto-upload="true"
            >
            </el-upload>
            <el-button type="primary" size="small" @click="triggerAvatarUpload">
              <el-icon><Upload /></el-icon>
              上传头像
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="editForm.username" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="editForm.bio" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="专长标签">
          <el-select v-model="editForm.expertise" multiple filterable allow-create default-first-option>
            <el-option label="VBA" value="VBA" />
            <el-option label="Power Query" value="Power Query" />
            <el-option label="函数公式" value="函数公式" />
            <el-option label="图表" value="图表" />
            <el-option label="数据透视表" value="数据透视表" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showAvatarPreview"
      title="头像预览"
      width="400px"
      class="avatar-preview-dialog"
    >
      <div class="preview-content">
        <img :src="editForm.avatar" alt="头像预览" class="preview-image" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import PostList from '../components/PostList.vue'
import LevelTag from '../components/LevelTag.vue'
import api from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Plus, Check, ChatDotRound, Upload } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const user = ref({})
const activeTab = ref('posts')
const showEditDialog = ref(false)
const avatarUploadRef = ref(null)
const showAvatarPreview = ref(false)
const isFollowing = ref(false)
const followLoading = ref(false)
const followerCount = ref(0)
const followingCount = ref(0)

const posts = ref([])
const replies = ref([])
const favorites = ref([])
const following = ref([])
const followers = ref([])
const viewHistory = ref([])

// 各 tab 独立 loading
const postsLoading = ref(false)
const repliesLoading = ref(false)
const favoritesLoading = ref(false)
const historyLoading = ref(false)
const followingLoading = ref(false)
const followersLoading = ref(false)

// 各 tab 独立分页
const postsPage = ref(1)
const repliesPage = ref(1)
const favoritesPage = ref(1)
const historyPage = ref(1)
const followingPage = ref(1)
const followersPage = ref(1)

const totalPosts = ref(0)
const totalReplies = ref(0)
const totalFavorites = ref(0)
const totalHistory = ref(0)
const totalFollowing = ref(0)
const totalFollowers = ref(0)

const editForm = reactive({
  avatar: '',
  username: '',
  bio: '',
  expertise: []
})

const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})

const isCurrentUser = computed(() => {
  return userStore.isAuthenticated && userStore.user.id === parseInt(route.params.id)
})

const formatTime = (time) => {
  const date = new Date(time)
  return date.toLocaleString()
}

const beforeAvatarUpload = (file) => {
  const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('头像只能是 JPG/PNG/GIF/WebP 格式')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('头像大小不能超过 2MB')
    return false
  }
  return true
}

const resetTabState = () => {
  activeTab.value = 'posts'
  posts.value = []
  replies.value = []
  favorites.value = []
  following.value = []
  followers.value = []
  viewHistory.value = []
  postsPage.value = 1
  repliesPage.value = 1
  favoritesPage.value = 1
  historyPage.value = 1
  followingPage.value = 1
  followersPage.value = 1
  totalPosts.value = 0
  totalReplies.value = 0
  totalFavorites.value = 0
  totalHistory.value = 0
  totalFollowing.value = 0
  totalFollowers.value = 0
}

const fetchUser = async () => {
  try {
    const response = await api.get(`/users/${route.params.id}`)
    user.value = response
    if (typeof response.expertise === 'string' && response.expertise) {
      user.value.expertise = response.expertise.split(',').map(s => s.trim()).filter(Boolean)
    } else if (!Array.isArray(response.expertise)) {
      user.value.expertise = []
    }

    const followersRes = await api.get(`/users/${route.params.id}/followers`, {
      params: { page: 1, limit: 1 }
    })
    followerCount.value = followersRes.total || 0

    const followingRes = await api.get(`/users/${route.params.id}/following`, {
      params: { page: 1, limit: 1 }
    })
    followingCount.value = followingRes.total || 0
  } catch (error) {
    console.error('获取用户信息失败:', error)
    ElMessage.error('获取用户信息失败')
  }
}

const fetchUserPosts = async () => {
  postsLoading.value = true
  try {
    const response = await api.get(`/users/${route.params.id}/posts`, {
      params: { page: postsPage.value, limit: 10 }
    })
    posts.value = response.posts
    totalPosts.value = response.total
  } catch (error) {
    console.error('获取用户帖子失败:', error)
  } finally {
    postsLoading.value = false
  }
}

const fetchUserReplies = async () => {
  repliesLoading.value = true
  try {
    const response = await api.get(`/users/${route.params.id}/replies`, {
      params: { page: repliesPage.value, limit: 10 }
    })
    replies.value = response.replies
    totalReplies.value = response.total
  } catch (error) {
    console.error('获取用户回复失败:', error)
  } finally {
    repliesLoading.value = false
  }
}

const fetchUserFavorites = async () => {
  favoritesLoading.value = true
  try {
    const response = await api.get(`/users/${route.params.id}/favorites`, {
      params: { page: favoritesPage.value, limit: 10 }
    })
    favorites.value = response.posts
    totalFavorites.value = response.total
  } catch (error) {
    console.error('获取用户收藏失败:', error)
  } finally {
    favoritesLoading.value = false
  }
}

const fetchUserFollowing = async () => {
  followingLoading.value = true
  try {
    const response = await api.get(`/users/${route.params.id}/following`, {
      params: { page: followingPage.value, limit: 10 }
    })
    following.value = response.users
    totalFollowing.value = response.total || 0
  } catch (error) {
    console.error('获取关注列表失败:', error)
  } finally {
    followingLoading.value = false
  }
}

const fetchUserFollowers = async () => {
  followersLoading.value = true
  try {
    const response = await api.get(`/users/${route.params.id}/followers`, {
      params: { page: followersPage.value, limit: 10 }
    })
    followers.value = response.users
    totalFollowers.value = response.total || 0
  } catch (error) {
    console.error('获取粉丝列表失败:', error)
  } finally {
    followersLoading.value = false
  }
}

const fetchViewHistory = async () => {
  if (!isCurrentUser.value) return
  historyLoading.value = true
  try {
    const response = await api.get(`/users/${route.params.id}/view-history`, {
      params: { page: historyPage.value, limit: 10 }
    })
    viewHistory.value = response.posts
    totalHistory.value = response.total
  } catch (error) {
    console.error('获取浏览历史失败:', error)
  } finally {
    historyLoading.value = false
  }
}

const handleTabChange = (tab) => {
  switch (tab) {
    case 'posts':
      fetchUserPosts()
      break
    case 'replies':
      fetchUserReplies()
      break
    case 'favorites':
      fetchUserFavorites()
      break
    case 'history':
      fetchViewHistory()
      break
    case 'following':
      fetchUserFollowing()
      break
    case 'followers':
      fetchUserFollowers()
      break
  }
}

const handleAvatarSuccess = (response) => {
  editForm.avatar = response.url
  ElMessage.success('头像上传成功，点击保存按钮完成更新')
}

const handleAvatarError = (error) => {
  console.error('头像上传失败:', error)
  ElMessage.error('头像上传失败，请重试')
}

const triggerAvatarUpload = () => {
  if (avatarUploadRef.value) {
    const uploadInput = avatarUploadRef.value.$el.querySelector('input[type="file"]')
    if (uploadInput) {
      uploadInput.click()
    }
  }
}

const handleAvatarPreview = () => {
  if (editForm.avatar) {
    showAvatarPreview.value = true
  }
}

const saveProfile = async () => {
  try {
    await userStore.updateProfile(editForm)
    ElMessage.success('保存成功')
    showEditDialog.value = false
    fetchUser()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const sendMessage = () => {
  router.push({ path: '/messages', query: { userId: route.params.id } })
}

const checkFollowStatus = async () => {
  if (!userStore.isAuthenticated || isCurrentUser.value) return

  try {
    const response = await api.get(`/users/${route.params.id}/is-following`)
    isFollowing.value = response.isFollowing
  } catch (error) {
    console.error('检查关注状态失败:', error)
  }
}

const refreshFollowCounts = async () => {
  try {
    const followersRes = await api.get(`/users/${route.params.id}/followers`, {
      params: { page: 1, limit: 1 }
    })
    followerCount.value = followersRes.total || 0

    const followingRes = await api.get(`/users/${route.params.id}/following`, {
      params: { page: 1, limit: 1 }
    })
    followingCount.value = followingRes.total || 0
  } catch (error) {
    console.error('刷新关注计数失败:', error)
  }
}

const handleFollow = async () => {
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }

  followLoading.value = true
  try {
    await api.post(`/users/${route.params.id}/follow`)
    isFollowing.value = true
    ElMessage.success('关注成功')
    refreshFollowCounts()
  } catch (error) {
    ElMessage.error('关注失败')
  } finally {
    followLoading.value = false
  }
}

const handleUnfollow = async () => {
  try {
    await ElMessageBox.confirm('确定要取消关注吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    followLoading.value = true
    try {
      await api.delete(`/users/${route.params.id}/follow`)
      isFollowing.value = false
      ElMessage.success('已取消关注')
      refreshFollowCounts()
    } catch (error) {
      ElMessage.error('取消关注失败')
    } finally {
      followLoading.value = false
    }
  } catch {
    // 用户取消操作
  }
}

watch(() => route.params.id, () => {
  resetTabState()
  fetchUser()
  fetchUserPosts()
  checkFollowStatus()
}, { immediate: true })

watch(showEditDialog, (val) => {
  if (val) {
    editForm.avatar = user.value.avatar
    editForm.username = user.value.username
    editForm.bio = user.value.bio
    editForm.expertise = user.value.expertise || []
  }
})
</script>

<style scoped>
.user-profile {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
}

.profile-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  box-shadow: var(--card-shadow);
  overflow: hidden;
  margin-bottom: 24px;
}

.profile-cover {
  height: 180px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  position: relative;
  overflow: hidden;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 100%);
}

.cover-pattern {
  position: absolute;
  inset: 0;
  background-image: 
    radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 40%),
    radial-gradient(circle at 40% 80%, rgba(255,255,255,0.1) 0%, transparent 40%);
  animation: patternFloat 20s ease-in-out infinite;
}

@keyframes patternFloat {
  0%, 100% { transform: translateX(0) translateY(0); }
  50% { transform: translateX(-20px) translateY(-10px); }
}

.profile-body {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  padding: 0 32px;
  margin-top: -60px;
  position: relative;
  z-index: 1;
}

.avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.user-avatar {
  border: 4px solid #fff;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  font-size: 48px;
  font-weight: 600;
  color: var(--primary-color);
}

.avatar-ring {
  position: absolute;
  inset: -6px;
  border: 3px solid transparent;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2) border-box;
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: ringRotate 8s linear infinite;
}

@keyframes ringRotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.user-main-info {
  flex: 1;
  min-width: 0;
  padding-top: 72px;
}

.name-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.username {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.level-badge {
  display: flex;
  align-items: center;
}

.level-tag {
  font-size: 12px;
  color: #fff;
  padding: 4px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  font-weight: 500;
}

.user-bio {
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  font-size: 15px;
  line-height: 1.6;
  max-width: 500px;
}

.expertise-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.expertise-tags .el-tag {
  border-radius: 16px;
  font-weight: 500;
  background: rgba(102, 126, 234, 0.1);
  border-color: rgba(102, 126, 234, 0.3);
  color: var(--primary-color);
}

.action-area {
  padding-top: 72px;
  flex-shrink: 0;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.action-buttons .el-button {
  border-radius: 20px;
  font-weight: 500;
  padding: 10px 20px;
  transition: all 0.3s ease;
}

.action-buttons .el-button--primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.action-buttons .el-button--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
}

.action-buttons .el-button:not(.el-button--primary) {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.action-buttons .el-button:not(.el-button--primary):hover {
  background: var(--bg-tertiary);
  color: var(--primary-color);
  border-color: var(--primary-color);
}

.profile-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 32px;
  margin-top: 16px;
  background: linear-gradient(180deg, transparent 0%, rgba(102, 126, 234, 0.03) 100%);
  border-top: 1px solid var(--border-color);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 32px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 12px;
}

.stat-item:hover {
  background: rgba(102, 126, 234, 0.08);
  transform: translateY(-2px);
}

.stat-num {
  font-size: 26px;
  font-weight: 700;
  color: var(--primary-color);
  line-height: 1.2;
}

.stat-text {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-top: 4px;
  font-weight: 500;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--border-color);
}

.content-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  box-shadow: var(--card-shadow);
  overflow: hidden;
}

.content-card :deep(.el-card__body) {
  padding: 24px;
}

.content-card :deep(.el-tabs__header) {
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-color);
}

.content-card :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.content-card :deep(.el-tabs__item) {
  font-weight: 500;
  color: var(--text-secondary);
  padding: 0 24px;
  height: 48px;
  line-height: 48px;
  transition: all 0.3s ease;
}

.content-card :deep(.el-tabs__item.is-active) {
  color: var(--primary-color);
  font-weight: 600;
}

.content-card :deep(.el-tabs__item:hover) {
  color: var(--primary-color);
}

.content-card :deep(.el-tabs__active-bar) {
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.avatar-edit-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid var(--border-color);
  transition: all 0.3s ease;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-preview:hover {
  border-color: var(--primary-color);
  transform: scale(1.05);
}

.avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 32px;
  font-weight: 600;
}

.avatar-upload-hidden {
  display: none;
}

.avatar-preview-dialog .preview-content {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.avatar-preview-dialog .preview-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.loading,
.empty {
  padding: 40px 20px;
  text-align: center;
}

.reply-item {
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 12px;
  background: var(--bg-secondary);
  transition: all 0.3s ease;
}

.reply-item:hover {
  background: var(--bg-tertiary);
  transform: translateX(4px);
}

.reply-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.post-title {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 600;
  font-size: 15px;
  transition: all 0.3s ease;
}

.post-title:hover {
  color: var(--primary-dark);
  text-decoration: underline;
}

.reply-time {
  font-size: 12px;
  color: var(--text-tertiary);
}

.reply-content {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;
  word-break: break-word;
}

.user-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 16px;
  transition: all 0.3s ease;
  cursor: pointer;
  background: var(--bg-secondary);
  border: 1px solid transparent;
}

.user-item:hover {
  background: var(--bg-tertiary);
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
}

.user-item .el-avatar {
  border: 2px solid var(--border-color);
  transition: all 0.3s ease;
}

.user-item:hover .el-avatar {
  border-color: var(--primary-color);
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-info .username {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.user-info .bio {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination {
  margin-top: 24px;
  text-align: center;
}

.avatar-uploader {
  text-align: center;
}

.avatar-uploader :deep(.el-upload) {
  cursor: pointer;
  transition: all 0.3s ease;
}

.avatar-uploader :deep(.el-upload:hover) {
  transform: scale(1.05);
}

@media (max-width: 768px) {
  .user-profile {
    padding: 16px;
  }

  .profile-cover {
    height: 140px;
  }

  .profile-body {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 0 20px;
    margin-top: -50px;
  }

  .avatar-wrapper {
    margin-bottom: 16px;
  }

  .user-avatar {
    width: 100px !important;
    height: 100px !important;
    font-size: 36px;
  }

  .user-main-info {
    padding-top: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .name-section {
    justify-content: center;
  }

  .username {
    font-size: 24px;
  }

  .user-bio {
    text-align: center;
    max-width: 100%;
  }

  .expertise-tags {
    justify-content: center;
  }

  .action-area {
    padding-top: 16px;
    width: 100%;
  }

  .action-buttons {
    justify-content: center;
  }

  .profile-stats {
    flex-wrap: wrap;
    padding: 16px;
    gap: 8px;
  }

  .stat-item {
    padding: 8px 20px;
  }

  .stat-divider {
    display: none;
  }

  .stat-num {
    font-size: 22px;
  }

  .user-list {
    grid-template-columns: 1fr;
  }

  .reply-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .user-profile {
    padding: 12px;
  }

  .profile-cover {
    height: 120px;
  }

  .profile-body {
    padding: 0 16px;
  }

  .user-avatar {
    width: 80px !important;
    height: 80px !important;
    font-size: 28px;
  }

  .username {
    font-size: 20px;
  }

  .action-buttons {
    flex-direction: column;
    width: 100%;
  }

  .action-buttons .el-button {
    width: 100%;
  }

  .stat-item {
    padding: 8px 16px;
  }

  .stat-num {
    font-size: 20px;
  }
}
</style>
