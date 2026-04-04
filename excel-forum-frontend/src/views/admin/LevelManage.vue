<template>
  <div class="page-management level-manage">
    <el-card class="management-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">等级管理</span>
          <div class="header-actions">
            <el-button class="action-button" @click="fetchAll">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-button type="primary" class="action-button" :loading="recalculating" @click="recalculateLevels">
              <el-icon><RefreshRight /></el-icon>
              重算等级
            </el-button>
          </div>
        </div>
      </template>

      <el-row :gutter="20" class="stats-row">
        <el-col :xs="24" :sm="12" :lg="6">
          <div class="stat-card">
            <div class="stat-icon blue">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ overview.stats.userCount }}</div>
              <div class="stat-label">等级用户总数</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :lg="6">
          <div class="stat-card">
            <div class="stat-icon gold">
              <el-icon><Medal /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">Lv.{{ overview.stats.highestLevel }}</div>
              <div class="stat-label">{{ overview.stats.highestLevelName }} · {{ overview.stats.highestLevelUsers }}人</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :lg="6">
          <div class="stat-card">
            <div class="stat-icon green">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ overview.stats.totalExp }}</div>
              <div class="stat-label">累计经验值</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :lg="6">
          <div class="stat-card">
            <div class="stat-icon purple">
              <el-icon><Calendar /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ overview.stats.todayExp }}</div>
              <div class="stat-label">今日新增经验</div>
            </div>
          </div>
        </el-col>
      </el-row>

      <div class="overview-grid">
        <div class="overview-panel">
          <div class="panel-title">等级规则</div>
          <div class="level-rule-list">
            <div v-for="rule in overview.levelRules" :key="rule.level" class="level-rule-item">
              <div class="rule-head">
                <LevelTag :level="rule.level" :show-admin="false" />
                <span class="rule-threshold">经验 ≥ {{ rule.threshold }}</span>
              </div>
              <div class="rule-meta">
                <span>{{ rule.name }}</span>
                <span>{{ getDistributionCount(rule.level) }} 人</span>
              </div>
            </div>
          </div>
        </div>

        <div class="overview-panel">
          <div class="panel-title">经验规则</div>
          <div class="exp-rule-list">
            <div v-for="rule in overview.expRules" :key="rule.key" class="exp-rule-item">
              <div class="exp-rule-meta">
                <span class="rule-name">{{ rule.label }}</span>
                <span class="rule-description">{{ rule.description || '暂无说明' }}</span>
              </div>
              <div class="exp-rule-actions">
                <el-tag :type="rule.enabled ? 'success' : 'info'" effect="plain">
                  {{ rule.rangeText }}
                </el-tag>
                <el-button type="primary" link @click="openRuleDialog(rule)">编辑</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <el-card class="management-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">用户等级</span>
          <div class="header-actions">
            <el-input
              v-model="userFilters.keyword"
              placeholder="搜索用户名或邮箱"
              class="search-input wide"
              clearable
              @keyup.enter="fetchUsers"
            />
            <el-select v-model="userFilters.level" class="search-input" clearable placeholder="等级筛选">
              <el-option v-for="rule in overview.levelRules" :key="rule.level" :label="`Lv.${rule.level} ${rule.name}`" :value="rule.level" />
            </el-select>
            <el-button type="primary" class="action-button" @click="fetchUsers">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="users.records" v-loading="users.loading" stripe class="admin-table">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="用户" min-width="180">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :src="row.avatar" :size="34">
                {{ row.username?.charAt(0) }}
              </el-avatar>
              <div class="user-meta">
                <span class="username">{{ row.username }}</span>
                <span class="user-role">{{ formatRole(row.role) }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="等级" width="160">
          <template #default="{ row }">
            <LevelTag :level="row.level" :role="row.role" />
          </template>
        </el-table-column>
        <el-table-column label="经验" min-width="220">
          <template #default="{ row }">
            <div class="exp-cell">
              <div class="exp-values">
                <span>{{ row.exp }}</span>
                <span class="exp-hint">
                  {{ row.progress?.maxLevel ? '已满级' : `${row.progress?.currentInLevel || 0}/${row.progress?.totalInLevel || 0}` }}
                </span>
              </div>
              <el-progress
                :percentage="getProgressPercent(row.progress)"
                :stroke-width="8"
                :show-text="false"
                :status="row.progress?.maxLevel ? 'success' : ''"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="points" label="积分" width="90" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'danger' : 'success'" size="small">
              {{ row.status === 1 ? '已封禁' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button type="primary" link @click="openUserDialog(row)">编辑等级</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container" v-if="users.total > users.size">
        <el-pagination
          v-model:current-page="users.page"
          :page-size="users.size"
          :total="users.total"
          layout="prev, pager, next, total"
          background
          @current-change="fetchUsers"
        />
      </div>
    </el-card>

    <el-card class="management-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">经验流水</span>
          <div class="header-actions">
            <el-input
              v-model="logFilters.username"
              placeholder="搜索用户名"
              class="search-input"
              clearable
              @keyup.enter="fetchLogs"
            />
            <el-select v-model="logFilters.bizType" class="search-input" clearable placeholder="经验来源">
              <el-option
                v-for="rule in overview.expRules"
                :key="rule.key"
                :label="rule.label"
                :value="rule.key"
              />
            </el-select>
            <el-button type="primary" class="action-button" @click="fetchLogs">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="logs.records" v-loading="logs.loading" stripe class="admin-table">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="用户" width="180">
          <template #default="{ row }">
            <div class="user-cell" v-if="row.user">
              <el-avatar :src="row.user.avatar" :size="30">
                {{ row.user.username?.charAt(0) }}
              </el-avatar>
              <div class="user-meta">
                <span class="username">{{ row.user.username }}</span>
                <span class="user-role">Lv.{{ row.user.level }} · {{ row.user.exp }}经验</span>
              </div>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="bizLabel" label="来源" width="140" />
        <el-table-column label="经验变化" width="120">
          <template #default="{ row }">
            <span class="exp-change">+{{ row.expChange }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="说明" min-width="220" show-overflow-tooltip />
        <el-table-column label="时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createTime) }}
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container" v-if="logs.total > logs.size">
        <el-pagination
          v-model:current-page="logs.page"
          :page-size="logs.size"
          :total="logs.total"
          layout="prev, pager, next, total"
          background
          @current-change="fetchLogs"
        />
      </div>
    </el-card>

    <el-dialog v-model="ruleDialog.visible" title="编辑经验规则" width="440px">
      <el-form label-width="88px">
        <el-form-item label="规则名称">
          <el-input v-model="ruleDialog.form.label" />
        </el-form-item>
        <el-form-item label="规则说明">
          <el-input v-model="ruleDialog.form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="最小经验">
          <el-input-number v-model="ruleDialog.form.minExp" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="最大经验">
          <el-input-number v-model="ruleDialog.form.maxExp" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="ruleDialog.form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ruleDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="ruleDialog.saving" @click="saveRule">
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="userDialog.visible" title="编辑用户等级" width="440px">
      <el-form label-width="88px">
        <el-form-item label="用户">
          <div class="dialog-user">{{ userDialog.form.username || '-' }}</div>
        </el-form-item>
        <el-form-item label="目标等级">
          <el-select v-model="userDialog.form.level" style="width: 100%">
            <el-option
              v-for="rule in overview.levelRules"
              :key="rule.level"
              :label="`Lv.${rule.level} ${rule.name}`"
              :value="rule.level"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="经验值">
          <el-input-number v-model="userDialog.form.exp" :min="0" :max="999999" style="width: 100%" />
        </el-form-item>
        <el-form-item label="等级区间">
          <div class="dialog-hint">{{ currentLevelRangeText }}</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="userDialog.saving" @click="saveUserLevel">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Calendar, Medal, Refresh, RefreshRight, Search, TrendCharts, User } from '@element-plus/icons-vue'
import api from '../../api'
import LevelTag from '../../components/LevelTag.vue'

const overview = reactive({
  stats: {
    userCount: 0,
    totalExp: 0,
    todayExp: 0,
    highestLevel: 1,
    highestLevelName: '新手',
    highestLevelUsers: 0
  },
  levelRules: [],
  expRules: [],
  distribution: []
})

const recalculating = ref(false)

const ruleDialog = reactive({
  visible: false,
  saving: false,
  form: {
    key: '',
    label: '',
    description: '',
    minExp: 0,
    maxExp: 0,
    enabled: true
  }
})

const userDialog = reactive({
  visible: false,
  saving: false,
  form: {
    id: null,
    username: '',
    level: 1,
    exp: 0
  }
})

const userFilters = reactive({
  keyword: '',
  level: undefined
})

const users = reactive({
  loading: false,
  records: [],
  page: 1,
  size: 10,
  total: 0
})

const logFilters = reactive({
  username: '',
  bizType: ''
})

const logs = reactive({
  loading: false,
  records: [],
  page: 1,
  size: 10,
  total: 0
})

const formatTime = (time) => {
  if (!time) return '-'
  return new Date(time).toLocaleString()
}

const formatRole = (role) => {
  if (role === 'admin') return '管理员'
  if (role === 'moderator') return '版主'
  return '普通用户'
}

const getDistributionCount = (level) => {
  return overview.distribution.find(item => item.level === level)?.userCount || 0
}

const getProgressPercent = (progress) => {
  if (!progress) return 0
  if (progress.maxLevel) return 100
  const total = Number(progress.totalInLevel || 0)
  const current = Number(progress.currentInLevel || 0)
  if (!total) return 0
  return Math.min(100, Math.max(0, Math.round((current / total) * 100)))
}

const currentLevelRangeText = computed(() => {
  const targetLevel = Number(userDialog.form.level || 1)
  const currentIndex = overview.levelRules.findIndex(item => item.level === targetLevel)
  if (currentIndex < 0) return '未找到等级区间'
  const current = overview.levelRules[currentIndex]
  const next = overview.levelRules[currentIndex + 1]
  if (!next) {
    return `该等级最低经验为 ${current.threshold}，无上限`
  }
  return `该等级经验范围：${current.threshold} - ${next.threshold - 1}`
})

const openRuleDialog = (rule) => {
  ruleDialog.form.key = rule.key
  ruleDialog.form.label = rule.label
  ruleDialog.form.description = rule.description || ''
  ruleDialog.form.minExp = Number(rule.minExp || 0)
  ruleDialog.form.maxExp = Number(rule.maxExp || 0)
  ruleDialog.form.enabled = !!rule.enabled
  ruleDialog.visible = true
}

const openUserDialog = (row) => {
  userDialog.form.id = row.id
  userDialog.form.username = row.username
  userDialog.form.level = Number(row.level || 1)
  userDialog.form.exp = Number(row.exp || 0)
  userDialog.visible = true
}

const fetchOverview = async () => {
  const response = await api.get('/admin/levels/overview')
  overview.stats = response.stats || overview.stats
  overview.levelRules = response.levelRules || []
  overview.expRules = response.expRules || []
  overview.distribution = response.distribution || []
}

const fetchUsers = async () => {
  users.loading = true
  try {
    const response = await api.get('/admin/levels/users', {
      params: {
        page: users.page,
        size: users.size,
        keyword: userFilters.keyword || undefined,
        level: userFilters.level
      }
    })
    users.records = response.records || []
    users.total = response.total || 0
  } catch (error) {
    ElMessage.error('获取用户等级失败')
  } finally {
    users.loading = false
  }
}

const fetchLogs = async () => {
  logs.loading = true
  try {
    const response = await api.get('/admin/levels/logs', {
      params: {
        page: logs.page,
        size: logs.size,
        username: logFilters.username || undefined,
        bizType: logFilters.bizType || undefined
      }
    })
    logs.records = response.records || []
    logs.total = response.total || 0
  } catch (error) {
    ElMessage.error('获取经验流水失败')
  } finally {
    logs.loading = false
  }
}

const fetchAll = async () => {
  try {
    await Promise.all([fetchOverview(), fetchUsers(), fetchLogs()])
  } catch (error) {
    ElMessage.error('刷新等级管理失败')
  }
}

const recalculateLevels = async () => {
  recalculating.value = true
  try {
    const response = await api.post('/admin/levels/recalculate')
    ElMessage.success(response.message || '等级已重算')
    await fetchAll()
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '等级重算失败')
  } finally {
    recalculating.value = false
  }
}

const saveRule = async () => {
  if (ruleDialog.form.maxExp < ruleDialog.form.minExp) {
    ElMessage.warning('最大经验不能小于最小经验')
    return
  }
  ruleDialog.saving = true
  try {
    await api.put(`/admin/levels/exp-rules/${ruleDialog.form.key}`, {
      name: ruleDialog.form.label,
      description: ruleDialog.form.description,
      minExp: ruleDialog.form.minExp,
      maxExp: ruleDialog.form.maxExp,
      enabled: ruleDialog.form.enabled
    })
    ElMessage.success('经验规则已更新')
    ruleDialog.visible = false
    await fetchOverview()
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '经验规则更新失败')
  } finally {
    ruleDialog.saving = false
  }
}

const saveUserLevel = async () => {
  userDialog.saving = true
  try {
    await api.put(`/admin/levels/users/${userDialog.form.id}`, {
      level: userDialog.form.level,
      exp: userDialog.form.exp
    })
    ElMessage.success('用户等级已更新')
    userDialog.visible = false
    await Promise.all([fetchUsers(), fetchLogs(), fetchOverview()])
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '用户等级更新失败')
  } finally {
    userDialog.saving = false
  }
}

onMounted(() => {
  fetchAll()
})
</script>

<style scoped>
.page-management {
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.management-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--card-shadow);
  backdrop-filter: blur(10px);
  overflow: hidden;
}

.management-card :deep(.el-card__header) {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.action-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.search-input {
  width: 180px;
}

.search-input.wide {
  width: 240px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  background: rgba(255, 255, 255, 0.7);
  min-height: 96px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
}

.stat-icon.blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.stat-icon.gold { background: linear-gradient(135deg, #f59e0b, #d97706); }
.stat-icon.green { background: linear-gradient(135deg, #10b981, #059669); }
.stat-icon.purple { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.overview-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 20px;
}

.overview-panel {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: 18px;
  background: rgba(255, 255, 255, 0.75);
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 14px;
}

.level-rule-list,
.exp-rule-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.level-rule-item,
.exp-rule-item {
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-md);
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.85);
}

.rule-head,
.exp-rule-item,
.exp-rule-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rule-threshold,
.rule-meta,
.rule-name,
.rule-description {
  color: var(--text-secondary);
  font-size: 13px;
}

.exp-rule-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rule-meta {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
}

.exp-rule-actions {
  flex-shrink: 0;
}

.management-card :deep(.el-card__body) {
  padding: 20px 24px 24px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.username {
  color: var(--text-primary);
  font-weight: 600;
}

.user-role {
  color: var(--text-secondary);
  font-size: 12px;
}

.exp-cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.exp-values {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--text-primary);
  font-weight: 600;
}

.exp-hint {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 400;
}

.exp-change {
  color: #16a34a;
  font-weight: 700;
}

.dialog-user,
.dialog-hint {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.pagination-container {
  display: flex;
  justify-content: center;
  padding-top: 18px;
}

@media (max-width: 1200px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .search-input,
  .search-input.wide {
    width: 100%;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions > * {
    flex: 1 1 100%;
  }
}
</style>
