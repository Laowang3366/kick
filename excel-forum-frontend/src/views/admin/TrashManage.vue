<template>
  <div class="page-management">
    <el-card class="management-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">回收站</span>
          <div class="header-actions">
            <el-button type="danger" class="action-button" @click="emptyTrash" :disabled="posts.length === 0">
              <el-icon><Delete /></el-icon>
              清空回收站
            </el-button>
            <el-button class="action-button" @click="fetchPosts">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>
      
      <el-empty v-if="posts.length === 0 && !loading" description="回收站是空的" />
      
      <el-table v-else :data="posts" style="width: 100%" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="post-title">{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="author.username" label="作者" width="100" />
        <el-table-column label="版块" width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ getCategoryName(row.categoryId) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="删除时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.updateTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="success" size="small" @click="restorePost(row)" class="action-btn">
                <el-icon><RefreshLeft /></el-icon>
                恢复
              </el-button>
              <el-button type="danger" size="small" @click="permanentDelete(row)" class="action-btn">
                <el-icon><Delete /></el-icon>
                永久删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-container" v-if="totalPosts > 10">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="10"
          :total="totalPosts"
          layout="prev, pager, next, total"
          @current-change="fetchPosts"
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
import { Delete, RefreshLeft, Refresh } from '@element-plus/icons-vue'
import { useForumEvents } from '../../composables/useForumEvents'

const posts = ref([])
const forums = ref([])
const loading = ref(false)
const currentPage = ref(1)
const totalPosts = ref(0)

const formatTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString()
}

const getCategoryName = (categoryId) => {
  const category = forums.value.find(f => f.id === categoryId)
  return category ? category.name : '未知板块'
}

const fetchForums = async () => {
  try {
    const response = await api.get('/categories')
    forums.value = response || []
  } catch (error) {
    console.error('获取版块列表失败:', error)
  }
}

const fetchPosts = async () => {
  loading.value = true
  try {
    const response = await api.get('/admin/posts', { 
      params: { 
        page: currentPage.value, 
        size: 10,
        status: 'deleted'
      } 
    })
    posts.value = response.records || response.posts || []
    totalPosts.value = response.total || 0
  } catch (error) {
    console.error('获取回收站列表失败:', error)
    ElMessage.error('获取回收站列表失败')
  } finally {
    loading.value = false
  }
}

const restorePost = async (post) => {
  await ElMessageBox.confirm(`确定要恢复帖子「${post.title}」吗？`, '恢复帖子', {
    type: 'info',
    confirmButtonText: '确定恢复',
    cancelButtonText: '取消'
  })
  
  try {
    await api.put(`/admin/posts/${post.id}/restore`)
    ElMessage.success('恢复成功')
    fetchPosts()
  } catch (error) {
    ElMessage.error('恢复失败')
  }
}

const permanentDelete = async (post) => {
  await ElMessageBox.confirm(
    `确定要永久删除帖子「${post.title}」吗？此操作不可恢复！`, 
    '永久删除', 
    {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    }
  )
  
  try {
    await api.delete(`/admin/posts/${post.id}/permanent`)
    ElMessage.success('永久删除成功')
    fetchPosts()
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

const emptyTrash = async () => {
  await ElMessageBox.confirm(
    '确定要清空回收站吗？所有已删除的帖子将被永久删除，此操作不可恢复！', 
    '清空回收站', 
    {
      type: 'warning',
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    }
  )
  
  try {
    for (const post of posts.value) {
      await api.delete(`/admin/posts/${post.id}/permanent`)
    }
    ElMessage.success('回收站已清空')
    fetchPosts()
  } catch (error) {
    ElMessage.error('清空失败')
  }
}

useForumEvents((event) => {
  if (event.type === 'POST_DELETED') {
    fetchPosts()
  }
})

onMounted(() => {
  fetchForums()
  fetchPosts()
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

.action-button {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: var(--border-radius-md);
  font-weight: 500;
  transition: all var(--transition-fast);
}

.action-button:hover:not(:disabled) {
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

.post-title {
  font-weight: 500;
  color: var(--text-primary);
}

.action-buttons {
  display: flex;
  gap: 8px;
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
