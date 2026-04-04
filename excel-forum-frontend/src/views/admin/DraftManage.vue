<template>
  <div class="page-management">
    <el-card class="management-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div>
            <span class="card-title">草稿治理</span>
            <p class="card-subtitle">仅展示草稿元数据，超过 10 天未发布的草稿会自动清理</p>
          </div>
          <div class="header-actions">
            <el-input
              v-model="filters.keyword"
              placeholder="搜索标题或内容"
              clearable
              class="filter-input"
              @keyup.enter="handleFilter"
            />
            <el-input
              v-model="filters.username"
              placeholder="按用户名筛选"
              clearable
              class="filter-input"
              @keyup.enter="handleFilter"
            />
            <el-select v-model="filters.status" clearable placeholder="全部状态" class="filter-select">
              <el-option label="继续编辑中" value="editing" />
              <el-option label="已暂存" value="draft" />
            </el-select>
            <el-select v-model="filters.categoryId" clearable placeholder="全部版块" class="filter-select">
              <el-option
                v-for="category in categories"
                :key="category.id"
                :label="category.name"
                :value="category.id"
              />
            </el-select>
            <el-select v-model="filters.expired" clearable placeholder="全部有效期" class="filter-select">
              <el-option label="即将过期/已过期" :value="true" />
              <el-option label="仍在有效期" :value="false" />
            </el-select>
            <el-select v-model="filters.sort" class="filter-select">
              <el-option label="最近更新" value="latest" />
              <el-option label="最早更新" value="oldest" />
              <el-option label="优先显示快过期" value="expiring" />
            </el-select>
            <el-button type="primary" class="action-button" @click="handleFilter">
              搜索
            </el-button>
            <el-button class="action-button" @click="resetFilters">
              重置
            </el-button>
          </div>
        </div>
      </template>

      <div class="summary-strip">
        <span>当前共 {{ total }} 条草稿</span>
        <span>自动清理阈值 {{ expireDays }} 天</span>
      </div>

      <div class="table-container">
        <div class="admin-table">
          <el-table :data="drafts" v-loading="loading" stripe style="width: 100%">
            <el-table-column prop="id" label="ID" min-width="72" />
            <el-table-column label="标题" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">
                <div class="cell-content-wrapper">
                  <div class="draft-title-cell">
                    <span class="cell-text">{{ row.title || '未命名草稿' }}</span>
                    <div class="status-tags">
                      <el-tag :type="row.status === 'editing' ? 'success' : 'info'" size="small" effect="light">
                        {{ row.status === 'editing' ? '继续编辑中' : '已暂存' }}
                      </el-tag>
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="作者" min-width="150" show-overflow-tooltip>
              <template #default="{ row }">
                <div class="user-cell">
                  <el-avatar :size="28" :src="row.author?.avatar">
                    {{ row.author?.username?.charAt(0) }}
                  </el-avatar>
                  <span>{{ row.author?.username || `用户 ${row.userId || '-'}` }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="版块" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">
                <el-tag size="small" effect="plain">
                  {{ row.category?.name || getCategoryName(row.categoryId) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="更新时间" min-width="160">
              <template #default="{ row }">
                {{ formatTime(row.updateTime) }}
              </template>
            </el-table-column>
            <el-table-column label="有效期" min-width="170">
              <template #default="{ row }">
                <div class="validity-cell">
                  <el-tag :type="getExpireTagType(row)" size="small" effect="light">
                    {{ getExpireLabel(row) }}
                  </el-tag>
                  <span class="validity-time">{{ formatTime(row.expireTime) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="内容信号" min-width="150">
              <template #default="{ row }">
                <div class="status-tags">
                  <el-tag
                    v-for="signal in getDraftSignals(row)"
                    :key="`${row.id}-${signal}`"
                    size="small"
                    effect="plain"
                  >
                    {{ signal }}
                  </el-tag>
                  <span v-if="!getDraftSignals(row).length" class="empty-signal">普通文本</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="250">
              <template #default="{ row }">
                <div class="action-cell">
                  <el-button class="action-btn" size="small" @click="openDetail(row)">
                    查看详情
                  </el-button>
                  <el-button type="danger" plain class="action-btn" size="small" @click="deleteDraft(row)">
                    删除
                  </el-button>
                  <el-button type="warning" plain class="action-btn" size="small" @click="deleteUserDrafts(row)">
                    清理该用户草稿
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :page-sizes="[10, 20, 30]"
          :total="total"
          @current-change="fetchDrafts"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" title="草稿详情" width="760px">
      <template v-if="detailDraft">
        <div class="detail-section">
          <div class="detail-title">{{ detailDraft.title || '未命名草稿' }}</div>
          <div class="detail-meta">
            <span>作者：{{ detailDraft.author?.username || '-' }}</span>
            <span>版块：{{ detailDraft.category?.name || getCategoryName(detailDraft.categoryId) }}</span>
            <span>更新时间：{{ formatTime(detailDraft.updateTime) }}</span>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-label">正文内容</div>
          <div class="detail-content">{{ getPreview(detailDraft.content, 600) }}</div>
        </div>

        <div class="detail-section" v-if="parseJsonArray(detailDraft.tags).length">
          <div class="detail-label">标签</div>
          <div class="status-tags">
            <el-tag
              v-for="tag in parseJsonArray(detailDraft.tags)"
              :key="`${detailDraft.id}-${tag}`"
              effect="plain"
            >
              {{ tag }}
            </el-tag>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-label">附件</div>
          <div class="detail-content">
            {{ parseJsonArray(detailDraft.attachments).length ? `共 ${parseJsonArray(detailDraft.attachments).length} 个附件` : '无附件' }}
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../../api'

const loading = ref(false)
const drafts = ref([])
const categories = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const detailVisible = ref(false)
const detailDraft = ref(null)
const expireDays = 10

const filters = reactive({
  keyword: '',
  username: '',
  status: '',
  categoryId: '',
  expired: '',
  sort: 'latest'
})

const parseJsonArray = (value) => {
  if (!value) {
    return []
  }

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

const formatTime = (value) => {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getCategoryName = (categoryId) => {
  const category = categories.value.find(item => item.id === categoryId)
  return category?.name || '未选择版块'
}

const getPreview = (content, limit = 120) => {
  const text = (content || '')
    .replace(/```[\s\S]*?```/g, ' [代码块] ')
    .replace(/\|[^\n]*\|/g, ' [表格] ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' [图片] ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) {
    return '暂未填写内容'
  }

  return text.length > limit ? `${text.slice(0, limit)}...` : text
}

const getDraftSignals = (draft) => {
  const signals = []
  const attachments = parseJsonArray(draft.attachments)
  const content = draft.content || ''
  const hasImageAttachment = attachments.some(item => `${item?.type || ''}`.startsWith('image/'))
  const hasImageInContent = /!\[[^\]]*]\([^)]*\)|<img\b/i.test(content)
  const hasCodeBlock = /```|<pre\b|<code\b/i.test(content)

  if (attachments.length) {
    signals.push('含附件')
  }
  if (hasImageAttachment || hasImageInContent) {
    signals.push('含图片')
  }
  if (hasCodeBlock) {
    signals.push('含代码块')
  }

  return signals
}

const getExpireDate = (draft) => {
  if (!draft?.expireTime) {
    return null
  }

  const expireDate = new Date(draft.expireTime)
  return Number.isNaN(expireDate.getTime()) ? null : expireDate
}

const getExpireLabel = (draft) => {
  const expireDate = getExpireDate(draft)
  if (!expireDate) {
    return '有效期未知'
  }

  const remainingDays = Math.ceil((expireDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  if (remainingDays <= 0) {
    return '即将清理'
  }
  if (remainingDays === 1) {
    return '剩余 1 天'
  }
  return `剩余 ${remainingDays} 天`
}

const getExpireTagType = (draft) => {
  const expireDate = getExpireDate(draft)
  if (!expireDate) {
    return 'info'
  }

  const remainingDays = Math.ceil((expireDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  if (remainingDays <= 2) {
    return 'danger'
  }
  if (remainingDays <= 5) {
    return 'warning'
  }
  return 'success'
}

const fetchCategories = async () => {
  try {
    categories.value = await api.get('/categories')
  } catch (error) {
    ElMessage.error('获取版块列表失败')
  }
}

const fetchDrafts = async () => {
  loading.value = true
  try {
    const response = await api.get('/admin/drafts', {
      params: {
        page: currentPage.value,
        size: pageSize.value,
        keyword: filters.keyword.trim() || undefined,
        username: filters.username.trim() || undefined,
        status: filters.status || undefined,
        categoryId: filters.categoryId || undefined,
        expired: filters.expired === '' ? undefined : filters.expired,
        sort: filters.sort
      }
    })
    drafts.value = response.records || []
    total.value = response.total || 0
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '获取草稿列表失败')
  } finally {
    loading.value = false
  }
}

const handleFilter = async () => {
  currentPage.value = 1
  await fetchDrafts()
}

const handleSizeChange = async () => {
  currentPage.value = 1
  await fetchDrafts()
}

const resetFilters = async () => {
  filters.keyword = ''
  filters.username = ''
  filters.status = ''
  filters.categoryId = ''
  filters.expired = ''
  filters.sort = 'latest'
  currentPage.value = 1
  await fetchDrafts()
}

const openDetail = (draft) => {
  detailDraft.value = draft
  detailVisible.value = true
}

const deleteDraft = async (draft) => {
  try {
    await ElMessageBox.confirm(`确认删除草稿「${draft.title || '未命名草稿'}」吗？`, '删除草稿', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    const response = await api.delete(`/admin/drafts/${draft.id}`)
    ElMessage.success(response.message || '草稿已删除')
    await fetchDrafts()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '删除草稿失败')
  }
}

const deleteUserDrafts = async (draft) => {
  const username = draft.author?.username || `用户 ${draft.author?.id || draft.userId || ''}`
  try {
    await ElMessageBox.confirm(`确认清理 ${username} 的全部草稿吗？该操作不可恢复。`, '清理用户草稿', {
      confirmButtonText: '确认清理',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    const response = await api.delete(`/admin/drafts/by-user/${draft.author?.id || draft.userId}`)
    ElMessage.success(response.message || '已清理用户草稿')
    await fetchDrafts()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '清理用户草稿失败')
  }
}

onMounted(async () => {
  await fetchCategories()
  await fetchDrafts()
})
</script>

<style scoped>
@import '../../styles/admin-table.css';

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

.management-card :deep(.el-card__header) {
  background: transparent;
  border-bottom: 1px solid var(--border-color);
  padding: 20px 24px;
}

.management-card :deep(.el-card__body) {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.card-title {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.card-subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-input {
  width: 180px;
}

.filter-select {
  width: 150px;
}

.action-button {
  border-radius: var(--border-radius-md);
}

.summary-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 24px 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.table-container {
  padding: 16px 24px 0;
  overflow-x: auto;
}

.draft-title-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.validity-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.validity-time {
  font-size: 12px;
  color: var(--text-tertiary);
}

.empty-signal {
  font-size: 12px;
  color: var(--text-tertiary);
}

.pagination-container {
  padding: 20px 24px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--border-color);
}

.detail-section + .detail-section {
  margin-top: 18px;
}

.detail-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}

.detail-label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.detail-content {
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 768px) {
  .filter-input,
  .filter-select {
    width: 100%;
  }

  .table-container,
  .summary-strip,
  .pagination-container {
    padding-left: 12px;
    padding-right: 12px;
  }
}
</style>
