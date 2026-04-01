<template>
  <el-upload
    class="file-upload"
    drag
    action="/api/upload"
    :headers="headers"
    :on-success="handleSuccess"
    :on-error="handleError"
    :before-upload="beforeUpload"
    :accept="acceptTypes"
    multiple
  >
    <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
    <div class="el-upload__text">
      将文件拖到此处，或<em>点击上传</em>
    </div>
    <template #tip>
      <div class="el-upload__tip">
        支持 {{ acceptTypes.replace(/\./g, '').toUpperCase() }} 格式，单个文件不超过 20MB
      </div>
    </template>
  </el-upload>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'

const emit = defineEmits(['success', 'error'])

const acceptTypes = '.xlsx,.xlsm,.xls,.pdf,.png,.jpg,.jpeg'

const headers = computed(() => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})

const beforeUpload = (file) => {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/pdf',
    'image/png',
    'image/jpeg'
  ]
  
  const isAllowed = allowedTypes.includes(file.type)
  const isLt20M = file.size / 1024 / 1024 < 20

  if (!isAllowed) {
    ElMessage.error('不支持的文件类型')
    return false
  }
  if (!isLt20M) {
    ElMessage.error('文件大小不能超过 20MB')
    return false
  }
  return true
}

const handleSuccess = (response, file) => {
  ElMessage.success('上传成功')
  emit('success', {
    name: file.name,
    url: response.url,
    type: file.type
  })
}

const handleError = () => {
  ElMessage.error('上传失败')
  emit('error')
}
</script>

<style scoped>
.file-upload {
  width: 100%;
}

.file-upload :deep(.el-upload-dragger) {
  width: 100%;
}
</style>