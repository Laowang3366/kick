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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import NotificationList from '../components/NotificationList.vue'
import api from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'

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
      params: { type: 'interaction', page: interactionPage.value, limit: 10 }
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
    case 'like':
      return '收到点赞'
    case 'reply':
      return '收到回复'
    case 'favorite':
      return '帖子被收藏'
    default:
      return '通知'
  }
}

const getNotificationLink = (notification) => {
  if (notification.senderId) {
    return `/messages?userId=${notification.senderId}`
  }
  if (notification.content && notification.content.includes('私信')) {
    return '/messages'
  }
  if (notification.relatedId) {
    return `/post/${notification.relatedId}`
  }
  return null
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
  
  if (notification.link) {
    router.push(notification.link)
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
