<template>
  <div class="announcement-banner" v-if="announcements.length > 0">
    <el-carousel
      :interval="5000"
      arrow="hover"
      indicator-position="outside"
      height="56px"
      @change="handleCarouselChange"
    >
      <el-carousel-item v-for="(item, index) in announcements" :key="item.id">
        <div class="banner-content" @click="showDetail(item)">
          <el-tag :type="getTypeTag(item.type)" size="small" effect="dark" class="type-tag">
            {{ getTypeName(item.type) }}
          </el-tag>
          <span class="banner-title">{{ item.title }}</span>
          <el-icon class="arrow-icon"><ArrowRight /></el-icon>
        </div>
      </el-carousel-item>
    </el-carousel>

    <div class="banner-indicator">
      <span class="current">{{ currentIndex + 1 }}</span>
      <span class="separator">/</span>
      <span class="total">{{ announcements.length }}</span>
    </div>

    <el-dialog v-model="detailVisible" :title="detailData?.title" width="640px" class="detail-dialog" destroy-on-close>
      <div class="detail-content" v-if="detailData">
        <div class="detail-meta">
          <el-tag :type="getTypeTag(detailData.type)" size="small" effect="dark">{{ getTypeName(detailData.type) }}</el-tag>
          <span class="detail-time">{{ formatTime(detailData.sendTime) }}</span>
        </div>
        <el-divider />
        <div class="detail-body">{{ detailData.content }}</div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button type="primary" @click="goToAnnouncements">查看全部公告</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'
import api from '../api'

const router = useRouter()
const announcements = ref([])
const currentIndex = ref(0)
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

const handleCarouselChange = (index) => {
  currentIndex.value = index
}

const fetchAnnouncements = async () => {
  try {
    const response = await api.get('/notifications/announcements', {
      params: { page: 1, size: 5 }
    })
    announcements.value = response.records || []
  } catch (error) {
    console.error('获取公告失败:', error)
  }
}

const showDetail = (item) => {
  detailData.value = item
  detailVisible.value = true
}

const goToAnnouncements = () => {
  detailVisible.value = false
  router.push('/announcements')
}

onMounted(() => {
  fetchAnnouncements()
})
</script>

<style scoped>
.announcement-banner {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border-radius: 16px;
  margin-bottom: 20px;
  border: 2px solid rgba(75, 85, 99, 0.15);
  box-shadow: 0 4px 16px rgba(75, 85, 99, 0.1);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 0 16px;
}

.announcement-banner::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, #4b5563 0%, #374151 100%);
}

.announcement-banner :deep(.el-carousel) {
  flex: 1;
}

.announcement-banner :deep(.el-carousel__container) {
  height: 56px;
}

.announcement-banner :deep(.el-carousel__indicators) {
  display: none;
}

.announcement-banner :deep(.el-carousel__arrow) {
  width: 32px;
  height: 32px;
  background: rgba(75, 85, 99, 0.1);
  color: #4b5563;
  border: 1px solid rgba(75, 85, 99, 0.2);
}

.announcement-banner :deep(.el-carousel__arrow:hover) {
  background: rgba(75, 85, 99, 0.2);
}

.banner-content {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 40px;
  cursor: pointer;
  gap: 16px;
  transition: all 0.3s ease;
}

.banner-content:hover {
  background: rgba(75, 85, 99, 0.05);
}

.type-tag {
  flex-shrink: 0;
  border-radius: 12px;
}

.banner-title {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow-icon {
  flex-shrink: 0;
  color: #4b5563;
  font-size: 16px;
  transition: transform 0.3s ease;
}

.banner-content:hover .arrow-icon {
  transform: translateX(4px);
}

.banner-indicator {
  position: absolute;
  right: 60px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  color: #909399;
  background: rgba(255, 255, 255, 0.8);
  padding: 4px 10px;
  border-radius: 12px;
  pointer-events: none;
}

.banner-indicator .current {
  font-weight: 600;
  color: #4b5563;
}

.banner-indicator .separator {
  margin: 0 2px;
}

.detail-dialog :deep(.el-dialog__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
  margin-right: 0;
}

.detail-content {
  padding: 4px 0;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.detail-time {
  font-size: 13px;
  color: #909399;
}

.detail-body {
  font-size: 15px;
  line-height: 1.8;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 768px) {
  .announcement-banner {
    margin-bottom: 16px;
    border-radius: 12px;
    padding: 0 12px;
  }

  .banner-content {
    padding: 0 32px;
    gap: 10px;
  }

  .banner-title {
    font-size: 14px;
  }

  .banner-indicator {
    right: 40px;
    font-size: 12px;
    padding: 3px 8px;
  }
}
</style>
