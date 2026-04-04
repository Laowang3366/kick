<template>
  <div class="level-wrapper">
    <el-tag v-if="isAdmin && showAdmin" type="danger" size="small" class="admin-tag">
      <el-icon><Star /></el-icon>
      管理员
    </el-tag>
    <el-tag v-if="showLevel" :type="tagType" size="small" class="level-tag">
      Lv.{{ level }} {{ levelName }}
    </el-tag>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Star } from '@element-plus/icons-vue'

const props = defineProps({
  level: {
    type: Number,
    default: 1
  },
  points: {
    type: Number,
    default: 0
  },
  role: {
    type: String,
    default: ''
  },
  showAdmin: {
    type: Boolean,
    default: true
  },
  showLevel: {
    type: Boolean,
    default: true
  }
})

const isAdmin = computed(() => {
  return props.role === 'admin' || props.role === 'ADMIN'
})

const levelName = computed(() => {
  const levelMap = {
    1: '新手',
    2: '入门',
    3: '熟练',
    4: '专家',
    5: '大师',
    6: '传说'
  }
  return levelMap[props.level] || '新手'
})

const tagType = computed(() => {
  if (!props.level) return 'info'
  if (props.level >= 6) return 'danger'
  if (props.level >= 4) return 'warning'
  if (props.level >= 2) return 'success'
  return 'info'
})
</script>

<style scoped>
.level-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.admin-tag {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.admin-tag .el-icon {
  font-size: 12px;
}

.level-tag {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 500;
}
</style>
