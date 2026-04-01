<template>
  <div class="practice-page">
    <div class="page-header">
      <h1>小试牛刀</h1>
      <p>通过练习提升你的Excel技能</p>
    </div>
    
    <div class="practice-categories">
      <div 
        v-for="category in categories" 
        :key="category.id" 
        class="category-card"
        @click="selectCategory(category)"
      >
        <div class="category-icon">
          <el-icon><EditPen /></el-icon>
        </div>
        <div class="category-info">
          <h3>{{ category.name }}</h3>
          <p>{{ category.description }}</p>
          <div class="category-stats">
            <span><el-icon><Document /></el-icon> {{ category.count }} 道题目</span>
          </div>
        </div>
        <div class="category-arrow">
          <el-icon><ArrowRight /></el-icon>
        </div>
      </div>
    </div>

    <div class="practice-history" v-if="userStore.isAuthenticated">
      <h2>我的练习记录</h2>
      <div class="history-list">
        <div v-if="practiceHistory.length === 0" class="empty-state">
          <el-icon><DocumentCopy /></el-icon>
          <p>暂无练习记录，快去练习吧！</p>
        </div>
        <div v-for="record in practiceHistory" :key="record.id" class="history-item">
          <div class="record-info">
            <span class="record-title">{{ record.title }}</span>
            <span class="record-date">{{ record.date }}</span>
          </div>
          <div class="record-score">
            <el-progress 
              :percentage="record.score" 
              :color="getScoreColor(record.score)"
              :stroke-width="8"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import { EditPen, ArrowRight, Document, DocumentCopy } from '@element-plus/icons-vue'

const userStore = useUserStore()

const categories = ref([
  { id: 1, name: '基础公式', description: '学习常用的Excel公式和函数', count: 50 },
  { id: 2, name: '数据分析', description: '掌握数据透视表和数据分析技巧', count: 35 },
  { id: 3, name: '图表制作', description: '创建专业的数据可视化图表', count: 28 },
  { id: 4, name: '快捷键', description: '提高效率的键盘快捷操作', count: 42 },
  { id: 5, name: 'VBA编程', description: '自动化任务和宏编程', count: 30 },
  { id: 6, name: '高级技巧', description: '进阶Excel技巧和窍门', count: 45 }
])

const practiceHistory = ref([])

const selectCategory = (category) => {
  console.log('选择分类:', category.name)
}

const getScoreColor = (score) => {
  if (score >= 80) return '#67c23a'
  if (score >= 60) return '#e6a23c'
  return '#f56c6c'
}

onMounted(() => {
  if (userStore.isAuthenticated) {
    practiceHistory.value = [
      { id: 1, title: '基础公式测试', date: '2026-03-28', score: 85 },
      { id: 2, title: '数据分析练习', date: '2026-03-25', score: 72 },
      { id: 3, title: '图表制作挑战', date: '2026-03-20', score: 90 }
    ]
  }
})
</script>

<style scoped>
.practice-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
  padding: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24px;
  color: white;
}

.page-header h1 {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}

.page-header p {
  font-size: 16px;
  opacity: 0.9;
}

.practice-categories {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.category-card {
  display: flex;
  align-items: center;
  padding: 24px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.category-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.2);
  border-color: #667eea;
}

.category-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  flex-shrink: 0;
}

.category-icon .el-icon {
  font-size: 28px;
  color: white;
}

.category-info {
  flex: 1;
}

.category-info h3 {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 6px;
}

.category-info p {
  font-size: 14px;
  color: #7f8c8d;
  margin-bottom: 8px;
}

.category-stats {
  font-size: 13px;
  color: #667eea;
  display: flex;
  align-items: center;
  gap: 4px;
}

.category-arrow {
  color: #bdc3c7;
  transition: transform 0.3s ease;
}

.category-card:hover .category-arrow {
  transform: translateX(4px);
  color: #667eea;
}

.practice-history {
  background: white;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.1);
}

.practice-history h2 {
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f2ff;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #95a5a6;
}

.empty-state .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #f8f9ff;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.history-item:hover {
  background: #f0f2ff;
}

.record-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.record-title {
  font-weight: 600;
  color: #2c3e50;
}

.record-date {
  font-size: 13px;
  color: #95a5a6;
}

.record-score {
  width: 120px;
}

@media (max-width: 768px) {
  .practice-page {
    padding: 16px;
  }

  .practice-categories {
    grid-template-columns: 1fr;
  }

  .category-card {
    padding: 16px;
  }

  .category-icon {
    width: 50px;
    height: 50px;
  }
}
</style>
