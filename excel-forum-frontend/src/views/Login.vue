<template>
  <div class="login-container">
    <div class="login-background">
      <div class="bg-shape bg-shape-1"></div>
      <div class="bg-shape bg-shape-2"></div>
      <div class="bg-shape bg-shape-3"></div>
    </div>
    
    <div class="login-content">
      <div class="login-left">
        <div class="brand-section">
          <div class="brand-logo">
            <el-icon :size="48"><DataAnalysis /></el-icon>
          </div>
          <h1 class="brand-title">Excel 论坛</h1>
          <p class="brand-desc">分享 Excel 技巧，解决数据难题</p>
          <div class="features-list">
            <div class="feature-item">
              <el-icon><ChatDotRound /></el-icon>
              <span>技术交流</span>
            </div>
            <div class="feature-item">
              <el-icon><Document /></el-icon>
              <span>经验分享</span>
            </div>
            <div class="feature-item">
              <el-icon><User /></el-icon>
              <span>专家答疑</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="login-right">
        <el-card class="login-card">
          <div class="card-header">
            <h2 class="login-title">欢迎回来</h2>
            <p class="login-subtitle">登录您的账号继续探索</p>
          </div>
          
          <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" @submit.prevent="handleLogin" class="login-form">
            <el-form-item prop="username">
              <el-input 
                v-model="loginForm.username" 
                placeholder="请输入用户名或邮箱" 
                prefix-icon="User" 
                size="large"
                clearable
              />
            </el-form-item>
            
            <el-form-item prop="password">
              <el-input 
                v-model="loginForm.password" 
                type="password" 
                placeholder="请输入密码" 
                prefix-icon="Lock" 
                size="large"
                show-password
                @keyup.enter="handleLogin"
              />
            </el-form-item>
            
            <div class="form-options">
              <el-checkbox v-model="rememberMe">记住密码</el-checkbox>
              <el-link type="primary" :underline="false" @click="showForgotPassword = true">忘记密码？</el-link>
            </div>
            
            <el-form-item>
              <el-button 
                type="primary" 
                native-type="submit" 
                :loading="loading" 
                class="login-btn"
                size="large"
              >
                <span v-if="!loading">登 录</span>
                <span v-else>登录中...</span>
              </el-button>
            </el-form-item>
          </el-form>
          
          <div class="divider">
            <span>或</span>
          </div>
          
          <div class="social-login">
            <el-button class="social-btn" @click="handleSocialLogin('wechat')">
              <el-icon><ChatDotRound /></el-icon>
              微信登录
            </el-button>
            <el-button class="social-btn" @click="handleSocialLogin('qq')">
              <el-icon><Message /></el-icon>
              QQ登录
            </el-button>
          </div>
          
          <div class="login-footer">
            <span>还没有账号？</span>
            <router-link to="/register" class="register-link">立即注册</router-link>
          </div>
        </el-card>
      </div>
    </div>
    
    <el-dialog 
      v-model="showForgotPassword" 
      title="找回密码" 
      width="420px"
      class="forgot-dialog"
      :close-on-click-modal="false"
    >
      <el-form ref="forgotFormRef" :model="forgotForm" :rules="forgotRules" label-width="80px">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="forgotForm.email" placeholder="请输入注册邮箱" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showForgotPassword = false">取消</el-button>
        <el-button type="primary" :loading="forgotLoading" @click="handleForgotPassword">
          发送重置邮件
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import { DataAnalysis, ChatDotRound, Document, User, Message } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const loginFormRef = ref(null)
const forgotFormRef = ref(null)
const loading = ref(false)
const forgotLoading = ref(false)
const rememberMe = ref(false)
const showForgotPassword = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const forgotForm = reactive({
  email: ''
})

const loginRules = {
  username: [
    { required: true, message: '请输入用户名或邮箱', trigger: 'blur' },
    { min: 2, message: '用户名至少2个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符', trigger: 'blur' }
  ]
}

const forgotRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  try {
    await loginFormRef.value.validate()
  } catch {
    return
  }
  
  loading.value = true
  try {
    await userStore.login(loginForm)
    
    if (rememberMe.value) {
      localStorage.setItem('rememberedUsername', loginForm.username)
      localStorage.setItem('rememberMe', 'true')
    } else {
      localStorage.removeItem('rememberedUsername')
      localStorage.removeItem('rememberMe')
    }
    
    ElMessage.success('登录成功，欢迎回来！')
    
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (error) {
    const errorMsg = typeof error.response?.data === 'string' 
      ? error.response.data 
      : (error.response?.data?.message || '登录失败，请检查用户名和密码')
    ElMessage.error(errorMsg)
  } finally {
    loading.value = false
  }
}

const handleForgotPassword = async () => {
  try {
    await forgotFormRef.value.validate()
  } catch {
    return
  }
  
  forgotLoading.value = true
  try {
    ElMessage.success('重置邮件已发送，请查收邮箱')
    showForgotPassword.value = false
    forgotForm.email = ''
  } catch (error) {
    ElMessage.error('发送失败，请稍后重试')
  } finally {
    forgotLoading.value = false
  }
}

const handleSocialLogin = (type) => {
  ElMessage.info(`${type === 'wechat' ? '微信' : 'QQ'}登录功能开发中`)
}

onMounted(() => {
  if (localStorage.getItem('rememberMe') === 'true') {
    rememberMe.value = true
    loginForm.username = localStorage.getItem('rememberedUsername') || ''
  }
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  position: relative;
  overflow: hidden;
}

.login-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  z-index: 0;
}

.bg-shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
  animation: float 20s ease-in-out infinite;
}

.bg-shape-1 {
  width: 600px;
  height: 600px;
  background: white;
  top: -200px;
  left: -200px;
  animation-delay: 0s;
}

.bg-shape-2 {
  width: 400px;
  height: 400px;
  background: white;
  bottom: -100px;
  right: -100px;
  animation-delay: -5s;
}

.bg-shape-3 {
  width: 300px;
  height: 300px;
  background: white;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -10s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-30px) rotate(180deg);
  }
}

.login-content {
  display: flex;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px;
  position: relative;
  z-index: 1;
  align-items: center;
  justify-content: center;
  gap: 80px;
}

.login-left {
  flex: 1;
  max-width: 450px;
}

.brand-section {
  color: white;
  text-align: center;
}

.brand-logo {
  width: 100px;
  height: 100px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  backdrop-filter: blur(10px);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 30px 10px rgba(255, 255, 255, 0.2);
  }
}

.brand-title {
  font-size: 42px;
  font-weight: 800;
  margin: 0 0 12px;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  letter-spacing: 2px;
}

.brand-desc {
  font-size: 18px;
  opacity: 0.9;
  margin: 0 0 40px;
}

.features-list {
  display: flex;
  justify-content: center;
  gap: 32px;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.feature-item:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-5px);
}

.feature-item .el-icon {
  font-size: 28px;
}

.feature-item span {
  font-size: 14px;
  font-weight: 500;
}

.login-right {
  flex: 1;
  max-width: 420px;
}

.login-card {
  border-radius: 24px;
  border: none;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
}

.login-card :deep(.el-card__body) {
  padding: 40px;
}

.card-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 8px;
}

.login-subtitle {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 12px;
  padding: 4px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.login-form :deep(.el-input__wrapper:hover) {
  border-color: #667eea;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.login-form :deep(.el-form-item) {
  margin-bottom: 24px;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.form-options :deep(.el-checkbox__label) {
  color: #606266;
  font-size: 14px;
}

.login-btn {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: all 0.3s ease;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.divider {
  display: flex;
  align-items: center;
  margin: 24px 0;
  color: #c0c4cc;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e4e7ed;
}

.divider span {
  padding: 0 16px;
  font-size: 14px;
}

.social-login {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.social-btn {
  flex: 1;
  height: 44px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.social-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.login-footer {
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.register-link {
  color: #667eea;
  font-weight: 600;
  text-decoration: none;
  margin-left: 4px;
  transition: color 0.3s ease;
}

.register-link:hover {
  color: #764ba2;
}

.forgot-dialog :deep(.el-dialog__header) {
  padding: 20px 24px;
  border-bottom: 1px solid #e4e7ed;
}

.forgot-dialog :deep(.el-dialog__body) {
  padding: 24px;
}

@media (max-width: 900px) {
  .login-content {
    flex-direction: column;
    gap: 40px;
    padding: 20px;
  }
  
  .login-left {
    max-width: 100%;
  }
  
  .brand-title {
    font-size: 32px;
  }
  
  .features-list {
    flex-wrap: wrap;
    gap: 16px;
  }
  
  .feature-item {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .login-card :deep(.el-card__body) {
    padding: 24px;
  }
  
  .login-title {
    font-size: 24px;
  }
  
  .social-login {
    flex-direction: column;
  }
  
  .brand-logo {
    width: 80px;
    height: 80px;
  }
  
  .brand-logo .el-icon {
    font-size: 36px;
  }
}
</style>
