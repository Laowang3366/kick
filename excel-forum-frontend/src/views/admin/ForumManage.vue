<template>
  <div class="page-management">
    <el-card class="management-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">版块管理</span>
          <div class="header-actions">
            <el-button type="primary" class="action-button" @click="showForumDialog()">
              <el-icon><Plus /></el-icon>
              新增版块
            </el-button>
          </div>
        </div>
      </template>
      
      <el-table :data="forums" style="width: 100%" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="版块名称">
          <template #default="{ row }">
            <span class="forum-name">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="postCount" label="帖子数" width="100">
          <template #default="{ row }">
            <span class="post-count-badge">{{ row.postCount || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="80">
          <template #default="{ row }">
            <span class="sort-badge">{{ row.sortOrder || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" @click="showForumDialog(row)" class="action-btn">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button type="danger" size="small" @click="deleteForum(row)" class="action-btn">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="forumDialogVisible" :title="isEdit ? '编辑版块' : '新增版块'" width="500px">
      <el-form :model="forumForm" label-width="80px">
        <el-form-item label="版块名称">
          <el-input v-model="forumForm.name" placeholder="请输入版块名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="forumForm.description" type="textarea" :rows="3" placeholder="请输入版块描述" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="forumForm.sortOrder" :min="0" :max="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="forumDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveForum">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'

const forums = ref([])
const loading = ref(false)

const forumDialogVisible = ref(false)
const isEdit = ref(false)

const forumForm = reactive({
  id: null,
  name: '',
  description: '',
  sortOrder: 0
})

const formatTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString()
}

const fetchForums = async () => {
  loading.value = true
  try {
    const response = await api.get('/admin/categories')
    forums.value = response || []
  } catch (error) {
    console.error('获取版块列表失败:', error)
    ElMessage.error('获取版块列表失败')
  } finally {
    loading.value = false
  }
}

const showForumDialog = (forum = null) => {
  if (forum) {
    isEdit.value = true
    forumForm.id = forum.id
    forumForm.name = forum.name
    forumForm.description = forum.description
    forumForm.sortOrder = forum.sortOrder || 0
  } else {
    isEdit.value = false
    forumForm.id = null
    forumForm.name = ''
    forumForm.description = ''
    forumForm.sortOrder = forums.value.length
  }
  forumDialogVisible.value = true
}

const saveForum = async () => {
  if (!forumForm.name) {
    ElMessage.warning('请输入版块名称')
    return
  }
  
  try {
    if (isEdit.value) {
      await api.put(`/admin/categories/${forumForm.id}`, forumForm)
      ElMessage.success('更新成功')
    } else {
      await api.post('/admin/categories', forumForm)
      ElMessage.success('创建成功')
    }
    forumDialogVisible.value = false
    fetchForums()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const deleteForum = async (forum) => {
  await ElMessageBox.confirm('确定要删除这个版块吗？', '提示', {
    type: 'warning'
  })
  try {
    await api.delete(`/admin/categories/${forum.id}`)
    ElMessage.success('删除成功')
    fetchForums()
  } catch (error) {
    ElMessage.error(error.response?.data || '删除失败')
  }
}

onMounted(() => {
  fetchForums()
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

.forum-name {
  font-weight: 600;
  color: var(--text-primary);
}

.post-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 24px;
  padding: 0 10px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: #fff;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(17, 153, 142, 0.3);
}

.sort-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 24px;
  padding: 0 8px;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: #fff;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
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

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
