<template>
  <div class="page-management">
    <el-card class="management-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">举报管理</span>
          <div class="header-actions">
            <el-select v-model="filterStatus" placeholder="全部状态" clearable class="filter-select">
              <el-option label="待处理" value="pending" />
              <el-option label="已处理" value="handled" />
              <el-option label="已忽略" value="ignored" />
            </el-select>
            <el-button type="primary" class="action-button" @click="fetchReports">
              <el-icon><Filter /></el-icon>
              筛选
            </el-button>
            <el-button class="action-button" @click="fetchReports">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>
      
      <el-empty v-if="reports.length === 0 && !loading" description="暂无举报" />
      
      <el-table v-else :data="reports" style="width: 100%" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="举报人" width="120">
          <template #default="{ row }">
            <div class="user-cell" v-if="row.reporter">
              <el-avatar :src="row.reporter.avatar" :size="28">
                {{ row.reporter.username?.charAt(0) }}
              </el-avatar>
              <span>{{ row.reporter.username }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="举报类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.targetType === 'post' ? 'primary' : 'success'" size="small">
              {{ row.targetType === 'post' ? '帖子' : '回复' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="举报内容" min-width="200">
          <template #default="{ row }">
            <div class="report-content">
              <div class="reason"><strong>原因：</strong>{{ row.reason }}</div>
              <div class="description" v-if="row.description">{{ row.description }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="被举报内容" min-width="150">
          <template #default="{ row }">
            <div class="target-content" v-if="row.target">
              <span class="target-title" v-if="row.targetType === 'post'">{{ row.target.title }}</span>
              <span class="target-preview" v-else>{{ row.target.content?.substring(0, 50) }}...</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small" effect="dark">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="举报时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons" v-if="row.status === 'pending'">
              <el-button type="danger" size="small" @click="handleReport(row, 'delete')" class="action-btn">
                <el-icon><Delete /></el-icon>
                删除内容
              </el-button>
              <el-button type="info" size="small" @click="handleReport(row, 'ignore')" class="action-btn">
                <el-icon><Close /></el-icon>
                忽略
              </el-button>
            </div>
            <span v-else class="handled-text">已处理</span>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-container" v-if="totalReports > 10">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="10"
          :total="totalReports"
          layout="prev, pager, next, total"
          @current-change="fetchReports"
          background
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Filter, Delete, Close, Refresh } from '@element-plus/icons-vue'

const reports = ref([])
const loading = ref(false)
const currentPage = ref(1)
const totalReports = ref(0)
const filterStatus = ref('')

const formatTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString()
}

const getStatusType = (status) => {
  switch (status) {
    case 'pending': return 'warning'
    case 'handled': return 'success'
    case 'ignored': return 'info'
    default: return 'info'
  }
}

const getStatusText = (status) => {
  switch (status) {
    case 'pending': return '待处理'
    case 'handled': return '已处理'
    case 'ignored': return '已忽略'
    default: return '未知'
  }
}

const fetchReports = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      size: 10
    }
    if (filterStatus.value) {
      params.status = filterStatus.value
    }
    const response = await api.get('/admin/reports', { params })
    reports.value = response.reports || []
    totalReports.value = response.total || 0
  } catch (error) {
    console.error('获取举报列表失败:', error)
    ElMessage.error('获取举报列表失败')
  } finally {
    loading.value = false
  }
}

const handleReport = async (report, action) => {
  const actionText = action === 'delete' ? '删除被举报内容' : '忽略此举报'
  await ElMessageBox.confirm(`确定要${actionText}吗？`, '处理举报', {
    type: 'warning'
  })
  
  try {
    await api.put(`/admin/reports/${report.id}/handle`, { action })
    ElMessage.success('处理成功')
    fetchReports()
  } catch (error) {
    ElMessage.error('处理失败')
  }
}

onMounted(() => {
  fetchReports()
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
  backdrop-filter: blur(10px);
  overflow: hidden;
  transition: all var(--transition-normal);
}

.management-card:hover {
  box-shadow: var(--shadow-xl);
}

.management-card :deep(.el-card__header) {
  background: transparent;
  border-bottom: 1px solid var(--border-color);
  padding: 20px 24px;
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
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-select {
  width: 140px;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: var(--border-radius-md);
  font-weight: 500;
  transition: all var(--transition-fast);
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.management-card :deep(.el-card__body) {
  padding: 0;
}

.management-card :deep(.el-table) {
  background: transparent;
}

.management-card :deep(.el-table__body-wrapper) {
  background: transparent;
}

.management-card :deep(.el-table tr) {
  background: transparent;
}

.management-card :deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: var(--table-stripe-bg);
}

.management-card :deep(.el-table__body tr:hover > td) {
  background-color: var(--table-hover-bg) !important;
}

.management-card :deep(.el-table td) {
  border-bottom: 1px solid var(--border-light);
}

.management-card :deep(.el-table th) {
  background: var(--table-header-bg);
  color: var(--text-secondary);
  font-weight: 600;
  border-bottom: 1px solid var(--border-color);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.report-content {
  font-size: 13px;
}

.report-content .reason {
  color: var(--text-primary);
}

.report-content .description {
  color: var(--text-secondary);
  margin-top: 4px;
}

.target-content {
  font-size: 13px;
}

.target-title {
  font-weight: 500;
  color: var(--text-primary);
}

.target-preview {
  color: var(--text-secondary);
}

.handled-text {
  color: var(--text-tertiary);
  font-size: 13px;
}

.action-buttons {
  display: flex;
  gap: 6px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: var(--border-radius-sm);
  font-weight: 500;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.pagination-container {
  padding: 20px 24px;
  display: flex;
  justify-content: center;
  background: transparent;
  border-top: 1px solid var(--border-color);
}
</style>
