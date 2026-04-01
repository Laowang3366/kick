<template>
  <div class="tiptap-editor">
    <div v-if="editor" class="toolbar">
      <el-button-group>
        <el-button :class="{ 'is-active': editor.isActive('bold') }" @click="editor.chain().focus().toggleBold().run()">
          B
        </el-button>
        <el-button :class="{ 'is-active': editor.isActive('italic') }" @click="editor.chain().focus().toggleItalic().run()">
          I
        </el-button>
        <el-button :class="{ 'is-active': editor.isActive('underline') }" @click="editor.chain().focus().toggleUnderline().run()">
          U
        </el-button>
        <el-button :class="{ 'is-active': editor.isActive('strike') }" @click="editor.chain().focus().toggleStrike().run()">
          S
        </el-button>
      </el-button-group>
      <el-button-group>
        <el-button :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }" @click="editor.chain().focus().toggleHeading({ level: 1 }).run()">
          H1
        </el-button>
        <el-button :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">
          H2
        </el-button>
        <el-button :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()">
          H3
        </el-button>
      </el-button-group>
      <el-button-group>
        <el-button :class="{ 'is-active': editor.isActive('bulletList') }" @click="editor.chain().focus().toggleBulletList().run()">
          •
        </el-button>
        <el-button :class="{ 'is-active': editor.isActive('orderedList') }" @click="editor.chain().focus().toggleOrderedList().run()">
          1.
        </el-button>
        <el-button :class="{ 'is-active': editor.isActive('blockquote') }" @click="editor.chain().focus().toggleBlockquote().run()">
          "
        </el-button>
      </el-button-group>
      <el-button-group>
        <el-button @click="addImage">
          img
        </el-button>
        <el-button @click="addLink">
          link
        </el-button>
        <el-button @click="addCodeBlock">
          code
        </el-button>
        <el-button @click="addTable">
          table
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
            <el-button>😊</el-button>
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
            <el-button @click="openMentionPicker">@</el-button>
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
      <el-button-group>
        <el-button @click="editor.chain().focus().undo().run()" :disabled="!editor.can().undo()">
          undo
        </el-button>
        <el-button @click="editor.chain().focus().redo().run()" :disabled="!editor.can().redo()">
          redo
        </el-button>
      </el-button-group>
    </div>
    <editor-content :editor="editor" class="editor-content" />
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, computed } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { common, createLowlight } from 'lowlight'
import { ElMessageBox } from 'element-plus'
import api from '../api'

const lowlight = createLowlight(common)

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '开始编写内容...'
  }
})

const emit = defineEmits(['update:modelValue'])

const showEmojiPicker = ref(false)
const showMentionPicker = ref(false)
const mentionSearch = ref('')
const mentionUsers = ref([])

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

const editor = useEditor({
  extensions: [
    StarterKit,
    Underline,
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
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  }
})

watch(() => props.modelValue, (value) => {
  if (editor.value && editor.value.getHTML() !== value) {
    editor.value.commands.setContent(value, false)
  }
})

const addImage = async () => {
  const { value: url } = await ElMessageBox.prompt('请输入图片URL', '插入图片', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /^https?:\/\/.+/,
    inputErrorMessage: '请输入有效的URL'
  })
  if (url) {
    editor.value.chain().focus().setImage({ src: url }).run()
  }
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
  editor.value.chain().focus().toggleCodeBlock().run()
}

const addTable = () => {
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

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})
</script>

<style scoped>
.tiptap-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 10px;
  border-bottom: 1px solid #dcdfe6;
  background-color: #f5f7fa;
}

.toolbar .el-button {
  padding: 5px 10px;
}

.toolbar .is-active {
  background-color: #409eff;
  color: white;
}

.editor-content {
  min-height: 300px;
  padding: 15px;
}

.editor-content :deep(.ProseMirror) {
  outline: none;
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
  border-left: 3px solid #409eff;
  padding-left: 1rem;
  margin-left: 0;
  color: #606266;
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
  background-color: #f8f9fa;
  font-weight: bold;
  text-align: left;
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
</style>