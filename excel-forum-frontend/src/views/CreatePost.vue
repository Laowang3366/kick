<template>
  <div class="create-post-page">
    <div class="post-editor-container">
      <div class="editor-header">
        <el-button @click="cancelEdit" class="back-btn" circle>
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <h1 class="editor-title">{{ pageTitle }}</h1>
        <div class="editor-actions">
          <span v-if="showDraftActions" class="draft-quota-chip">
            已保存 {{ draftSummary.total }}/{{ draftSummary.maxTotal }} · 编辑中 {{ draftSummary.editingCount }}/{{ draftSummary.maxEditing }}
          </span>
          <span v-if="showDraftActions" class="draft-status-chip" :class="`is-${autoSaveState}`">
            {{ autoSaveLabel }}
          </span>
          <span v-if="showDraftActions && lastSavedAtLabel" class="draft-saved-at-chip">
            上次保存：{{ lastSavedAtLabel }}
          </span>
          <el-button
            v-if="showDraftActions && autoSaveState === 'error'"
            plain
            class="draft-retry-btn"
            @click="retryAutoSave"
          >
            立即重试
          </el-button>
          <el-button v-if="showDraftActions" plain @click="goToDrafts">
            我的草稿
          </el-button>
        </div>
      </div>

      <div class="editor-body">
        <div class="main-editor">
          <div class="shared-toolbar">
            <div class="shared-toolbar-header">
              <div>
                <div class="shared-toolbar-title">编辑工具</div>
                <div class="shared-toolbar-subtitle">当前作用于{{ activeTarget === 'title' ? '主题' : '内容' }}</div>
              </div>
              <div class="target-switcher">
                <button
                  type="button"
                  class="target-chip"
                  :class="{ 'is-active': activeTarget === 'title' }"
                  @click="switchTarget('title')"
                >
                  主题
                </button>
                <button
                  type="button"
                  class="target-chip"
                  :class="{ 'is-active': activeTarget === 'content' }"
                  @click="switchTarget('content')"
                >
                  内容
                </button>
              </div>
            </div>

            <div class="shared-toolbar-body">
              <div class="shared-toolbar-group toolbar-forum-group">
                <span class="toolbar-group-label">板块</span>
                <el-select
                  v-model="form.forumId"
                  placeholder="选择版块"
                  class="forum-select toolbar-forum-select"
                  :class="{ 'has-value': form.forumId }"
                >
                  <el-option
                    v-for="forum in forums"
                    :key="forum.id"
                    :label="forum.name"
                    :value="forum.id"
                  >
                    <div class="forum-option">
                      <span class="forum-name">{{ forum.name }}</span>
                      <span class="forum-desc">{{ forum.description }}</span>
                    </div>
                  </el-option>
                </el-select>
              </div>

              <div class="shared-toolbar-group">
                <span class="toolbar-group-label">文字</span>
                <div class="toolbar-group-actions">
                  <el-button :class="{ 'is-active': currentFormatting.bold }" @click="toggleFormat('bold')">加粗</el-button>
                  <el-button :class="{ 'is-active': currentFormatting.italic }" @click="toggleFormat('italic')">斜体</el-button>
                  <el-button :class="{ 'is-active': currentFormatting.underline }" @click="toggleFormat('underline')">下划线</el-button>
                  <el-button :class="{ 'is-active': currentFormatting.strike }" @click="toggleFormat('strike')">删除线</el-button>
                </div>
              </div>

              <div class="shared-toolbar-group">
                <span class="toolbar-group-label">样式</span>
                <div class="toolbar-group-actions">
                  <el-popover placement="bottom-start" :width="252" trigger="click" v-model:visible="showColorPalette">
                    <template #reference>
                      <button type="button" class="color-trigger shared-color-trigger">
                        <span class="color-trigger-swatch" :style="{ backgroundColor: currentFormatting.textColor }" />
                        <span class="color-trigger-label">颜色</span>
                      </button>
                    </template>
                    <div class="color-palette">
                      <button
                        v-for="color in toolbarColorOptions"
                        :key="color"
                        type="button"
                        class="color-chip"
                        :class="{ 'is-active': normalizeToolbarColor(currentFormatting.textColor) === normalizeToolbarColor(color) }"
                        :style="{ backgroundColor: color }"
                        @click="applyToolbarColor(color)"
                      />
                      <label class="custom-color-field">
                        <span>自定义</span>
                        <input
                          :value="currentFormatting.textColor"
                          type="color"
                          class="native-color-input"
                          @input="applyToolbarCustomColor"
                        />
                      </label>
                    </div>
                  </el-popover>
                  <el-button class="size-button" @click="adjustCurrentFontSize(-2)">A-</el-button>
                  <el-select :model-value="currentFormatting.fontSize" size="small" class="font-size-select" @change="setCurrentFontSize">
                    <el-option v-for="size in toolbarFontSizeOptions" :key="size" :label="`${size}px`" :value="size" />
                  </el-select>
                  <el-button class="size-button" @click="adjustCurrentFontSize(2)">A+</el-button>
                </div>
              </div>

              <div class="shared-toolbar-group">
                <span class="toolbar-group-label">排版</span>
                <div class="toolbar-group-actions">
                  <el-button :class="{ 'is-active': currentFormatting.textAlign === 'left' }" @click="setCurrentTextAlign('left')">左对齐</el-button>
                  <el-button :class="{ 'is-active': currentFormatting.textAlign === 'center' }" @click="setCurrentTextAlign('center')">居中</el-button>
                  <el-button :class="{ 'is-active': currentFormatting.textAlign === 'right' }" @click="setCurrentTextAlign('right')">右对齐</el-button>
                </div>
              </div>

              <div class="shared-toolbar-group">
                <span class="toolbar-group-label">插入</span>
                <div class="toolbar-group-actions">
                  <el-button :disabled="activeTarget === 'title'" @click="triggerContentInsert('image')">插入图片</el-button>
                  <el-button :disabled="activeTarget === 'title'" @click="triggerContentInsert('link')">插入链接</el-button>
                  <el-button :disabled="activeTarget === 'title'" @click="triggerContentInsert('code')">代码块</el-button>
                  <el-button :disabled="activeTarget === 'title'" @click="triggerContentInsert('table')">表格</el-button>
                </div>
              </div>

              <div class="shared-toolbar-group shared-toolbar-group-actions">
                <span class="toolbar-group-label">操作</span>
                <div class="toolbar-group-actions">
                  <el-button @click="handleUndo">撤销</el-button>
                  <el-button @click="handleClearCurrent">清空</el-button>
                </div>
              </div>
            </div>
          </div>

          <div class="title-input-wrapper" :class="{ 'is-active': activeTarget === 'title' }">
            <div class="field-title">主题</div>
            <div class="title-input-container">
              <input
                ref="titleInputRef"
                v-model="form.title"
                type="text"
                class="title-input"
                :style="titleInputStyle"
                placeholder="请输入标题（5-100字）"
                maxlength="100"
                @focus="activeTarget = 'title'"
              />
              <span class="title-count">{{ form.title.length }}/100</span>
            </div>
          </div>

          <div class="content-editor" :class="{ 'is-active': activeTarget === 'content' }" @click="activeTarget = 'content'">
            <div class="field-title content-title">内容</div>
            <TiptapEditor
              ref="contentEditorRef"
              v-model="form.content"
              placeholder="分享你的Excel技巧、问题或经验..."
              :toolbar-visible="false"
              @focus="activeTarget = 'content'"
              @state-change="handleContentToolbarStateChange"
            />
          </div>

          <div class="tag-section">
            <div class="tag-header">
              <span class="tag-label">标签</span>
              <span class="tag-hint">添加标签让更多人看到你的帖子</span>
            </div>
            <div class="tag-input-wrapper">
              <el-tag
                v-for="tag in form.tags"
                :key="tag"
                closable
                @close="removeTag(tag)"
                class="tag-item"
              >
                {{ tag }}
              </el-tag>
              <el-input
                v-if="showTagInput"
                ref="tagInputRef"
                v-model="newTag"
                size="small"
                class="tag-input"
                @keyup.enter="addTag"
                @blur="addTag"
                placeholder="输入标签"
              />
              <el-button
                v-else
                size="small"
                @click="showTagInput = true"
                text
                type="primary"
              >
                + 添加标签
              </el-button>
            </div>
            <div class="hot-tags">
              <span class="hot-label">热门：</span>
              <el-tag
                v-for="tag in commonTags"
                :key="tag"
                @click="addHotTag(tag)"
                class="hot-tag"
                effect="plain"
              >
                {{ tag }}
              </el-tag>
            </div>
          </div>
        </div>

        <div class="side-panel">
          <div class="panel-card">
            <div class="panel-header">
              <el-icon><Upload /></el-icon>
              <span>附件上传</span>
            </div>
            <div class="panel-body">
              <FileUpload @success="handleFileUpload" />
              <div v-if="form.attachments.length" class="attachment-list">
                <div
                  v-for="(file, index) in form.attachments"
                  :key="index"
                  class="attachment-item"
                >
                  <el-icon><Document /></el-icon>
                  <span class="file-name">{{ file.name }}</span>
                  <el-icon class="remove-btn" @click="removeAttachment(index)"><Close /></el-icon>
                </div>
              </div>
            </div>
          </div>

          <div class="panel-card" v-if="!isEdit">
            <div class="panel-header">
              <el-icon><Coin /></el-icon>
              <span>悬赏积分</span>
            </div>
            <div class="panel-body">
              <div class="reward-info">
                <span class="current-points">当前积分：{{ userStore.user?.points || 0 }}</span>
              </div>
              <el-slider
                v-model="form.rewardPoints"
                :max="userStore.user?.points || 0"
                :step="5"
                show-input
                :show-input-controls="false"
              />
              <p class="reward-hint">设置悬赏可以吸引更多人回答</p>
            </div>
          </div>

          <div class="panel-card tips-card">
            <div class="panel-header">
              <el-icon><InfoFilled /></el-icon>
              <span>发帖提示</span>
            </div>
            <div class="panel-body">
              <ul class="tips-list">
                <li>标题简洁明了，概括主要内容</li>
                <li>详细描述问题，附上截图更清晰</li>
                <li>使用代码块展示Excel公式或VBA</li>
                <li>选择正确的版块获得更多关注</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="editor-footer">
        <div class="footer-left">
          <template v-if="showDraftActions">
            <el-button plain @click="goToDrafts">我的草稿</el-button>
            <el-button type="warning" plain @click="saveCurrentDraft" :loading="savingDraft">
              {{ currentDraftId ? '更新草稿' : '保存草稿' }}
            </el-button>
            <el-button v-if="isDraftEdit" plain @click="parkAndReturnDrafts" :loading="parkingDraft">
              暂存草稿
            </el-button>
          </template>
        </div>
        <div class="footer-right">
          <el-button @click="previewPost" :disabled="!canPreview">
            <el-icon><View /></el-icon>
            预览
          </el-button>
          <el-button v-if="isEdit" @click="cancelEdit">
            取消修改
          </el-button>
          <el-button type="primary" @click="submitForm" :loading="submitting" size="large">
            <el-icon><Position /></el-icon>
            {{ submitButtonText }}
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed, nextTick, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useUserStore } from '../stores/user'
import TiptapEditor from '../components/TiptapEditor.vue'
import FileUpload from '../components/FileUpload.vue'
import api from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  ArrowLeft, Upload, Document, Close, Coin, InfoFilled, View, Position 
} from '@element-plus/icons-vue'

const DEFAULT_TITLE_STYLE = {
  bold: true,
  italic: false,
  underline: false,
  strike: false,
  textColor: '#1f2a44',
  fontSize: 28,
  textAlign: 'center'
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const submitting = ref(false)
const savingDraft = ref(false)
const parkingDraft = ref(false)
const forums = ref([])
const commonTags = ref(['VBA', 'Power Query', '函数公式', '图表', '数据透视表', '条件格式', '宏', 'SQL', 'M语言', '求助', '分享', '教程'])
const showTagInput = ref(false)
const newTag = ref('')
const tagInputRef = ref(null)
const titleInputRef = ref(null)
const contentEditorRef = ref(null)
const activeTarget = ref('title')
const showColorPalette = ref(false)
const initialContent = ref('')
const allowRouteLeave = ref(false)
const editReady = ref(false)
const currentDraftId = ref(null)
const draftStatus = ref('')
const autoSaveTimer = ref(null)
const autoSaveCountdownTimer = ref(null)
const autoSaveState = ref('idle')
const autoSaveMessage = ref('')
const autoSaveReady = ref(false)
const lastSavedDraftFingerprint = ref('')
const suppressAutoSaveWatch = ref(false)
const autoSaveSecondsLeft = ref(15)
const lastSavedAt = ref('')
const draftSummary = reactive({
  total: 0,
  editingCount: 0,
  maxTotal: 15,
  maxEditing: 3
})

const toolbarFontSizeOptions = [16, 18, 20, 24, 28, 32, 36]
const toolbarColorOptions = ['#334155', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#111827']
const titleStyle = reactive({ ...DEFAULT_TITLE_STYLE })
const contentToolbarState = ref({
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  textAlign: 'left',
  textColor: '#2f3a4d',
  fontSize: 16,
  canUndo: false,
  isEmpty: true
})

const isPostEdit = computed(() => route.name === 'EditPost')
const isDraftEdit = computed(() => route.name === 'EditDraft')
const isEdit = computed(() => isPostEdit.value)
const showDraftActions = computed(() => !isPostEdit.value)
const pageTitle = computed(() => {
  if (isPostEdit.value) {
    return '编辑帖子'
  }
  if (isDraftEdit.value) {
    return '编辑草稿'
  }
  return '发布新帖'
})
const submitButtonText = computed(() => {
  if (isPostEdit.value) {
    return '保存修改'
  }
  return '发布帖子'
})
const autoSaveLabel = computed(() => {
  const stateMap = {
    idle: '草稿未变化',
    waiting: autoSaveMessage.value || `草稿将在 ${autoSaveSecondsLeft.value} 秒后自动保存`,
    saving: '草稿保存中',
    saved: autoSaveMessage.value || '草稿已保存',
    error: autoSaveMessage.value || '草稿自动保存失败'
  }
  return stateMap[autoSaveState.value] || '草稿未变化'
})
const lastSavedAtLabel = computed(() => {
  if (!lastSavedAt.value) {
    return ''
  }

  const date = new Date(lastSavedAt.value)
  if (Number.isNaN(date.getTime())) {
    return lastSavedAt.value
  }

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})

const form = reactive({
  title: '',
  forumId: '',
  tags: [],
  content: '',
  rewardPoints: 0,
  attachments: []
})

const canPreview = computed(() => {
  return form.title.length >= 5 && form.content.length >= 10
})

const hasDraftContent = computed(() => {
  return Boolean(
    form.title?.trim()
    || form.content?.trim()
    || form.forumId
    || form.tags.length
    || form.attachments.length
    || form.rewardPoints
  )
})

const hasUnsavedChanges = computed(() => {
  return hasCurrentUnsavedChanges()
})

const hasCurrentUnsavedChanges = () => {
  if (!isEdit.value || !editReady.value) {
    return false
  }

  return (form.content || '') !== initialContent.value
}

const currentFormatting = computed(() => {
  if (activeTarget.value === 'title') {
    return titleStyle
  }
  return contentToolbarState.value
})

const titleInputStyle = computed(() => {
  const decorations = []
  if (titleStyle.underline) decorations.push('underline')
  if (titleStyle.strike) decorations.push('line-through')

  return {
    color: titleStyle.textColor,
    fontSize: `${titleStyle.fontSize}px`,
    textAlign: titleStyle.textAlign,
    fontWeight: titleStyle.bold ? 700 : 500,
    fontStyle: titleStyle.italic ? 'italic' : 'normal',
    textDecoration: decorations.length ? decorations.join(' ') : 'none'
  }
})

const normalizeToolbarColor = (color) => (color || '').toLowerCase()

const applyTitleStyle = (style) => {
  Object.assign(titleStyle, DEFAULT_TITLE_STYLE, style || {})
}

const markEditSnapshot = () => {
  if (!isEdit.value) {
    return
  }

  initialContent.value = form.content || ''
  editReady.value = true
}

const fetchForums = async () => {
  try {
    const response = await api.get('/categories')
    forums.value = response
  } catch (error) {
    console.error('获取版块列表失败:', error)
  }
}

const fetchDraftSummary = async () => {
  if (!showDraftActions.value) {
    return
  }

  try {
    const response = await api.get('/drafts')
    draftSummary.total = response.total || 0
    draftSummary.editingCount = response.editingCount || 0
    draftSummary.maxTotal = response.maxTotal || 15
    draftSummary.maxEditing = response.maxEditing || 3
  } catch (error) {
    console.error('获取草稿统计失败:', error)
  }
}

const parseSavedField = (value, fallback) => {
  if (!value) {
    return fallback
  }

  try {
    return typeof value === 'string' ? JSON.parse(value) : value
  } catch (error) {
    return fallback
  }
}

const applyEditorPayload = (record) => {
  form.title = record.title || ''
  form.forumId = record.forumId || record.categoryId || ''
  form.content = record.content || ''
  form.rewardPoints = Number(record.rewardPoints || 0)
  form.tags = parseSavedField(record.tags, [])
  form.attachments = parseSavedField(record.attachments, [])

  const parsedTitleStyle = parseSavedField(record.titleStyle, DEFAULT_TITLE_STYLE)
  applyTitleStyle(parsedTitleStyle || DEFAULT_TITLE_STYLE)
}

const syncDraftSavedFingerprint = (message = '草稿已保存') => {
  lastSavedDraftFingerprint.value = getDraftContentFingerprint()
  autoSaveState.value = hasDraftContent.value ? 'saved' : 'idle'
  autoSaveMessage.value = hasDraftContent.value ? message : ''
}

const updateLastSavedAt = (value) => {
  lastSavedAt.value = value || new Date().toISOString()
}

const fetchPost = async () => {
  if (!isEdit.value) return
  try {
    const response = await api.get(`/posts/${route.params.id}`)
    applyEditorPayload(response.post)
    markEditSnapshot()
  } catch (error) {
    console.error('获取帖子信息失败:', error)
    ElMessage.error('获取帖子信息失败')
    router.back()
  }
}

const fetchDraft = async () => {
  if (!isDraftEdit.value) {
    return
  }

  try {
    const resumeResponse = await api.post(`/drafts/${route.params.id}/resume`)
    currentDraftId.value = Number(route.params.id)
    draftStatus.value = resumeResponse.status || 'editing'

    const response = await api.get(`/drafts/${route.params.id}`)
    suppressAutoSaveWatch.value = true
    applyEditorPayload(response.draft)
    syncDraftSavedFingerprint()
    updateLastSavedAt(response.draft?.updateTime)
    await fetchDraftSummary()
  } catch (error) {
    console.error('获取草稿失败:', error)
    ElMessage.error(error.response?.data?.message || '获取草稿失败')
    router.push('/drafts')
  } finally {
    await nextTick()
    suppressAutoSaveWatch.value = false
  }
}

const handleFileUpload = (file) => {
  form.attachments.push({
    name: file.name,
    url: file.url,
    type: file.type
  })
}

const removeAttachment = (index) => {
  form.attachments.splice(index, 1)
}

const addTag = () => {
  const tag = newTag.value.trim()
  if (tag && !form.tags.includes(tag) && form.tags.length < 5) {
    form.tags.push(tag)
  }
  newTag.value = ''
  showTagInput.value = false
}

const removeTag = (tag) => {
  const index = form.tags.indexOf(tag)
  if (index > -1) {
    form.tags.splice(index, 1)
  }
}

const addHotTag = (tag) => {
  if (!form.tags.includes(tag) && form.tags.length < 5) {
    form.tags.push(tag)
  }
}

const switchTarget = (target) => {
  activeTarget.value = target
  showColorPalette.value = false

  if (target === 'content') {
    contentEditorRef.value?.focusEditor?.()
    return
  }

  nextTick(() => {
    titleInputRef.value?.focus()
  })
}

const handleContentToolbarStateChange = (state) => {
  contentToolbarState.value = state
}

const toggleFormat = (type) => {
  if (activeTarget.value === 'title') {
    titleStyle[type] = !titleStyle[type]
    nextTick(() => titleInputRef.value?.focus())
    return
  }

  const editor = contentEditorRef.value
  if (!editor) {
    return
  }

  const actions = {
    bold: () => editor.toggleBold(),
    italic: () => editor.toggleItalic(),
    underline: () => editor.toggleUnderline(),
    strike: () => editor.toggleStrike()
  }

  actions[type]?.()
}

const applyToolbarColor = (color) => {
  if (activeTarget.value === 'title') {
    titleStyle.textColor = color
    showColorPalette.value = false
    nextTick(() => titleInputRef.value?.focus())
    return
  }

  contentEditorRef.value?.applyTextColor?.(color)
  showColorPalette.value = false
}

const applyToolbarCustomColor = (event) => {
  applyToolbarColor(event.target.value)
}

const setCurrentFontSize = (size) => {
  if (activeTarget.value === 'title') {
    titleStyle.fontSize = size
    nextTick(() => titleInputRef.value?.focus())
    return
  }

  contentEditorRef.value?.setFontSize?.(size)
}

const adjustCurrentFontSize = (step) => {
  if (activeTarget.value === 'title') {
    titleStyle.fontSize = Math.max(18, Math.min(40, titleStyle.fontSize + step))
    nextTick(() => titleInputRef.value?.focus())
    return
  }

  contentEditorRef.value?.adjustFontSize?.(step)
}

const setCurrentTextAlign = (alignment) => {
  if (activeTarget.value === 'title') {
    titleStyle.textAlign = alignment
    nextTick(() => titleInputRef.value?.focus())
    return
  }

  contentEditorRef.value?.setTextAlign?.(alignment)
}

const triggerContentInsert = (type) => {
  const editor = contentEditorRef.value
  if (!editor) {
    return
  }

  activeTarget.value = 'content'

  const actions = {
    image: () => editor.triggerImageUpload?.(),
    link: () => editor.addLink?.(),
    code: () => editor.addCodeBlock?.(),
    table: () => editor.addTable?.()
  }

  actions[type]?.()
}

const handleUndo = () => {
  if (activeTarget.value === 'title') {
    titleInputRef.value?.focus()
    document.execCommand?.('undo')
    return
  }

  contentEditorRef.value?.undoLastChange?.()
}

const handleClearCurrent = async () => {
  if (activeTarget.value === 'title') {
    if (!form.title) {
      return
    }

    try {
      await ElMessageBox.confirm('确定要清空当前主题吗？', '清空主题', {
        confirmButtonText: '清空',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch {
      return
    }

    form.title = ''
    nextTick(() => titleInputRef.value?.focus())
    return
  }

  contentEditorRef.value?.clearAllContent?.()
}

const buildEditorPayload = () => ({
  title: form.title,
  titleStyle: { ...titleStyle },
  forumId: form.forumId,
  categoryId: form.forumId,
  tags: form.tags,
  content: form.content,
  attachments: form.attachments,
  rewardPoints: form.rewardPoints
})

const getDraftContentFingerprint = () => {
  return [
    form.title?.trim(),
    form.content?.trim(),
    form.forumId,
    form.tags.length,
    form.attachments.length,
    JSON.stringify(titleStyle),
    form.rewardPoints
  ].join('|')
}

const clearAutoSaveTimer = () => {
  if (!autoSaveTimer.value) {
    clearAutoSaveCountdown()
    return
  }

  window.clearTimeout(autoSaveTimer.value)
  autoSaveTimer.value = null
  clearAutoSaveCountdown()
}

const clearAutoSaveCountdown = () => {
  if (autoSaveCountdownTimer.value) {
    window.clearInterval(autoSaveCountdownTimer.value)
    autoSaveCountdownTimer.value = null
  }
}

const getDraftId = () => {
  if (currentDraftId.value) {
    return currentDraftId.value
  }
  if (isDraftEdit.value) {
    return Number(route.params.id)
  }
  return null
}

const goToDrafts = async () => {
  if (isDraftEdit.value) {
    await parkCurrentDraft(true)
    allowNextRouteLeave()
  }
  router.push('/drafts')
}

const saveCurrentDraft = async () => {
  if (!showDraftActions.value) {
    return
  }

  clearAutoSaveTimer()

  if (!hasDraftContent.value) {
    ElMessage.warning('请先输入要保存的内容')
    return
  }

  savingDraft.value = true
  try {
    const payload = buildEditorPayload()
    const draftId = getDraftId()
    if (draftId) {
      const response = await api.put(`/drafts/${draftId}`, payload)
      draftStatus.value = response.status || draftStatus.value || 'editing'
      syncDraftSavedFingerprint('草稿已更新')
      updateLastSavedAt(response.updateTime)
      await fetchDraftSummary()
      ElMessage.success(response.message || '草稿已更新')
      return
    }

    const response = await api.post('/drafts', payload)
    currentDraftId.value = response.id
    draftStatus.value = response.status || 'editing'
    syncDraftSavedFingerprint('草稿已保存')
    updateLastSavedAt(response.updateTime)
    await fetchDraftSummary()
    ElMessage.success(response.message || '草稿已保存')
    allowNextRouteLeave()
    await router.replace(`/drafts/${response.id}/edit`)
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '保存草稿失败')
  } finally {
    savingDraft.value = false
  }
}

const autoSaveDraft = async () => {
  if (!showDraftActions.value || !autoSaveReady.value || savingDraft.value || submitting.value) {
    return
  }

  clearAutoSaveCountdown()

  if (!hasDraftContent.value || getDraftContentFingerprint() === lastSavedDraftFingerprint.value) {
    autoSaveState.value = hasDraftContent.value ? 'saved' : 'idle'
    autoSaveMessage.value = hasDraftContent.value ? '草稿已保存' : ''
    return
  }

  autoSaveState.value = 'saving'
  autoSaveMessage.value = ''

  try {
    const payload = buildEditorPayload()
    const draftId = getDraftId()
    if (draftId) {
      const response = await api.put(`/drafts/${draftId}`, payload)
      draftStatus.value = response.status || draftStatus.value || 'editing'
      updateLastSavedAt(response.updateTime)
    } else {
      const response = await api.post('/drafts', payload)
      currentDraftId.value = response.id
      draftStatus.value = response.status || 'editing'
      updateLastSavedAt(response.updateTime)
      allowNextRouteLeave()
      await router.replace(`/drafts/${response.id}/edit`)
    }
    syncDraftSavedFingerprint('草稿已自动保存')
    await fetchDraftSummary()
  } catch (error) {
    autoSaveState.value = 'error'
    autoSaveMessage.value = error.response?.data?.message || '草稿自动保存失败'
  }
}

const scheduleAutoSave = () => {
  if (!showDraftActions.value || !autoSaveReady.value || suppressAutoSaveWatch.value) {
    return
  }

  clearAutoSaveTimer()

  if (!hasDraftContent.value || getDraftContentFingerprint() === lastSavedDraftFingerprint.value) {
    autoSaveState.value = hasDraftContent.value ? 'saved' : 'idle'
    autoSaveMessage.value = hasDraftContent.value ? '草稿已保存' : ''
    return
  }

  autoSaveState.value = 'waiting'
  autoSaveSecondsLeft.value = 15
  autoSaveMessage.value = `草稿将在 ${autoSaveSecondsLeft.value} 秒后自动保存`
  autoSaveCountdownTimer.value = window.setInterval(() => {
    if (autoSaveSecondsLeft.value <= 1) {
      clearAutoSaveCountdown()
      return
    }
    autoSaveSecondsLeft.value -= 1
    autoSaveMessage.value = `草稿将在 ${autoSaveSecondsLeft.value} 秒后自动保存`
  }, 1000)
  autoSaveTimer.value = window.setTimeout(() => {
    autoSaveDraft()
  }, 15000)
}

const retryAutoSave = async () => {
  clearAutoSaveTimer()
  await autoSaveDraft()
}

const promptRestoreLatestDraft = async () => {
  if (!showDraftActions.value || isDraftEdit.value || currentDraftId.value || hasDraftContent.value) {
    return
  }

  try {
    const response = await api.get('/drafts')
    const latestEditingDraft = (response.records || []).find(item => item.status === 'editing')
    if (!latestEditingDraft) {
      return
    }

    await ElMessageBox.confirm(
      `检测到你还有一条编辑中的草稿「${latestEditingDraft.title || '未命名草稿'}」，是否继续编辑？`,
      '恢复草稿',
      {
        confirmButtonText: '继续编辑',
        cancelButtonText: '新建帖子',
        type: 'info'
      }
    )

    allowNextRouteLeave()
    await router.replace(`/drafts/${latestEditingDraft.id}/edit`)
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('检查草稿恢复失败:', error)
    }
  }
}

const parkCurrentDraft = async (silent = false) => {
  const draftId = getDraftId()
  if (!draftId || !isDraftEdit.value) {
    return true
  }

  if (draftStatus.value === 'draft') {
    return true
  }

  parkingDraft.value = true
  try {
    const response = await api.post(`/drafts/${draftId}/park`)
    draftStatus.value = response.status || 'draft'
    updateLastSavedAt(response.updateTime)
    await fetchDraftSummary()
    if (!silent) {
      ElMessage.success(response.message || '草稿已暂存')
    }
    return true
  } catch (error) {
    if (!silent) {
      ElMessage.error(error.response?.data?.message || '暂存草稿失败')
    }
    return false
  } finally {
    parkingDraft.value = false
  }
}

const parkAndReturnDrafts = async () => {
  const parked = await parkCurrentDraft(false)
  if (!parked) {
    return
  }
  allowNextRouteLeave()
  router.push('/drafts')
}

const allowNextRouteLeave = () => {
  allowRouteLeave.value = true
}

const goToPostDetail = () => {
  allowNextRouteLeave()
  router.push(`/post/${route.params.id}`)
}

const confirmLeaveEdit = async () => {
  if (!hasCurrentUnsavedChanges()) {
    return true
  }

  return window.confirm('修改未生效，是否确认返回？')
}

const cancelEdit = async () => {
  if (isDraftEdit.value) {
    const parked = await parkCurrentDraft(true)
    if (!parked) {
      return
    }
    allowNextRouteLeave()
    router.push('/drafts')
    return
  }

  if (!isEdit.value) {
    router.back()
    return
  }

  const confirmed = await confirmLeaveEdit()
  if (!confirmed) {
    return
  }

  goToPostDetail()
}

const handleBeforeUnload = (event) => {
  if (!hasCurrentUnsavedChanges()) {
    return
  }

  event.preventDefault()
  event.returnValue = ''
}

const handleBrowserBack = async () => {
  if (!isEdit.value) {
    return
  }

  if (allowRouteLeave.value) {
    allowRouteLeave.value = false
    return
  }

  const confirmed = await confirmLeaveEdit()
  if (confirmed) {
    goToPostDetail()
    return
  }

  window.history.pushState({ editGuard: true }, '', window.location.href)
}

const previewPost = () => {
  ElMessage.info('预览功能开发中')
}

const submitForm = async () => {
  if (form.title.length < 5) {
    ElMessage.warning('标题至少5个字符')
    return
  }
  if (!form.forumId) {
    ElMessage.warning('请选择版块')
    return
  }
  if (form.content.length < 10) {
    ElMessage.warning('内容至少10个字符')
    return
  }

  submitting.value = true
  try {
    const data = buildEditorPayload()
    if (!isEdit.value) {
      const draftId = getDraftId()
      if (draftId) {
        try {
          await ElMessageBox.confirm(
            '确认发布后，将以当前时间作为帖子发布时间，草稿副本不会保留。是否继续发布？',
            '发布草稿',
            {
              confirmButtonText: '确认发布',
              cancelButtonText: '取消',
              type: 'warning'
            }
          )
        } catch {
          return
        }

        await api.put(`/drafts/${draftId}`, data)
        const response = await api.post(`/drafts/${draftId}/publish`)
        currentDraftId.value = null
        draftStatus.value = ''
        await fetchDraftSummary()
        allowNextRouteLeave()
        ElMessage.success(response.message || '草稿已发布')
        router.push(`/post/${response.id}`)
        return
      }

      const response = await api.post('/posts', data)
      ElMessage.success(response.message || '发布成功！帖子已提交')
      if (response.id) {
        router.push(`/post/${response.id}`)
      } else {
        router.push('/')
      }
    } else {
      await api.put(`/posts/${route.params.id}`, data)
      markEditSnapshot()
      allowNextRouteLeave()
      ElMessage.success('修改成功！')
      router.push(`/post/${route.params.id}`)
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await fetchForums()
  await fetchDraftSummary()
  if (isPostEdit.value) {
    await fetchPost()
  } else if (isDraftEdit.value) {
    await fetchDraft()
  }
  await promptRestoreLatestDraft()
  syncDraftSavedFingerprint()
  autoSaveReady.value = true
  window.addEventListener('beforeunload', handleBeforeUnload)
  if (isEdit.value) {
    window.history.pushState({ editGuard: true }, '', window.location.href)
    window.addEventListener('popstate', handleBrowserBack)
  }
})

onBeforeRouteLeave(async () => {
  if (allowRouteLeave.value) {
    allowRouteLeave.value = false
    return true
  }

  if (isDraftEdit.value) {
    return await parkCurrentDraft(true)
  }

  if (!isEdit.value || !hasUnsavedChanges.value) {
    return true
  }

  return await confirmLeaveEdit()
})

onBeforeUnmount(() => {
  clearAutoSaveTimer()
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('popstate', handleBrowserBack)
})

watch(
  () => getDraftContentFingerprint(),
  () => {
    scheduleAutoSave()
  }
)
</script>

<style scoped>
.create-post-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  padding: 24px;
}

.post-editor-container {
  max-width: 1200px;
  margin: 0 auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 32px;
  border-bottom: 1px solid #f0f0f0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.back-btn {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  color: rgba(255, 255, 255, 0.85) !important;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.25) !important;
  border-color: rgba(255, 255, 255, 0.5) !important;
  color: white !important;
  transform: translateX(-2px);
}

.editor-title {
  flex: 1;
  font-size: 22px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.editor-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.draft-status-chip {
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.22);
}

.draft-quota-chip {
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #eff6ff;
  background: rgba(15, 23, 42, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.draft-status-chip.is-waiting,
.draft-status-chip.is-saving {
  background: rgba(251, 191, 36, 0.22);
}

.draft-status-chip.is-saved {
  background: rgba(52, 211, 153, 0.2);
}

.draft-status-chip.is-error {
  background: rgba(248, 113, 113, 0.22);
}

.draft-saved-at-chip {
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #eff6ff;
  background: rgba(15, 23, 42, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.draft-retry-btn {
  color: rgba(255, 255, 255, 0.92);
  border-color: rgba(255, 255, 255, 0.26);
  background: rgba(248, 113, 113, 0.16);
}

.editor-actions .el-button {
  color: rgba(255, 255, 255, 0.9);
  border-color: rgba(255, 255, 255, 0.26);
  background: rgba(255, 255, 255, 0.12);
}

.editor-body {
  display: flex;
  gap: 24px;
  padding: 24px 32px;
}

.main-editor {
  flex: 1;
  min-width: 0;
}

.shared-toolbar {
  margin-bottom: 20px;
  padding: 18px 20px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 18px;
  background:
    radial-gradient(circle at top left, rgba(96, 165, 250, 0.12), transparent 28%),
    linear-gradient(135deg, #fbfdff 0%, #f6f8ff 100%);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
}

.shared-toolbar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.shared-toolbar-title {
  font-size: 17px;
  font-weight: 700;
  color: #1f2a44;
}

.shared-toolbar-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #7c8aa5;
}

.target-switcher {
  display: inline-flex;
  padding: 4px;
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.8);
}

.target-chip {
  min-width: 72px;
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.target-chip.is-active {
  background: linear-gradient(135deg, #3157d5, #5b7af0);
  color: #fff;
  box-shadow: 0 10px 20px rgba(49, 87, 213, 0.22);
}

.shared-toolbar-body {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.shared-toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
}

.shared-toolbar-group-actions {
  margin-left: 0;
}

.toolbar-forum-group {
  min-width: 280px;
}

.toolbar-forum-select {
  min-width: 220px;
}

.toolbar-group-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}

.toolbar-group-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.shared-toolbar :deep(.el-button) {
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  border-radius: 9px;
  border-color: #d7deea;
  color: #2f3a4d;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
}

.shared-toolbar :deep(.el-button:hover) {
  color: #3157d5;
  border-color: #b9c8ff;
  background: #f5f8ff;
}

.shared-toolbar :deep(.el-button.is-active) {
  background: linear-gradient(135deg, #3157d5, #5877eb);
  border-color: transparent;
  color: #fff;
}

.shared-toolbar :deep(.font-size-select) {
  width: 82px;
}

.shared-toolbar :deep(.font-size-select .el-input__wrapper) {
  border-radius: 9px;
}

.shared-color-trigger {
  min-width: 88px;
}

.color-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid #d7deea;
  border-radius: 9px;
  background: #fff;
  color: #2f3a4d;
  cursor: pointer;
}

.color-trigger-swatch {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.color-trigger-label {
  font-size: 12px;
}

.color-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.color-chip {
  width: 28px;
  height: 28px;
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.12);
}

.color-chip.is-active {
  border-color: #1e293b;
}

.custom-color-field {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 100%;
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid #e2e8f0;
  color: #475569;
  font-size: 12px;
}

.native-color-input {
  width: 48px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.field-title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.side-panel {
  width: 300px;
  flex-shrink: 0;
}

.title-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 18px 20px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 18px;
  background: linear-gradient(135deg, #ffffff 0%, #fbfcff 100%);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06);
  transition: all 0.2s ease;
}

.title-input-wrapper .field-title {
  width: 44px;
  margin-bottom: 0;
  flex-shrink: 0;
}

.title-input-wrapper.is-active {
  border-color: rgba(49, 87, 213, 0.32);
  box-shadow: 0 0 0 4px rgba(49, 87, 213, 0.08);
}

.title-input-container {
  position: relative;
  flex: 1;
}

.title-input {
  width: 100%;
  padding: 16px 20px;
  padding-right: 80px;
  font-size: 20px;
  font-weight: 500;
  border: 1px solid #d7deea;
  border-radius: 14px;
  outline: none;
  background: linear-gradient(135deg, #fdfefe 0%, #f8faff 100%);
  transition: all 0.2s ease;
}

.title-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.title-input::placeholder {
  color: #bbb;
  font-weight: 400;
}

.title-count {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: #999;
}

.forum-select {
  flex: 1;
}

.forum-select :deep(.el-input__wrapper) {
  border-radius: 8px;
  padding: 4px 12px;
}

.forum-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.forum-name {
  font-size: 14px;
  color: #333;
}

.forum-desc {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-editor {
  margin-bottom: 20px;
  border: 2px solid #e8e8e8;
  border-radius: 18px;
  overflow: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.06);
  transition: all 0.2s ease;
}

.content-title {
  margin: 0;
  padding: 12px 16px 0;
}

.content-editor:focus-within {
  border-color: #667eea;
}

.content-editor.is-active {
  border-color: rgba(49, 87, 213, 0.42);
  box-shadow: 0 0 0 4px rgba(49, 87, 213, 0.08), 0 16px 34px rgba(15, 23, 42, 0.06);
}

.tag-section {
  background: #fafafa;
  border-radius: 12px;
  padding: 16px 20px;
}

.tag-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.tag-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.tag-hint {
  font-size: 12px;
  color: #999;
}

.tag-input-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.tag-item {
  border-radius: 16px;
  padding: 4px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: #fff;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
}

.tag-input {
  width: 100px;
}

.hot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.hot-label {
  font-size: 12px;
  color: #999;
}

.hot-tag {
  cursor: pointer;
  border-radius: 14px;
  padding: 0 10px;
  height: 24px;
  line-height: 22px;
  font-size: 12px;
  transition: all 0.2s;
}

.hot-tag:hover {
  background: #667eea;
  color: #fff;
  border-color: #667eea;
}

.panel-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  margin-bottom: 16px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.panel-body {
  padding: 16px;
}

.attachment-list {
  margin-top: 12px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 8px;
}

.attachment-item .file-name {
  flex: 1;
  font-size: 13px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-item .remove-btn {
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
}

.attachment-item .remove-btn:hover {
  color: #f56c6c;
}

.reward-info {
  margin-bottom: 12px;
}

.current-points {
  font-size: 13px;
  color: #666;
}

.reward-hint {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.tips-card .panel-body {
  padding: 12px 16px;
}

.tips-list {
  margin: 0;
  padding-left: 18px;
}

.tips-list li {
  font-size: 13px;
  color: #666;
  line-height: 2;
}

.editor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.footer-left {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.footer-right {
  display: flex;
  gap: 12px;
}

.footer-right .el-button--primary {
  padding: 12px 32px;
  border-radius: 24px;
  font-size: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.footer-right .el-button--primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

@media (max-width: 900px) {
  .editor-body {
    flex-direction: column;
  }

  .side-panel {
    width: 100%;
  }

  .create-post-page {
    padding: 12px;
  }

  .editor-header {
    padding: 16px 20px;
  }

  .editor-body {
    padding: 16px 20px;
  }

  .editor-footer {
    padding: 16px 20px;
    flex-direction: column;
    gap: 16px;
  }

  .footer-left {
    width: 100%;
  }

  .footer-right {
    width: 100%;
  }

  .footer-right .el-button {
    flex: 1;
  }
}
</style>
