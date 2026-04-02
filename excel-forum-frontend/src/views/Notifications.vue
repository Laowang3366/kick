<template>
  <div class="notifications-page">
    <div class="page-header">
      <el-button class="back-btn" @click="$router.back()" circle>
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <h1>通知中心</h1>
      <div class="header-actions">
        <el-button v-if="selectedIds.length > 0" type="danger" size="small" @click="deleteSelected">
          删除选中 ({{ selectedIds.length }})
        </el-button>
        <el-button type="primary" size="small" @click="markAllRead">
          全部标记已读
        </el-button>
      </div>
    </div>

    <div class="notifications-container">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="notification-tabs">
        <el-tab-pane label="全部通知" name="all">
          <div class="selection-bar">
            <el-checkbox v-model="isAllSelected" @change="toggleSelectAll">全选</el-checkbox>
            <span class="count-info">共 {{ totalAll }} 条通知</span>
          </div>
          <NotificationList 
            :notifications="allNotifications" 
            :loading="loading" 
            :selected-ids="selectedIds"
            @notification-click="handleNotificationClick"
            @toggle-select="toggleSelect"
            @delete="deleteNotification"
          />
          <div class="pagination">
            <el-pagination
              v-model:current-page="allPage"
              :page-size="10"
              :total="totalAll"
              layout="prev, pager, next"
              @current-change="fetchAllNotifications"
            />
          </div>
        </el-tab-pane>
        <el-tab-pane label="系统通知" name="system">
          <div class="selection-bar">
            <el-checkbox v-model="isAllSelected" @change="toggleSelectAll">全选</el-checkbox>
            <span class="count-info">共 {{ totalSystem }} 条通知</span>
          </div>
          <NotificationList 
            :notifications="systemNotifications" 
            :loading="loading"
            :selected-ids="selectedIds"
            @notification-click="handleNotificationClick"
            @toggle-select="toggleSelect"
            @delete="deleteNotification"
          />
          <div class="pagination">
            <el-pagination
              v-model:current-page="systemPage"
              :page-size="10"
              :total="totalSystem"
              layout="prev, pager, next"
              @current-change="fetchSystemNotifications"
            />
          </div>
        </el-tab-pane>
        <el-tab-pane label="互动通知" name="interaction">
          <div class="selection-bar">
            <el-checkbox v-model="isAllSelected" @change="toggleSelectAll">全选</el-checkbox>
            <span class="count-info">共 {{ totalInteraction }} 条通知</span>
          </div>
          <NotificationList 
            :notifications="interactionNotifications" 
            :loading="loading"
            :selected-ids="selectedIds"
            @notification-click="handleNotificationClick"
            @toggle-select="toggleSelect"
            @delete="deleteNotification"
          />
          <div class="pagination">
            <el-pagination
              v-model:current-page="interactionPage"
              :page-size="10"
              :total="totalInteraction"
              layout="prev, pager, next"
              @current-change="fetchInteractionNotifications"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 通知详情弹窗 -->
    <el-dialog v-model="detailVisible" width="640px" :show-close="false" class="detail-dialog">
      <template #header>
        <div class="dialog-header">
          <div class="dialog-header-left">
            <span class="dialog-type-icon" :class="detailTagType">
              <el-icon :size="18"><component :is="detailIcon" /></el-icon>
            </span>
            <div>
              <h3 class="dialog-title">{{ detailTitle }}</h3>
              <span class="dialog-subtitle">{{ detailTime }}</span>
            </div>
          </div>
          <el-button :icon="Close" circle size="small" text @click="detailVisible = false" />
        </div>
      </template>
      <div class="detail-content">
        <!-- 通知正文 -->
        <div class="detail-body-card">
          <div class="detail-type-badge">
            <el-tag :type="detailTagType" size="small" effect="dark" round>{{ detailCategory }}</el-tag>
          </div>
          <p class="detail-body-text">{{ detailNotification?.content }}</p>
        </div>

        <!-- 关联内容：帖子 -->
        <div v-if="detailPost" class="detail-related">
          <div class="related-label">关联帖子</div>
          <div class="related-post-card" @click="goToPost(detailPost.id)">
            <div class="post-card-header">
              <el-icon><Document /></el-icon>
              <h4>{{ detailPost.title }}</h4>
            </div>
            <p>{{ detailPost.content }}</p>
            <div class="post-card-footer">
              <span class="post-author">
                <el-icon><User /></el-icon>
                {{ detailPost.username || '未知' }}
              </span>
              <span class="post-time">{{ formatDetailTime(detailPost.createTime) }}</span>
            </div>
          </div>
        </div>

        <!-- 关联内容：全站公告 -->
        <div v-if="detailAnnouncement" class="detail-related">
          <div class="related-label">公告详情</div>
          <div class="related-announcement-link" @click="showAnnouncementDetail(detailAnnouncement)">
            <el-icon><Bell /></el-icon>
            <span>{{ detailAnnouncement.title }}</span>
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>
        </div>

        <!-- 关联内容：关注者 -->
        <div v-if="detailFollower" class="detail-related">
          <div class="related-label">关注者</div>
          <div class="related-user-card" @click="goToUser(detailFollower.id)">
            <el-avatar :size="44" :src="detailFollower.avatar">{{ detailFollower.username?.[0] }}</el-avatar>
            <div class="user-info">
              <h4>{{ detailFollower.username }}</h4>
              <p>{{ detailFollower.bio || '这个人很懒，什么都没写' }}</p>
            </div>
            <el-icon class="card-arrow"><ArrowRight /></el-icon>
          </div>
        </div>

        <!-- 关联内容：发私信者 -->
        <div v-if="detailSender" class="detail-related">
          <div class="related-label">发送者</div>
          <div class="related-user-card" @click="goToUser(detailSender.id)">
            <el-avatar :size="44" :src="detailSender.avatar">{{ detailSender.username?.[0] }}</el-avatar>
            <div class="user-info">
              <h4>{{ detailSender.username }}</h4>
              <p>{{ detailSender.bio || '这个人很懒，什么都没写' }}</p>
            </div>
            <el-icon class="card-arrow"><ArrowRight /></el-icon>
          </div>
        </div>

        <div v-if="detailLoading" class="detail-loading">
          <el-skeleton :rows="3" animated />
        </div>
      </div>
      <template #footer>
        <el-button v-if="detailGoLink" type="primary" @click="goDetailLink">
          <el-icon><View /></el-icon>查看详情
        </el-button>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 公告详情弹窗 -->
    <el-dialog v-model="announcementDetailVisible" width="720px" :show-close="false" class="announcement-detail-dialog" destroy-on-close>
      <template #header>
        <div class="dialog-header">
          <div class="dialog-header-left">
            <span class="dialog-type-icon" :class="getAnnouncementIconClass(announcementDetailData?.type)">
              <el-icon :size="20"><Bell /></el-icon>
            </span>
            <div>
              <h3 class="dialog-title">公告详情</h3>
              <span class="dialog-subtitle">{{ formatAnnouncementTime(announcementDetailData?.sendTime) }}</span>
            </div>
          </div>
          <el-button :icon="Close" circle size="small" text @click="announcementDetailVisible = false" />
        </div>
      </template>
      <div class="detail-content" v-if="announcementDetailData">
        <div class="detail-body-card">
          <div class="detail-type-badge">
            <el-tag :type="getAnnouncementTypeTag(announcementDetailData.type)" size="small" effect="dark" round>{{ getAnnouncementTypeName(announcementDetailData.type) }}</el-tag>
          </div>
          
          <div class="detail-title-section">
            <h2 class="detail-main-title">{{ announcementDetailData.title }}</h2>
            <div class="title-divider"></div>
          </div>
          
          <div class="detail-content-section">
            <div class="content-label">
              <el-icon><Document /></el-icon>
              <span>公告内容</span>
            </div>
            <div class="detail-body-text">{{ announcementDetailData.content }}</div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="announcementDetailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import NotificationList from '../components/NotificationList.vue'
import api from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Close, Bell, Star, ChatDotRound, Collection, User, Delete, Document, View, ArrowRight } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref('all')
const loading = ref(false)
const selectedIds = ref([])

const allNotifications = ref([])
const systemNotifications = ref([])
const interactionNotifications = ref([])

const allPage = ref(1)
const systemPage = ref(1)
const interactionPage = ref(1)

const totalAll = ref(0)
const totalSystem = ref(0)
const totalInteraction = ref(0)

const currentNotifications = computed(() => {
  switch (activeTab.value) {
    case 'all': return allNotifications.value
    case 'system': return systemNotifications.value
    case 'interaction': return interactionNotifications.value
    default: return []
  }
})

const isAllSelected = computed({
  get: () => {
    if (currentNotifications.value.length === 0) return false
    return currentNotifications.value.every(n => selectedIds.value.includes(n.id))
  },
  set: () => {}
})

const toggleSelectAll = (val) => {
  if (val) {
    selectedIds.value = currentNotifications.value.map(n => n.id)
  } else {
    selectedIds.value = []
  }
}

const toggleSelect = (id) => {
  const index = selectedIds.value.indexOf(id)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(id)
  }
}

const fetchAllNotifications = async () => {
  loading.value = true
  try {
    const response = await api.get('/notifications', {
      params: { page: allPage.value, limit: 10 }
    })
    allNotifications.value = response.notifications.map(n => transformNotification(n))
    totalAll.value = response.total
  } catch (error) {
    console.error('获取通知失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchSystemNotifications = async () => {
  loading.value = true
  try {
    const response = await api.get('/notifications', {
      params: { type: 'system', page: systemPage.value, limit: 10 }
    })
    systemNotifications.value = response.notifications.map(n => transformNotification(n))
    totalSystem.value = response.total
  } catch (error) {
    console.error('获取系统通知失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchInteractionNotifications = async () => {
  loading.value = true
  try {
    const response = await api.get('/notifications', {
      params: { type: 'interaction,like,reply,favorite,follow,MENTION,message', page: interactionPage.value, limit: 10 }
    })
    interactionNotifications.value = response.notifications.map(n => transformNotification(n))
    totalInteraction.value = response.total
  } catch (error) {
    console.error('获取互动通知失败:', error)
  } finally {
    loading.value = false
  }
}

const transformNotification = (notification) => {
  return {
    id: notification.id,
    type: notification.type,
    title: getNotificationTitle(notification.type),
    content: notification.content,
    createdAt: notification.createTime,
    isRead: notification.isRead === 1,
    link: getNotificationLink(notification),
    relatedId: notification.relatedId,
    senderId: notification.senderId
  }
}

const getNotificationTitle = (type) => {
  switch (type) {
    case 'system':
      return '系统通知'
    case 'interaction':
      return '互动消息'
    case 'post_deleted':
      return '帖子被删除'
    case 'post_review':
      return '审核结果'
    case 'like':
      return '收到点赞'
    case 'reply':
      return '收到回复'
    case 'favorite':
      return '帖子被收藏'
    case 'message':
      return '收到私信'
    case 'MENTION':
      return '有人@了你'
    case 'follow':
      return '新增粉丝'
    case 'site_notification':
      return '全站公告'
    default:
      return '通知'
  }
}

const getNotificationLink = (notification) => {
  switch (notification.type) {
    case 'like':
    case 'reply':
    case 'favorite':
    case 'post_review':
      return notification.relatedId ? `/post/${notification.relatedId}` : null
    case 'message':
      return notification.senderId ? `/messages?userId=${notification.senderId}` : null
    case 'follow':
      return notification.relatedId ? `/user/${notification.relatedId}` : null
    case 'site_notification':
      return '/announcements'
    default:
      return null
  }
}

// ====== 通知详情弹窗 ======
const detailVisible = ref(false)
const detailNotification = ref(null)
const detailTitle = computed(() => detailNotification.value?.title || '通知详情')
const detailTime = computed(() => formatDetailTime(detailNotification.value?.createdAt))
const detailLoading = ref(false)

// 公告详情弹窗
const announcementDetailVisible = ref(false)
const announcementDetailData = ref(null)

// 关联数据
const detailPost = ref(null)
const detailAnnouncement = ref(null)
const detailFollower = ref(null)
const detailSender = ref(null)

const detailGoLink = computed(() => {
  if (!detailNotification.value) return null
  return getNotificationLink(detailNotification.value)
})

const detailCategory = computed(() => {
  if (!detailNotification.value) return '通知'
  return detailNotification.value.title || '通知'
})

const detailTagType = computed(() => {
  const map = {
    system: 'info', post_deleted: 'danger', post_review: 'warning',
    like: 'success', reply: 'primary', favorite: 'success', message: 'primary',
    MENTION: 'primary', follow: 'success', site_notification: 'warning'
  }
  return map[detailNotification.value?.type] || 'info'
})

const detailIcon = computed(() => {
  const map = {
    system: 'Bell', post_deleted: 'Delete', post_review: 'Document',
    like: 'Star', reply: 'ChatDotRound', favorite: 'Collection',
    message: 'ChatDotRound', MENTION: 'User', follow: 'User',
    site_notification: 'Bell'
  }
  return map[detailNotification.value?.type] || 'Bell'
})

const announcementTagType = computed(() => {
  const map = { system: 'info', activity: 'success', update: '', urgent: 'danger' }
  return map[detailAnnouncement.value?.type] || 'info'
})

const announcementTypeLabel = computed(() => {
  const map = { system: '系统公告', activity: '活动通知', update: '更新日志', urgent: '紧急通知' }
  return map[detailAnnouncement.value?.type] || '公告'
})

const formatDetailTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  return date.toLocaleString()
}

const resetDetail = () => {
  detailPost.value = null
  detailAnnouncement.value = null
  detailFollower.value = null
  detailSender.value = null
  detailLoading.value = false
}

const goDetailLink = () => {
  if (detailGoLink.value) {
    detailVisible.value = false
    router.push(detailGoLink.value)
  }
}

const goToPost = (id) => {
  detailVisible.value = false
  router.push(`/post/${id}`)
}

const goToUser = (id) => {
  detailVisible.value = false
  router.push(`/user/${id}`)
}

const showAnnouncementDetail = (announcement) => {
  announcementDetailData.value = announcement
  announcementDetailVisible.value = true
}

const getAnnouncementIconClass = (type) => {
  const map = { system: 'primary', activity: 'success', update: 'warning', urgent: 'danger' }
  return map[type] || 'info'
}

const getAnnouncementTypeTag = (type) => {
  const tags = { system: 'primary', activity: 'success', update: 'warning', urgent: 'danger' }
  return tags[type] || 'info'
}

const getAnnouncementTypeName = (type) => {
  const names = { system: '系统公告', activity: '活动通知', update: '更新日志', urgent: '紧急通知' }
  return names[type] || '通知'
}

const formatAnnouncementTime = (time) => {
  if (!time) return '-'
  return new Date(time).toLocaleString()
}

const handleNotificationClick = async (notification) => {
  if (!notification.isRead) {
    try {
      await api.put(`/notifications/${notification.id}/read`)
      notification.isRead = true
      await userStore.fetchUnreadCount()
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }

  // 弹出详情弹窗
  resetDetail()
  detailNotification.value = notification
  detailVisible.value = true

  // 根据类型加载关联数据
  const { type, relatedId, senderId } = notification

  if (['like', 'reply', 'favorite', 'post_review', 'system'].includes(type) && relatedId) {
    detailLoading.value = true
    try {
      const post = await api.get(`/posts/${relatedId}`)
      detailPost.value = post
    } catch {
      detailPost.value = null
    } finally {
      detailLoading.value = false
    }
  }

  if (type === 'site_notification' && relatedId) {
    detailLoading.value = true
    try {
      const res = await api.get('/notifications/announcements', { params: { page: 1, size: 1 } })
      const ann = res.records?.find(r => r.id === relatedId)
      if (ann) detailAnnouncement.value = ann
    } catch {
      // ignore
    } finally {
      detailLoading.value = false
    }
  }

  if (type === 'follow' && relatedId) {
    detailLoading.value = true
    try {
      const user = await api.get(`/users/${relatedId}`)
      detailFollower.value = user
    } catch {
      detailFollower.value = null
    } finally {
      detailLoading.value = false
    }
  }

  if (type === 'message' && senderId) {
    detailLoading.value = true
    try {
      const user = await api.get(`/users/${senderId}`)
      detailSender.value = user
    } catch {
      detailSender.value = null
    } finally {
      detailLoading.value = false
    }
  }
}

const handleTabChange = (tab) => {
  selectedIds.value = []
  switch (tab) {
    case 'all':
      fetchAllNotifications()
      break
    case 'system':
      fetchSystemNotifications()
      break
    case 'interaction':
      fetchInteractionNotifications()
      break
  }
}

const markAllRead = async () => {
  try {
    await api.put('/notifications/read-all')
    ElMessage.success('已全部标记为已读')
    await userStore.fetchUnreadCount()
    handleTabChange(activeTab.value)
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const deleteNotification = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这条通知吗？', '提示', {
      type: 'warning'
    })
    await api.delete(`/notifications/${id}`)
    ElMessage.success('删除成功')
    selectedIds.value = selectedIds.value.filter(i => i !== id)
    handleTabChange(activeTab.value)
    await userStore.fetchUnreadCount()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const deleteSelected = async () => {
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedIds.value.length} 条通知吗？`, '提示', {
      type: 'warning'
    })
    await api.delete('/notifications/batch', {
      data: { ids: selectedIds.value }
    })
    ElMessage.success('删除成功')
    selectedIds.value = []
    handleTabChange(activeTab.value)
    await userStore.fetchUnreadCount()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  fetchAllNotifications()
})
</script>

<style scoped>
.notifications-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
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

.header-actions {
  display: flex;
  gap: 12px;
}

.notifications-container {
  background: white;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.1);
}

.notification-tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
}

.notification-tabs :deep(.el-tabs__item) {
  font-size: 15px;
  font-weight: 500;
}

.notification-tabs :deep(.el-tabs__item.is-active) {
  color: #667eea;
}

.notification-tabs :deep(.el-tabs__active-bar) {
  background-color: #667eea;
}

.selection-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8f9ff;
  border-radius: 12px;
  margin-bottom: 16px;
}

.count-info {
  font-size: 13px;
  color: #909399;
}

.pagination {
  margin-top: 20px;
  text-align: center;
}

/* ====== 通知详情弹窗 ====== */
.detail-dialog :deep(.el-dialog) {
  border-radius: 20px;
  overflow: hidden;
}

.detail-dialog :deep(.el-dialog__header) {
  padding: 0;
  margin: 0;
}

.detail-dialog :deep(.el-dialog__body) {
  padding: 0 24px 16px;
}

.detail-dialog :deep(.el-dialog__footer) {
  padding: 12px 24px 20px;
  border-top: 1px solid #f0f2f5;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  background: linear-gradient(135deg, #f5f7ff 0%, #f0f2ff 100%);
  border-bottom: 1px solid #e8ecf4;
}

.dialog-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.dialog-type-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.dialog-type-icon.info { background: linear-gradient(135deg, #909399, #b1b3b8); }
.dialog-type-icon.success { background: linear-gradient(135deg, #67c23a, #85ce61); }
.dialog-type-icon.warning { background: linear-gradient(135deg, #e6a23c, #f0c78a); }
.dialog-type-icon.danger { background: linear-gradient(135deg, #f56c6c, #fab6b6); }
.dialog-type-icon.primary { background: linear-gradient(135deg, #667eea, #764ba2); }

.dialog-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #1a1a2e;
  letter-spacing: 0.3px;
}

.dialog-subtitle {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
  display: block;
}

/* 正文卡片 */
.detail-content {
  padding: 0;
}

.detail-body-card {
  position: relative;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 14px;
  padding: 20px;
  margin-top: 16px;
}

.detail-type-badge {
  position: absolute;
  top: -10px;
  left: 16px;
}

.detail-body-text {
  margin: 8px 0 0;
  font-size: 15px;
  line-height: 1.9;
  color: #303133;
  word-break: break-word;
}

/* 关联内容 */
.detail-related {
  margin-top: 20px;
}

.related-label {
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 10px;
  padding-left: 2px;
}

.related-post-card {
  background: #fafbff;
  border: 1px solid #e4e8f1;
  border-radius: 14px;
  padding: 18px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.related-post-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.12);
  transform: translateY(-1px);
}

.post-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: #667eea;
}

.post-card-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1a1a2e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.related-post-card p {
  margin: 0 0 14px;
  font-size: 13px;
  color: #606266;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
}

.post-author {
  display: flex;
  align-items: center;
  gap: 4px;
}

.related-announcement-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8f9ff 0%, #fdf8ff 100%);
  border: 1px solid #e4e8f1;
  border-left: 4px solid #667eea;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.related-announcement-link:hover {
  border-color: #667eea;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.12);
  transform: translateY(-1px);
}

.related-announcement-link .el-icon:first-child {
  font-size: 20px;
  color: #667eea;
}

.related-announcement-link span {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.related-announcement-link .arrow-icon {
  font-size: 16px;
  color: #667eea;
  transition: transform 0.25s ease;
}

.related-announcement-link:hover .arrow-icon {
  transform: translateX(4px);
}

.related-user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fafbff;
  border: 1px solid #e4e8f1;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.related-user-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.12);
  transform: translateY(-1px);
}

.related-user-card .user-info {
  flex: 1;
  min-width: 0;
}

.related-user-card .user-info h4 {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}

.related-user-card .user-info p {
  margin: 0;
  font-size: 13px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-arrow {
  color: #c0c4cc;
  font-size: 16px;
  flex-shrink: 0;
}

.detail-loading {
  margin-top: 20px;
}

/* 公告详情弹窗样式 */
.announcement-detail-dialog :deep(.el-dialog) {
  border-radius: 20px;
  overflow: hidden;
}

.announcement-detail-dialog :deep(.el-dialog__header) {
  padding: 0;
  margin: 0;
}

.announcement-detail-dialog :deep(.el-dialog__body) {
  padding: 0 24px 16px;
}

.announcement-detail-dialog :deep(.el-dialog__footer) {
  padding: 12px 24px 20px;
  border-top: 1px solid #f0f2f5;
}

.announcement-detail-dialog .detail-body-card {
  position: relative;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 14px;
  padding: 24px;
  margin-top: 16px;
}

.announcement-detail-dialog .detail-type-badge {
  position: absolute;
  top: -10px;
  left: 16px;
}

.announcement-detail-dialog .detail-title-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
}

.announcement-detail-dialog .detail-main-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1a1a2e;
  line-height: 1.4;
  letter-spacing: 0.5px;
  text-align: center;
}

.announcement-detail-dialog .title-divider {
  margin-top: 16px;
  height: 3px;
  background: linear-gradient(90deg, transparent, #667eea, transparent);
  border-radius: 2px;
}

.announcement-detail-dialog .detail-content-section {
  margin-top: 8px;
}

.announcement-detail-dialog .content-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #667eea;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #f5f7ff 0%, #f0f2ff 100%);
  border-radius: 8px;
  border-left: 3px solid #667eea;
}

.announcement-detail-dialog .detail-body-text {
  font-size: 15px;
  line-height: 2;
  color: #2c2c2c;
  word-break: break-word;
  padding: 16px;
  background: #fafbff;
  border-radius: 10px;
  border: 1px solid #f0f2f5;
}

@media (max-width: 768px) {
  .notifications-page {
    padding: 16px;
  }

  .page-header {
    flex-wrap: wrap;
    padding: 16px 20px;
  }

  .page-header h1 {
    flex: 1;
    text-align: center;
  }

  .back-btn {
    width: 36px;
    height: 36px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
    margin-top: 12px;
  }
}
</style>
