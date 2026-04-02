<template>
  <div class="settings-page">
    <div class="page-header">
      <el-button class="back-btn" @click="$router.back()" circle>
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <h1>账户设置</h1>
    </div>

    <el-card class="settings-card">
      <el-tabs v-model="activeTab" tab-position="left">
        <el-tab-pane label="修改邮箱" name="email">
          <div class="settings-section">
            <h3>修改邮箱</h3>
            <p class="section-desc">更改您的登录邮箱地址</p>
            <el-form :model="emailForm" :rules="emailRules" ref="emailFormRef" label-width="100px">
              <el-form-item label="当前邮箱">
                <el-input :value="userStore.user.email" disabled />
              </el-form-item>
              <el-form-item label="新邮箱" prop="newEmail">
                <el-input v-model="emailForm.newEmail" placeholder="请输入新邮箱地址" />
              </el-form-item>
              <el-form-item label="确认密码" prop="password">
                <el-input v-model="emailForm.password" type="password" placeholder="请输入当前密码确认身份" show-password />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handleEmailChange" :loading="emailLoading">
                  保存修改
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="修改密码" name="password">
          <div class="settings-section">
            <h3>修改密码</h3>
            <p class="section-desc">定期更改密码可以提高账户安全性</p>
            <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="100px">
              <el-form-item label="当前密码" prop="oldPassword">
                <el-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入当前密码" show-password />
              </el-form-item>
              <el-form-item label="新密码" prop="newPassword">
                <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码（至少6位）" show-password />
              </el-form-item>
              <el-form-item label="确认密码" prop="confirmPassword">
                <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handlePasswordChange" :loading="passwordLoading">
                  保存修改
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="隐私设置" name="privacy">
          <div class="settings-section">
            <h3>隐私设置</h3>
            <p class="section-desc">控制您的个人信息可见性</p>
            <div class="privacy-options">
              <div class="privacy-item">
                <div class="privacy-info">
                  <span class="privacy-label">公开个人资料</span>
                  <span class="privacy-desc">允许其他用户查看您的个人资料页面</span>
                </div>
                <el-switch v-model="privacySettings.publicProfile" @change="handlePrivacyChange" />
              </div>
              <div class="privacy-item">
                <div class="privacy-info">
                  <span class="privacy-label">显示在线状态</span>
                  <span class="privacy-desc">允许其他用户看到您的在线状态</span>
                </div>
                <el-switch v-model="privacySettings.showOnlineStatus" @change="handlePrivacyChange" />
              </div>
              <div class="privacy-item">
                <div class="privacy-info">
                  <span class="privacy-label">允许私信</span>
                  <span class="privacy-desc">允许其他用户向您发送私信</span>
                </div>
                <el-switch v-model="privacySettings.allowMessages" @change="handlePrivacyChange" />
              </div>
              <div class="privacy-item">
                <div class="privacy-info">
                  <span class="privacy-label">显示关注列表</span>
                  <span class="privacy-desc">允许其他用户查看您的关注列表</span>
                </div>
                <el-switch v-model="privacySettings.showFollowing" @change="handlePrivacyChange" />
              </div>
              <div class="privacy-item">
                <div class="privacy-info">
                  <span class="privacy-label">显示粉丝列表</span>
                  <span class="privacy-desc">允许其他用户查看您的粉丝列表</span>
                </div>
                <el-switch v-model="privacySettings.showFollowers" @change="handlePrivacyChange" />
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import api from '../api'

const userStore = useUserStore()
const activeTab = ref('email')

const emailFormRef = ref(null)
const passwordFormRef = ref(null)

const emailLoading = ref(false)
const passwordLoading = ref(false)

const emailForm = reactive({
  newEmail: '',
  password: ''
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const privacySettings = reactive({
  publicProfile: true,
  showOnlineStatus: true,
  allowMessages: true,
  showFollowing: true,
  showFollowers: true
})

const validateEmail = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入新邮箱'))
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    callback(new Error('请输入有效的邮箱地址'))
  } else if (value === userStore.user.email) {
    callback(new Error('新邮箱不能与当前邮箱相同'))
  } else {
    callback()
  }
}

const validatePass = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入新密码'))
  } else if (value.length < 6) {
    callback(new Error('密码长度至少6位'))
  } else {
    if (passwordForm.confirmPassword) {
      passwordFormRef.value.validateField('confirmPassword')
    }
    callback()
  }
}

const validatePass2 = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请再次输入密码'))
  } else if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入密码不一致'))
  } else {
    callback()
  }
}

const emailRules = {
  newEmail: [{ validator: validateEmail, trigger: 'blur' }],
  password: [{ required: true, message: '请输入当前密码', trigger: 'blur' }]
}

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [{ validator: validatePass, trigger: 'blur' }],
  confirmPassword: [{ validator: validatePass2, trigger: 'blur' }]
}

const handleEmailChange = async () => {
  if (!emailFormRef.value) return
  
  await emailFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    emailLoading.value = true
    try {
      await api.put('/auth/email', {
        newEmail: emailForm.newEmail,
        password: emailForm.password
      })
      ElMessage.success('邮箱修改成功')
      userStore.user.email = emailForm.newEmail
      emailForm.newEmail = ''
      emailForm.password = ''
      emailFormRef.value.resetFields()
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '邮箱修改失败')
    } finally {
      emailLoading.value = false
    }
  })
}

const handlePasswordChange = async () => {
  if (!passwordFormRef.value) return
  
  await passwordFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    passwordLoading.value = true
    try {
      await api.put('/auth/password', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      })
      ElMessage.success('密码修改成功')
      passwordForm.oldPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
      passwordFormRef.value.resetFields()
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '密码修改失败')
    } finally {
      passwordLoading.value = false
    }
  })
}

const handlePrivacyChange = async () => {
  try {
    await api.put('/users/privacy', privacySettings)
    ElMessage.success('隐私设置已保存')
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const fetchPrivacySettings = async () => {
  try {
    const response = await api.get('/users/privacy')
    Object.assign(privacySettings, response)
  } catch (error) {
    console.error('获取隐私设置失败:', error)
  }
}

onMounted(() => {
  fetchPrivacySettings()
})
</script>

<style scoped>
.settings-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 24px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24px;
  color: white;
}

.back-btn {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  color: rgba(255, 255, 255, 0.85) !important;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.25) !important;
  border-color: rgba(255, 255, 255, 0.5) !important;
  color: white !important;
  transform: translateX(-2px);
}

.page-header h1 {
  flex: 1;
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.settings-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: var(--card-shadow);
}

.settings-card :deep(.el-card__body) {
  padding: 0;
}

.settings-card :deep(.el-tabs__header) {
  margin: 0;
}

.settings-card :deep(.el-tabs__nav-wrap) {
  padding: 20px 0;
}

.settings-card :deep(.el-tabs__nav-scroll) {
  padding: 0 16px;
}

.settings-card :deep(.el-tabs__item) {
  height: 48px;
  line-height: 48px;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 0 20px;
  transition: all 0.3s ease;
}

.settings-card :deep(.el-tabs__item:hover) {
  color: var(--primary-color);
}

.settings-card :deep(.el-tabs__item.is-active) {
  color: var(--primary-color);
  background: rgba(102, 126, 234, 0.08);
  border-radius: 8px;
}

.settings-card :deep(.el-tabs__active-bar) {
  display: none;
}

.settings-card :deep(.el-tabs__content) {
  padding: 32px;
}

.settings-section {
  max-width: 500px;
}

.settings-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.section-desc {
  color: var(--text-tertiary);
  font-size: 14px;
  margin: 0 0 24px 0;
}

.privacy-options {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.privacy-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.privacy-item:hover {
  background: var(--bg-tertiary);
}

.privacy-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.privacy-label {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 15px;
}

.privacy-desc {
  font-size: 13px;
  color: var(--text-tertiary);
}

@media (max-width: 768px) {
  .settings-page {
    padding: 16px;
  }

  .page-header {
    padding: 16px 20px;
  }

  .page-header h1 {
    font-size: 20px;
  }

  .back-btn {
    width: 36px;
    height: 36px;
  }

  .settings-card :deep(.el-tabs__nav-scroll) {
    padding: 0;
  }

  .settings-card :deep(.el-tabs__content) {
    padding: 20px;
  }

  .settings-section {
    max-width: 100%;
  }

  .privacy-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
