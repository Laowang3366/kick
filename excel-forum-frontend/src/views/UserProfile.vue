<template>
  <div class="user-profile">
    <el-card class="profile-card">
      <div class="profile-header">
        <div class="avatar-section">
          <el-avatar :src="user.avatar" :size="100">
            {{ user.username?.charAt(0) }}
          </el-avatar>
          <div v-if="isCurrentUser" class="action-buttons">
            <el-button type="primary" size="small" @click="showEditDialog = true">
              编辑资料
            </el-button>
          </div>
          <div v-else-if="userStore.isAuthenticated" class="action-buttons">
            <el-button 
              v-if="!isFollowing"
              type="primary" 
              size="small" 
              :loading="followLoading"
              @click="handleFollow"
            >
              + 关注
            </el-button>
            <el-button 
              v-else
              size="small" 
              :loading="followLoading"
              @click="handleUnfollow"
            >
              已关注
            </el-button>
            <el-button size="small" @click="sendMessage">
              发送私信
            </el-button>
          </div>
        </div>
        <div class="info-section">
          <div class="username-row">
            <h2 class="username">{{ user.username }}</h2>
          </div>
          <div class="level-row">
            <LevelTag v-if="user.level" :level="user.level" :points="user.points" :role="user.role" />
            <span v-else class="level-tag">Lv.1 新手</span>
          </div>
          <p class="bio">{{ user.bio || '这个人很懒，什么都没留下' }}</p>
          <div class="stats">
            <div class="stat">
              <div class="stat-value">{{ user.points || 0 }}</div>
              <div class="stat-label">积分</div>
            </div>
            <div class="stat">
              <div class="stat-value">{{ user.postCount || 0 }}</div>
              <div class="stat-label">帖子</div>
            </div>
            <div class="stat">
              <div class="stat-value">{{ user.replyCount || 0 }}</div>
              <div class="stat-label">回复</div>
            </div>
            <div class="stat">
              <div class="stat-value">{{ followerCount }}</div>
              <div class="stat-label">粉丝</div>
            </div>
            <div class="stat">
              <div class="stat-value">{{ followingCount }}</div>
              <div class="stat-label">关注</div>
            </div>
          </div>
          <div class="tags" v-if="user.expertise?.length">
            <el-tag v-for="tag in user.expertise" :key="tag" size="small" type="success">
              {{ tag }}
            </el-tag>
          </div>
        </div>
      </div>
    </el-card>

    <el-card class="content-card">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="我的帖子" name="posts">
          <PostList :posts="posts" :loading="loading" />
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
          <div v-if="loading" class="loading">
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
        <el-tab-pane label="我的收藏" name="favorites">
          <PostList :posts="favorites" :loading="loading" />
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
          <PostList :posts="viewHistory" :loading="loading" />
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
          <div v-if="loading" class="loading">
            <el-skeleton :rows="5" animated />
          </div>
          <div v-else-if="following.length === 0" class="empty">
            <el-empty description="暂无关注" />
          </div>
          <div v-else class="user-list">
            <div v-for="user in following" :key="user.id" class="user-item">
              <el-avatar :src="user.avatar" :size="40">
                {{ user.username?.charAt(0) }}
              </el-avatar>
              <div class="user-info">
                <div class="username">{{ user.username }}</div>
                <div class="bio">{{ user.bio }}</div>
              </div>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="粉丝" name="followers">
          <div v-if="loading" class="loading">
            <el-skeleton :rows="5" animated />
          </div>
          <div v-else-if="followers.length === 0" class="empty">
            <el-empty description="暂无粉丝" />
          </div>
          <div v-else class="user-list">
            <div v-for="user in followers" :key="user.id" class="user-item">
              <el-avatar :src="user.avatar" :size="40">
                {{ user.username?.charAt(0) }}
              </el-avatar>
              <div class="user-info">
                <div class="username">{{ user.username }}</div>
                <div class="bio">{{ user.bio }}</div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="showEditDialog" title="编辑个人资料" width="500px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="头像">
          <el-upload
            class="avatar-uploader"
            action="/api/upload"
            :headers="uploadHeaders"
            :show-file-list="false"
            :on-success="handleAvatarSuccess"
          >
            <el-avatar :src="editForm.avatar" :size="80">
              {{ editForm.username?.charAt(0) }}
            </el-avatar>
          </el-upload>
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import PostList from '../components/PostList.vue'
import LevelTag from '../components/LevelTag.vue'
import api from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const user = ref({})
const loading = ref(false)
const activeTab = ref('posts')
const showEditDialog = ref(false)
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

const postsPage = ref(1)
const repliesPage = ref(1)
const favoritesPage = ref(1)
const historyPage = ref(1)

const totalPosts = ref(0)
const totalReplies = ref(0)
const totalFavorites = ref(0)
const totalHistory = ref(0)

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

const fetchUser = async () => {
  loading.value = true
  try {
    const response = await api.get(`/users/${route.params.id}`)
    user.value = response
    
    const followersRes = await api.get(`/users/${route.params.id}/followers`)
    followerCount.value = followersRes.users?.length || 0
    
    const followingRes = await api.get(`/users/${route.params.id}/following`)
    followingCount.value = followingRes.users?.length || 0
  } catch (error) {
    console.error('获取用户信息失败:', error)
    ElMessage.error('获取用户信息失败')
  } finally {
    loading.value = false
  }
}

const fetchUserPosts = async () => {
  loading.value = true
  try {
    const response = await api.get(`/users/${route.params.id}/posts`, {
      params: { page: postsPage.value, limit: 10 }
    })
    posts.value = response.posts
    totalPosts.value = response.total
  } catch (error) {
    console.error('获取用户帖子失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchUserReplies = async () => {
  loading.value = true
  try {
    const response = await api.get(`/users/${route.params.id}/replies`, {
      params: { page: repliesPage.value, limit: 10 }
    })
    replies.value = response.replies
    totalReplies.value = response.total
  } catch (error) {
    console.error('获取用户回复失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchUserFavorites = async () => {
  loading.value = true
  try {
    const response = await api.get(`/users/${route.params.id}/favorites`, {
      params: { page: favoritesPage.value, limit: 10 }
    })
    favorites.value = response.posts
    totalFavorites.value = response.total
  } catch (error) {
    console.error('获取用户收藏失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchUserFollowing = async () => {
  loading.value = true
  try {
    const response = await api.get(`/users/${route.params.id}/following`)
    following.value = response.users
  } catch (error) {
    console.error('获取关注列表失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchUserFollowers = async () => {
  loading.value = true
  try {
    const response = await api.get(`/users/${route.params.id}/followers`)
    followers.value = response.users
  } catch (error) {
    console.error('获取粉丝列表失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchViewHistory = async () => {
  if (!isCurrentUser.value) return
  loading.value = true
  try {
    const response = await api.get(`/users/${route.params.id}/view-history`, {
      params: { page: historyPage.value, limit: 10 }
    })
    viewHistory.value = response.posts
    totalHistory.value = response.total
  } catch (error) {
    console.error('获取浏览历史失败:', error)
  } finally {
    loading.value = false
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
}

.profile-card {
  margin-bottom: 20px;
}

.profile-header {
  display: flex;
  gap: 30px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.info-section {
  flex: 1;
}

.username-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.username {
  margin: 0;
  font-size: 24px;
}

.level-row {
  margin-bottom: 10px;
}

.level-tag {
  font-size: 12px;
  color: #909399;
}

.bio {
  color: #606266;
  margin-bottom: 15px;
}

.stats {
  display: flex;
  gap: 25px;
  margin-bottom: 15px;
}

.stat {
  text-align: center;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.content-card {
  margin-bottom: 20px;
}

.loading,
.empty {
  padding: 20px;
}

.reply-item {
  padding: 15px 0;
  border-bottom: 1px solid #ebeef5;
}

.reply-item:last-child {
  border-bottom: none;
}

.reply-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.post-title {
  color: #409eff;
  text-decoration: none;
}

.post-title:hover {
  text-decoration: underline;
}

.reply-time {
  font-size: 12px;
  color: #909399;
}

.reply-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-item:hover {
  background-color: #f5f7fa;
}

.user-info {
  flex: 1;
}

.user-info .username {
  font-weight: bold;
  margin-bottom: 5px;
}

.user-info .bio {
  font-size: 12px;
  color: #909399;
  margin: 0;
}

.pagination {
  margin-top: 20px;
  text-align: center;
}

.avatar-uploader {
  text-align: center;
}

.avatar-uploader :deep(.el-upload) {
  cursor: pointer;
}

@media (max-width: 768px) {
  .user-profile {
    padding: 0 5px;
  }

  .profile-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 20px;
  }

  .avatar-section {
    width: 100%;
  }

  .info-section {
    width: 100%;
  }

  .username {
    font-size: 20px;
  }

  .stats {
    justify-content: center;
    gap: 20px;
  }

  .stat-value {
    font-size: 18px;
  }

  .tags {
    justify-content: center;
  }

  .reply-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .el-dialog {
    width: 90% !important;
  }
}

@media (max-width: 480px) {
  .stats {
    flex-wrap: wrap;
    gap: 15px;
  }

  .stat {
    min-width: 60px;
  }

  .username {
    font-size: 18px;
  }

  .stat-value {
    font-size: 16px;
  }
}
</style>