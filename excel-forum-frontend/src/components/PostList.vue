<template>
  <div class="post-list">
    <div v-if="loading" class="loading">
      <el-skeleton :rows="5" animated />
    </div>
    <div v-else-if="posts.length === 0" class="empty">
      <el-empty description="暂无帖子" />
    </div>
    <div v-else class="posts-container">
      <div v-for="post in posts" :key="post.id" class="post-item" @click="$router.push(`/post/${post.id}`)">
        <div class="post-left">
          <LevelTag 
            v-if="post.author?.role === 'admin' || post.author?.role === 'ADMIN'" 
            :level="post.author?.level" 
            :points="post.author?.points" 
            :role="post.author?.role"
            :show-level="false"
            class="admin-tag-above"
          />
          <div class="author-avatar-wrapper">
            <el-avatar :src="post.author?.avatar" :size="52">
              {{ post.author?.username?.charAt(0) }}
            </el-avatar>
          </div>
          <span class="author-name" @click.stop="$router.push(`/user/${post.author?.id}`)">
            {{ post.author?.username }}
          </span>
          <LevelTag 
            v-if="post.author?.level" 
            :level="post.author?.level" 
            :points="post.author?.points" 
            :role="post.author?.role"
            :show-admin="false"
          />
        </div>
        <div class="post-center">
          <div class="post-header">
            <div class="title-section">
              <span class="section-label title-label">主题</span>
              <div class="title-row">
                <el-tag v-if="post.isTop" type="danger" size="small" class="status-tag">置顶</el-tag>
                <el-tag v-if="post.isEssence" type="success" size="small" class="status-tag">精华</el-tag>
                <h3 class="post-title">{{ post.title }}</h3>
              </div>
            </div>
            <div class="summary-section">
              <span class="section-label summary-label">内容摘要</span>
              <div class="summary-box">
                <p class="post-summary">{{ getSummary(post.content) }}</p>
              </div>
            </div>
          </div>
          <div class="post-footer">
            <div class="post-meta">
              <span class="time">{{ formatTime(post.createTime) }}</span>
              <span class="separator">·</span>
              <span class="forum-name">{{ post.category?.name }}</span>
            </div>
            <div class="post-stats">
              <span class="stat-item">
                <el-icon><View /></el-icon>
                {{ post.viewCount || 0 }}
              </span>
              <span class="stat-item">
                <el-icon><ChatDotRound /></el-icon>
                {{ post.replyCount || 0 }}
              </span>
              <span class="stat-item">
                <el-icon><Star /></el-icon>
                {{ post.likeCount || 0 }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ChatDotRound, View, Star } from '@element-plus/icons-vue'
import LevelTag from './LevelTag.vue'

const props = defineProps({
  posts: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const formatTime = (time) => {
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString()
}

const getSummary = (content) => {
  if (!content) return ''
  let text = content.replace(/<[^>]*>/g, '').replace(/!\[.*?\]\(.*?\)/g, '').replace(/\n/g, ' ').trim()
  if (text.length > 15) {
    text = text.substring(0, 15) + '...'
  }
  return text || '暂无内容摘要'
}
</script>

<style scoped>
.post-list {
  width: 100%;
}

.loading,
.empty {
  padding: 20px;
}

.posts-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.post-item {
  display: flex;
  gap: 18px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #ffffff 0%, #fafbff 100%);
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid rgba(102, 126, 234, 0.1);
  box-shadow: 0 2px 12px rgba(102, 126, 234, 0.06);
  position: relative;
  overflow: hidden;
}

.post-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.post-item:hover {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border-color: rgba(102, 126, 234, 0.3);
  transform: translateX(6px);
  box-shadow: 0 6px 24px rgba(102, 126, 234, 0.15);
}

.post-item:hover::before {
  opacity: 1;
}

.post-left {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 110px;
  padding: 12px 8px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
  border-radius: 14px;
  border: 1px solid rgba(102, 126, 234, 0.08);
  margin-right: 12px;
}

.admin-tag-above {
  margin-bottom: 4px;
}

.author-avatar-wrapper .el-avatar {
  border: 3px solid rgba(102, 126, 234, 0.15);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  transition: all 0.3s ease;
}

.post-item:hover .author-avatar-wrapper .el-avatar {
  border-color: #667eea;
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.25);
}

.author-name {
  font-size: 13px;
  font-weight: 600;
  color: #667eea;
  cursor: pointer;
  transition: color 0.3s ease;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 4px;
}

.author-name:hover {
  color: #764ba2;
}

.post-center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.post-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.title-section,
.summary-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.title-label {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
  color: #667eea;
  border-left: 3px solid #667eea;
}

.summary-label {
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.12) 0%, rgba(76, 175, 80, 0.12) 100%);
  color: #67c23a;
  border-left: 3px solid #67c23a;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.status-tag {
  flex-shrink: 0;
  font-weight: 600;
  border-radius: 6px;
}

.post-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #2c3e50;
  line-height: 1.4;
  transition: color 0.3s ease;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-item:hover .post-title {
  color: #667eea;
}

.summary-box {
  background: rgba(102, 126, 234, 0.03);
  border: 1px solid rgba(102, 126, 234, 0.06);
  border-radius: 8px;
  padding: 8px 12px;
}

.post-summary {
  margin: 0;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.post-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid rgba(102, 126, 234, 0.08);
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.separator {
  color: #ccc;
  font-size: 12px;
}

.time {
  font-size: 13px;
  color: #999;
}

.forum-name {
  font-size: 13px;
  color: #999;
  background: rgba(102, 126, 234, 0.08);
  padding: 2px 10px;
  border-radius: 10px;
}

.post-stats {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #888;
  transition: color 0.3s ease;
}

.stat-item .el-icon {
  font-size: 15px;
}

.stat-item:hover {
  color: #667eea;
}

@media (max-width: 768px) {
  .post-item {
    padding: 16px 18px;
    gap: 14px;
    border-radius: 14px;
  }

  .post-left {
    width: 85px;
    padding: 8px 6px;
  }

  .author-avatar-wrapper .el-avatar {
    width: 44px;
    height: 44px;
  }

  .section-label {
    font-size: 11px;
    padding: 2px 8px;
  }

  .post-title {
    font-size: 15px;
  }

  .post-summary {
    font-size: 13px;
  }

  .author-name {
    font-size: 12px;
  }

  .time,
  .forum-name {
    font-size: 12px;
  }

  .post-stats {
    gap: 12px;
  }

  .stat-item {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .post-item {
    padding: 14px 16px;
    gap: 12px;
    border-radius: 12px;
  }

  .post-left {
    width: 70px;
    padding: 6px 4px;
  }

  .author-avatar-wrapper .el-avatar {
    width: 40px;
    height: 40px;
  }

  .section-label {
    font-size: 10px;
    padding: 2px 6px;
  }

  .post-title {
    font-size: 14px;
  }

  .post-summary {
    font-size: 12px;
  }

  .post-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .post-stats {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
