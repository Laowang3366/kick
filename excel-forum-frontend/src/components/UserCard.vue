<template>
  <el-popover
    :visible="visible"
    :width="320"
    placement="right-start"
    :show-arrow="false"
    :offset="4"
    popper-class="user-card-popover"
  >
    <template #reference>
      <div @mouseenter="showCard" @mouseleave="hideCard">
        <slot></slot>
      </div>
    </template>
    <div class="user-card" @mouseenter="cancelHide" @mouseleave="hideCard">
      <div class="card-header">
        <el-avatar :src="user.avatar" :size="60">
          {{ user.username?.charAt(0) }}
        </el-avatar>
        <div class="user-info">
          <div class="username-row">
            <span class="username">{{ user.username }}</span>
            <el-tag v-if="user.role === 'admin'" type="danger" size="small">管理员</el-tag>
          </div>
          <LevelTag v-if="user.level" :level="user.level" :points="user.points" :role="user.role" />
        </div>
      </div>
      <div class="card-stats">
        <div class="stat-item">
          <span class="stat-value">{{ user.postCount || 0 }}</span>
          <span class="stat-label">帖子</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ user.replyCount || 0 }}</span>
          <span class="stat-label">回复</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ user.points || 0 }}</span>
          <span class="stat-label">积分</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ followerCount }}</span>
          <span class="stat-label">粉丝</span>
        </div>
      </div>
      <div class="card-bio" v-if="user.bio">
        {{ user.bio }}
      </div>
      <div class="card-actions" v-if="showFollowButton && userStore.isAuthenticated && user.id !== userStore.user.id">
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
        <el-button size="small" @click="goToProfile">
          个人主页
        </el-button>
        <el-button size="small" @click="sendMessage">
          私信
        </el-button>
      </div>
    </div>
  </el-popover>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import LevelTag from './LevelTag.vue'
import api from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({
  userId: {
    type: Number,
    required: true
  },
  showFollowButton: {
    type: Boolean,
    default: true
  }
})

const router = useRouter()
const userStore = useUserStore()

const visible = ref(false)
const user = ref({})
const followerCount = ref(0)
const isFollowing = ref(false)
const followLoading = ref(false)
let hideTimer = null

const showCard = () => {
  clearTimeout(hideTimer)
  visible.value = true
  fetchUserInfo()
}

const hideCard = () => {
  hideTimer = setTimeout(() => {
    visible.value = false
  }, 200)
}

const cancelHide = () => {
  clearTimeout(hideTimer)
}

const fetchUserInfo = async () => {
  try {
    const response = await api.get(`/users/${props.userId}`)
    user.value = response
    
    const followersRes = await api.get(`/users/${props.userId}/followers`)
    followerCount.value = followersRes.users?.length || 0
    
    if (userStore.isAuthenticated && props.userId !== userStore.user.id) {
      const followRes = await api.get(`/users/${props.userId}/is-following`)
      isFollowing.value = followRes.isFollowing
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

const handleFollow = async () => {
  followLoading.value = true
  try {
    await api.post(`/users/${props.userId}/follow`)
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
      await api.delete(`/users/${props.userId}/follow`)
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

const goToProfile = () => {
  visible.value = false
  router.push(`/user/${props.userId}`)
}

const sendMessage = () => {
  visible.value = false
  router.push({ path: '/messages', query: { userId: props.userId } })
}
</script>

<style scoped>
.user-card {
  padding: 12px;
}

.card-header {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.user-info {
  flex: 1;
}

.username-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.username {
  font-size: 16px;
  font-weight: bold;
}

.card-stats {
  display: flex;
  justify-content: space-around;
  padding: 12px 0;
  border-top: 1px solid var(--border-lighter);
  border-bottom: 1px solid var(--border-lighter);
  margin-bottom: 12px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 18px;
  font-weight: bold;
  color: var(--text-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.card-bio {
  font-size: 13px;
  color: var(--text-regular);
  margin-bottom: 12px;
  line-height: 1.5;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>

<style>
.user-card-popover {
  padding: 0 !important;
  min-width: 320px !important;
}
</style>
