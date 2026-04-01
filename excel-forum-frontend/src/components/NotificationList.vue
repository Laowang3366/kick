<template>
  <div class="notification-list">
    <div v-if="loading" class="loading">
      <el-skeleton :rows="5" animated />
    </div>
    <div v-else-if="notifications.length === 0" class="empty">
      <el-empty description="暂无通知" />
    </div>
    <div v-else class="notification-items">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="notification-item"
        :class="{ unread: !notification.isRead, selected: isSelected(notification.id) }"
      >
        <div class="notification-checkbox" @click.stop>
          <el-checkbox 
            :model-value="isSelected(notification.id)" 
            @change="toggleSelect(notification.id)"
          />
        </div>
        <div class="notification-main" @click="handleClick(notification)">
          <div class="notification-icon">
            <el-icon v-if="notification.type === 'system'" :size="20"><Bell /></el-icon>
            <el-icon v-else-if="notification.type === 'like'" :size="20"><Star /></el-icon>
            <el-icon v-else-if="notification.type === 'reply'" :size="20"><ChatDotRound /></el-icon>
            <el-icon v-else-if="notification.type === 'favorite'" :size="20"><Collection /></el-icon>
            <el-icon v-else-if="notification.type === 'post_deleted'" :size="20"><Delete /></el-icon>
            <el-icon v-else :size="20"><Bell /></el-icon>
          </div>
          <div class="notification-content">
            <div class="notification-title">{{ notification.title }}</div>
            <div class="notification-body">{{ notification.content }}</div>
            <div class="notification-time">{{ formatTime(notification.createdAt) }}</div>
          </div>
          <div v-if="!notification.isRead" class="unread-dot"></div>
        </div>
        <div class="notification-actions" @click.stop>
          <el-button type="danger" size="small" text @click="handleDelete(notification.id)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Bell, Star, ChatDotRound, Collection, Delete } from '@element-plus/icons-vue'

const props = defineProps({
  notifications: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  selectedIds: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['notification-click', 'toggle-select', 'delete'])

const formatTime = (time) => {
  if (!time) return ''
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

const isSelected = (id) => {
  return props.selectedIds.includes(id)
}

const toggleSelect = (id) => {
  emit('toggle-select', id)
}

const handleClick = (notification) => {
  emit('notification-click', notification)
}

const handleDelete = (id) => {
  emit('delete', id)
}
</script>

<style scoped>
.notification-list {
  min-height: 200px;
}

.loading,
.empty {
  padding: 40px 20px;
}

.notification-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  background: #fafbff;
  border-radius: 16px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.notification-item:hover {
  background: #f0f2ff;
  border-color: rgba(102, 126, 234, 0.2);
}

.notification-item.unread {
  background: linear-gradient(135deg, #ecf5ff 0%, #f0f2ff 100%);
  border-color: rgba(102, 126, 234, 0.3);
}

.notification-item.selected {
  background: #e8ebff;
  border-color: #667eea;
}

.notification-checkbox {
  padding-top: 10px;
}

.notification-main {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  min-width: 0;
}

.notification-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 600;
  font-size: 15px;
  color: #2c3e50;
  margin-bottom: 6px;
}

.notification-body {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.notification-time {
  font-size: 12px;
  color: #909399;
}

.unread-dot {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f56c6c 0%, #e6a23c 100%);
  margin-top: 6px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

.notification-actions {
  flex-shrink: 0;
  padding-top: 6px;
}

.notification-actions .el-button {
  opacity: 0;
  transition: opacity 0.3s;
}

.notification-item:hover .notification-actions .el-button {
  opacity: 1;
}

@media (max-width: 768px) {
  .notification-item {
    padding: 12px 16px;
  }

  .notification-icon {
    width: 36px;
    height: 36px;
  }

  .notification-actions .el-button {
    opacity: 1;
  }
}
</style>
