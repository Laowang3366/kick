<template>
  <div class="announcements-page">
    <div class="page-header">
      <el-button class="back-btn" @click="$router.back()" circle>
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <h1>公告通知</h1>
      <el-select v-model="filterType" placeholder="全部类型" clearable class="type-filter" @change="fetchAnnouncements">
        <el-option label="系统公告" value="system" />
        <el-option label="活动通知" value="activity" />
        <el-option label="更新日志" value="update" />
        <el-option label="紧急通知" value="urgent" />
      </el-select>
    </div>

    <div class="announcements-container">
      <el-empty v-if="announcements.length === 0 && !loading" description="暂无公告" />

      <div v-else v-loading="loading" class="announcement-list">
        <div
          v-for="item in announcements"
          :key="item.id"
          class="announcement-card"
          :class="'card-type-' + item.type"
          @click="showDetail(item)"
        >
          <div class="card-accent-bar" :class="'bar-' + item.type"></div>
          <div class="card-body">
            <div class="card-top-row">
              <span class="card-type-badge" :class="'badge-' + item.type">{{ getTypeName(item.type) }}</span>
              <span class="card-time">{{ formatTime(item.sendTime) }}</span>
            </div>
            <h3 class="card-title">{{ item.title }}</h3>
            <p class="card-excerpt">{{ item.content }}</p>
            <div class="card-footer">
              <span class="card-read-more">查看详情</span>
              <el-icon class="card-arrow"><ArrowRight /></el-icon>
            </div>
          </div>
        </div>
      </div>

      <div class="pagination" v-if="total > pageSize">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="fetchAnnouncements"
          background
        />
      </div>
    </div>

    <el-dialog v-model="detailVisible" width="720px" :show-close="false" class="detail-dialog" destroy-on-close>
      <template #header>
        <div class="dialog-header">
          <div class="dialog-header-left">
            <span class="dialog-type-icon" :class="getDialogIconClass(detailData?.type)">
              <el-icon :size="20"><Bell /></el-icon>
            </span>
            <div>
              <h3 class="dialog-title">公告详情</h3>
              <span class="dialog-subtitle">{{ formatTime(detailData?.sendTime) }}</span>
            </div>
          </div>
          <el-button :icon="Close" circle size="small" text @click="detailVisible = false" />
        </div>
      </template>
      <div class="detail-content" v-if="detailData">
        <div class="detail-body-card">
          <div class="detail-type-badge">
            <el-tag :type="getTypeTag(detailData.type)" size="small" effect="dark" round>{{ getTypeName(detailData.type) }}</el-tag>
          </div>
          
          <div class="detail-title-section">
            <h2 class="detail-main-title">{{ detailData.title }}</h2>
            <div class="title-divider"></div>
          </div>
          
          <div class="detail-content-section">
            <div class="content-label">
              <el-icon><Document /></el-icon>
              <span>公告内容</span>
            </div>
            <div class="detail-body-text">{{ detailData.content }}</div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'
import { ArrowLeft, ArrowRight, Close, Bell, Document } from '@element-plus/icons-vue'

const announcements = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = 10
const total = ref(0)
const filterType = ref('')
const detailVisible = ref(false)
const detailData = ref(null)

const formatTime = (time) => {
  if (!time) return '-'
  return new Date(time).toLocaleString()
}

const getTypeTag = (type) => {
  const tags = { system: 'primary', activity: 'success', update: 'warning', urgent: 'danger' }
  return tags[type] || 'info'
}

const getTypeName = (type) => {
  const names = { system: '系统公告', activity: '活动通知', update: '更新日志', urgent: '紧急通知' }
  return names[type] || '通知'
}

const getTypeColor = (type) => {
  const colors = { system: '#409eff', activity: '#67c23a', update: '#e6a23c', urgent: '#f56c6c' }
  return colors[type] || '#909399'
}

const getDialogIconClass = (type) => {
  const map = { system: 'primary', activity: 'success', update: 'warning', urgent: 'danger' }
  return map[type] || 'info'
}

const fetchAnnouncements = async () => {
  loading.value = true
  try {
    const params = { page: currentPage.value, size: pageSize }
    if (filterType.value) {
      params.type = filterType.value
    }
    const response = await api.get('/notifications/announcements', { params })
    announcements.value = response.records || []
    total.value = response.total || 0
  } catch (error) {
    console.error('获取公告列表失败:', error)
  } finally {
    loading.value = false
  }
}

const showDetail = (item) => {
  detailData.value = item
  detailVisible.value = true
}

onMounted(() => {
  fetchAnnouncements()
})
</script>

<style scoped>
.announcements-page {
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
}

.page-header h1 {
  flex: 1;
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.type-filter {
  width: 140px;
}

.type-filter :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: none;
  backdrop-filter: blur(10px);
}

.type-filter :deep(.el-input__inner) {
  color: white;
}

.type-filter :deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.7);
}

.announcements-container {
  background: white;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.1);
}

/* ====== 公告卡片 ====== */
.announcement-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.announcement-card {
  display: flex;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #ebeef5;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.announcement-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(102, 126, 234, 0.13);
  border-color: transparent;
}

/* 左侧色条 */
.card-accent-bar {
  width: 5px;
  flex-shrink: 0;
}

.bar-system { background: linear-gradient(180deg, #409eff, #79bbff); }
.bar-activity { background: linear-gradient(180deg, #67c23a, #95d475); }
.bar-update { background: linear-gradient(180deg, #e6a23c, #eebe77); }
.bar-urgent { background: linear-gradient(180deg, #f56c6c, #fab6b6); }

/* 卡片主体 */
.card-body {
  flex: 1;
  padding: 20px 24px 16px;
  min-width: 0;
}

.card-top-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

/* 类型徽章 */
.card-type-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.badge-system {
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
}
.badge-activity {
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
}
.badge-update {
  background: rgba(230, 162, 60, 0.1);
  color: #e6a23c;
}
.badge-urgent {
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
}

.card-time {
  font-size: 12px;
  color: #b0b3b8;
  margin-left: auto;
}

/* 标题 — 深色粗体大字 */
.card-title {
  margin: 0 0 10px;
  font-size: 17px;
  font-weight: 700;
  color: #1a1a2e;
  line-height: 1.45;
  letter-spacing: 0.3px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 摘要 — 浅灰色小字 */
.card-excerpt {
  margin: 0 0 14px;
  font-size: 14px;
  color: #8c8c99;
  line-height: 1.75;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 底部操作行 */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  font-size: 13px;
  color: #667eea;
  font-weight: 500;
  opacity: 0;
  transform: translateX(-6px);
  transition: all 0.3s ease;
}

.announcement-card:hover .card-footer {
  opacity: 1;
  transform: translateX(0);
}

.card-arrow {
  font-size: 14px;
  transition: transform 0.3s ease;
}

.announcement-card:hover .card-arrow {
  transform: translateX(3px);
}

.pagination {
  margin-top: 24px;
  text-align: center;
}

/* ====== 详情弹窗 ====== */
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

.detail-body-card {
  position: relative;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 14px;
  padding: 24px;
  margin-top: 16px;
}

.detail-type-badge {
  position: absolute;
  top: -10px;
  left: 16px;
}

.detail-title-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
}

.detail-main-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1a1a2e;
  line-height: 1.4;
  letter-spacing: 0.5px;
  text-align: center;
}

.title-divider {
  margin-top: 16px;
  height: 3px;
  background: linear-gradient(90deg, transparent, #667eea, transparent);
  border-radius: 2px;
}

.detail-content-section {
  margin-top: 8px;
}

.content-label {
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

.detail-body-text {
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
  .announcements-page {
    padding: 16px;
  }

  .page-header {
    flex-wrap: wrap;
    padding: 16px 20px;
  }

  .page-header h1 {
    flex: 1;
  }

  .type-filter {
    width: 100%;
    margin-top: 12px;
  }
}
</style>
