import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import router from '../router'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

let isShowingLoginExpired = false

api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    if (error.response) {
      const currentPath = router.currentRoute.value.path
      const isAuthPage = currentPath === '/login' || currentPath === '/register'
      
      switch (error.response.status) {
        case 401:
          if (!isShowingLoginExpired) {
            isShowingLoginExpired = true
            
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            
            if (!isAuthPage) {
              const message = typeof error.response.data === 'string' 
                ? error.response.data 
                : (error.response.data?.message || '您的登录状态已过期，请重新登录以继续使用。')
              ElMessageBox.confirm(
                message,
                '登录过期',
                {
                  confirmButtonText: '重新登录',
                  cancelButtonText: '取消',
                  type: 'warning',
                  closeOnClickModal: false
                }
              ).then(() => {
                router.push({
                  path: '/login',
                  query: { redirect: currentPath }
                })
              }).catch(() => {
                router.push('/')
              }).finally(() => {
                isShowingLoginExpired = false
              })
            } else {
              isShowingLoginExpired = false
            }
          }
          break
        case 403:
          if (!isAuthPage) {
            ElMessage.error('没有权限访问该资源')
          }
          break
        case 404:
          if (!isAuthPage) {
            ElMessage.error('请求的资源不存在')
          }
          break
        case 500:
          ElMessage.error('服务器内部错误，请稍后重试')
          break
        default:
          ElMessage.error(error.response.data?.message || '请求失败')
      }
    } else if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请检查网络连接')
    } else {
      ElMessage.error('网络错误，请检查网络连接')
    }
    return Promise.reject(error)
  }
)

export default api
