<template>
  <div class="following-page">
    <div class="page-header">
      <h1>我的关注</h1>
      <p>查看你关注的用户和板块</p>
    </div>

    <el-tabs v-model="activeTab" class="following-tabs">
      <el-tab-pane label="关注的用户" name="users">
        <div v-if="usersLoading" class="loading-state">
          <el-skeleton :rows="3" animated />
        </div>
        <div v-else class="user-list">
          <div v-if="followingUsers.length === 0" class="empty-state">
            <el-icon><User /></el-icon>
            <p>暂无关注的用户</p>
            <el-button type="primary" @click="$router.push('/')">去发现用户</el-button>
          </div>
          <div v-for="user in followingUsers" :key="user.id" class="user-card" @click="$router.push(`/user/${user.id}`)">
            <el-avatar :src="user.avatar" :size="56" class="user-avatar">
              {{ user.username?.charAt(0) }}
            </el-avatar>
            <div class="user-info">
              <h3>{{ user.username }}</h3>
              <p>{{ user.bio || '这个人很懒，什么都没写~' }}</p>
            </div>
            <el-button
              :type="user.isFollowing ? 'default' : 'primary'"
              @click.stop="toggleUserFollow(user)"
            >
              {{ user.isFollowing ? '已关注' : '关注' }}
            </el-button>
          </div>
          <div v-if="followingUsers.length > 0 && usersTotal > followingUsers.length" class="load-more">
            <el-button @click="loadMoreUsers" :loading="usersLoadingMore">加载更多</el-button>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="关注的板块" name="forums">
        <div v-if="forumsLoading" class="loading-state">
          <el-skeleton :rows="3" animated />
        </div>
        <div v-else class="forum-list">
          <div v-if="followingForums.length === 0" class="empty-state">
            <el-icon><ChatDotRound /></el-icon>
            <p>暂无关注的板块</p>
            <el-button type="primary" @click="goToDiscoverForums">去发现版块</el-button>
          </div>
          <div v-for="forum in followingForums" :key="forum.id" class="forum-card" @click="$router.push(`/forum/${forum.id}`)">
            <div class="forum-icon">
              <el-icon><ChatDotRound /></el-icon>
            </div>
            <div class="forum-info">
              <h3>{{ forum.name }}</h3>
              <p>{{ forum.description || '暂无描述' }}</p>
              <div class="forum-stats">
                <span>{{ forum.postCount || 0 }} 帖子</span>
              </div>
            </div>
            <el-button
              type="default"
              size="small"
              @click.stop="toggleForumFollow(forum)"
            >
              取消关注
            </el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, ChatDotRound } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import api from '../api'

const router = useRouter()
const userStore = useUserStore()
const activeTab = ref('users')

// 用户关注
const followingUsers = ref([])
const usersLoading = ref(false)
const usersLoadingMore = ref(false)
const usersPage = ref(1)
const usersTotal = ref(0)

// 板块关注
const followingForums = ref([])
const forumsLoading = ref(false)

const fetchFollowingUsers = async (loadMore = false) => {
  if (loadMore) {
    usersLoadingMore.value = true
  } else {
    usersLoading.value = true
  }
  try {
    const userId = userStore.user?.id
    if (!userId) return
    const response = await api.get(`/users/${userId}/following`, {
      params: { page: usersPage.value, limit: 10 }
    })
    const users = response.users.map(u => ({ ...u, isFollowing: true }))
    if (loadMore) {
      followingUsers.value = [...followingUsers.value, ...users]
    } else {
      followingUsers.value = users
    }
    usersTotal.value = response.total
  } catch (error) {
    console.error('获取关注用户失败:', error)
  } finally {
    usersLoading.value = false
    usersLoadingMore.value = false
  }
}

const loadMoreUsers = () => {
  usersPage.value++
  fetchFollowingUsers(true)
}

const toggleUserFollow = async (user) => {
  try {
    if (user.isFollowing) {
      await api.delete(`/users/${user.id}/follow`)
      user.isFollowing = false
      ElMessage.success('已取消关注')
      // 从列表中移除
      followingUsers.value = followingUsers.value.filter(u => u.id !== user.id)
      usersTotal.value--
    } else {
      await api.post(`/users/${user.id}/follow`)
      user.isFollowing = true
      ElMessage.success('关注成功')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '操作失败')
  }
}

const fetchFollowingForums = async () => {
  forumsLoading.value = true
  try {
    const response = await api.get('/users/category-follows')
    followingForums.value = response.categories || []
  } catch (error) {
    console.error('获取关注板块失败:', error)
  } finally {
    forumsLoading.value = false
  }
}

const toggleForumFollow = async (forum) => {
  try {
    await api.delete(`/users/category-follows/${forum.id}`)
    ElMessage.success('已取消关注')
    followingForums.value = followingForums.value.filter(f => f.id !== forum.id)
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '操作失败')
  }
}

const goToDiscoverForums = async () => {
  try {
    const response = await api.get('/categories')
    if (response && response.length > 0) {
      router.push(`/forum/${response[0].id}`)
    } else {
      ElMessage.warning('暂无可用的板块')
    }
  } catch (error) {
    console.error('获取板块列表失败:', error)
    ElMessage.error('获取板块列表失败')
  }
}

onMounted(() => {
  fetchFollowingUsers()
  fetchFollowingForums()
})
</script>

<style scoped>
.following-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
  padding: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24px;
  color: white;
}

.page-header h1 {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}

.page-header p {
  font-size: 16px;
  opacity: 0.9;
}

.following-tabs {
  background: white;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.1);
}

.loading-state {
  padding: 20px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #95a5a6;
}

.empty-state .el-icon {
  font-size: 56px;
  margin-bottom: 16px;
  color: #bdc3c7;
}

.empty-state p {
  margin-bottom: 20px;
  font-size: 16px;
}

.user-list, .forum-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #f8f9ff;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.user-card:hover {
  background: #f0f2ff;
  transform: translateX(4px);
}

.user-avatar {
  margin-right: 16px;
  border: 3px solid #667eea;
}

.user-info {
  flex: 1;
}

.user-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.user-info p {
  font-size: 14px;
  color: #7f8c8d;
  margin-bottom: 4px;
}

.forum-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #f8f9ff;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.forum-card:hover {
  background: #f0f2ff;
  transform: translateX(4px);
}

.forum-icon {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  flex-shrink: 0;
}

.forum-icon .el-icon {
  font-size: 24px;
  color: white;
}

.forum-info {
  flex: 1;
}

.forum-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.forum-info p {
  font-size: 14px;
  color: #7f8c8d;
  margin-bottom: 8px;
}

.forum-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #667eea;
}

.load-more {
  text-align: center;
  padding: 16px 0;
}

@media (max-width: 768px) {
  .following-page {
    padding: 16px;
  }

  .user-card, .forum-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
