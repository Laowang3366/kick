<template>
  <div class="page-management">
    <el-card class="management-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">积分管理</span>
          <div class="header-actions">
            <el-button type="primary" class="action-button" @click="showAddDialog">
              <el-icon><Plus /></el-icon>
              新增积分规则
            </el-button>
            <el-button class="action-button" @click="fetchRules">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon points">
              <el-icon><Coin /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalPoints }}</div>
              <div class="stat-label">总积分发放</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon users">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.activeUsers }}</div>
              <div class="stat-label">活跃用户</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon today">
              <el-icon><Calendar /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.todayPoints }}</div>
              <div class="stat-label">今日发放</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon rules">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ rules.length }}</div>
              <div class="stat-label">积分规则</div>
            </div>
          </div>
        </el-col>
      </el-row>

      <el-table :data="rules" style="width: 100%" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="规则名称" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="积分变化" width="120">
          <template #default="{ row }">
            <span :class="['points-change', row.points > 0 ? 'positive' : 'negative']">
              {{ row.points > 0 ? '+' : '' }}{{ row.points }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'daily' ? 'success' : 'primary'" size="small">
              {{ row.type === 'daily' ? '每日' : '一次性' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="enabled" label="状态" width="80">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" @change="toggleRule(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" @click="editRule(row)" class="action-btn">
                编辑
              </el-button>
              <el-button type="danger" size="small" @click="deleteRule(row)" class="action-btn">
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="management-card" shadow="hover" style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span class="card-title">积分记录</span>
          <div class="header-actions">
            <el-input 
              v-model="searchUsername" 
              placeholder="搜索用户" 
              style="width: 200px" 
              clearable
              @keyup.enter="fetchRecords"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button class="action-button" @click="fetchRecords">
              搜索
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="records" style="width: 100%" v-loading="recordsLoading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="用户" width="150">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar :src="row.user?.avatar" :size="28">
                {{ row.user?.username?.charAt(0) }}
              </el-avatar>
              <span>{{ row.user?.username }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="ruleName" label="规则" width="150" />
        <el-table-column label="积分变化" width="120">
          <template #default="{ row }">
            <span :class="['points-change', row.change > 0 ? 'positive' : 'negative']">
              {{ row.change > 0 ? '+' : '' }}{{ row.change }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="balance" label="变动后余额" width="120" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.createTime) }}
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container" v-if="totalRecords > 10">
        <el-pagination
          v-model:current-page="recordPage"
          :page-size="10"
          :total="totalRecords"
          layout="prev, pager, next, total"
          @current-change="fetchRecords"
          background
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingRule ? '编辑规则' : '新增规则'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="规则名称">
          <el-input v-model="form.name" placeholder="请输入规则名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="积分变化">
          <el-input-number v-model="form.points" :min="-1000" :max="1000" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" style="width: 100%">
            <el-option label="每日任务" value="daily" />
            <el-option label="一次性任务" value="once" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRule">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Coin, User, Calendar, Document, Search } from '@element-plus/icons-vue'

const rules = ref([])
const records = ref([])
const loading = ref(false)
const recordsLoading = ref(false)
const dialogVisible = ref(false)
const editingRule = ref(null)
const searchUsername = ref('')
const recordPage = ref(1)
const totalRecords = ref(0)

const stats = reactive({
  totalPoints: 0,
  activeUsers: 0,
  todayPoints: 0
})

const form = reactive({
  name: '',
  description: '',
  points: 0,
  type: 'daily',
  enabled: true
})

const formatTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString()
}

const fetchRules = async () => {
  loading.value = true
  try {
    const response = await api.get('/admin/points/rules')
    rules.value = response || []
  } catch (error) {
    console.error('获取积分规则失败:', error)
    ElMessage.error('获取积分规则失败')
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const response = await api.get('/admin/points/stats')
    Object.assign(stats, response)
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

const fetchRecords = async () => {
  recordsLoading.value = true
  try {
    const params = { page: recordPage.value, size: 10 }
    if (searchUsername.value) {
      params.username = searchUsername.value
    }
    const response = await api.get('/admin/points/records', { params })
    records.value = response.records || []
    totalRecords.value = response.total || 0
  } catch (error) {
    console.error('获取积分记录失败:', error)
    ElMessage.error('获取积分记录失败')
  } finally {
    recordsLoading.value = false
  }
}

const showAddDialog = () => {
  editingRule.value = null
  Object.assign(form, {
    name: '',
    description: '',
    points: 0,
    type: 'daily',
    enabled: true
  })
  dialogVisible.value = true
}

const editRule = (rule) => {
  editingRule.value = rule
  Object.assign(form, rule)
  dialogVisible.value = true
}

const saveRule = async () => {
  if (!form.name) {
    ElMessage.warning('请输入规则名称')
    return
  }
  
  try {
    if (editingRule.value) {
      await api.put(`/admin/points/rules/${editingRule.value.id}`, form)
      ElMessage.success('更新成功')
    } else {
      await api.post('/admin/points/rules', form)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchRules()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const toggleRule = async (rule) => {
  try {
    await api.put(`/admin/points/rules/${rule.id}`, { enabled: rule.enabled })
    ElMessage.success(rule.enabled ? '已启用' : '已禁用')
  } catch (error) {
    rule.enabled = !rule.enabled
    ElMessage.error('操作失败')
  }
}

const deleteRule = async (rule) => {
  await ElMessageBox.confirm(`确定删除规则「${rule.name}」吗？`, '删除确认', {
    type: 'warning'
  })
  
  try {
    await api.delete(`/admin/points/rules/${rule.id}`)
    ElMessage.success('删除成功')
    fetchRules()
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

onMounted(() => {
  fetchRules()
  fetchStats()
  fetchRecords()
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

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-icon.points {
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #fff;
}

.stat-icon.users {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}

.stat-icon.today {
  background: linear-gradient(135deg, #11998e, #38ef7d);
  color: #fff;
}

.stat-icon.rules {
  background: linear-gradient(135deg, #ee0979, #ff6a00);
  color: #fff;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.points-change {
  font-weight: 600;
  font-size: 14px;
}

.points-change.positive {
  color: #67c23a;
}

.points-change.negative {
  color: #f56c6c;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
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
  padding: 20px 0;
  display: flex;
  justify-content: center;
}
</style>
