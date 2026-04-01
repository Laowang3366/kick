<template>
  <div class="search-page">
    <el-card class="search-card">
      <template #header>
        <h2>搜索</h2>
      </template>
      <el-form :model="searchForm" @submit.prevent="handleSearch">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="关键词">
              <el-input v-model="searchForm.keyword" placeholder="输入关键词搜索" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="版块">
              <el-select v-model="searchForm.forumId" placeholder="全部版块" clearable filterable>
                <el-option
                  v-for="forum in forums"
                  :key="forum.id"
                  :label="forum.name"
                  :value="forum.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="标签">
              <el-select v-model="searchForm.tags" multiple placeholder="选择标签" filterable>
                <el-option
                  v-for="tag in commonTags"
                  :key="tag"
                  :label="tag"
                  :value="tag"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="时间范围">
              <el-date-picker
                v-model="searchForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="排序">
              <el-select v-model="searchForm.sort">
                <el-option label="最新" value="latest" />
                <el-option label="最热" value="hot" />
                <el-option label="相关度" value="relevance" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item>
              <el-button type="primary" @click="handleSearch">搜索</el-button>
              <el-button @click="resetSearch">重置</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card class="results-card">
      <template #header>
        <div class="results-header">
          <span>搜索结果 ({{ totalResults }})</span>
        </div>
      </template>
      <div v-if="loading" class="loading">
        <el-skeleton :rows="5" animated />
      </div>
      <div v-else-if="results.length === 0" class="empty">
        <el-empty description="没有找到相关结果" />
      </div>
      <PostList v-else :posts="results" />
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="10"
          :total="totalResults"
          layout="prev, pager, next"
          @current-change="handleSearch"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PostList from '../components/PostList.vue'
import api from '../api'

const route = useRoute()
const router = useRouter()

const forums = ref([])
const commonTags = ref(['VBA', 'Power Query', '函数公式', '图表', '数据透视表', '条件格式', '宏', 'SQL', 'M语言'])

const searchForm = reactive({
  keyword: route.query.q || '',
  forumId: '',
  tags: [],
  dateRange: [],
  sort: 'latest'
})

const results = ref([])
const loading = ref(false)
const currentPage = ref(1)
const totalResults = ref(0)

const fetchForums = async () => {
  try {
    const response = await api.get('/categories')
    forums.value = response
  } catch (error) {
    console.error('获取版块列表失败:', error)
  }
}

const handleSearch = async () => {
  if (!searchForm.keyword.trim()) return
  
  loading.value = true
  try {
    const params = {
      q: searchForm.keyword,
      page: currentPage.value,
      limit: 10,
      sort: searchForm.sort
    }
    
    if (searchForm.forumId) {
      params.forumId = searchForm.forumId
    }
    
    if (searchForm.tags.length) {
      params.tags = searchForm.tags.join(',')
    }
    
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    
    const response = await api.get('/search', { params })
    results.value = response.posts
    totalResults.value = response.total
    
    // 更新URL
    router.replace({ query: { q: searchForm.keyword } })
  } catch (error) {
    console.error('搜索失败:', error)
  } finally {
    loading.value = false
  }
}

const resetSearch = () => {
  searchForm.keyword = ''
  searchForm.forumId = ''
  searchForm.tags = []
  searchForm.dateRange = []
  searchForm.sort = 'latest'
  results.value = []
  totalResults.value = 0
  currentPage.value = 1
}

onMounted(() => {
  fetchForums()
  if (searchForm.keyword) {
    handleSearch()
  }
})
</script>

<style scoped>
.search-page {
  width: 100%;
}

.search-card {
  margin-bottom: 20px;
}

.results-card {
  margin-bottom: 20px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.loading,
.empty {
  padding: 20px;
}

.pagination {
  margin-top: 20px;
  text-align: center;
}
</style>