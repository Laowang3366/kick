<template>
  <div class="create-post-page">
    <div class="post-editor-container">
      <div class="editor-header">
        <el-button @click="$router.back()" class="back-btn" circle>
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <h1 class="editor-title">{{ isEdit ? '编辑帖子' : '发布新帖' }}</h1>
        <div class="editor-actions">
        </div>
      </div>

      <div class="editor-body">
        <div class="main-editor">
          <div class="title-input-wrapper">
            <input
              v-model="form.title"
              type="text"
              class="title-input"
              placeholder="请输入标题（5-100字）"
              maxlength="100"
            />
            <span class="title-count">{{ form.title.length }}/100</span>
          </div>

          <div class="forum-selector">
            <span class="selector-label">发布到：</span>
            <el-select
              v-model="form.forumId"
              placeholder="选择版块"
              class="forum-select"
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

          <div class="content-editor">
            <TiptapEditor v-model="form.content" placeholder="分享你的Excel技巧、问题或经验..." />
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
          <el-checkbox v-model="saveDraft">保存草稿</el-checkbox>
        </div>
        <div class="footer-right">
          <el-button @click="previewPost" :disabled="!canPreview">
            <el-icon><View /></el-icon>
            预览
          </el-button>
          <el-button type="primary" @click="submitForm" :loading="submitting" size="large">
            <el-icon><Position /></el-icon>
            {{ isEdit ? '保存修改' : '发布帖子' }}
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import TiptapEditor from '../components/TiptapEditor.vue'
import FileUpload from '../components/FileUpload.vue'
import api from '../api'
import { ElMessage } from 'element-plus'
import { 
  ArrowLeft, Upload, Document, Close, Coin, InfoFilled, View, Position 
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const submitting = ref(false)
const forums = ref([])
const commonTags = ref(['VBA', 'Power Query', '函数公式', '图表', '数据透视表', '条件格式', '宏', 'SQL', 'M语言', '求助', '分享', '教程'])
const showTagInput = ref(false)
const newTag = ref('')
const tagInputRef = ref(null)
const saveDraft = ref(false)

const isEdit = computed(() => !!route.params.id)

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

const fetchForums = async () => {
  try {
    const response = await api.get('/categories')
    forums.value = response
  } catch (error) {
    console.error('获取版块列表失败:', error)
  }
}

const fetchPost = async () => {
  if (!isEdit.value) return
  try {
    const response = await api.get(`/posts/${route.params.id}`)
    const post = response.post
    form.title = post.title
    form.forumId = post.forumId || post.categoryId
    
    if (post.tags) {
      try {
        form.tags = typeof post.tags === 'string' 
          ? JSON.parse(post.tags) 
          : (Array.isArray(post.tags) ? post.tags : [])
      } catch (e) {
        form.tags = []
      }
    } else {
      form.tags = []
    }
    
    form.content = post.content
    if (post.attachments) {
      try {
        form.attachments = typeof post.attachments === 'string' 
          ? JSON.parse(post.attachments) 
          : post.attachments
      } catch (e) {
        form.attachments = []
      }
    }
  } catch (error) {
    console.error('获取帖子信息失败:', error)
    ElMessage.error('获取帖子信息失败')
    router.back()
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
    const data = {
      title: form.title,
      forumId: form.forumId,
      tags: form.tags,
      content: form.content,
      attachments: form.attachments
    }
    if (!isEdit.value) {
      data.rewardPoints = form.rewardPoints
      const response = await api.post('/posts', data)
      ElMessage.success('发布成功！帖子已提交')
      if (response.id) {
        router.push(`/post/${response.id}`)
      } else {
        router.push('/')
      }
    } else {
      await api.put(`/posts/${route.params.id}`, data)
      ElMessage.success('修改成功！')
      router.push(`/post/${route.params.id}`)
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchForums()
  fetchPost()
})
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
  gap: 12px;
}

.editor-actions .el-button {
  color: rgba(255, 255, 255, 0.9);
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

.side-panel {
  width: 300px;
  flex-shrink: 0;
}

.title-input-wrapper {
  position: relative;
  margin-bottom: 20px;
}

.title-input {
  width: 100%;
  padding: 16px 20px;
  padding-right: 80px;
  font-size: 20px;
  font-weight: 500;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  outline: none;
  transition: all 0.3s;
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

.forum-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.selector-label {
  font-size: 14px;
  color: #666;
  white-space: nowrap;
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
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.3s;
}

.content-editor:focus-within {
  border-color: #667eea;
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
