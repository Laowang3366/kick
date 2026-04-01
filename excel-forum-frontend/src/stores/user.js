import { defineStore } from 'pinia'
import api from '../api'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null') || {},
    isAuthenticated: !!localStorage.getItem('token'),
    unreadCount: 0,
    authChecked: false
  }),
  getters: {
    isAdmin: (state) => state.user?.role === 'admin',
    userId: (state) => state.user?.id,
    username: (state) => state.user?.username,
    avatar: (state) => state.user?.avatar,
    level: (state) => state.user?.level || 1
  },
  actions: {
    async login(credentials) {
      try {
        const response = await api.post('/auth/login', credentials)
        this.token = response.token
        this.user = response.user
        this.isAuthenticated = true
        this.authChecked = true
        localStorage.setItem('token', response.token)
        localStorage.setItem('user', JSON.stringify(response.user))
        this.fetchUnreadCount()
        return response
      } catch (error) {
        throw error
      }
    },
    async register(userData) {
      try {
        const response = await api.post('/auth/register', userData)
        return response
      } catch (error) {
        throw error
      }
    },
    async logout() {
      try {
        if (this.isAuthenticated) {
          await api.post('/auth/logout')
        }
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        this.clearAuth()
      }
    },
    clearAuth() {
      this.token = ''
      this.user = {}
      this.isAuthenticated = false
      this.unreadCount = 0
      this.authChecked = false
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
    async fetchUserInfo() {
      if (!this.token) return null
      try {
        const response = await api.get('/auth/current')
        this.user = response
        this.authChecked = true
        localStorage.setItem('user', JSON.stringify(response))
        return response
      } catch (error) {
        this.clearAuth()
        throw error
      }
    },
    async checkAuth() {
      if (!this.token) {
        this.authChecked = true
        return false
      }
      
      try {
        await this.fetchUserInfo()
        this.isAuthenticated = true
        this.fetchUnreadCount()
        return true
      } catch (error) {
        this.clearAuth()
        return false
      }
    },
    async fetchUnreadCount() {
      if (!this.isAuthenticated) return
      try {
        const response = await api.get('/notifications/unread-count')
        this.unreadCount = response.count || 0
      } catch (error) {
        console.error('获取未读通知数失败:', error)
      }
    },
    updateUser(updates) {
      this.user = { ...this.user, ...updates }
      localStorage.setItem('user', JSON.stringify(this.user))
    }
  }
})
