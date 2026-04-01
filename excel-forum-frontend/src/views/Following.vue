<template>
  <div class="following-page">
    <div class="page-header">
      <h1>我的关注</h1>
      <p>查看你关注的用户和内容</p>
    </div>

    <el-tabs v-model="activeTab" class="following-tabs">
      <el-tab-pane label="关注的用户" name="users">
        <div class="user-list">
          <div v-if="followingUsers.length === 0" class="empty-state">
            <el-icon><User /></el-icon>
            <p>暂无关注的用户</p>
            <el-button type="primary" @click="$router.push('/')">去发现用户</el-button>
          </div>
          <div v-for="user in followingUsers" :key="user.id" class="user-card">
            <el-avatar :src="user.avatar" :size="56" class="user-avatar">
              {{ user.username?.charAt(0) }}
            </el-avatar>
            <div class="user-info">
              <h3>{{ user.username }}</h3>
              <p>{{ user.bio || '这个人很懒，什么都没写~' }}</p>
              <div class="user-stats">
                <span><el-icon><Document /></el-icon> {{ user.postCount }} 帖子</span>
                <span><el-icon><User /></el-icon> {{ user.followerCount }} 粉丝</span>
              </div>
            </div>
            <el-button 
              :type="user.isFollowing ? 'default' : 'primary'" 
              @click="toggleFollow(user)"
            >
              {{ user.isFollowing ? '已关注' : '关注' }}
            </el-button>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="关注的帖子" name="posts">
        <div class="post-list">
          <div v-if="followingPosts.length === 0" class="empty-state">
            <el-icon><Star /></el-icon>
            <p>暂无收藏的帖子</p>
            <el-button type="primary" @click="$router.push('/')">去发现帖子</el-button>
          </div>
          <div v-for="post in followingPosts" :key="post.id" class="post-card" @click="$router.push(`/post/${post.id}`)">
            <div class="post-content">
              <h3>{{ post.title }}</h3>
              <p>{{ post.summary }}</p>
            </div>
            <div class="post-meta">
              <div class="author-info">
                <el-avatar :src="post.author.avatar" :size="32">
                  {{ post.author.username?.charAt(0) }}
                </el-avatar>
                <span>{{ post.author.username }}</span>
              </div>
              <div class="post-stats">
                <span><el-icon><View /></el-icon> {{ post.views }}</span>
                <span><el-icon><ChatDotRound /></el-icon> {{ post.replyCount }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="关注的版块" name="forums">
        <div class="forum-list">
          <div v-if="followingForums.length === 0" class="empty-state">
            <el-icon><ChatDotRound /></el-icon>
            <p>暂无关注的版块</p>
            <el-button type="primary" @click="$router.push('/')">去发现版块</el-button>
          </div>
          <div v-for="forum in followingForums" :key="forum.id" class="forum-card" @click="$router.push(`/forum/${forum.id}`)">
            <div class="forum-icon">
              <el-icon><ChatDotRound /></el-icon>
            </div>
            <div class="forum-info">
              <h3>{{ forum.name }}</h3>
              <p>{{ forum.description }}</p>
              <div class="forum-stats">
                <span>{{ forum.postCount }} 帖子</span>
                <span>{{ forum.memberCount }} 成员</span>
              </div>
            </div>
            <el-button 
              :type="forum.isFollowing ? 'default' : 'primary'" 
              size="small"
              @click.stop="toggleForumFollow(forum)"
            >
              {{ forum.isFollowing ? '已关注' : '关注' }}
            </el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import { User, Star, Document, View, ChatDotRound } from '@element-plus/icons-vue'

const userStore = useUserStore()
const activeTab = ref('users')

const followingUsers = ref([])
const followingPosts = ref([])
const followingForums = ref([])

const toggleFollow = (user) => {
  user.isFollowing = !user.isFollowing
}

const toggleForumFollow = (forum) => {
  forum.isFollowing = !forum.isFollowing
}

onMounted(() => {
  followingUsers.value = [
    { id: 1, username: 'Excel大师', avatar: '', bio: '专注Excel教学10年', postCount: 128, followerCount: 2340, isFollowing: true },
    { id: 2, username: '数据分析师', avatar: '', bio: '数据驱动决策', postCount: 56, followerCount: 890, isFollowing: true },
    { id: 3, username: 'VBA专家', avatar: '', bio: '自动化解决方案', postCount: 89, followerCount: 1560, isFollowing: true }
  ]

  followingPosts.value = [
    { id: 1, title: 'VLOOKUP函数详解', summary: '详细介绍VLOOKUP函数的使用方法和技巧...', author: { username: 'Excel大师', avatar: '' }, views: 1234, replyCount: 23 },
    { id: 2, title: '数据透视表入门指南', summary: '从零开始学习数据透视表...', author: { username: '数据分析师', avatar: '' }, views: 892, replyCount: 15 }
  ]

  followingForums.value = [
    { id: 1, name: '函数公式', description: '讨论Excel函数和公式的使用技巧', postCount: 2340, memberCount: 5670, isFollowing: true },
    { id: 2, name: 'VBA编程', description: 'VBA宏编程交流', postCount: 890, memberCount: 2340, isFollowing: true }
  ]
})
</script>

<style scoped>
.following-page {
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

.following-tabs {
  background: white;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.1);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #95a5a6;
}

.empty-state .el-icon {
  font-size: 56px;
  margin-bottom: 16px;
  color: #bdc3c7;
}

.empty-state p {
  margin-bottom: 20px;
  font-size: 16px;
}

.user-list, .post-list, .forum-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #f8f9ff;
  border-radius: 16px;
  transition: all 0.3s ease;
}

.user-card:hover {
  background: #f0f2ff;
  transform: translateX(4px);
}

.user-avatar {
  margin-right: 16px;
  border: 3px solid #667eea;
}

.user-info {
  flex: 1;
}

.user-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.user-info p {
  font-size: 14px;
  color: #7f8c8d;
  margin-bottom: 8px;
}

.user-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #667eea;
}

.user-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.post-card {
  padding: 20px;
  background: #f8f9ff;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.post-card:hover {
  background: #f0f2ff;
  transform: translateX(4px);
}

.post-content h3 {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
}

.post-content p {
  font-size: 14px;
  color: #7f8c8d;
  margin-bottom: 12px;
  line-height: 1.5;
}

.post-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #667eea;
}

.post-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #95a5a6;
}

.post-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.forum-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #f8f9ff;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.forum-card:hover {
  background: #f0f2ff;
  transform: translateX(4px);
}

.forum-icon {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  flex-shrink: 0;
}

.forum-icon .el-icon {
  font-size: 24px;
  color: white;
}

.forum-info {
  flex: 1;
}

.forum-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.forum-info p {
  font-size: 14px;
  color: #7f8c8d;
  margin-bottom: 8px;
}

.forum-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #667eea;
}

@media (max-width: 768px) {
  .following-page {
    padding: 16px;
  }

  .user-card, .post-card, .forum-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
