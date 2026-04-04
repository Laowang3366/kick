<template>
  <el-container class="admin-layout">
    <el-aside 
      :width="isCollapse ? '64px' : '240px'" 
      class="admin-aside"
      :class="{ 'is-collapse': isCollapse }"
    >
      <div class="admin-logo">
        <transition name="fade" mode="out-in">
          <span v-if="!isCollapse" key="full" class="logo-text">后台管理</span>
          <el-icon v-else key="icon" :size="24"><DataBoard /></el-icon>
        </transition>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        class="admin-menu"
        :collapse="isCollapse"
        :collapse-transition="false"
        @select="handleMenuSelect"
      >
        <el-menu-item index="dashboard">
          <el-icon><DataBoard /></el-icon>
          <template #title>仪表盘</template>
        </el-menu-item>
        <el-menu-item index="users">
          <el-icon><User /></el-icon>
          <template #title>用户管理</template>
        </el-menu-item>
        <el-menu-item index="forums">
          <el-icon><ChatDotRound /></el-icon>
          <template #title>版块管理</template>
        </el-menu-item>
        <el-menu-item index="posts">
          <el-icon><Document /></el-icon>
          <template #title>帖子管理</template>
        </el-menu-item>
        <el-menu-item index="levels">
          <el-icon><Medal /></el-icon>
          <template #title>等级管理</template>
        </el-menu-item>
        <el-menu-item index="reports">
          <el-icon><Warning /></el-icon>
          <template #title>举报管理</template>
        </el-menu-item>
        <el-menu-item index="review">
          <el-icon><DocumentChecked /></el-icon>
          <template #title>帖子审核</template>
        </el-menu-item>
        <el-menu-item index="points">
          <el-icon><Coin /></el-icon>
          <template #title>积分管理</template>
        </el-menu-item>
        <el-menu-item index="questions">
          <el-icon><EditPen /></el-icon>
          <template #title>题目管理</template>
        </el-menu-item>
        <el-menu-item index="notifications">
          <el-icon><Bell /></el-icon>
          <template #title>网站通知</template>
        </el-menu-item>
        <el-menu-item index="drafts">
          <el-icon><DocumentCopy /></el-icon>
          <template #title>草稿治理</template>
        </el-menu-item>
        <el-menu-item index="trash">
          <el-icon><Delete /></el-icon>
          <template #title>回收站</template>
        </el-menu-item>
      </el-menu>
      
      <div class="collapse-btn" @click="toggleCollapse">
        <el-icon :size="18">
          <ArrowLeft v-if="!isCollapse" />
          <ArrowRight v-else />
        </el-icon>
      </div>
    </el-aside>
    
    <el-container>
      <el-header class="admin-header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/admin' }">后台管理</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentRoute">{{ currentRoute }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <div class="header-right">
          <div class="theme-toggle" @click="toggleTheme">
            <el-tooltip :content="theme === 'light' ? '切换深色模式' : '切换浅色模式'" placement="bottom">
              <el-icon :size="20" class="theme-icon">
                <Sunny v-if="theme === 'dark'" />
                <Moon v-else />
              </el-icon>
            </el-tooltip>
          </div>
          
          <el-dropdown>
            <div class="user-info">
              <el-avatar :src="userStore.user?.avatar" :size="32" class="user-avatar">
                {{ userStore.user?.username?.charAt(0) }}
              </el-avatar>
              <span class="username">{{ userStore.user?.username }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="goHome">
                  <el-icon><House /></el-icon>
                  返回前台
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main class="admin-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../../stores/user'
import { useTheme } from '../../composables/useTheme'
import {
  DataBoard,
  User,
  ChatDotRound,
  Document,
  Medal,
  Warning,
  DocumentChecked,
  Coin,
  EditPen,
  Bell,
  DocumentCopy,
  Delete,
  ArrowLeft,
  ArrowRight,
  Sunny,
  Moon,
  House,
  SwitchButton
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { theme, toggleTheme, initTheme } = useTheme()

const isCollapse = ref(false)

const activeMenu = computed(() => {
  const path = route.path
  if (path.includes('/admin/users')) return 'users'
  if (path.includes('/admin/forums')) return 'forums'
  if (path.includes('/admin/posts')) return 'posts'
  if (path.includes('/admin/levels')) return 'levels'
  if (path.includes('/admin/reports')) return 'reports'
  if (path.includes('/admin/review')) return 'review'
  if (path.includes('/admin/points')) return 'points'
  if (path.includes('/admin/questions')) return 'questions'
  if (path.includes('/admin/notifications')) return 'notifications'
  if (path.includes('/admin/drafts')) return 'drafts'
  if (path.includes('/admin/trash')) return 'trash'
  return 'dashboard'
})

const currentRoute = computed(() => {
  const titles = {
    dashboard: '仪表盘',
    users: '用户管理',
    forums: '版块管理',
    posts: '帖子管理',
    levels: '等级管理',
    reports: '举报管理',
    review: '帖子审核',
    points: '积分管理',
    questions: '题目管理',
    notifications: '网站通知',
    drafts: '草稿治理',
    trash: '回收站'
  }
  return titles[activeMenu.value] || ''
})

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

const handleMenuSelect = (index) => {
  if (index === 'dashboard') {
    router.push('/admin')
  } else {
    router.push(`/admin/${index}`)
  }
}

const goHome = () => {
  router.push('/')
}

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

onMounted(() => {
  initTheme()
})
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background: var(--bg-gradient);
}

.admin-aside {
  background: var(--sidebar-bg);
  border-right: none;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  transition: width var(--transition-normal);
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.admin-aside.is-collapse {
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.15);
}

.admin-logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  background: var(--primary-gradient);
  letter-spacing: 1px;
  text-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  position: relative;
  overflow: hidden;
}

.admin-logo::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  animation: shimmer 3s infinite;
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

.logo-text {
  white-space: nowrap;
}

.admin-menu {
  border-right: none;
  background: transparent;
  padding: 8px 0;
  flex: 1;
}

.admin-menu :deep(.el-menu-item) {
  color: var(--sidebar-text);
  margin: 4px 12px;
  border-radius: var(--border-radius-md);
  height: 48px;
  line-height: 48px;
  font-weight: 500;
  transition: all var(--transition-fast);
  position: relative;
  overflow: hidden;
}

.admin-menu :deep(.el-menu-item::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  background: var(--primary-gradient);
  border-radius: 0 2px 2px 0;
  transition: height var(--transition-fast);
}

.admin-menu :deep(.el-menu-item:hover) {
  background-color: var(--sidebar-hover-bg);
  color: #fff;
}

.admin-menu :deep(.el-menu-item:hover::before) {
  height: 60%;
}

.admin-menu :deep(.el-menu-item.is-active) {
  color: #fff;
  background: var(--sidebar-active-bg);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.admin-menu :deep(.el-menu-item.is-active::before) {
  height: 80%;
}

.admin-menu :deep(.el-menu-item .el-icon) {
  font-size: 18px;
  margin-right: 10px;
  transition: transform var(--transition-fast);
}

.admin-menu :deep(.el-menu-item:hover .el-icon) {
  transform: scale(1.1);
}

.collapse-btn {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sidebar-text);
  cursor: pointer;
  transition: all var(--transition-fast);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.collapse-btn:hover {
  background: var(--sidebar-hover-bg);
  color: #fff;
}

.collapse-btn:hover .el-icon {
  transform: scale(1.2);
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-sm);
  padding: 0 24px;
  height: 64px;
  border-bottom: 1px solid var(--border-color);
  transition: all var(--transition-normal);
}

.admin-header :deep(.el-breadcrumb) {
  font-size: 15px;
}

.admin-header :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  font-weight: 600;
  color: var(--text-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.theme-toggle {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.theme-toggle:hover {
  background: var(--primary-gradient);
  border-color: transparent;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.theme-toggle:hover .theme-icon {
  color: #fff;
}

.theme-icon {
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: var(--border-radius-lg);
  transition: all var(--transition-fast);
}

.user-info:hover {
  background: var(--bg-secondary);
}

.user-avatar {
  border: 2px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.user-info:hover .user-avatar {
  transform: scale(1.05);
  box-shadow: var(--shadow-md);
  border-color: var(--primary-color);
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.admin-main {
  background: var(--bg-gradient);
  padding: 24px;
  min-height: calc(100vh - 64px);
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-fast);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
