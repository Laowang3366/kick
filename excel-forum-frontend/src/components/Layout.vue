<template>
  <el-container class="layout-container">
    <el-header class="header">
      <div class="header-left">
        <el-button 
          class="mobile-menu-btn"
          @click="mobileMenuVisible = true"
        >
          <el-icon><Menu /></el-icon>
        </el-button>
        <div class="logo" @click="$router.push('/')">Excel论坛</div>
        <el-input
          v-model="searchKeyword"
          placeholder="搜索帖子、用户..."
          class="search-input"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
      <div class="header-right">
        <el-badge :value="userStore.unreadCount" :hidden="!userStore.unreadCount" class="notification-badge">
          <el-button :icon="Bell" circle @click="$router.push('/notifications')" />
        </el-badge>
        <el-dropdown v-if="userStore.isAuthenticated" trigger="click">
          <el-avatar :src="userStore.user.avatar" :size="32" class="user-avatar">
            {{ userStore.user.username?.charAt(0) }}
          </el-avatar>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="$router.push(`/user/${userStore.user.id}`)">
                个人中心
              </el-dropdown-item>
              <el-dropdown-item @click="$router.push('/messages')">
                私信
              </el-dropdown-item>
              <el-dropdown-item v-if="userStore.user.role === 'admin'" @click="router.push('/admin')">
                后台管理
              </el-dropdown-item>
              <el-dropdown-item divided @click="handleLogout">
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <div v-else class="auth-buttons">
          <el-button type="primary" @click="$router.push('/login')">登录</el-button>
          <el-button @click="$router.push('/register')">注册</el-button>
        </div>
      </div>
    </el-header>
    
    <!-- 副导航栏 - 板块浏览页和帖子详情页显示 -->
    <Transition name="sub-nav">
      <div 
        class="sub-nav" 
        v-if="(isForumPage || isPostDetailPage) && !subNavHidden && forums.length > 0"
      >
        <div class="sub-nav-container">
          <div class="sub-nav-tabs">
            <TransitionGroup name="tab-item" tag="div" class="tabs-wrapper">
              <div
                v-for="(forum, index) in forums"
                :key="forum.id"
                :class="['sub-nav-tab', { 'is-active': activeForumId === forum.id }]"
                :style="{ '--delay': `${index * 0.08}s` }"
                @click="handleSubNavClick(forum.id)"
              >
                <el-icon><ChatDotRound /></el-icon>
                <span>{{ forum.name }}</span>
              </div>
            </TransitionGroup>
          </div>
        </div>
        <div class="sub-nav-collapse-btn" @click="subNavHidden = true">
          <el-icon><ArrowUp /></el-icon>
        </div>
      </div>
    </Transition>
    
    <!-- 副导航栏隐藏后的触发区域 -->
    <div 
      v-if="(isForumPage || isPostDetailPage) && subNavHidden && forums.length > 0" 
      class="sub-nav-trigger"
      @click="subNavHidden = false"
    >
      <el-icon><ArrowDown /></el-icon>
    </div>
    
    <el-container class="main-container">
      <Transition name="aside-fade">
        <el-aside v-show="!asideCollapsed" width="220px" class="aside">
          <div class="aside-header">
            <span class="aside-title">导航菜单</span>
            <el-button 
              class="collapse-btn" 
              @click="toggleAside"
              text
            >
              <el-icon><Fold /></el-icon>
            </el-button>
          </div>
          <el-menu
            :default-active="activeMenu"
            class="sidebar-menu"
            @select="handleMenuSelect"
          >
            <el-menu-item index="home">
              <el-icon><HomeFilled /></el-icon>
              <span>首页</span>
            </el-menu-item>
            <el-menu-item index="forums" v-if="forums.length > 0">
              <el-icon><ChatDotRound /></el-icon>
              <span>版块导航</span>
            </el-menu-item>
            <el-menu-item index="practice">
              <el-icon><EditPen /></el-icon>
              <span>小试牛刀</span>
            </el-menu-item>
            <el-menu-item index="following">
              <el-icon><Star /></el-icon>
              <span>我的关注</span>
            </el-menu-item>
            <el-menu-item index="checkin">
              <el-icon><Calendar /></el-icon>
              <span>积分签到</span>
            </el-menu-item>
          </el-menu>
        </el-aside>
      </Transition>
      <div v-if="asideCollapsed" class="aside-collapsed-trigger" @click="toggleAside">
        <el-icon><Expand /></el-icon>
        <span>展开菜单</span>
      </div>
      <el-main class="main-content" :class="{ 'full-width': asideCollapsed }">
        <router-view v-slot="{ Component, route }">
          <Transition :name="route.name === 'CreatePost' || route.name === 'EditPost' ? 'slide-up' : 'fade'">
            <component :is="Component" :key="route.path" />
          </Transition>
        </router-view>
      </el-main>
    </el-container>
    <el-footer class="footer">
      <div>© 2026 Excel论坛 版权所有</div>
    </el-footer>
    
    <el-drawer
      v-model="mobileMenuVisible"
      direction="ltr"
      :size="280"
      title="菜单"
      class="mobile-menu-drawer"
    >
      <el-menu
        :default-active="activeMenu"
        @select="handleMobileMenuSelect"
      >
        <el-menu-item index="home">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="forums" v-if="forums.length > 0">
          <el-icon><ChatDotRound /></el-icon>
          <span>版块导航</span>
        </el-menu-item>
        <el-menu-item index="practice">
          <el-icon><EditPen /></el-icon>
          <span>小试牛刀</span>
        </el-menu-item>
        <el-menu-item index="following">
          <el-icon><Star /></el-icon>
          <span>我的关注</span>
        </el-menu-item>
        <el-menu-item index="checkin">
          <el-icon><Calendar /></el-icon>
          <span>积分签到</span>
        </el-menu-item>
      </el-menu>
    </el-drawer>
  </el-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'
import { Bell, Search, HomeFilled, ChatDotRound, Menu, Fold, Expand, ArrowUp, ArrowDown, EditPen, Star, Calendar, User } from '@element-plus/icons-vue'
import api from '../api'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const searchKeyword = ref('')
const forums = ref([])
const currentCategoryId = ref(null)
const mobileMenuVisible = ref(false)
const asideCollapsed = ref(false)
const subNavHidden = ref(false)
const expandedSections = reactive({
  forums: true
})

const activeMenu = computed(() => {
  if (route.path === '/') return 'home'
  if (route.path.startsWith('/forum/')) return 'forums'
  if (route.path.startsWith('/post/')) return 'forums'
  if (route.path.startsWith('/practice')) return 'practice'
  if (route.path.startsWith('/following')) return 'following'
  if (route.path.startsWith('/checkin')) return 'checkin'
  return ''
})

const activeForumId = computed(() => {
  if (route.path.startsWith('/forum/')) {
    return parseInt(route.params.id)
  }
  if (route.path.startsWith('/post/')) {
    return currentCategoryId.value
  }
  return null
})

const isForumPage = computed(() => {
  return route.path.startsWith('/forum/')
})

const isPostDetailPage = computed(() => {
  return route.path.startsWith('/post/') && !route.path.includes('/create') && !route.path.includes('/edit')
})

const toggleAside = () => {
  asideCollapsed.value = !asideCollapsed.value
}

const fetchForums = async () => {
  try {
    console.log('开始获取版块列表...')
    const response = await api.get('/categories')
    console.log('获取版块列表成功:', response)
    console.log('响应类型:', typeof response)
    console.log('是否为数组:', Array.isArray(response))
    if (Array.isArray(response)) {
      console.log('数组长度:', response.length)
      if (response.length > 0) {
        console.log('第一个元素:', response[0])
      }
    }
    forums.value = response
    console.log('forums.value 已设置:', forums.value)
  } catch (error) {
    console.error('获取版块列表失败:', error)
    console.error('错误详情:', error.response?.data || error.message)
  }
}

const fetchPostCategory = async (postId) => {
  try {
    const response = await api.get(`/posts/${postId}`)
    if (response.post?.categoryId) {
      currentCategoryId.value = response.post.categoryId
    }
  } catch (error) {
    console.error('获取帖子板块失败:', error)
  }
}

const fetchUnreadNotifications = async () => {
  if (!userStore.isAuthenticated) return
  try {
    const response = await api.get('/notifications/unread-count')
    userStore.unreadCount = response.count
  } catch (error) {
    console.error('获取未读通知数失败:', error)
  }
}

const startNotificationPolling = () => {
  if (!userStore.isAuthenticated) return
  
  fetchUnreadNotifications()
  
  setInterval(() => {
    fetchUnreadNotifications()
  }, 30000)
}

const handleSearch = () => {
  if (searchKeyword.value.trim()) {
    router.push({ path: '/search', query: { q: searchKeyword.value } })
  }
}

const handleMenuSelect = (index) => {
  if (index === 'home') {
    router.push('/')
  } else if (index === 'forums') {
    if (forums.value.length > 0) {
      router.push(`/forum/${forums.value[0].id}`)
    }
  } else if (index === 'practice') {
    router.push('/practice')
  } else if (index === 'following') {
    router.push('/following')
  } else if (index === 'checkin') {
    router.push('/checkin')
  }
}

const handleSubNavClick = (forumId) => {
  router.push(`/forum/${forumId}`)
}

const handleMobileMenuSelect = (index) => {
  handleMenuSelect(index)
  mobileMenuVisible.value = false
}

const toggleSection = (section) => {
  expandedSections[section] = !expandedSections[section]
}

const handleLogout = async () => {
  await userStore.logout()
  router.push('/login')
}

watch(() => route.path, (newPath) => {
  if (newPath.startsWith('/post/') && !newPath.includes('/create') && !newPath.includes('/edit')) {
    const postId = route.params.id
    if (postId) {
      fetchPostCategory(postId)
    }
    asideCollapsed.value = true
    subNavHidden.value = true
  } else {
    currentCategoryId.value = null
    asideCollapsed.value = false
    subNavHidden.value = false
  }
}, { immediate: true })

onMounted(() => {
  fetchForums()
  startNotificationPolling()
})
</script>

<style scoped>
.layout-container {
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
  padding: 0 28px;
  z-index: 100;
  height: 70px;
  position: relative;
}

.header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%);
  pointer-events: none;
}

.sub-nav {
  background: linear-gradient(180deg, #ffffff 0%, #f8f9ff 100%);
  border-bottom: 2px solid rgba(102, 126, 234, 0.1);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.08);
  position: relative;
  overflow: hidden;
  margin: 0;
  display: flex;
  flex-direction: column;
}

.sub-nav-container {
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
}

.sub-nav-tabs{
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 12px 0;
  scrollbar-width: thin;
}

.sub-nav-tabs::-webkit-scrollbar {
  height: 6px;
}

.sub-nav-tabs::-webkit-scrollbar-track {
  background: rgba(102, 126, 234, 0.05);
  border-radius: 3px;
}

.sub-nav-tabs::-webkit-scrollbar-thumb {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 3px;
}

.sub-nav-tabs::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(90deg, #764ba2 0%, #667eea 100%);
}

.sub-nav-collapse-btn {
  width: 100%;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: linear-gradient(180deg, #f8f9ff 0%, #ffffff 100%);
  transition: all 0.3s ease;
  border-top: 1px solid rgba(102, 126, 234, 0.1);
  flex-shrink: 0;
}

.sub-nav-collapse-btn:hover {
  background: linear-gradient(180deg, #e8ebff 0%, #f0f2ff 100%);
}

.sub-nav-collapse-btn .el-icon {
  font-size: 18px;
  color: #667eea;
  transition: all 0.3s ease;
}

.sub-nav-collapse-btn:hover .el-icon{
  color: #764ba2;
  transform: translateY(-2px);
}

.sub-nav-trigger {
  width: 100%;
  height: 36px;
  background: linear-gradient(180deg, #f8f9ff 0%, #ffffff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.08);
}

.sub-nav-trigger:hover {
  background: linear-gradient(180deg, #e8ebff 0%, #f0f2ff 100%);
}

.sub-nav-trigger .el-icon{
  font-size: 18px;
  color: #667eea;
  transition: all 0.3s ease;
  animation: bounce-down 1.5s ease-in-out infinite;
}

.sub-nav-trigger:hover .el-icon{
  color: #764ba2;
}

@keyframes bounce-down {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(3px);
  }
}

.sub-nav::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
  background-size: 200% 100%;
  animation: gradient-flow 3s ease infinite;
  border-radius: 0 0 3px 3px;
}

@keyframes gradient-flow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.sub-nav-enter-active {
  animation: sub-nav-slide-down 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.sub-nav-leave-active {
  animation: sub-nav-slide-down 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse;
}

@keyframes sub-nav-slide-down {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.tabs-wrapper {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.tab-item-enter-active {
  animation: tab-bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
  animation-delay: var(--delay);
}

.tab-item-leave-active {
  animation: tab-pop-out 0.2s ease forwards;
}

@keyframes tab-bounce-in {
  0% {
    opacity: 0;
    transform: translateY(-30px) scale(0);
  }
  50% {
    opacity: 1;
    transform: translateY(10px) scale(1.1);
  }
  70% {
    transform: translateY(-5px) scale(0.95);
  }
  85% {
    transform: translateY(3px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes tab-pop-out {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.8);
  }
}

.sub-nav-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
  border-radius: 28px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 14px;
  font-weight: 600;
  color: #5a6c7d;
  border: 2px solid rgba(102, 126, 234, 0.15);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.08);
  position: relative;
  overflow: hidden;
}

.sub-nav-tab::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 0.5s ease;
}

.sub-nav-tab:hover::before {
  left: 100%;
}

.sub-nav-tab:hover {
  background: linear-gradient(135deg, #e8ebff 0%, #f0f2ff 100%);
  color: #667eea;
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.2);
  border-color: rgba(102, 126, 234, 0.4);
}

.sub-nav-tab.is-active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
  transform: translateY(-3px) scale(1.05);
  border-color: transparent;
}

.sub-nav-tab.is-active .el-icon {
  color: white;
}

.sub-nav-tab .el-icon {
  font-size: 18px;
  transition: transform 0.3s ease;
}

.sub-nav-tab:hover .el-icon {
  transform: scale(1.2);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 28px;
  position: relative;
  z-index: 1;
}

.logo {
  font-size: 26px;
  font-weight: 800;
  color: white;
  cursor: pointer;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
}

.logo:hover {
  transform: scale(1.08);
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.search-input {
  width: 340px;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.search-input :deep(.el-input__wrapper:hover) {
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.search-input :deep(.el-input__wrapper.is-focus) {
  background: white;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  z-index: 1;
}

.notification-badge {
  margin-right: 0;
}

.notification-badge :deep(.el-button) {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.notification-badge :deep(.el-button:hover) {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.1);
}

.user-avatar {
  cursor: pointer;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.user-avatar:hover {
  transform: scale(1.15);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  border-color: white;
}

.auth-buttons {
  display: flex;
  gap: 14px;
}

.auth-buttons :deep(.el-button) {
  border-radius: 24px;
  padding: 10px 24px;
  font-weight: 600;
  transition: all 0.3s ease;
  border: none;
}

.auth-buttons :deep(.el-button--primary) {
  background: white;
  color: #667eea;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.auth-buttons :deep(.el-button--primary:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  background: white;
  color: #764ba2;
}

.auth-buttons :deep(.el-button:not(.el-button--primary)) {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.auth-buttons :deep(.el-button:not(.el-button--primary):hover) {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.main-container {
  flex: 1;
  display: flex;
  overflow: visible;
  min-height: calc(100vh - 140px);
}

.aside {
  background-color: var(--bg-primary);
  background: linear-gradient(180deg, #ffffff 0%, #f8f9ff 100%);
  box-shadow: 4px 0 20px rgba(102, 126, 234, 0.12);
  width: 240px;
  overflow-y: auto;
  padding: 16px 12px;
  border-right: 3px solid transparent;
  border-image: linear-gradient(180deg, #667eea 0%, #764ba2 50%, #667eea 100%) 1;
  border-radius: 0 20px 20px 0;
  margin: 12px 0;
  position: sticky;
  top: 80px;
  height: calc(100vh - 140px);
  max-height: calc(100vh - 140px);
  flex-shrink: 0;
  align-self: flex-start;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.aside::-webkit-scrollbar {
  display: none;
}

.aside-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
}

.aside-title {
  font-size: 14px;
  font-weight: 600;
  color: #667eea;
}

.collapse-btn {
  padding: 6px !important;
  border-radius: 8px !important;
  color: #667eea !important;
  transition: all 0.3s ease !important;
}

.collapse-btn:hover {
  background: rgba(102, 126, 234, 0.1) !important;
  transform: scale(1.1);
}

.aside-collapsed-trigger {
  width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 8px;
  background: linear-gradient(180deg, #ffffff 0%, #f8f9ff 100%);
  border-right: 3px solid transparent;
  border-image: linear-gradient(180deg, #667eea 0%, #764ba2 50%, #667eea 100%) 1;
  border-radius: 0 20px 20px 0;
  margin: 12px 0;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 4px 0 20px rgba(102, 126, 234, 0.12);
  position: sticky;
  top: 80px;
  height: calc(100vh - 140px);
  max-height: calc(100vh - 140px);
  flex-shrink: 0;
  align-self: flex-start;
}

.aside-collapsed-trigger:hover {
  background: linear-gradient(180deg, #f8f9ff 0%, #f0f2ff 100%);
  box-shadow: 4px 0 30px rgba(102, 126, 234, 0.2);
}

.aside-collapsed-trigger .el-icon {
  font-size: 20px;
  color: #667eea;
  transition: transform 0.3s ease;
}

.aside-collapsed-trigger:hover .el-icon {
  transform: scale(1.2);
}

.aside-collapsed-trigger span {
  font-size: 11px;
  color: #667eea;
  font-weight: 500;
  writing-mode: vertical-rl;
  letter-spacing: 2px;
}

.aside::after {
  content: '';
  position: absolute;
  top: 20px;
  right: 0;
  width: 4px;
  height: 60px;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px 0 0 4px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.sidebar-menu {
  border-right: none;
}

.sidebar-section {
  margin-bottom: 16px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  cursor: pointer;
  background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%);
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  color: var(--text-primary);
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.sidebar-header:hover {
  background: var(--primary-light);
  color: #667eea;
  border-color: #667eea;
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.sidebar-header .el-icon {
  transition: transform 0.3s ease;
}

.sidebar-header .is-active {
  transform: rotate(180deg);
}

.sidebar-content {
  padding: 16px 8px;
}

.sidebar-menu :deep(.el-menu-item) {
  border-radius: 12px;
  margin: 6px 0;
  color: var(--text-regular);
  transition: all 0.3s ease;
  font-weight: 500;
  border: 2px solid transparent;
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background: var(--primary-light);
  color: var(--primary-color);
  transform: translateX(4px);
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  color: white;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.35);
  border-color: transparent;
}

.main-content {
  background-color: var(--bg-secondary);
  padding: 0;
  overflow-y: auto;
  transition: all 0.3s ease;
  flex: 1;
}

.main-content.full-width {
  margin-left: 0;
  max-width: 100%;
  padding: 0;
}

.aside-fade-enter-active,
.aside-fade-leave-active {
  transition: all 0.3s ease;
}

.aside-fade-enter-from,
.aside-fade-leave-to {
  opacity: 0;
  width: 0 !important;
  padding: 0;
  margin: 0;
}

.slide-up-enter-active {
  animation: slide-up-in 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-leave-active {
  animation: slide-up-out 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slide-up-in {
  0% {
    opacity: 0;
    transform: translateY(100%);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-up-out {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(100%);
  }
}

.fade-enter-active {
  animation: fade-in 0.3s ease;
}

.fade-leave-active {
  animation: fade-out 0.2s ease;
}

@keyframes fade-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes fade-out {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.footer {
  text-align: center;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  color: white;
  padding: 28px;
  border-top: none;
  font-size: 14px;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.mobile-menu-btn {
  display: none;
  margin-right: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

.mobile-menu-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: white;
}

.mobile-menu-drawer :deep(.el-drawer__body) {
  padding: 16px 12px;
}

@media (max-width: 768px) {
  .mobile-menu-btn {
    display: flex;
  }

  .aside {
    display: none;
  }

  .aside-collapsed-trigger {
    display: none;
  }

  .header {
    height: 60px;
    padding: 0 18px;
  }

  .header-left {
    gap: 14px;
  }

  .logo {
    font-size: 20px;
  }

  .search-input {
    width: 180px;
  }

  .header-right {
    gap: 12px;
  }

  .auth-buttons {
    flex-direction: column;
    gap: 8px;
  }

  .auth-buttons :deep(.el-button) {
    padding: 8px 18px;
    font-size: 13px;
  }

  .main-content {
    padding: 0;
  }

  .main-content.full-width {
    padding: 0;
  }

  .footer {
    padding: 20px;
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .search-input {
    width: 120px;
  }

  .logo {
    font-size: 18px;
  }

  .header {
    padding: 0 14px;
  }

  .notification-badge {
    margin-right: 0;
  }
}
</style>