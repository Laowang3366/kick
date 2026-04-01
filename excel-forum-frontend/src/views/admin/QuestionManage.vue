<template>
  <div class="page-management">
    <el-card class="management-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">题目管理</span>
          <div class="header-actions">
            <el-select v-model="typeFilter" placeholder="题目类型" clearable style="width: 120px" @change="fetchQuestions">
              <el-option label="单选题" value="single" />
              <el-option label="多选题" value="multiple" />
              <el-option label="判断题" value="judge" />
              <el-option label="填空题" value="fill" />
            </el-select>
            <el-select v-model="categoryFilter" placeholder="题目分类" clearable style="width: 140px" @change="fetchQuestions">
              <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
            </el-select>
            <el-button type="primary" class="action-button" @click="showAddDialog">
              <el-icon><Plus /></el-icon>
              新增题目
            </el-button>
            <el-button class="action-button" @click="fetchQuestions">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="questions" style="width: 100%" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="title" label="题目内容" min-width="250" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="question-title" @click="previewQuestion(row)">{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)" size="small">
              {{ getTypeName(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            <el-tag effect="plain" size="small">{{ getCategoryName(row.categoryId) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="difficulty" label="难度" width="80">
          <template #default="{ row }">
            <div class="difficulty-stars">
              <el-icon v-for="i in row.difficulty" :key="i" class="star"><Star /></el-icon>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="points" label="分值" width="70" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" @change="toggleQuestion(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" @click="editQuestion(row)" class="action-btn">
                编辑
              </el-button>
              <el-button type="info" size="small" plain @click="previewQuestion(row)" class="action-btn">
                预览
              </el-button>
              <el-button type="danger" size="small" @click="deleteQuestion(row)" class="action-btn">
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container" v-if="totalQuestions > 10">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="10"
          :total="totalQuestions"
          layout="prev, pager, next, total"
          @current-change="fetchQuestions"
          background
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingQuestion ? '编辑题目' : '新增题目'" width="700px" class="question-dialog">
      <el-form :model="form" label-width="80px">
        <el-form-item label="题目类型">
          <el-select v-model="form.type" style="width: 200px" @change="onTypeChange">
            <el-option label="单选题" value="single" />
            <el-option label="多选题" value="multiple" />
            <el-option label="判断题" value="judge" />
            <el-option label="填空题" value="fill" />
          </el-select>
        </el-form-item>
        <el-form-item label="题目分类">
          <el-select v-model="form.categoryId" style="width: 200px" placeholder="选择分类">
            <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="题目内容">
          <el-input v-model="form.title" type="textarea" :rows="3" placeholder="请输入题目内容" />
        </el-form-item>
        
        <template v-if="form.type === 'single' || form.type === 'multiple'">
          <el-form-item label="选项">
            <div class="options-list">
              <div v-for="(option, index) in form.options" :key="index" class="option-item">
                <span class="option-label">{{ String.fromCharCode(65 + index) }}.</span>
                <el-input v-model="form.options[index]" placeholder="请输入选项内容" />
                <el-button v-if="form.options.length > 2" type="danger" :icon="Delete" circle size="small" @click="removeOption(index)" />
              </div>
              <el-button v-if="form.options.length < 6" type="primary" plain size="small" @click="addOption">
                <el-icon><Plus /></el-icon>
                添加选项
              </el-button>
            </div>
          </el-form-item>
          <el-form-item label="正确答案">
            <el-checkbox-group v-if="form.type === 'multiple'" v-model="form.answer">
              <el-checkbox v-for="(option, index) in form.options" :key="index" :label="String.fromCharCode(65 + index)">
                {{ String.fromCharCode(65 + index) }}
              </el-checkbox>
            </el-checkbox-group>
            <el-radio-group v-else v-model="form.answer">
              <el-radio v-for="(option, index) in form.options" :key="index" :label="String.fromCharCode(65 + index)">
                {{ String.fromCharCode(65 + index) }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </template>

        <template v-if="form.type === 'judge'">
          <el-form-item label="正确答案">
            <el-radio-group v-model="form.answer">
              <el-radio label="true">正确</el-radio>
              <el-radio label="false">错误</el-radio>
            </el-radio-group>
          </el-form-item>
        </template>

        <template v-if="form.type === 'fill'">
          <el-form-item label="正确答案">
            <el-input v-model="form.answer" placeholder="请输入正确答案" />
            <div class="form-tip">多个答案用 | 分隔，如：答案1|答案2</div>
          </el-form-item>
        </template>

        <el-form-item label="难度">
          <el-rate v-model="form.difficulty" :max="5" />
        </el-form-item>
        <el-form-item label="分值">
          <el-input-number v-model="form.points" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="解析">
          <el-input v-model="form.explanation" type="textarea" :rows="2" placeholder="请输入答案解析（选填）" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveQuestion">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="previewVisible" title="题目预览" width="600px">
      <div class="preview-content" v-if="previewData">
        <div class="preview-header">
          <el-tag :type="getTypeTag(previewData.type)">{{ getTypeName(previewData.type) }}</el-tag>
          <el-tag effect="plain">{{ getCategoryName(previewData.categoryId) }}</el-tag>
          <div class="difficulty-stars">
            <el-icon v-for="i in previewData.difficulty" :key="i" class="star"><Star /></el-icon>
          </div>
          <span class="preview-points">{{ previewData.points }}分</span>
        </div>
        <h3 class="preview-title">{{ previewData.title }}</h3>
        
        <div v-if="previewData.type === 'single' || previewData.type === 'multiple'" class="preview-options">
          <div v-for="(option, index) in previewData.options" :key="index" class="preview-option">
            <span class="option-label">{{ String.fromCharCode(65 + index) }}.</span>
            <span>{{ option }}</span>
            <el-icon v-if="isCorrectAnswer(previewData, index)" class="correct-icon"><Check /></el-icon>
          </div>
        </div>

        <div v-if="previewData.type === 'judge'" class="preview-judge">
          <el-tag :type="previewData.answer === 'true' ? 'success' : 'danger'">
            {{ previewData.answer === 'true' ? '正确' : '错误' }}
          </el-tag>
        </div>

        <div v-if="previewData.type === 'fill'" class="preview-fill">
          <span class="answer-label">正确答案：</span>
          <span class="answer-text">{{ previewData.answer }}</span>
        </div>

        <div v-if="previewData.explanation" class="preview-explanation">
          <div class="explanation-label">解析：</div>
          <div class="explanation-text">{{ previewData.explanation }}</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Delete, Star, Check } from '@element-plus/icons-vue'

const questions = ref([])
const categories = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const previewVisible = ref(false)
const editingQuestion = ref(null)
const previewData = ref(null)
const currentPage = ref(1)
const totalQuestions = ref(0)
const typeFilter = ref('')
const categoryFilter = ref('')

const form = reactive({
  type: 'single',
  categoryId: null,
  title: '',
  options: ['', '', '', ''],
  answer: '',
  difficulty: 3,
  points: 10,
  explanation: '',
  enabled: true
})

const getTypeTag = (type) => {
  const tags = { single: 'primary', multiple: 'success', judge: 'warning', fill: 'info' }
  return tags[type] || 'info'
}

const getTypeName = (type) => {
  const names = { single: '单选题', multiple: '多选题', judge: '判断题', fill: '填空题' }
  return names[type] || '未知'
}

const getCategoryName = (categoryId) => {
  const cat = categories.value.find(c => c.id === categoryId)
  return cat ? cat.name : '未分类'
}

const isCorrectAnswer = (question, index) => {
  const letter = String.fromCharCode(65 + index)
  if (question.type === 'multiple') {
    return question.answer.includes(letter)
  }
  return question.answer === letter
}

const fetchCategories = async () => {
  try {
    const response = await api.get('/categories')
    categories.value = response || []
  } catch (error) {
    console.error('获取分类失败:', error)
  }
}

const fetchQuestions = async () => {
  loading.value = true
  try {
    const params = { page: currentPage.value, size: 10 }
    if (typeFilter.value) params.type = typeFilter.value
    if (categoryFilter.value) params.categoryId = categoryFilter.value
    
    const response = await api.get('/admin/questions', { params })
    questions.value = response.records || response.questions || []
    totalQuestions.value = response.total || 0
  } catch (error) {
    console.error('获取题目列表失败:', error)
    ElMessage.error('获取题目列表失败')
  } finally {
    loading.value = false
  }
}

const showAddDialog = () => {
  editingQuestion.value = null
  Object.assign(form, {
    type: 'single',
    categoryId: null,
    title: '',
    options: ['', '', '', ''],
    answer: '',
    difficulty: 3,
    points: 10,
    explanation: '',
    enabled: true
  })
  dialogVisible.value = true
}

const editQuestion = (question) => {
  editingQuestion.value = question
  Object.assign(form, {
    ...question,
    answer: question.type === 'multiple' ? JSON.parse(question.answer) : question.answer,
    options: question.options ? JSON.parse(question.options) : ['', '', '', '']
  })
  dialogVisible.value = true
}

const onTypeChange = (type) => {
  if (type === 'judge') {
    form.answer = 'true'
    form.options = []
  } else if (type === 'fill') {
    form.answer = ''
    form.options = []
  } else {
    form.answer = type === 'multiple' ? [] : ''
    form.options = ['', '', '', '']
  }
}

const addOption = () => {
  if (form.options.length < 6) {
    form.options.push('')
  }
}

const removeOption = (index) => {
  form.options.splice(index, 1)
}

const saveQuestion = async () => {
  if (!form.title) {
    ElMessage.warning('请输入题目内容')
    return
  }
  
  try {
    const data = {
      ...form,
      answer: form.type === 'multiple' ? JSON.stringify(form.answer) : form.answer,
      options: (form.type === 'single' || form.type === 'multiple') ? JSON.stringify(form.options) : null
    }
    
    if (editingQuestion.value) {
      await api.put(`/admin/questions/${editingQuestion.value.id}`, data)
      ElMessage.success('更新成功')
    } else {
      await api.post('/admin/questions', data)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchQuestions()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const toggleQuestion = async (question) => {
  try {
    await api.put(`/admin/questions/${question.id}`, { enabled: question.enabled })
    ElMessage.success(question.enabled ? '已启用' : '已禁用')
  } catch (error) {
    question.enabled = !question.enabled
    ElMessage.error('操作失败')
  }
}

const deleteQuestion = async (question) => {
  await ElMessageBox.confirm(`确定删除该题目吗？`, '删除确认', { type: 'warning' })
  
  try {
    await api.delete(`/admin/questions/${question.id}`)
    ElMessage.success('删除成功')
    fetchQuestions()
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

const previewQuestion = (question) => {
  previewData.value = {
    ...question,
    options: question.options ? JSON.parse(question.options) : [],
    answer: question.type === 'multiple' ? JSON.parse(question.answer) : question.answer
  }
  previewVisible.value = true
}

onMounted(() => {
  fetchCategories()
  fetchQuestions()
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

.question-title {
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
}

.question-title:hover {
  color: var(--primary-color);
}

.difficulty-stars {
  display: flex;
  gap: 2px;
}

.star {
  color: #f7ba2a;
  font-size: 14px;
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

.options-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.option-label {
  width: 24px;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-tip {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.preview-content {
  padding: 10px;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.preview-points {
  font-weight: 600;
  color: var(--text-secondary);
}

.preview-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.preview-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.correct-icon {
  color: #67c23a;
  margin-left: auto;
}

.preview-judge,
.preview-fill {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.answer-label {
  font-weight: 600;
  color: var(--text-secondary);
}

.answer-text {
  color: #67c23a;
  font-weight: 600;
}

.preview-explanation {
  margin-top: 20px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border-left: 4px solid var(--primary-color);
}

.explanation-label {
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.explanation-text {
  color: var(--text-primary);
  line-height: 1.6;
}
</style>
