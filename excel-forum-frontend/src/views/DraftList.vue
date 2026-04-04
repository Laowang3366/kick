<template>
  <div class="draft-page">
    <div class="draft-shell">
      <div class="draft-header">
        <div>
          <el-button class="draft-back-btn" text @click="goHome">返回首页</el-button>
          <h1 class="draft-title">我的草稿</h1>
          <p class="draft-subtitle">最多保存 {{ summary.maxTotal }} 条草稿，同时可继续编辑 {{ summary.maxEditing }} 条，草稿超过 {{ expireDays }} 天未发布会自动清理</p>
        </div>
        <el-button type="primary" @click="goCreatePost">新建帖子</el-button>
      </div>

      <div class="draft-metrics">
        <div class="metric-card">
          <span class="metric-label">草稿总数</span>
          <strong class="metric-value">{{ summary.total }}/{{ summary.maxTotal }}</strong>
        </div>
        <div class="metric-card">
          <span class="metric-label">继续编辑中</span>
          <strong class="metric-value">{{ summary.editingCount }}/{{ summary.maxEditing }}</strong>
        </div>
      </div>

      <div class="draft-filters">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索草稿标题或内容"
          clearable
          class="draft-search"
        />
        <el-select v-model="statusFilter" clearable placeholder="全部状态" class="draft-filter-select">
          <el-option label="全部状态" value="" />
          <el-option label="继续编辑中" value="editing" />
          <el-option label="已暂存" value="draft" />
        </el-select>
        <el-select v-model="categoryFilter" clearable placeholder="全部板块" class="draft-filter-select">
          <el-option label="全部板块" value="" />
          <el-option
            v-for="option in categoryOptions"
            :key="option.id"
            :label="option.name"
            :value="option.id"
          />
        </el-select>
        <el-select v-model="sortOrder" placeholder="最近更新" class="draft-filter-select">
          <el-option label="最近更新" value="latest" />
          <el-option label="最早更新" value="oldest" />
        </el-select>
      </div>

      <div v-if="filteredDrafts.length" class="draft-batch-bar">
        <el-checkbox
          :model-value="allCurrentPageSelected"
          :indeterminate="selectedDraftIds.length > 0 && !allCurrentPageSelected"
          @change="toggleSelectCurrentPage"
        >
          当前页全选
        </el-checkbox>
        <span class="draft-batch-count">已选 {{ selectedDraftIds.length }} 条</span>
        <el-button plain :disabled="!selectedDraftIds.length" @click="batchParkDrafts">
          批量暂存
        </el-button>
        <el-button type="danger" plain :disabled="!selectedDraftIds.length" @click="batchDeleteDrafts">
          批量删除
        </el-button>
      </div>

      <div v-loading="loading" class="draft-content">
        <div v-if="filteredDrafts.length" class="draft-grid">
          <article v-for="draft in filteredDrafts" :key="draft.id" class="draft-card">
            <div class="draft-card-top">
              <div class="draft-card-main">
                <div class="draft-card-title">{{ draft.title || '未命名草稿' }}</div>
                <div class="draft-card-meta">
                  <span>{{ getCategoryName(draft.categoryId) }}</span>
                  <span>更新时间 {{ formatTime(draft.updateTime) }}</span>
                </div>
                <div class="draft-expire-row">
                  <el-tag :type="getExpireTagType(draft)" effect="light" size="small">
                    {{ getExpireLabel(draft) }}
                  </el-tag>
                  <span class="draft-expire-time">有效至 {{ formatTime(getExpireTime(draft)) }}</span>
                </div>
              </div>
              <div class="draft-card-side">
                <el-tag :type="draft.status === 'editing' ? 'success' : 'info'" effect="light">
                  {{ draft.status === 'editing' ? '继续编辑中' : '已暂存' }}
                </el-tag>
                <el-checkbox
                  :model-value="selectedDraftIds.includes(draft.id)"
                  class="draft-select-checkbox"
                  @change="toggleDraftSelection(draft.id)"
                />
              </div>
            </div>

            <p class="draft-card-preview">{{ getPreview(draft.content) }}</p>

            <div v-if="getDraftSignals(draft).length" class="draft-signals">
              <el-tag
                v-for="signal in getDraftSignals(draft)"
                :key="`${draft.id}-${signal}`"
                size="small"
                effect="plain"
                class="draft-signal-tag"
              >
                {{ signal }}
              </el-tag>
            </div>

            <div v-if="parseJsonArray(draft.tags).length" class="draft-tags">
              <el-tag
                v-for="tag in parseJsonArray(draft.tags).slice(0, 4)"
                :key="`${draft.id}-${tag}`"
                effect="plain"
              >
                {{ tag }}
              </el-tag>
            </div>

            <div class="draft-card-actions">
              <el-button @click="continueEdit(draft)">
                {{ draft.status === 'editing' ? '继续编辑' : '进入编辑' }}
              </el-button>
              <el-button v-if="draft.status === 'editing'" plain @click="parkDraft(draft.id)">
                暂存
              </el-button>
              <el-button type="primary" plain @click="publishDraft(draft.id)">
                发布
              </el-button>
              <el-button type="danger" plain @click="deleteDraft(draft.id)">
                删除
              </el-button>
            </div>
          </article>
        </div>

        <el-empty v-else :description="drafts.length ? '没有符合条件的草稿' : '还没有草稿'">
          <el-button type="primary" @click="goCreatePost">去写帖子</el-button>
        </el-empty>
      </div>

      <div v-if="pagination.total > pagination.pageSize" class="draft-pagination">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :page-sizes="[6, 9, 12]"
          :total="pagination.total"
          @current-change="fetchDrafts"
          @size-change="handlePageSizeChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const router = useRouter()
const loading = ref(false)
const drafts = ref([])
const categoryMap = ref({})
const searchKeyword = ref('')
const statusFilter = ref('')
const categoryFilter = ref('')
const sortOrder = ref('latest')
const searchDebounceTimer = ref(null)
const selectedDraftIds = ref([])
const expireDays = 10
const summary = reactive({
  total: 0,
  editingCount: 0,
  maxTotal: 15,
  maxEditing: 3
})
const pagination = reactive({
  currentPage: 1,
  pageSize: 6,
  total: 0,
  pages: 0
})

const categoryOptions = computed(() => {
  return Object.entries(categoryMap.value).map(([id, name]) => ({
    id: Number(id),
    name
  }))
})

const filteredDrafts = computed(() => drafts.value)
const allCurrentPageSelected = computed(() => {
  if (!filteredDrafts.value.length) {
    return false
  }
  return filteredDrafts.value.every(draft => selectedDraftIds.value.includes(draft.id))
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

const getPreview = (content) => {
  const normalizedText = (content || '')
    .replace(/```[\s\S]*?```/g, ' [代码块] ')
    .replace(/\|[^\n]*\|/g, ' [表格] ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' [图片] ')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()

  if (!normalizedText) {
    return '暂未填写内容'
  }

  const compactText = normalizedText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' / ')

  return compactText.length > 120 ? `${compactText.slice(0, 120)}...` : compactText
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
  if (!categoryId) {
    return '未选择版块'
  }
  return categoryMap.value[categoryId] || `版块 ${categoryId}`
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

const getExpireTime = (draft) => {
  const baseValue = draft?.updateTime || draft?.createTime
  if (!baseValue) {
    return ''
  }

  const baseDate = new Date(baseValue)
  if (Number.isNaN(baseDate.getTime())) {
    return ''
  }

  return new Date(baseDate.getTime() + expireDays * 24 * 60 * 60 * 1000)
}

const getRemainingDays = (draft) => {
  const expireTime = getExpireTime(draft)
  if (!expireTime) {
    return null
  }

  const remainingMs = expireTime.getTime() - Date.now()
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000))
}

const getExpireLabel = (draft) => {
  const remainingDays = getRemainingDays(draft)
  if (remainingDays === null) {
    return '有效期未计算'
  }
  if (remainingDays <= 0) {
    return '即将被清理'
  }
  if (remainingDays === 1) {
    return '剩余 1 天'
  }
  return `剩余 ${remainingDays} 天`
}

const getExpireTagType = (draft) => {
  const remainingDays = getRemainingDays(draft)
  if (remainingDays === null) {
    return 'info'
  }
  if (remainingDays <= 2) {
    return 'danger'
  }
  if (remainingDays <= 5) {
    return 'warning'
  }
  return 'success'
}

const goCreatePost = () => {
  router.push('/post/create')
}

const goHome = () => {
  router.push('/')
}

const fetchCategories = async () => {
  try {
    const response = await api.get('/categories')
    categoryMap.value = (response || []).reduce((acc, item) => {
      acc[item.id] = item.name
      return acc
    }, {})
  } catch (error) {
    console.error('获取版块列表失败:', error)
  }
}

const fetchDrafts = async () => {
  loading.value = true
  try {
    const response = await api.get('/drafts', {
      params: {
        page: pagination.currentPage,
        size: pagination.pageSize,
        keyword: searchKeyword.value.trim() || undefined,
        status: statusFilter.value || undefined,
        categoryId: categoryFilter.value || undefined,
        sort: sortOrder.value
      }
    })
    drafts.value = response.records || []
    summary.total = response.allTotal || 0
    summary.editingCount = response.editingCount || 0
    summary.maxTotal = response.maxTotal || 15
    summary.maxEditing = response.maxEditing || 3
    pagination.total = response.total || 0
    pagination.pages = response.pages || 0
    pagination.currentPage = response.current || pagination.currentPage
    pagination.pageSize = response.size || pagination.pageSize
    selectedDraftIds.value = selectedDraftIds.value.filter(id => drafts.value.some(draft => draft.id === id))
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '获取草稿列表失败')
  } finally {
    loading.value = false
  }
}

const toggleDraftSelection = (draftId) => {
  if (selectedDraftIds.value.includes(draftId)) {
    selectedDraftIds.value = selectedDraftIds.value.filter(id => id !== draftId)
    return
  }
  selectedDraftIds.value = [...selectedDraftIds.value, draftId]
}

const toggleSelectCurrentPage = (checked) => {
  if (checked) {
    selectedDraftIds.value = [...new Set([...selectedDraftIds.value, ...filteredDrafts.value.map(draft => draft.id)])]
    return
  }
  selectedDraftIds.value = selectedDraftIds.value.filter(id => !filteredDrafts.value.some(draft => draft.id === id))
}

const resetToFirstPageAndFetch = async () => {
  pagination.currentPage = 1
  await fetchDrafts()
}

const handlePageSizeChange = async () => {
  pagination.currentPage = 1
  await fetchDrafts()
}

const continueEdit = async (draft) => {
  try {
    if (draft.status !== 'editing') {
      await api.post(`/drafts/${draft.id}/resume`)
    }
    router.push(`/drafts/${draft.id}/edit`)
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '进入草稿失败')
    fetchDrafts()
  }
}

const parkDraft = async (draftId) => {
  try {
    const response = await api.post(`/drafts/${draftId}/park`)
    ElMessage.success(response.message || '草稿已暂存')
    fetchDrafts()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '暂存草稿失败')
  }
}

const batchParkDrafts = async () => {
  if (!selectedDraftIds.value.length) {
    return
  }

  try {
    const response = await api.post('/drafts/batch-park', {
      ids: selectedDraftIds.value
    })
    ElMessage.success(response.message || '批量暂存成功')
    selectedDraftIds.value = []
    await fetchDrafts()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '批量暂存失败')
  }
}

const publishDraft = async (draftId) => {
  try {
    await ElMessageBox.confirm('确认发布后，将以当前时间作为帖子发布时间，草稿副本不会保留。是否继续发布？', '发布草稿', {
      confirmButtonText: '确认发布',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    const response = await api.post(`/drafts/${draftId}/publish`)
    ElMessage.success(response.message || '草稿已发布')
    router.push(`/post/${response.id}`)
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '发布草稿失败')
    fetchDrafts()
  }
}

const deleteDraft = async (draftId) => {
  try {
    await ElMessageBox.confirm('删除后无法恢复，是否继续？', '删除草稿', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    const response = await api.delete(`/drafts/${draftId}`)
    ElMessage.success(response.message || '草稿已删除')
    fetchDrafts()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '删除草稿失败')
  }
}

const batchDeleteDrafts = async () => {
  if (!selectedDraftIds.value.length) {
    return
  }

  try {
    await ElMessageBox.confirm(`确定删除已选中的 ${selectedDraftIds.value.length} 条草稿吗？`, '批量删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    const response = await api.delete('/drafts/batch', {
      data: {
        ids: selectedDraftIds.value
      }
    })
    ElMessage.success(response.message || '批量删除成功')
    selectedDraftIds.value = []
    await fetchDrafts()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '批量删除失败')
  }
}

onMounted(async () => {
  await fetchCategories()
  await fetchDrafts()
})

watch([statusFilter, categoryFilter, sortOrder], async () => {
  await resetToFirstPageAndFetch()
})

watch(searchKeyword, () => {
  if (searchDebounceTimer.value) {
    window.clearTimeout(searchDebounceTimer.value)
  }

  searchDebounceTimer.value = window.setTimeout(() => {
    resetToFirstPageAndFetch()
  }, 300)
})

onBeforeUnmount(() => {
  if (searchDebounceTimer.value) {
    window.clearTimeout(searchDebounceTimer.value)
  }
})
</script>

<style scoped>
.draft-page {
  min-height: 100vh;
  padding: 28px 24px;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 24%),
    linear-gradient(135deg, #f6f8fc 0%, #edf2ff 100%);
}

.draft-shell {
  max-width: 1180px;
  margin: 0 auto;
}

.draft-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.draft-title {
  margin: 8px 0 0;
  font-size: 30px;
  font-weight: 700;
  color: #182033;
}

.draft-back-btn {
  padding: 0;
  font-size: 14px;
  font-weight: 600;
  color: #3157d5;
}

.draft-subtitle {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.draft-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.draft-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.draft-search {
  flex: 1;
  min-width: 240px;
}

.draft-filter-select {
  width: 180px;
}

.metric-card {
  padding: 18px 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.06);
}

.metric-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #64748b;
}

.metric-value {
  font-size: 26px;
  font-weight: 700;
  color: #1e293b;
}

.draft-content {
  min-height: 260px;
}

.draft-batch-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 16px 28px rgba(15, 23, 42, 0.05);
}

.draft-batch-count {
  font-size: 13px;
  color: #475569;
}

.draft-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 18px;
}

.draft-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.08);
}

.draft-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.draft-card-main {
  flex: 1;
  min-width: 0;
}

.draft-card-side {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.draft-select-checkbox {
  margin-top: 0;
}

.draft-card-title {
  font-size: 18px;
  font-weight: 700;
  color: #182033;
  line-height: 1.4;
}

.draft-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
}

.draft-expire-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  margin-top: 10px;
}

.draft-expire-time {
  font-size: 12px;
  color: #64748b;
}

.draft-card-preview {
  min-height: 66px;
  margin: 0;
  color: #475569;
  font-size: 14px;
  line-height: 1.7;
}

.draft-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.draft-signals {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.draft-signal-tag {
  border-radius: 999px;
}

.draft-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.draft-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

@media (max-width: 768px) {
  .draft-page {
    padding: 16px 12px;
  }

  .draft-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .draft-metrics {
    grid-template-columns: 1fr;
  }

  .draft-filter-select,
  .draft-search {
    width: 100%;
  }
}
</style>
