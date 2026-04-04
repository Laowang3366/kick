<template>
  <div class="page-management">
    <el-card class="management-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">网站通知</span>
          <div class="header-actions">
            <el-button type="primary" class="action-button" @click="showAddDialog">
              <el-icon><Plus /></el-icon>
              发送通知
            </el-button>
            <el-button class="action-button" @click="fetchNotifications">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon total">
              <el-icon><Bell /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">总通知数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon sent">
              <el-icon><Promotion /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.sent }}</div>
              <div class="stat-label">已发送</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon draft">
              <el-icon><Edit /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.draft }}</div>
              <div class="stat-label">草稿</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon users">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalUsers }}</div>
              <div class="stat-label">接收用户</div>
            </div>
          </div>
        </el-col>
      </el-row>

      <el-table :data="notifications" style="width: 100%" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="notification-title" @click="viewNotification(row)">{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)" size="small">
              {{ getTypeName(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'sent' ? 'success' : 'info'" size="small">
              {{ row.status === 'sent' ? '已发送' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="阅读情况" width="120">
          <template #default="{ row }">
            <span class="read-stats">{{ row.readCount || 0 }}/{{ row.totalCount || stats.totalUsers }}</span>
          </template>
        </el-table-column>
        <el-table-column label="发送时间" width="160">
          <template #default="{ row }">
            {{ row.sendTime ? formatTime(row.sendTime) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button v-if="row.status === 'draft'" type="success" size="small" @click="sendNotification(row)" class="action-btn">
                发送
              </el-button>
              <el-button type="primary" size="small" @click="editNotification(row)" class="action-btn">
                编辑
              </el-button>
              <el-button type="danger" size="small" @click="deleteNotification(row)" class="action-btn">
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container" v-if="total > 10">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="10"
          :total="total"
          layout="prev, pager, next, total"
          @current-change="fetchNotifications"
          background
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingNotification ? '编辑通知' : '发送通知'" width="600px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="请输入通知标题" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" style="width: 100%">
            <el-option label="系统公告" value="system" />
            <el-option label="活动通知" value="activity" />
            <el-option label="更新日志" value="update" />
            <el-option label="紧急通知" value="urgent" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" :rows="6" placeholder="请输入通知内容" maxlength="2000" show-word-limit />
        </el-form-item>
        <el-form-item label="发送方式">
          <el-radio-group v-model="form.sendType">
            <el-radio label="now">立即发送</el-radio>
            <el-radio label="draft">保存草稿</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="接收对象">
          <el-select v-model="form.targetType" style="width: 100%">
            <el-option label="所有用户" value="all" />
            <el-option label="指定角色" value="role" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.targetType === 'role'" label="选择角色">
          <el-select v-model="form.targetRoles" multiple style="width: 100%">
            <el-option label="普通用户" value="user" />
            <el-option label="版主" value="moderator" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveNotification">
          {{ form.sendType === 'now' ? '发送' : '保存' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="viewVisible" title="通知详情" width="600px">
      <div class="notification-detail" v-if="viewingNotification">
        <div class="detail-header">
          <h3 class="detail-title">{{ viewingNotification.title }}</h3>
          <div class="detail-meta">
            <el-tag :type="getTypeTag(viewingNotification.type)" size="small">
              {{ getTypeName(viewingNotification.type) }}
            </el-tag>
            <span class="detail-time">{{ formatTime(viewingNotification.sendTime) }}</span>
          </div>
        </div>
        <el-divider />
        <div class="detail-content">{{ viewingNotification.content }}</div>
        <div class="detail-stats">
          <span>阅读人数：{{ viewingNotification.readCount || 0 }}</span>
          <span>总接收人数：{{ viewingNotification.totalCount || stats.totalUsers }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Bell, Promotion, Edit, User } from '@element-plus/icons-vue'

const notifications = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const viewVisible = ref(false)
const editingNotification = ref(null)
const viewingNotification = ref(null)
const currentPage = ref(1)
const total = ref(0)

const stats = reactive({
  total: 0,
  sent: 0,
  draft: 0,
  totalUsers: 0
})

const form = reactive({
  title: '',
  type: 'system',
  content: '',
  sendType: 'now',
  targetType: 'all',
  targetRoles: []
})

const normalizeTargetRoles = (targetRoles) => {
  if (Array.isArray(targetRoles)) {
    return targetRoles
  }
  if (typeof targetRoles === 'string') {
    return targetRoles
      .split(',')
      .map(role => role.trim())
      .filter(Boolean)
  }
  return []
}

const formatTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString()
}

const getTypeTag = (type) => {
  const tags = { system: 'primary', activity: 'success', update: 'warning', urgent: 'danger' }
  return tags[type] || 'info'
}

const getTypeName = (type) => {
  const names = { system: '系统公告', activity: '活动通知', update: '更新日志', urgent: '紧急通知' }
  return names[type] || '通知'
}

const fetchNotifications = async () => {
  loading.value = true
  try {
    const response = await api.get('/admin/notifications', {
      params: { page: currentPage.value, size: 10 }
    })
    notifications.value = response.records || response.notifications || []
    total.value = response.total || 0
  } catch (error) {
    console.error('获取通知列表失败:', error)
    ElMessage.error('获取通知列表失败')
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const response = await api.get('/admin/notifications/stats')
    Object.assign(stats, response)
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

const showAddDialog = () => {
  editingNotification.value = null
  Object.assign(form, {
    title: '',
    type: 'system',
    content: '',
    sendType: 'now',
    targetType: 'all',
    targetRoles: []
  })
  dialogVisible.value = true
}

const editNotification = (notification) => {
  editingNotification.value = notification
  Object.assign(form, {
    title: notification.title,
    type: notification.type,
    content: notification.content,
    sendType: notification.status === 'sent' ? 'now' : 'draft',
    targetType: notification.targetType || 'all',
    targetRoles: normalizeTargetRoles(notification.targetRoles)
  })
  dialogVisible.value = true
}

const viewNotification = (notification) => {
  viewingNotification.value = notification
  viewVisible.value = true
}

const saveNotification = async () => {
  if (!form.title) {
    ElMessage.warning('请输入通知标题')
    return
  }
  if (!form.content) {
    ElMessage.warning('请输入通知内容')
    return
  }

  try {
    const data = {
      ...form,
      targetRoles: form.targetType === 'role' ? form.targetRoles.join(',') : null,
      status: form.sendType === 'now' ? 'sent' : 'draft'
    }
    
    if (editingNotification.value) {
      await api.put(`/admin/notifications/${editingNotification.value.id}`, data)
      ElMessage.success('更新成功')
    } else {
      await api.post('/admin/notifications', data)
      ElMessage.success(form.sendType === 'now' ? '发送成功' : '保存成功')
    }
    dialogVisible.value = false
    fetchNotifications()
    fetchStats()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const sendNotification = async (notification) => {
  await ElMessageBox.confirm(`确定发送通知「${notification.title}」吗？`, '发送确认', {
    type: 'warning'
  })

  try {
    await api.put(`/admin/notifications/${notification.id}/send`)
    ElMessage.success('发送成功')
    fetchNotifications()
    fetchStats()
  } catch (error) {
    ElMessage.error('发送失败')
  }
}

const deleteNotification = async (notification) => {
  await ElMessageBox.confirm(`确定删除通知「${notification.title}」吗？`, '删除确认', {
    type: 'warning'
  })

  try {
    await api.delete(`/admin/notifications/${notification.id}`)
    ElMessage.success('删除成功')
    fetchNotifications()
    fetchStats()
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

onMounted(() => {
  fetchNotifications()
  fetchStats()
})
</script>

<style scoped>
.page-management {
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
}

.management-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--card-shadow);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-icon.total {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}

.stat-icon.sent {
  background: linear-gradient(135deg, #11998e, #38ef7d);
  color: #fff;
}

.stat-icon.draft {
  background: linear-gradient(135deg, #f093fb, #f5576c);
  color: #fff;
}

.stat-icon.users {
  background: linear-gradient(135deg, #4facfe, #00f2fe);
  color: #fff;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.notification-title {
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
}

.notification-title:hover {
  color: var(--primary-color);
}

.read-stats {
  font-size: 13px;
  color: var(--text-secondary);
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pagination-container {
  padding: 20px 24px;
  display: flex;
  justify-content: center;
}

.notification-detail {
  padding: 10px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.detail-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-time {
  font-size: 13px;
  color: var(--text-secondary);
}

.detail-content {
  line-height: 1.8;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.detail-stats {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 24px;
  font-size: 14px;
  color: var(--text-secondary);
}
</style>
