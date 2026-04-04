<template>
  <div class="tiptap-editor" :class="{ 'tiptap-editor--embedded': !toolbarVisible }">
    <input
      ref="imageInputRef"
      type="file"
      accept="image/png,image/jpeg"
      class="image-input"
      @change="handleImageFileChange"
    />
    <div v-if="editor && toolbarVisible" class="toolbar">
      <div class="toolbar-section">
        <span class="section-label">文字</span>
        <el-button-group>
          <el-button :class="{ 'is-active': editor.isActive('bold') }" @click="editor.chain().focus().toggleBold().run()">
            加粗
          </el-button>
          <el-button :class="{ 'is-active': editor.isActive('italic') }" @click="editor.chain().focus().toggleItalic().run()">
            斜体
          </el-button>
          <el-button :class="{ 'is-active': editor.isActive('underline') }" @click="editor.chain().focus().toggleUnderline().run()">
            下划线
          </el-button>
          <el-button :class="{ 'is-active': editor.isActive('strike') }" @click="editor.chain().focus().toggleStrike().run()">
            删除线
          </el-button>
        </el-button-group>
        <div class="toolbar-inline">
          <span class="toolbar-hint">颜色</span>
          <el-popover
            placement="bottom-start"
            :width="252"
            trigger="click"
            v-model:visible="showColorPicker"
          >
            <template #reference>
              <div class="picker-anchor" @mousedown.capture="captureSelection">
                <button type="button" class="color-trigger">
                  <span class="color-trigger-swatch" :style="{ backgroundColor: selectedTextColor }" />
                  <span class="color-trigger-label">选择颜色</span>
                </button>
              </div>
            </template>
            <div class="color-palette" @mousedown.prevent>
              <button
                v-for="color in textColorOptions"
                :key="color"
                type="button"
                class="color-chip"
                :class="{ 'is-active': normalizeColor(selectedTextColor) === normalizeColor(color) }"
                :style="{ backgroundColor: color }"
                @click="handlePresetColor(color)"
              />
              <label class="custom-color-field">
                <span>自定义</span>
                <input
                  :value="selectedTextColor"
                  type="color"
                  class="native-color-input"
                  @input="handleCustomColor"
                />
              </label>
            </div>
          </el-popover>
          <el-button text class="mini-action" @click="resetTextColor">默认</el-button>
        </div>
        <div class="toolbar-inline">
          <span class="toolbar-hint">字号</span>
          <el-button class="size-button" @click="adjustFontSize(-2)">A-</el-button>
          <div class="picker-anchor" @mousedown.capture="captureSelection">
            <el-select
              :model-value="selectedFontSize"
              size="small"
              class="font-size-select"
              @change="setFontSize"
            >
              <el-option
                v-for="size in fontSizeOptions"
                :key="size"
                :label="`${size}px`"
                :value="size"
              />
            </el-select>
          </div>
          <el-button class="size-button" @click="adjustFontSize(2)">A+</el-button>
        </div>
      </div>

      <div class="toolbar-section">
        <span class="section-label">结构</span>
        <el-button-group>
          <el-button :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }" @click="editor.chain().focus().toggleHeading({ level: 1 }).run()">
            一级标题
          </el-button>
          <el-button :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">
            二级标题
          </el-button>
          <el-button :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()">
            三级标题
          </el-button>
        </el-button-group>
        <el-button-group>
          <el-button :class="{ 'is-active': editor.isActive('bulletList') }" @click="editor.chain().focus().toggleBulletList().run()">
            无序列表
          </el-button>
          <el-button :class="{ 'is-active': editor.isActive('orderedList') }" @click="editor.chain().focus().toggleOrderedList().run()">
            有序列表
          </el-button>
          <el-button :class="{ 'is-active': editor.isActive('blockquote') }" @click="editor.chain().focus().toggleBlockquote().run()">
            引用
          </el-button>
        </el-button-group>
      </div>

      <div class="toolbar-section">
        <span class="section-label">排版</span>
        <el-button-group>
          <el-button :class="{ 'is-active': selectedTextAlign === 'left' }" @click="setTextAlign('left')">
            左对齐
          </el-button>
          <el-button :class="{ 'is-active': selectedTextAlign === 'center' }" @click="setTextAlign('center')">
            居中
          </el-button>
          <el-button :class="{ 'is-active': selectedTextAlign === 'right' }" @click="setTextAlign('right')">
            右对齐
          </el-button>
          <el-button :class="{ 'is-active': selectedTextAlign === 'justify' }" @click="setTextAlign('justify')">
            两端对齐
          </el-button>
        </el-button-group>
      </div>

      <div class="toolbar-section">
        <span class="section-label">插入</span>
        <el-button-group>
          <el-button @click="triggerImageUpload">
            插入图片
          </el-button>
          <el-button @click="addLink">
            插入链接
          </el-button>
          <el-button @click="addCodeBlock">
            代码块
          </el-button>
          <el-button @click="addTable">
            表格
          </el-button>
        </el-button-group>
        <el-button-group>
          <el-popover
            placement="bottom"
            :width="280"
            trigger="click"
            v-model:visible="showEmojiPicker"
          >
            <template #reference>
              <el-button>表情</el-button>
            </template>
            <div class="emoji-grid">
              <span 
                v-for="emoji in emojiList" 
                :key="emoji" 
                class="emoji-item"
                @click="insertEmoji(emoji)"
              >
                {{ emoji }}
              </span>
            </div>
          </el-popover>
          <el-popover
            placement="bottom"
            :width="250"
            trigger="click"
            v-model:visible="showMentionPicker"
          >
            <template #reference>
              <el-button @click="openMentionPicker">提及用户</el-button>
            </template>
            <div class="mention-list">
              <el-input 
                v-model="mentionSearch" 
                placeholder="搜索用户" 
                size="small"
                clearable
                class="mention-search"
              />
              <div class="mention-users">
                <div 
                  v-for="user in filteredMentionUsers" 
                  :key="user.id" 
                  class="mention-user-item"
                  @click="insertMention(user)"
                >
                  <el-avatar :src="user.avatar" :size="28">
                    {{ user.username?.charAt(0) }}
                  </el-avatar>
                  <span class="mention-username">{{ user.username }}</span>
                </div>
              </div>
            </div>
          </el-popover>
        </el-button-group>
      </div>

      <div class="toolbar-section toolbar-section-actions">
        <span class="section-label">操作</span>
        <el-button-group>
          <el-button @click="undoLastChange" :disabled="!canUndo">
            撤销
          </el-button>
          <el-button @click="clearAllContent" :disabled="isEditorEmpty">
            清空内容
          </el-button>
        </el-button-group>
      </div>
    </div>
    <editor-content :editor="editor" class="editor-content" />
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, computed } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { Extension } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Color from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { common, createLowlight } from 'lowlight'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const lowlight = createLowlight(common)
const DEFAULT_TEXT_COLOR = '#2f3a4d'
const DEFAULT_FONT_SIZE = 16
const fontSizeOptions = [12, 14, 16, 18, 20, 24, 28, 32]
const textColorOptions = ['#1f2937', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#111827']

const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle']
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize || null,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}`
              }
            }
          }
        }
      }
    ]
  },

  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize }).run()
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()
      }
    }
  }
})

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '开始编写内容...'
  },
  toolbarVisible: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'state-change'])

const showEmojiPicker = ref(false)
const showMentionPicker = ref(false)
const mentionSearch = ref('')
const mentionUsers = ref([])
const imageInputRef = ref(null)
const selectedTextColor = ref(DEFAULT_TEXT_COLOR)
const selectedFontSize = ref(DEFAULT_FONT_SIZE)
const selectedTextAlign = ref('left')
const savedSelection = ref(null)
const showColorPicker = ref(false)
const toolbarVisible = computed(() => props.toolbarVisible)

const emojiList = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
  '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛',
  '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
  '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔',
  '👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '🎉', '🎊', '🎁',
  '🔥', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '💕'
]

const filteredMentionUsers = computed(() => {
  if (!mentionSearch.value) {
    return mentionUsers.value.slice(0, 10)
  }
  return mentionUsers.value
    .filter(u => u.username.toLowerCase().includes(mentionSearch.value.toLowerCase()))
    .slice(0, 10)
})

const canUndo = computed(() => editor.value?.can().undo() ?? false)
const isEditorEmpty = computed(() => editor.value?.isEmpty ?? true)

const editor = useEditor({
  extensions: [
    StarterKit,
    Underline,
    TextStyle,
    Color,
    FontSize,
    TextAlign.configure({
      types: ['heading', 'paragraph']
    }),
    Image.configure({
      inline: true,
      allowBase64: true
    }),
    Link.configure({
      openOnClick: false
    }),
    CodeBlockLowlight.configure({
      lowlight
    }),
    Placeholder.configure({
      placeholder: props.placeholder
    }),
    Table.configure({
      resizable: true
    }),
    TableRow,
    TableCell,
    TableHeader
  ],
  content: props.modelValue,
  onCreate: () => {
    syncToolbarState()
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
    syncToolbarState()
  },
  onSelectionUpdate: () => {
    syncToolbarState()
  },
  onFocus: () => {
    emit('focus')
    syncToolbarState()
  },
  onBlur: () => {
    emit('blur')
  }
})

watch(() => props.modelValue, (value) => {
  if (editor.value && editor.value.getHTML() !== value) {
    editor.value.commands.setContent(value, false)
  }
})

const triggerImageUpload = () => {
  imageInputRef.value?.click()
}

const captureSelection = () => {
  if (!editor.value) {
    return
  }

  const { from, to } = editor.value.state.selection
  if (from !== to) {
    savedSelection.value = { from, to }
  }
}

const restoreSelection = () => {
  if (!editor.value || !savedSelection.value) {
    return
  }

  const { from, to } = savedSelection.value
  const { doc } = editor.value.state
  const maxPos = doc.content.size
  const safeFrom = Math.max(1, Math.min(from, maxPos))
  const safeTo = Math.max(1, Math.min(to, maxPos))

  editor.value
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      if (!dispatch) {
        return true
      }
      tr.setSelection(TextSelection.create(tr.doc, safeFrom, safeTo))
      dispatch(tr)
      return true
    })
    .run()
}

const runWithSelection = (command) => {
  if (!editor.value) {
    return
  }

  restoreSelection()
  command(editor.value.chain().focus()).run()
}

const normalizeColor = (color) => (color || '').toLowerCase()

const syncToolbarState = () => {
  if (!editor.value) {
    return
  }

  captureSelection()
  const textStyleAttrs = editor.value.getAttributes('textStyle')
  selectedTextColor.value = textStyleAttrs.color || DEFAULT_TEXT_COLOR
  selectedFontSize.value = parseInt(textStyleAttrs.fontSize || `${DEFAULT_FONT_SIZE}px`, 10) || DEFAULT_FONT_SIZE

  if (editor.value.isActive({ textAlign: 'center' })) {
    selectedTextAlign.value = 'center'
  } else if (editor.value.isActive({ textAlign: 'right' })) {
    selectedTextAlign.value = 'right'
  } else if (editor.value.isActive({ textAlign: 'justify' })) {
    selectedTextAlign.value = 'justify'
  } else {
    selectedTextAlign.value = 'left'
  }

  emit('state-change', {
    bold: editor.value.isActive('bold'),
    italic: editor.value.isActive('italic'),
    underline: editor.value.isActive('underline'),
    strike: editor.value.isActive('strike'),
    textAlign: selectedTextAlign.value,
    textColor: selectedTextColor.value,
    fontSize: selectedFontSize.value,
    canUndo: canUndo.value,
    isEmpty: isEditorEmpty.value
  })
}

const handleImageFileChange = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''

  if (!file) {
    return
  }

  const allowedTypes = ['image/png', 'image/jpeg']
  const isAllowed = allowedTypes.includes(file.type)
  const isLt20M = file.size / 1024 / 1024 < 20

  if (!isAllowed) {
    ElMessage.error('仅支持 PNG 或 JPG 图片')
    return
  }

  if (!isLt20M) {
    ElMessage.error('图片大小不能超过 20MB')
    return
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    if (response.url) {
      editor.value.chain().focus().setImage({ src: response.url }).run()
      ElMessage.success('图片上传成功')
      return
    }

    ElMessage.error('图片上传失败')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '图片上传失败')
  }
}

const applyTextColor = (color) => {
  if (!editor.value) {
    return
  }

  if (!color) {
    resetTextColor()
    return
  }

  selectedTextColor.value = color
  runWithSelection((chain) => chain.setColor(color))
}

const resetTextColor = () => {
  if (!editor.value) {
    return
  }

  selectedTextColor.value = DEFAULT_TEXT_COLOR
  showColorPicker.value = false
  runWithSelection((chain) => chain.unsetColor())
}

const handlePresetColor = (color) => {
  applyTextColor(color)
  showColorPicker.value = false
}

const handleCustomColor = (event) => {
  applyTextColor(event.target.value)
}

const setFontSize = (size) => {
  if (!editor.value) {
    return
  }

  selectedFontSize.value = size
  if (size === DEFAULT_FONT_SIZE) {
    runWithSelection((chain) => chain.unsetFontSize())
    return
  }

  runWithSelection((chain) => chain.setFontSize(`${size}px`))
}

const adjustFontSize = (step) => {
  const nextSize = Math.max(12, Math.min(32, selectedFontSize.value + step))
  setFontSize(nextSize)
}

const setTextAlign = (alignment) => {
  if (!editor.value) {
    return
  }

  selectedTextAlign.value = alignment
  editor.value.chain().focus().setTextAlign(alignment).run()
}

const findParentNodeByName = (name) => {
  if (!editor.value) {
    return null
  }

  const { $from } = editor.value.state.selection
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    if (node.type.name === name) {
      return node
    }
  }
  return null
}

const undoLastChange = () => {
  if (!editor.value || !canUndo.value) {
    return
  }

  editor.value.chain().focus().undo().run()
}

const clearAllContent = async () => {
  if (!editor.value || isEditorEmpty.value) {
    return
  }

  try {
    await ElMessageBox.confirm('确定要清空当前编辑内容吗？该操作会删除当前文本、图片和表格。', '清空内容', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  editor.value.chain().focus().clearContent(true).run()
  savedSelection.value = null
  showColorPicker.value = false
  showEmojiPicker.value = false
  showMentionPicker.value = false
  syncToolbarState()
  ElMessage.success('内容已清空')
}

const addLink = async () => {
  const { value: url } = await ElMessageBox.prompt('请输入链接URL', '插入链接', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /^https?:\/\/.+/,
    inputErrorMessage: '请输入有效的URL'
  })
  if (url) {
    editor.value.chain().focus().setLink({ href: url }).run()
  }
}

const addCodeBlock = () => {
  const currentCodeBlock = findParentNodeByName('codeBlock')
  if (currentCodeBlock && !currentCodeBlock.textContent.trim()) {
    ElMessage.warning('请先完成当前代码块内容')
    return
  }

  editor.value.chain().focus().toggleCodeBlock().run()
}

const addTable = () => {
  const currentTable = findParentNodeByName('table')
  if (currentTable && !currentTable.textContent.trim()) {
    ElMessage.warning('请先填写当前表格内容')
    return
  }

  editor.value.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
}

const insertEmoji = (emoji) => {
  editor.value.chain().focus().insertContent(emoji).run()
  showEmojiPicker.value = false
}

const openMentionPicker = async () => {
  mentionSearch.value = ''
  if (mentionUsers.value.length === 0) {
    try {
      const response = await api.get('/users/search', { params: { q: '' } })
      mentionUsers.value = response.users || []
    } catch (error) {
      console.error('获取用户列表失败:', error)
    }
  }
}

const insertMention = (user) => {
  const mention = `@${user.username} `
  editor.value.chain().focus().insertContent(mention).run()
  showMentionPicker.value = false
  mentionSearch.value = ''
}

const toggleBold = () => {
  editor.value?.chain().focus().toggleBold().run()
}

const toggleItalic = () => {
  editor.value?.chain().focus().toggleItalic().run()
}

const toggleUnderline = () => {
  editor.value?.chain().focus().toggleUnderline().run()
}

const toggleStrike = () => {
  editor.value?.chain().focus().toggleStrike().run()
}

const focusEditor = () => {
  editor.value?.chain().focus().run()
}

const getToolbarState = () => ({
  bold: editor.value?.isActive('bold') ?? false,
  italic: editor.value?.isActive('italic') ?? false,
  underline: editor.value?.isActive('underline') ?? false,
  strike: editor.value?.isActive('strike') ?? false,
  textAlign: selectedTextAlign.value,
  textColor: selectedTextColor.value,
  fontSize: selectedFontSize.value,
  canUndo: canUndo.value,
  isEmpty: isEditorEmpty.value
})

defineExpose({
  focusEditor,
  getToolbarState,
  toggleBold,
  toggleItalic,
  toggleUnderline,
  toggleStrike,
  applyTextColor,
  resetTextColor,
  setFontSize,
  adjustFontSize,
  setTextAlign,
  triggerImageUpload,
  addLink,
  addCodeBlock,
  addTable,
  undoLastChange,
  clearAllContent
})

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})
</script>

<style scoped>
.tiptap-editor {
  border: 1px solid #d7deea;
  border-radius: 18px;
  background:
    radial-gradient(circle at top left, rgba(102, 126, 234, 0.08), transparent 28%),
    linear-gradient(180deg, #fbfcff 0%, #ffffff 100%);
  box-shadow: 0 18px 40px rgba(51, 65, 85, 0.08);
  overflow: hidden;
}

.tiptap-editor--embedded {
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
  background:
    linear-gradient(135deg, rgba(248, 250, 255, 0.98), rgba(241, 245, 255, 0.95));
  align-items: center;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 20px rgba(148, 163, 184, 0.08);
}

.toolbar-section-actions {
  margin-left: auto;
}

.section-label {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.toolbar .el-button {
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  border-radius: 9px;
  border-color: #d7deea;
  color: #2f3a4d;
  background: #fff;
  font-weight: 500;
  font-size: 13px;
}

.toolbar .el-button:hover {
  color: #3157d5;
  border-color: #b9c8ff;
  background: #f5f8ff;
}

.toolbar .is-active {
  background: linear-gradient(135deg, #3157d5, #5877eb);
  border-color: transparent;
  color: #fff;
}

.toolbar-inline {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-hint {
  font-size: 12px;
  color: #475569;
}

.picker-anchor {
  display: flex;
  align-items: center;
}

.color-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 92px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid #d7deea;
  border-radius: 9px;
  background: #fff;
  color: #2f3a4d;
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-trigger:hover {
  color: #3157d5;
  border-color: #b9c8ff;
  background: #f5f8ff;
}

.color-trigger-swatch {
  width: 16px;
  height: 16px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45);
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
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.color-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.16);
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

.mini-action {
  min-width: auto !important;
  padding: 0 4px !important;
  height: auto !important;
}

.font-size-select {
  width: 76px;
}

.font-size-select :deep(.el-input__wrapper) {
  border-radius: 10px;
}

.size-button {
  min-width: 40px !important;
}

.editor-content {
  min-height: 340px;
  max-height: 520px;
  padding: 16px 18px;
  overflow-y: auto;
  overflow-x: hidden;
}

.editor-content :deep(.ProseMirror) {
  outline: none;
  min-height: 300px;
  color: #243042;
  font-size: 16px;
  line-height: 1.85;
}

.editor-content::-webkit-scrollbar {
  width: 8px;
}

.editor-content::-webkit-scrollbar-track {
  background: rgba(226, 232, 240, 0.7);
  border-radius: 999px;
}

.editor-content::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.9);
  border-radius: 999px;
}

.editor-content::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.95);
}

.editor-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: #adb5bd;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

.editor-content :deep(.ProseMirror img) {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  margin: 12px 0;
}

.editor-content :deep(.ProseMirror pre) {
  background-color: #282c34;
  color: #abb2bf;
  padding: 1rem;
  border-radius: 5px;
  overflow-x: auto;
}

.editor-content :deep(.ProseMirror code) {
  background-color: rgba(135, 131, 120, 0.15);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
}

.editor-content :deep(.ProseMirror blockquote) {
  border-left: 4px solid #3157d5;
  padding-left: 1rem;
  margin-left: 0;
  color: #475569;
  background: rgba(49, 87, 213, 0.05);
  border-radius: 0 10px 10px 0;
  padding-top: 10px;
  padding-bottom: 10px;
}

.editor-content :deep(.ProseMirror table) {
  border-collapse: collapse;
  margin: 0;
  overflow: hidden;
  table-layout: fixed;
  width: 100%;
}

.editor-content :deep(.ProseMirror td),
.editor-content :deep(.ProseMirror th) {
  border: 2px solid #ced4da;
  box-sizing: border-box;
  min-width: 1em;
  padding: 5px 10px;
  position: relative;
  vertical-align: top;
}

.editor-content :deep(.ProseMirror th) {
  background-color: #eef3ff;
  font-weight: bold;
  text-align: left;
}

.editor-content :deep(.ProseMirror h1) {
  font-size: 30px;
  line-height: 1.3;
  margin: 1.2em 0 0.6em;
}

.editor-content :deep(.ProseMirror h2) {
  font-size: 24px;
  line-height: 1.35;
  margin: 1.1em 0 0.55em;
}

.editor-content :deep(.ProseMirror h3) {
  font-size: 20px;
  line-height: 1.4;
  margin: 1em 0 0.5em;
}

.editor-content :deep(.ProseMirror p) {
  margin: 0.8em 0;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.emoji-item {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 6px;
  font-size: 18px;
  transition: all 0.2s ease;
}

.emoji-item:hover {
  background: #f0f2ff;
  transform: scale(1.2);
}

.mention-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mention-search {
  margin-bottom: 8px;
}

.mention-users {
  max-height: 200px;
  overflow-y: auto;
}

.mention-user-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.mention-user-item:hover {
  background: #f0f2ff;
}

.mention-username {
  font-size: 14px;
  color: #2c3e50;
}

.image-input {
  display: none;
}

@media (max-width: 960px) {
  .toolbar {
    padding: 12px;
    gap: 10px;
  }

  .toolbar-section {
    width: 100%;
    flex-wrap: wrap;
  }

  .toolbar-section-actions {
    margin-left: 0;
  }
}
</style>
