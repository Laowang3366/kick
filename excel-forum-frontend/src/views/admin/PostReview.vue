<template>
  <div class="page-management">
    <el-card class="management-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">帖子审核</span>
          <div class="header-actions">
            <el-select v-model="statusFilter" placeholder="审核状态" clearable style="width: 120px" @change="fetchPosts">
              <el-option label="待审核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已拒绝" value="rejected" />
            </el-select>
            <el-button class="action-button" @click="fetchPosts">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>
      
      <el-empty v-if="posts.length === 0 && !loading" description="暂无待审核帖子" />
      
      <el-table v-else :data="posts" style="width: 100%" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="post-title" @click="previewPost(row)">{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="author.username" label="作者" width="100" />
        <el-table-column label="版块" width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ getCategoryName(row.categoryId) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.reviewStatus)" size="small">
              {{ getStatusText(row.reviewStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button v-if="row.reviewStatus === 'pending'" type="success" size="small" @click="approvePost(row)" class="action-btn">
                <el-icon><Check /></el-icon>
                通过
              </el-button>
              <el-button v-if="row.reviewStatus === 'pending'" type="danger" size="small" @click="rejectPost(row)" class="action-btn">
                <el-icon><Close /></el-icon>
                拒绝
              </el-button>
              <el-button type="primary" size="small" plain @click="previewPost(row)" class="action-btn">
                <el-icon><View /></el-icon>
                预览
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

    <el-dialog v-model="previewVisible" title="帖子预览" width="800px" class="preview-dialog">
      <div class="preview-content" v-if="previewData">
        <h2 class="preview-title">{{ previewData.title }}</h2>
        <div class="preview-meta">
          <span>作者：{{ previewData.author?.username }}</span>
          <span>版块：{{ getCategoryName(previewData.categoryId) }}</span>
          <span>时间：{{ formatTime(previewData.createTime) }}</span>
        </div>
        <el-divider />
        <div class="preview-body" v-html="previewData.content"></div>
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button v-if="previewData?.reviewStatus === 'pending'" type="success" @click="approvePost(previewData)">通过</el-button>
        <el-button v-if="previewData?.reviewStatus === 'pending'" type="danger" @click="rejectPost(previewData)">拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Close, View, Refresh } from '@element-plus/icons-vue'

const posts = ref([])
const forums = ref([])
const loading = ref(false)
const currentPage = ref(1)
const totalPosts = ref(0)
const statusFilter = ref('pending')
const previewVisible = ref(false)
const previewData = ref(null)

const formatTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString()
}

const getCategoryName = (categoryId) => {
  const category = forums.value.find(f => f.id === categoryId)
  return category ? category.name : '未知板块'
}

const getStatusType = (status) => {
  const types = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return texts[status] || '未知'
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
      size: 10
    }
    if (statusFilter.value) {
      params.reviewStatus = statusFilter.value
    }
    const response = await api.get('/admin/posts/review', { params })
    posts.value = response.records || response.posts || []
    totalPosts.value = response.total || 0
  } catch (error) {
    console.error('获取审核列表失败:', error)
    ElMessage.error('获取审核列表失败')
  } finally {
    loading.value = false
  }
}

const previewPost = (post) => {
  previewData.value = post
  previewVisible.value = true
}

const approvePost = async (post) => {
  await ElMessageBox.confirm(`确定通过帖子「${post.title}」的审核吗？`, '审核通过', {
    type: 'success',
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  })
  
  try {
    await api.put(`/admin/posts/${post.id}/review`, { status: 'approved' })
    ElMessage.success('审核通过')
    previewVisible.value = false
    fetchPosts()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const rejectPost = async (post) => {
  const { value } = await ElMessageBox.prompt('请输入拒绝原因', '拒绝帖子', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /\S+/,
    inputErrorMessage: '请输入拒绝原因'
  })
  
  try {
    await api.put(`/admin/posts/${post.id}/review`, { 
      status: 'rejected',
      reason: value
    })
    ElMessage.success('已拒绝')
    previewVisible.value = false
    fetchPosts()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

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

.post-title {
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
}

.post-title:hover {
  color: var(--primary-color);
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

.preview-content {
  padding: 20px;
}

.preview-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text-primary);
}

.preview-meta {
  display: flex;
  gap: 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

.preview-body {
  line-height: 1.8;
  color: var(--text-primary);
}

.preview-body :deep(img) {
  max-width: 100%;
  border-radius: 8px;
}

.preview-body :deep(pre) {
  background: var(--bg-secondary);
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
}
</style>
