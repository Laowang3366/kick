<template>
  <div class="forum-page">
    <el-card class="forum-info">
      <div v-if="loading" class="loading">
        <el-skeleton :rows="3" animated />
      </div>
      <div v-else-if="forum">
        <div class="forum-header">
          <h2>{{ forum.name }}</h2>
          <el-button v-if="userStore.isAuthenticated" type="primary" @click="$router.push('/post/create')">
            发布新帖
          </el-button>
        </div>
        <p class="forum-desc">{{ forum.description }}</p>
        <div class="forum-stats">
          <span>帖子数：{{ forum.postCount }}</span>
          <span>回复数：{{ forum.replyCount }}</span>
          <span>版主：{{ forum.moderators?.map(m => m.username).join(', ') || '无' }}</span>
        </div>
      </div>
    </el-card>

    <el-card class="post-list-card">
      <template #header>
        <div class="list-header">
          <span class="list-title">帖子列表</span>
          <div class="sort-options">
            <el-radio-group v-model="sortBy" size="small" @change="fetchPosts">
              <el-radio-button value="latest">最新</el-radio-button>
              <el-radio-button value="hot">最热</el-radio-button>
              <el-radio-button value="essence">精华</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>
      <PostList :posts="posts" :loading="postsLoading" />
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="10"
          :total="totalPosts"
          layout="prev, pager, next"
          @current-change="fetchPosts"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useForumEvents } from '../composables/useForumEvents'
import PostList from '../components/PostList.vue'
import api from '../api'

const route = useRoute()
const userStore = useUserStore()

const forum = ref(null)
const posts = ref([])
const loading = ref(false)
const postsLoading = ref(false)
const sortBy = ref('latest')
const currentPage = ref(1)
const totalPosts = ref(0)

const fetchForum = async () => {
  loading.value = true
  try {
    const response = await api.get(`/categories/${route.params.id}`)
    forum.value = response
  } catch (error) {
    console.error('获取版块信息失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchPosts = async () => {
  postsLoading.value = true
  try {
    const response = await api.get(`/posts`, {
      params: {
        page: currentPage.value,
        limit: 10,
        sort: sortBy.value,
        categoryId: route.params.id
      }
    })
    posts.value = response.records
    totalPosts.value = response.total
  } catch (error) {
    console.error('获取帖子列表失败:', error)
  } finally {
    postsLoading.value = false
  }
}

useForumEvents((event) => {
  console.log('Received forum event:', event)
  if (event.type === 'POST_UPDATED' || event.type === 'POST_DELETED') {
    fetchPosts()
  }
  if (event.type === 'CATEGORY_UPDATED' && event.targetId === Number(route.params.id)) {
    fetchForum()
  }
})

watch(() => route.params.id, () => {
  fetchForum()
  fetchPosts()
}, { immediate: true })

onMounted(() => {
  fetchForum()
  fetchPosts()
})
</script>

<style scoped>
.forum-page {
  width: 100%;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.forum-info {
  margin-bottom: 24px;
  border: 2px solid rgba(102, 126, 234, 0.15);
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(102, 126, 234, 0.12);
  transition: all 0.3s ease;
  overflow: hidden;
}

.forum-info:hover {
  border-color: rgba(102, 126, 234, 0.3);
  box-shadow: 0 8px 40px rgba(102, 126, 234, 0.2);
  transform: translateY(-4px);
}

.forum-info :deep(.el-card__body) {
  padding: 24px;
}

.loading {
  padding: 20px;
}

.forum-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.forum-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #333;
  position: relative;
  padding-left: 16px;
}

.forum-header h2::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 5px;
  height: 28px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 3px;
}

.forum-header .el-button {
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: all 0.3s ease;
}

.forum-header .el-button:hover {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
}

.forum-desc {
  color: #666;
  margin-bottom: 16px;
  font-size: 15px;
  line-height: 1.6;
  padding-left: 16px;
}

.forum-stats {
  font-size: 14px;
  color: #888;
  display: flex;
  gap: 24px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border-radius: 14px;
  margin-top: 16px;
}

.forum-stats span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.forum-stats span::before {
  content: '';
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
}

.post-list-card {
  margin-bottom: 24px;
  border: 2px solid rgba(102, 126, 234, 0.15);
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(102, 126, 234, 0.12);
  transition: all 0.3s ease;
  overflow: hidden;
}

.post-list-card:hover {
  border-color: rgba(102, 126, 234, 0.3);
  box-shadow: 0 8px 40px rgba(102, 126, 234, 0.2);
}

.post-list-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
  padding: 18px 24px;
}

.post-list-card :deep(.el-card__body) {
  padding: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-title {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  position: relative;
  padding-left: 12px;
}

.list-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
}

.list-header .sort-options :deep(.el-radio-button__inner) {
  border-radius: 10px;
  padding: 10px 20px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.list-header .sort-options :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.list-header .sort-options :deep(.el-radio-button:first-child .el-radio-button__inner) {
  border-radius: 10px 0 0 10px;
}

.list-header .sort-options :deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 0 10px 10px 0;
}

.pagination {
  margin-top: 24px;
  text-align: center;
  padding: 16px 0;
}

.pagination :deep(.el-pager li) {
  border-radius: 10px;
  margin: 0 4px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.pagination :deep(.el-pager li.is-active) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.pagination :deep(.btn-prev),
.pagination :deep(.btn-next) {
  border-radius: 10px;
  transition: all 0.3s ease;
}

.pagination :deep(.btn-prev:hover),
.pagination :deep(.btn-next:hover),
.pagination :deep(.el-pager li:hover) {
  color: #667eea;
}

@media (max-width: 768px) {
  .forum-page {
    padding: 16px;
  }

  .forum-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .forum-header .el-button {
    width: 100%;
  }

  .forum-stats {
    flex-direction: column;
    gap: 12px;
  }
}
</style>