<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h2 class="dashboard-title">仪表盘</h2>
      <el-button class="refresh-btn" @click="fetchDashboardData">
        <el-icon><Refresh /></el-icon>
        刷新数据
      </el-button>
    </div>
    <el-row :gutter="24" class="stats-row">
      <el-col :xs="24" :sm="12" :lg="6" v-for="(stat, index) in statsConfig" :key="index">
        <div class="stat-card" :class="`stat-card-${stat.type}`" @click="stat.onClick">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="32">
                <component :is="stat.icon" />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
          <div class="stat-bg-icon">
            <el-icon :size="100">
              <component :is="stat.icon" />
            </el-icon>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="24" style="margin-top: 24px;">
      <el-col :xs="24" :lg="12">
        <div class="glass-card">
          <div class="card-header">
            <h3 class="card-title">最新用户</h3>
            <el-button type="primary" link size="small" @click="goToUsers">
              查看全部
              <el-icon class="el-icon--right"><ArrowRight /></el-icon>
            </el-button>
          </div>
          <div class="table-wrapper">
            <el-table 
              :data="recentUsers" 
              style="width: 100%"
              :header-cell-style="{ background: 'var(--table-header-bg)', color: 'var(--text-secondary)', fontWeight: '600' }"
              stripe
            >
              <el-table-column prop="username" label="用户名">
                <template #default="{ row }">
                  <div class="user-cell">
                    <el-avatar :src="row.avatar" :size="32">
                      {{ row.username?.charAt(0) }}
                    </el-avatar>
                    <span>{{ row.username }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="email" label="邮箱" show-overflow-tooltip />
              <el-table-column prop="createTime" label="注册时间" width="180">
                <template #default="{ row }">
                  {{ formatTime(row.createTime) }}
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :lg="12">
        <div class="glass-card">
          <div class="card-header">
            <h3 class="card-title">最新帖子</h3>
            <el-button type="primary" link size="small" @click="goToPosts">
              查看全部
              <el-icon class="el-icon--right"><ArrowRight /></el-icon>
            </el-button>
          </div>
          <div class="table-wrapper">
            <el-table 
              :data="recentPosts" 
              style="width: 100%"
              :header-cell-style="{ background: 'var(--table-header-bg)', color: 'var(--text-secondary)', fontWeight: '600' }"
              stripe
            >
              <el-table-column prop="title" label="标题" show-overflow-tooltip>
                <template #default="{ row }">
                  <span class="post-title">{{ row.title }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="author.username" label="作者" width="120" />
              <el-table-column prop="createTime" label="发布时间" width="180">
                <template #default="{ row }">
                  {{ formatTime(row.createTime) }}
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="24" style="margin-top: 24px;">
      <el-col :xs="24" :lg="12">
        <div class="glass-card">
          <div class="card-header">
            <h3 class="card-title">帖子分类统计</h3>
          </div>
          <div class="chart-container">
            <div class="category-stats">
              <div v-for="cat in categoryStats" :key="cat.id" class="category-item">
                <div class="category-info">
                  <span class="category-name">{{ cat.name }}</span>
                  <span class="category-count">{{ cat.postCount || 0 }} 帖子</span>
                </div>
                <el-progress 
                  :percentage="getPercentage(cat.postCount)" 
                  :stroke-width="12"
                  :show-text="false"
                />
              </div>
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :lg="12">
        <div class="glass-card">
          <div class="card-header">
            <h3 class="card-title">系统概览</h3>
          </div>
          <div class="system-overview">
            <div class="overview-item">
              <div class="overview-icon blue">
                <el-icon><Document /></el-icon>
              </div>
              <div class="overview-info">
                <span class="overview-label">待处理举报</span>
                <span class="overview-value">{{ stats.pendingReports || 0 }}</span>
              </div>
            </div>
            <div class="overview-item">
              <div class="overview-icon orange">
                <el-icon><Delete /></el-icon>
              </div>
              <div class="overview-info">
                <span class="overview-label">回收站帖子</span>
                <span class="overview-value">{{ stats.deletedPostCount || 0 }}</span>
              </div>
            </div>
            <div class="overview-item">
              <div class="overview-icon green">
                <el-icon><ChatDotRound /></el-icon>
              </div>
              <div class="overview-info">
                <span class="overview-label">总回复数</span>
                <span class="overview-value">{{ stats.replyCount || 0 }}</span>
              </div>
            </div>
            <div class="overview-item">
              <div class="overview-icon purple">
                <el-icon><Folder /></el-icon>
              </div>
              <div class="overview-info">
                <span class="overview-label">板块数量</span>
                <span class="overview-value">{{ stats.categoryCount || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../api'
import { useForumEvents } from '../../composables/useForumEvents'
import { User, Document, ChatDotRound, Warning, ArrowRight, Refresh, Delete, Folder } from '@element-plus/icons-vue'

const router = useRouter()

const stats = ref({
  userCount: 0,
  postCount: 0,
  replyCount: 0,
  pendingReports: 0,
  deletedPostCount: 0,
  categoryCount: 0
})

const recentUsers = ref([])
const recentPosts = ref([])
const categoryStats = ref([])

useForumEvents(() => {
  fetchDashboardData()
})

const statsConfig = computed(() => [
  {
    label: '总用户数',
    value: stats.value.userCount,
    icon: User,
    type: 'blue',
    onClick: () => router.push('/admin/users')
  },
  {
    label: '总帖子数',
    value: stats.value.postCount,
    icon: Document,
    type: 'green',
    onClick: () => router.push('/admin/posts')
  },
  {
    label: '总回复数',
    value: stats.value.replyCount,
    icon: ChatDotRound,
    type: 'orange',
    onClick: () => router.push('/admin/levels')
  },
  {
    label: '待处理举报',
    value: stats.value.pendingReports,
    icon: Warning,
    type: 'red',
    onClick: () => router.push('/admin/reports')
  }
])

const formatTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString()
}

const getPercentage = (count) => {
  if (!categoryStats.value.length) return 0
  const max = Math.max(...categoryStats.value.map(c => c.postCount || 0))
  return max > 0 ? Math.round((count / max) * 100) : 0
}

const goToUsers = () => {
  router.push('/admin/users')
}

const goToPosts = () => {
  router.push('/admin/posts')
}

const fetchDashboardData = async () => {
  try {
    const [statsRes, usersRes, postsRes, categoriesRes] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/users', { params: { page: 1, size: 5 } }),
      api.get('/admin/posts', { params: { page: 1, size: 5, status: 'active' } }),
      api.get('/categories')
    ])
    
    if (statsRes && statsRes.stats) {
      stats.value = statsRes.stats
    }
    if (usersRes && usersRes.records) {
      recentUsers.value = usersRes.records
    }
    if (postsRes && postsRes.records) {
      recentPosts.value = postsRes.records
    }
    if (categoriesRes) {
      categoryStats.value = categoriesRes
    }
  } catch (error) {
    console.error('获取仪表盘数据失败:', error)
  }
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<style scoped>
.dashboard {
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.dashboard-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: var(--border-radius-md);
  font-weight: 500;
  transition: all var(--transition-fast);
}

.refresh-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  position: relative;
  padding: 24px;
  border-radius: var(--border-radius-lg);
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  box-shadow: var(--card-shadow);
  backdrop-filter: blur(10px);
  overflow: hidden;
  transition: all var(--transition-normal);
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
}

.stat-card-blue::before {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.stat-card-green::before {
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
}

.stat-card-orange::before {
  background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
}

.stat-card-red::before {
  background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
}

.stat-content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--border-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-gradient);
  color: #fff;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.stat-card-green .stat-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.stat-card-orange .stat-icon {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.stat-card-red .stat-icon {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.stat-bg-icon {
  position: absolute;
  right: -20px;
  bottom: -20px;
  color: var(--text-disabled);
  opacity: 0.1;
  z-index: 1;
}

.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--card-shadow);
  backdrop-filter: blur(10px);
  overflow: hidden;
  transition: all var(--transition-normal);
}

.glass-card:hover {
  box-shadow: var(--shadow-xl);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.table-wrapper {
  max-height: 300px;
  overflow-y: auto;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.post-title {
  font-weight: 500;
  color: var(--text-primary);
}

:deep(.el-table) {
  background: transparent;
}

:deep(.el-table__body-wrapper) {
  background: transparent;
}

:deep(.el-table tr) {
  background: transparent;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: var(--table-stripe-bg);
}

:deep(.el-table__body tr:hover > td) {
  background-color: var(--table-hover-bg) !important;
}

:deep(.el-table td) {
  border-bottom: 1px solid var(--border-light);
}

.chart-container {
  padding: 24px;
}

.category-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-name {
  font-weight: 500;
  color: var(--text-primary);
}

.category-count {
  font-size: 13px;
  color: var(--text-secondary);
}

.system-overview {
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.overview-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  transition: all var(--transition-fast);
}

.overview-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.overview-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--border-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #fff;
}

.overview-icon.blue {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.overview-icon.orange {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.overview-icon.green {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.overview-icon.purple {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}

.overview-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.overview-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.overview-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

@media (max-width: 1200px) {
  .stats-row .el-col {
    margin-bottom: 16px;
  }
  
  .system-overview {
    grid-template-columns: 1fr;
  }
}
</style>
