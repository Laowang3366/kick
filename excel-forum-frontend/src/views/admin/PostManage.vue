<template>
  <div class="page-management">
    <el-card class="management-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">帖子管理</span>
          <div class="header-actions">
            <el-select v-model="filterForum" placeholder="全部版块" clearable class="filter-select">
              <el-option
                v-for="forum in forums"
                :key="forum.id"
                :label="forum.name"
                :value="forum.id"
              />
            </el-select>
            <el-select v-model="filterStatus" placeholder="全部状态" clearable class="filter-select">
              <el-option label="正常" value="active" />
              <el-option label="已锁定" value="locked" />
            </el-select>
            <el-button type="primary" class="action-button" @click="fetchPosts">
              <el-icon><Filter /></el-icon>
              筛选
            </el-button>
            <el-button class="action-button" @click="fetchPosts">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>
      
      <div class="table-container">
        <el-table :data="posts" style="width: 100%" v-loading="loading" stripe>
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
          <el-table-column prop="viewCount" label="浏览" width="70">
            <template #default="{ row }">
              <span class="count-badge">{{ row.viewCount || 0 }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="replyCount" label="回复" width="70">
            <template #default="{ row }">
              <span class="count-badge">{{ row.replyCount || 0 }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="130">
            <template #default="{ row }">
              <div class="status-tags">
                <el-tag v-if="Number(row.status) === 1 || Number(row.status) === 2" type="danger" size="small" effect="dark">已删除</el-tag>
                <el-tag v-if="row.isLocked" type="warning" size="small" effect="dark">锁定</el-tag>
                <el-tag v-if="row.isTop" type="danger" size="small" effect="dark">置顶</el-tag>
                <el-tag v-if="row.isEssence" type="success" size="small" effect="dark">精华</el-tag>
                <el-tag v-if="Number(row.status) === 0 && !row.isLocked && !row.isTop && !row.isEssence" type="info" size="small" effect="dark">正常</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="发布时间" width="160">
            <template #default="{ row }">
              {{ formatTime(row.createTime) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="280">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button v-if="Number(row.status) !== 1 && Number(row.status) !== 2" type="danger" size="small" @click="deletePost(row)" class="action-btn">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
                <el-button v-if="!row.isLocked" type="warning" size="small" @click="toggleLock(row)" class="action-btn">
                  <el-icon><Lock /></el-icon>
                  锁定
                </el-button>
                <el-button v-else size="small" @click="toggleLock(row)" class="action-btn">
                  <el-icon><Unlock /></el-icon>
                  解锁
                </el-button>
                <el-button v-if="!row.isTop" type="primary" size="small" @click="toggleTop(row)" class="action-btn">
                  <el-icon><Top /></el-icon>
                  置顶
                </el-button>
                <el-button v-else type="info" size="small" @click="toggleTop(row)" class="action-btn">
                  <el-icon><Bottom /></el-icon>
                  取消
                </el-button>
                <el-button v-if="!row.isEssence" type="success" size="small" @click="toggleEssence(row)" class="action-btn">
                  <el-icon><Star /></el-icon>
                  加精
                </el-button>
                <el-button v-else type="warning" size="small" @click="toggleEssence(row)" class="action-btn">
                  <el-icon><StarFilled /></el-icon>
                  取消
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <div class="pagination-container">
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
import { Filter, Delete, Lock, Unlock, Top, Bottom, Star, StarFilled, Refresh } from '@element-plus/icons-vue'
import { useForumEvents } from '../../composables/useForumEvents'

const posts = ref([])
const forums = ref([])
const loading = ref(false)
const currentPage = ref(1)
const totalPosts = ref(0)

const filterForum = ref('')
const filterStatus = ref('')

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
    const params = {
      page: currentPage.value,
      size: 10,
      status: filterStatus.value || 'active'
    }
    if (filterForum.value) {
      params.categoryId = filterForum.value
    }
    const response = await api.get('/admin/posts', { params })
    posts.value = response.records || response.posts || []
    totalPosts.value = response.total || 0
  } catch (error) {
    console.error('获取帖子列表失败:', error)
    ElMessage.error('获取帖子列表失败')
  } finally {
    loading.value = false
  }
}

const deletePost = async (post) => {
  const { value: reason } = await ElMessageBox.prompt('请输入删除原因（可选）', '删除帖子', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    inputPlaceholder: '请输入删除原因',
    inputType: 'textarea'
  }).catch(() => {
    return { value: null }
  })
  
  if (reason === null) return
  
  try {
    await api.delete(`/admin/posts/${post.id}`, {
      data: { reason: reason || '' }
    })
    ElMessage.success('删除成功')
    fetchPosts()
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

const toggleTop = async (post) => {
  try {
    await api.put(`/admin/posts/${post.id}/top`)
    ElMessage.success('操作成功')
    fetchPosts()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const toggleEssence = async (post) => {
  try {
    await api.put(`/admin/posts/${post.id}/essence`)
    ElMessage.success('操作成功')
    fetchPosts()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const toggleLock = async (post) => {
  try {
    await api.put(`/admin/posts/${post.id}/lock`)
    ElMessage.success('操作成功')
    fetchPosts()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

useForumEvents((event) => {
  if (event.type === 'POST_UPDATED' || event.type === 'POST_DELETED' || event.type === 'REPLY_UPDATED') {
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

.table-container {
  overflow-x: auto;
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

.status-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.action-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
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

@media (max-width: 1200px) {
  .filter-select {
    width: 120px;
  }
}

@media (max-width: 768px) {
  .filter-select {
    width: 100%;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-actions {
    width: 100%;
  }
}
</style>
