import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  {
    path: '/',
    component: () => import('../components/Layout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('../views/Home.vue')
      },
      {
        path: 'forum/:id',
        name: 'Forum',
        component: () => import('../views/Forum.vue')
      },
      {
        path: 'post/create',
        name: 'CreatePost',
        component: () => import('../views/CreatePost.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'post/:id',
        name: 'PostDetail',
        component: () => import('../views/PostDetail.vue')
      },
      {
        path: 'post/:id/edit',
        name: 'EditPost',
        component: () => import('../views/CreatePost.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'user/:id',
        name: 'UserProfile',
        component: () => import('../views/UserProfile.vue')
      },
      {
        path: 'search',
        name: 'Search',
        component: () => import('../views/Search.vue')
      },
      {
        path: 'messages',
        name: 'Messages',
        component: () => import('../views/Messages.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('../views/Notifications.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'practice',
        name: 'Practice',
        component: () => import('../views/Practice.vue')
      },
      {
        path: 'following',
        name: 'Following',
        component: () => import('../views/Following.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'checkin',
        name: 'Checkin',
        component: () => import('../views/Checkin.vue')
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { guest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { guest: true }
  },
  {
    path: '/admin',
    component: () => import('../views/admin/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('../views/admin/Dashboard.vue')
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('../views/admin/UserManage.vue')
      },
      {
        path: 'forums',
        name: 'AdminForums',
        component: () => import('../views/admin/ForumManage.vue')
      },
      {
        path: 'posts',
        name: 'AdminPosts',
        component: () => import('../views/admin/PostManage.vue')
      },
      {
        path: 'replies',
        name: 'AdminReplies',
        component: () => import('../views/admin/ReplyManage.vue')
      },
      {
        path: 'reports',
        name: 'AdminReports',
        component: () => import('../views/admin/ReportManage.vue')
      },
      {
        path: 'review',
        name: 'AdminReview',
        component: () => import('../views/admin/PostReview.vue')
      },
      {
        path: 'points',
        name: 'AdminPoints',
        component: () => import('../views/admin/PointsManage.vue')
      },
      {
        path: 'questions',
        name: 'AdminQuestions',
        component: () => import('../views/admin/QuestionManage.vue')
      },
      {
        path: 'notifications',
        name: 'AdminNotifications',
        component: () => import('../views/admin/NotificationManage.vue')
      },
      {
        path: 'trash',
        name: 'AdminTrash',
        component: () => import('../views/admin/TrashManage.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

let authCheckPromise = null

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  
  if (!userStore.authChecked && userStore.token && !to.meta.guest) {
    if (!authCheckPromise) {
      authCheckPromise = userStore.checkAuth()
    }
    await authCheckPromise
    authCheckPromise = null
  }
  
  const isAuthenticated = userStore.isAuthenticated
  const isAdmin = userStore.isAdmin
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  } else if (to.meta.requiresAdmin && !isAdmin) {
    next('/')
  } else if (to.meta.guest && isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router
