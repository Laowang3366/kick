<template>
  <div class="register-container">
    <div class="register-background">
      <div class="bg-shape bg-shape-1"></div>
      <div class="bg-shape bg-shape-2"></div>
      <div class="bg-shape bg-shape-3"></div>
    </div>
    
    <div class="register-content">
      <div class="register-left">
        <div class="brand-section">
          <div class="brand-logo">
            <el-icon :size="48"><DataAnalysis /></el-icon>
          </div>
          <h1 class="brand-title">加入我们</h1>
          <p class="brand-desc">创建账号，开启 Excel 学习之旅</p>
          <div class="benefits-list">
            <div class="benefit-item">
              <el-icon><Check /></el-icon>
              <span>免费获取海量 Excel 教程</span>
            </div>
            <div class="benefit-item">
              <el-icon><Check /></el-icon>
              <span>与专家一对一交流</span>
            </div>
            <div class="benefit-item">
              <el-icon><Check /></el-icon>
              <span>分享经验获得积分奖励</span>
            </div>
            <div class="benefit-item">
              <el-icon><Check /></el-icon>
              <span>参与社区活动赢取好礼</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="register-right">
        <el-card class="register-card">
          <div class="card-header">
            <h2 class="register-title">创建账号</h2>
            <p class="register-subtitle">填写以下信息完成注册</p>
          </div>
          
          <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" @submit.prevent="handleRegister" class="register-form">
            <el-form-item prop="username">
              <el-input 
                v-model="registerForm.username" 
                placeholder="请输入用户名" 
                prefix-icon="User" 
                size="large"
                clearable
              />
            </el-form-item>
            
            <el-form-item prop="email">
              <el-input 
                v-model="registerForm.email" 
                placeholder="请输入邮箱" 
                prefix-icon="Message" 
                size="large"
                clearable
              />
            </el-form-item>
            
            <el-form-item prop="password">
              <el-input 
                v-model="registerForm.password" 
                type="password" 
                placeholder="请输入密码" 
                prefix-icon="Lock" 
                size="large"
                show-password
                @input="checkPasswordStrength"
              />
              <div class="password-strength" v-if="registerForm.password">
                <div class="strength-bar">
                  <div 
                    class="strength-fill" 
                    :style="{ width: passwordStrength.percent + '%' }"
                    :class="passwordStrength.level"
                  ></div>
                </div>
                <span class="strength-text" :class="passwordStrength.level">
                  {{ passwordStrength.text }}
                </span>
              </div>
            </el-form-item>
            
            <el-form-item prop="confirmPassword">
              <el-input 
                v-model="registerForm.confirmPassword" 
                type="password" 
                placeholder="请确认密码" 
                prefix-icon="Lock" 
                size="large"
                show-password
              />
            </el-form-item>
            
            <el-form-item prop="agreement">
              <el-checkbox v-model="registerForm.agreement" class="agreement-checkbox">
                我已阅读并同意
                <el-link type="primary" :underline="false" @click.stop="showAgreement('user')">《用户协议》</el-link>
                和
                <el-link type="primary" :underline="false" @click.stop="showAgreement('privacy')">《隐私政策》</el-link>
              </el-checkbox>
            </el-form-item>
            
            <el-form-item>
              <el-button 
                type="primary" 
                native-type="submit" 
                :loading="loading" 
                class="register-btn"
                size="large"
                :disabled="!registerForm.agreement"
              >
                <span v-if="!loading">立即注册</span>
                <span v-else>注册中...</span>
              </el-button>
            </el-form-item>
          </el-form>
          
          <div class="register-footer">
            <span>已有账号？</span>
            <router-link to="/login" class="login-link">立即登录</router-link>
          </div>
        </el-card>
      </div>
    </div>
    
    <el-dialog 
      v-model="showAgreementDialog" 
      :title="agreementType === 'user' ? '用户协议' : '隐私政策'"
      width="600px"
      class="agreement-dialog"
    >
      <div class="agreement-content" v-if="agreementType === 'user'">
        <h4>一、服务条款</h4>
        <p>欢迎使用 Excel 论坛。本协议是您与 Excel 论坛之间关于使用本平台服务的法律协议。</p>
        
        <h4>二、用户注册</h4>
        <p>1. 用户应提供真实、准确、完整的个人资料。</p>
        <p>2. 用户账号和密码由用户自行保管，因用户保管不当造成的损失由用户自行承担。</p>
        
        <h4>三、使用规则</h4>
        <p>1. 用户不得发布违法、违规内容。</p>
        <p>2. 用户应尊重他人知识产权，不得发布侵权内容。</p>
        <p>3. 用户应文明交流，不得进行人身攻击。</p>
        
        <h4>四、免责声明</h4>
        <p>本平台对用户发布的内容不承担任何责任，但有权对违规内容进行处理。</p>
      </div>
      <div class="agreement-content" v-else>
        <h4>一、信息收集</h4>
        <p>我们收集您注册时提供的用户名、邮箱等信息。</p>
        
        <h4>二、信息使用</h4>
        <p>您的信息仅用于提供和改进服务，不会出售给第三方。</p>
        
        <h4>三、信息保护</h4>
        <p>我们采用安全措施保护您的个人信息安全。</p>
        
        <h4>四、Cookie 使用</h4>
        <p>我们使用 Cookie 来改善用户体验，您可以在浏览器设置中禁用 Cookie。</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="showAgreementDialog = false">我已了解</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import { DataAnalysis, Check } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const registerFormRef = ref(null)
const loading = ref(false)
const showAgreementDialog = ref(false)
const agreementType = ref('user')

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreement: false
})

const passwordStrength = reactive({
  level: '',
  text: '',
  percent: 0
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const validateAgreement = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请阅读并同意用户协议'))
  } else {
    callback()
  }
}

const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在3到20个字符之间', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, message: '用户名只能包含字母、数字、下划线和中文', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在6到20个字符之间', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ],
  agreement: [
    { validator: validateAgreement, trigger: 'change' }
  ]
}

const checkPasswordStrength = () => {
  const password = registerForm.password
  let score = 0
  
  if (password.length >= 6) score += 20
  if (password.length >= 10) score += 20
  if (/[a-z]/.test(password)) score += 15
  if (/[A-Z]/.test(password)) score += 15
  if (/[0-9]/.test(password)) score += 15
  if (/[^a-zA-Z0-9]/.test(password)) score += 15
  
  passwordStrength.percent = Math.min(score, 100)
  
  if (score < 40) {
    passwordStrength.level = 'weak'
    passwordStrength.text = '弱'
  } else if (score < 70) {
    passwordStrength.level = 'medium'
    passwordStrength.text = '中'
  } else {
    passwordStrength.level = 'strong'
    passwordStrength.text = '强'
  }
}

const showAgreement = (type) => {
  agreementType.value = type
  showAgreementDialog.value = true
}

const handleRegister = async () => {
  try {
    await registerFormRef.value.validate()
  } catch {
    return
  }
  
  loading.value = true
  try {
    await userStore.register({
      username: registerForm.username,
      email: registerForm.email,
      password: registerForm.password
    })
    ElMessage.success('注册成功，请登录')
    router.push('/login')
  } catch (error) {
    const errorMsg = typeof error.response?.data === 'string' 
      ? error.response.data 
      : (error.response?.data?.message || '注册失败')
    ElMessage.error(errorMsg)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  position: relative;
  overflow: hidden;
}

.register-background {
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
  right: -200px;
  animation-delay: 0s;
}

.bg-shape-2 {
  width: 400px;
  height: 400px;
  background: white;
  bottom: -100px;
  left: -100px;
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

.register-content {
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

.register-left {
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

.benefits-list {
  text-align: left;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(10px);
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.benefit-item:last-child {
  border-bottom: none;
}

.benefit-item .el-icon {
  font-size: 20px;
  color: #4ade80;
}

.benefit-item span {
  font-size: 15px;
  font-weight: 500;
}

.register-right {
  flex: 1;
  max-width: 420px;
}

.register-card {
  border-radius: 24px;
  border: none;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
}

.register-card :deep(.el-card__body) {
  padding: 40px;
}

.card-header {
  text-align: center;
  margin-bottom: 32px;
}

.register-title {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 8px;
}

.register-subtitle {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.register-form :deep(.el-input__wrapper) {
  border-radius: 12px;
  padding: 4px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.register-form :deep(.el-input__wrapper:hover) {
  border-color: #667eea;
}

.register-form :deep(.el-input__wrapper.is-focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.register-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.password-strength {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.strength-bar {
  flex: 1;
  height: 4px;
  background: #e4e7ed;
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.strength-fill.weak {
  background: #f56c6c;
}

.strength-fill.medium {
  background: #e6a23c;
}

.strength-fill.strong {
  background: #67c23a;
}

.strength-text {
  font-size: 12px;
  font-weight: 500;
}

.strength-text.weak {
  color: #f56c6c;
}

.strength-text.medium {
  color: #e6a23c;
}

.strength-text.strong {
  color: #67c23a;
}

.agreement-checkbox {
  font-size: 13px;
}

.agreement-checkbox :deep(.el-checkbox__label) {
  font-size: 13px;
  color: #606266;
}

.register-btn {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: all 0.3s ease;
}

.register-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.register-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.register-footer {
  text-align: center;
  color: #909399;
  font-size: 14px;
  margin-top: 20px;
}

.login-link {
  color: #667eea;
  font-weight: 600;
  text-decoration: none;
  margin-left: 4px;
  transition: color 0.3s ease;
}

.login-link:hover {
  color: #764ba2;
}

.agreement-dialog :deep(.el-dialog__header) {
  padding: 20px 24px;
  border-bottom: 1px solid #e4e7ed;
}

.agreement-dialog :deep(.el-dialog__body) {
  padding: 24px;
  max-height: 400px;
  overflow-y: auto;
}

.agreement-content h4 {
  color: #303133;
  margin: 16px 0 8px;
  font-size: 15px;
}

.agreement-content h4:first-child {
  margin-top: 0;
}

.agreement-content p {
  color: #606266;
  font-size: 14px;
  line-height: 1.8;
  margin: 4px 0;
}

@media (max-width: 900px) {
  .register-content {
    flex-direction: column-reverse;
    gap: 40px;
    padding: 20px;
  }
  
  .register-left {
    max-width: 100%;
  }
  
  .brand-title {
    font-size: 32px;
  }
  
  .benefits-list {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .register-card :deep(.el-card__body) {
    padding: 24px;
  }
  
  .register-title {
    font-size: 24px;
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
