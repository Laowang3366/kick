<template>
  <div class="page-management">
    <el-card class="management-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">用户管理</span>
          <div class="header-actions">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索用户名或邮箱"
              class="search-input"
              clearable
              @clear="fetchUsers"
              @keyup.enter="fetchUsers"
            />
            <el-button type="primary" class="action-button" @click="fetchUsers">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button class="action-button" @click="fetchUsers">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-button type="success" class="action-button add-btn" @click="showAddDialog">
              <el-icon><Plus /></el-icon>
              新增用户
            </el-button>
          </div>
        </div>
      </template>
      
      <el-table :data="users" style="width: 100%" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="头像" width="80">
          <template #default="{ row }">
            <el-avatar :src="row.avatar" :size="40" class="user-avatar">
              {{ row.username?.charAt(0) }}
            </el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <div class="role-cell">
              <el-tag :type="getRoleTagType(row.role)" effect="dark" size="small">
                {{ getRoleText(row.role) }}
              </el-tag>
              <span v-if="row.role === 'moderator' && row.managedCategories" class="managed-categories">
                ({{ getCategoryNames(row.managedCategories) }})
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 0 ? 'success' : 'danger'" effect="dark">
              {{ row.status === 0 ? '正常' : '锁定' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="320">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" @click="showEditDialog(row)" class="action-btn">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button
                v-if="row.status === 0"
                type="warning"
                size="small"
                @click="toggleUserStatus(row, 1)"
                class="action-btn"
              >
                <el-icon><Lock /></el-icon>
                锁定
              </el-button>
              <el-button
                v-else
                type="success"
                size="small"
                @click="toggleUserStatus(row, 0)"
                class="action-btn"
              >
                <el-icon><Unlock /></el-icon>
                解锁
              </el-button>
              <el-button type="info" size="small" @click="showResetPasswordDialog(row)" class="action-btn">
                <el-icon><Key /></el-icon>
                重置
              </el-button>
              <el-button type="danger" size="small" @click="deleteUser(row)" class="action-btn">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="10"
          :total="totalUsers"
          layout="prev, pager, next, total"
          @current-change="fetchUsers"
          background
        />
      </div>
    </el-card>

    <el-dialog v-model="userDialogVisible" :title="isEdit ? '编辑用户' : '新增用户'" width="520px" class="user-dialog">
      <el-form :model="userForm" :rules="userRules" ref="userFormRef" label-width="90px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="请输入用户名" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="密码" prop="password">
          <el-input v-model="userForm.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="选择角色" style="width: 100%" @change="handleRoleChange">
            <el-option label="普通用户" value="user" />
            <el-option label="版主" value="moderator" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="userForm.role === 'moderator'" label="管理板块" prop="managedCategories">
          <el-select 
            v-model="userForm.managedCategories" 
            multiple 
            placeholder="请选择管理的板块" 
            style="width: 100%"
          >
            <el-option
              v-for="forum in forums"
              :key="forum.id"
              :label="forum.name"
              :value="forum.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="userForm.status" placeholder="选择状态" style="width: 100%">
            <el-option label="正常" :value="0" />
            <el-option label="锁定" :value="1" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUser" :loading="saveLoading">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resetPasswordVisible" title="重置密码" width="400px">
      <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="80px">
        <el-form-item label="用户">
          <el-input :value="selectedUser?.username" disabled />
        </el-form-item>
        <el-form-item label="新密码" prop="password">
          <el-input v-model="passwordForm.password" type="password" placeholder="请输入新密码" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请确认新密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPasswordVisible = false">取消</el-button>
        <el-button type="primary" @click="resetPassword" :loading="resetLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Lock, Unlock, Edit, Refresh, Plus, Delete, Key } from '@element-plus/icons-vue'
import { useForumEvents } from '../../composables/useForumEvents'

const users = ref([])
const forums = ref([])
const loading = ref(false)
const currentPage = ref(1)
const totalUsers = ref(0)
const searchKeyword = ref('')

const userDialogVisible = ref(false)
const resetPasswordVisible = ref(false)
const isEdit = ref(false)
const selectedUser = ref(null)
const saveLoading = ref(false)
const resetLoading = ref(false)
const userFormRef = ref(null)
const passwordFormRef = ref(null)

const userForm = reactive({
  id: null,
  username: '',
  email: '',
  password: '',
  role: 'user',
  status: 0,
  managedCategories: []
})

const passwordForm = reactive({
  password: '',
  confirmPassword: ''
})

const validatePassword = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请输入密码'))
  } else if (value.length < 6) {
    callback(new Error('密码长度不能少于6位'))
  } else {
    callback()
  }
}

const validateConfirmPassword = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入密码'))
  } else if (value !== passwordForm.password) {
    callback(new Error('两次输入密码不一致'))
  } else {
    callback()
  }
}

const validateManagedCategories = (rule, value, callback) => {
  if (userForm.role === 'moderator' && (!value || value.length === 0)) {
    callback(new Error('请选择至少一个管理的板块'))
  } else {
    callback()
  }
}

const userRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在3到20个字符之间', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, validator: validatePassword, trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  managedCategories: [
    { validator: validateManagedCategories, trigger: 'change' }
  ]
}

const passwordRules = {
  password: [
    { required: true, validator: validatePassword, trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const formatTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString()
}

const getRoleTagType = (role) => {
  switch (role) {
    case 'admin': return 'danger'
    case 'moderator': return 'warning'
    default: return 'info'
  }
}

const getRoleText = (role) => {
  switch (role) {
    case 'admin': return '管理员'
    case 'moderator': return '版主'
    default: return '用户'
  }
}

const getCategoryNames = (categoryIds) => {
  if (!categoryIds) return ''
  let ids = categoryIds
  if (typeof categoryIds === 'string') {
    try {
      ids = JSON.parse(categoryIds)
    } catch (e) {
      return ''
    }
  }
  if (!Array.isArray(ids) || !forums.value.length) return ''
  const names = ids.map(id => {
    const category = forums.value.find(f => f.id === id)
    return category ? category.name : ''
  }).filter(Boolean)
  return names.join('、')
}

const handleRoleChange = (role) => {
  if (role !== 'moderator') {
    userForm.managedCategories = []
  }
}

const fetchForums = async () => {
  try {
    const response = await api.get('/categories')
    forums.value = response || []
  } catch (error) {
    console.error('获取板块列表失败:', error)
  }
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      size: 10
    }
    if (searchKeyword.value) {
      params.keyword = searchKeyword.value
    }
    const response = await api.get('/admin/users', { params })
    users.value = response.records || []
    totalUsers.value = response.total || 0
  } catch (error) {
    console.error('获取用户列表失败:', error)
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const showAddDialog = () => {
  isEdit.value = false
  userForm.id = null
  userForm.username = ''
  userForm.email = ''
  userForm.password = ''
  userForm.role = 'user'
  userForm.status = 0
  userForm.managedCategories = []
  userDialogVisible.value = true
}

const showEditDialog = (user) => {
  isEdit.value = true
  selectedUser.value = user
  userForm.id = user.id
  userForm.username = user.username
  userForm.email = user.email
  userForm.role = user.role
  userForm.status = user.status
  
  if (user.managedCategories) {
    try {
      userForm.managedCategories = typeof user.managedCategories === 'string' 
        ? JSON.parse(user.managedCategories) 
        : user.managedCategories
    } catch (e) {
      userForm.managedCategories = []
    }
  } else {
    userForm.managedCategories = []
  }
  
  userDialogVisible.value = true
}

const saveUser = async () => {
  try {
    await userFormRef.value.validate()
  } catch {
    return
  }
  
  saveLoading.value = true
  try {
    const data = { ...userForm }
    if (isEdit.value) {
      await api.put(`/admin/users/${userForm.id}`, data)
      ElMessage.success('更新成功')
    } else {
      await api.post('/admin/users', data)
      ElMessage.success('创建成功')
    }
    userDialogVisible.value = false
    fetchUsers()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    saveLoading.value = false
  }
}

const toggleUserStatus = async (user, status) => {
  const action = status === 1 ? '锁定' : '解锁'
  await ElMessageBox.confirm(`确定要${action}用户 ${user.username} 吗？`, '提示', {
    type: 'warning'
  })
  try {
    await api.put(`/admin/users/${user.id}`, { status })
    ElMessage.success(`${action}成功`)
    fetchUsers()
  } catch (error) {
    ElMessage.error(`${action}失败`)
  }
}

const showResetPasswordDialog = (user) => {
  selectedUser.value = user
  passwordForm.password = ''
  passwordForm.confirmPassword = ''
  resetPasswordVisible.value = true
}

const resetPassword = async () => {
  try {
    await passwordFormRef.value.validate()
  } catch {
    return
  }
  
  resetLoading.value = true
  try {
    await api.put(`/admin/users/${selectedUser.value.id}/password`, {
      password: passwordForm.password
    })
    ElMessage.success('密码重置成功')
    resetPasswordVisible.value = false
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '密码重置失败')
  } finally {
    resetLoading.value = false
  }
}

const deleteUser = async (user) => {
  await ElMessageBox.confirm(`确定要删除用户 ${user.username} 吗？此操作不可恢复！`, '警告', {
    type: 'warning',
    confirmButtonText: '确定删除',
    cancelButtonText: '取消'
  })
  try {
    await api.delete(`/admin/users/${user.id}`)
    ElMessage.success('删除成功')
    fetchUsers()
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

useForumEvents((event) => {
  if (event.type === 'USER_UPDATED') {
    fetchUsers()
  }
})

onMounted(() => {
  fetchForums()
  fetchUsers()
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
  width: 240px;
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

.add-btn {
  margin-left: 8px;
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

.user-avatar {
  border: 2px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.user-avatar:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-md);
}

.role-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.managed-categories {
  font-size: 12px;
  color: var(--text-tertiary);
}

.action-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
  align-items: center;
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

.user-dialog :deep(.el-dialog__body) {
  padding: 24px;
}

@media (max-width: 768px) {
  .search-input {
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
