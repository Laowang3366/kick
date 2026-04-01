<template>
  <div class="page-management">
    <el-card class="management-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">回复管理</span>
          <div class="header-actions">
            <el-input
              v-model="searchPostId"
              placeholder="按帖子ID筛选"
              class="search-input"
              clearable
              type="number"
            />
            <el-button type="primary" class="action-button" @click="fetchReplies">
              <el-icon><Filter /></el-icon>
              筛选
            </el-button>
            <el-button class="action-button" @click="fetchReplies">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>
      
      <el-empty v-if="replies.length === 0 && !loading" description="暂无回复" />
      
      <el-table v-else :data="replies" style="width: 100%" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="作者" width="120">
          <template #default="{ row }">
            <div class="user-cell" v-if="row.author">
              <el-avatar :src="row.author.avatar" :size="28">
                {{ row.author.username?.charAt(0) }}
              </el-avatar>
              <span>{{ row.author.username }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="内容" min-width="250">
          <template #default="{ row }">
            <div class="reply-content">{{ row.content }}</div>
          </template>
        </el-table-column>
        <el-table-column label="所属帖子" min-width="150">
          <template #default="{ row }">
            <div class="post-info" v-if="row.post">
              <span class="post-title">{{ row.post.title }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="likeCount" label="点赞" width="80">
          <template #default="{ row }">
            <span class="count-badge">{{ row.likeCount || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" size="small" @click="deleteReply(row)" class="action-btn">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-container" v-if="totalReplies > 10">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="10"
          :total="totalReplies"
          layout="prev, pager, next, total"
          @current-change="fetchReplies"
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
import { Filter, Delete, Refresh } from '@element-plus/icons-vue'

const replies = ref([])
const loading = ref(false)
const currentPage = ref(1)
const totalReplies = ref(0)
const searchPostId = ref('')

const formatTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString()
}

const fetchReplies = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      size: 10
    }
    if (searchPostId.value) {
      params.postId = searchPostId.value
    }
    const response = await api.get('/admin/replies', { params })
    replies.value = response.replies || []
    totalReplies.value = response.total || 0
  } catch (error) {
    console.error('获取回复列表失败:', error)
    ElMessage.error('获取回复列表失败')
  } finally {
    loading.value = false
  }
}

const deleteReply = async (reply) => {
  await ElMessageBox.confirm('确定要删除该回复吗？', '删除回复', {
    type: 'warning'
  })
  
  try {
    await api.delete(`/admin/replies/${reply.id}`)
    ElMessage.success('删除成功')
    fetchReplies()
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

onMounted(() => {
  fetchReplies()
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

.search-input {
  width: 160px;
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

.reply-content {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.post-info {
  font-size: 13px;
}

.post-title {
  color: var(--text-secondary);
  font-weight: 500;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 22px;
  padding: 0 6px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
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
