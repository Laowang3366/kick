<template>
  <div class="checkin-page">
    <div class="page-header">
      <h1>每日签到</h1>
      <p>每天可签到一次，随机获得 1-20 点经验</p>
    </div>

    <div class="checkin-main">
      <div class="checkin-card">
        <div class="checkin-status" :class="{ 'checked-in': hasCheckedIn }">
          <div class="status-icon">
            <el-icon v-if="hasCheckedIn"><CircleCheck /></el-icon>
            <el-icon v-else><Calendar /></el-icon>
          </div>
          <h2>{{ hasCheckedIn ? '今日已签到' : '今日未签到' }}</h2>
          <p v-if="hasCheckedIn">今天已领取 {{ todayExp }} 点经验，明天再来吧</p>
          <p v-else>点击下方按钮签到，随机获得经验奖励</p>
        </div>

        <div class="checkin-stats">
          <div class="stat-item">
            <span class="stat-value">{{ checkinStats.continuousDays }}</span>
            <span class="stat-label">连续签到</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ checkinStats.totalDays }}</span>
            <span class="stat-label">累计签到</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ checkinStats.totalExp }}</span>
            <span class="stat-label">签到经验</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ expProgressText }}</span>
            <span class="stat-label">当前经验</span>
          </div>
        </div>

        <el-button
          type="primary"
          size="large"
          class="checkin-btn"
          :disabled="hasCheckedIn || loading"
          :loading="loading"
          @click="handleCheckin"
        >
          {{ hasCheckedIn ? '已签到' : '立即签到' }}
        </el-button>
        <div class="checkin-tip">经验奖励范围：{{ expRange.min }} - {{ expRange.max }}</div>
      </div>

      <div class="calendar-card">
        <h3>签到日历</h3>
        <el-calendar v-model="calendarDate">
          <template #header="{ date }">
            <div class="calendar-header">
              <el-button size="small" @click="selectPrevMonth">
                <el-icon><ArrowLeft /></el-icon>
              </el-button>
              <span class="calendar-title">{{ formatCalendarTitle(date) }}</span>
              <el-button size="small" @click="selectNextMonth">
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </template>
          <template #date-cell="{ data }">
            <div class="calendar-cell" :class="{ checked: isCheckinDay(data.day) }">
              {{ data.day.split('-')[2] }}
              <el-icon v-if="isCheckinDay(data.day)" class="check-icon"><CircleCheck /></el-icon>
            </div>
          </template>
        </el-calendar>
      </div>
    </div>

    <div class="rewards-section">
      <h3>签到说明</h3>
      <div class="rewards-grid">
        <div class="reward-item">
          <div class="reward-icon basic">
            <el-icon><Calendar /></el-icon>
          </div>
          <div class="reward-info">
            <h4>每日一次</h4>
            <p>每天只能签到一次</p>
          </div>
        </div>
        <div class="reward-item">
          <div class="reward-icon continuous">
            <el-icon><Trophy /></el-icon>
          </div>
          <div class="reward-info">
            <h4>随机经验</h4>
            <p>每次获得 1-20 点经验</p>
          </div>
        </div>
        <div class="reward-item">
          <div class="reward-icon monthly">
            <el-icon><Medal /></el-icon>
          </div>
          <div class="reward-info">
            <h4>连续签到</h4>
            <p>连续天数会自动累计</p>
          </div>
        </div>
        <div class="reward-item">
          <div class="reward-icon special">
            <el-icon><Present /></el-icon>
          </div>
          <div class="reward-info">
            <h4>等级成长</h4>
            <p>签到经验会直接计入等级进度</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, Calendar, CircleCheck, Medal, Present, Trophy } from '@element-plus/icons-vue'
import api from '../api'

const userStore = useUserStore()
const hasCheckedIn = ref(false)
const calendarDate = ref(new Date())
const loading = ref(false)
const todayExp = ref(0)
const expProgress = ref(null)
const expRange = reactive({
  min: 1,
  max: 20
})

const checkinStats = reactive({
  continuousDays: 0,
  totalDays: 0,
  totalExp: 0
})

const checkinDays = ref([])

const currentMonth = computed(() => {
  const year = calendarDate.value.getFullYear()
  const month = `${calendarDate.value.getMonth() + 1}`.padStart(2, '0')
  return `${year}-${month}`
})

const expProgressText = computed(() => {
  if (!expProgress.value) return '--'
  if (expProgress.value.maxLevel) {
    return `${expProgress.value.exp}/MAX`
  }
  return `${expProgress.value.currentInLevel}/${expProgress.value.totalInLevel}`
})

const isCheckinDay = (day) => checkinDays.value.includes(day)

const formatCalendarTitle = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
}

const selectPrevMonth = () => {
  const d = new Date(calendarDate.value)
  d.setMonth(d.getMonth() - 1)
  calendarDate.value = d
}

const selectNextMonth = () => {
  const d = new Date(calendarDate.value)
  d.setMonth(d.getMonth() + 1)
  calendarDate.value = d
}

const fetchCheckinStatus = async () => {
  loading.value = true
  try {
    const response = await api.get('/checkin/status', { params: { month: currentMonth.value } })
    hasCheckedIn.value = !!response.hasCheckedInToday
    todayExp.value = Number(response.todayExp || 0)
    checkinStats.continuousDays = Number(response.continuousDays || 0)
    checkinStats.totalDays = Number(response.totalDays || 0)
    checkinStats.totalExp = Number(response.totalExp || 0)
    checkinDays.value = response.checkinDates || []
    expRange.min = Number(response.expMin || 1)
    expRange.max = Number(response.expMax || 20)
    expProgress.value = response.expProgress || null
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '获取签到状态失败')
  } finally {
    loading.value = false
  }
}

const handleCheckin = async () => {
  if (hasCheckedIn.value || loading.value) return
  loading.value = true
  try {
    const response = await api.post('/checkin')
    hasCheckedIn.value = true
    todayExp.value = Number(response.gainedExp || 0)
    checkinStats.continuousDays = Number(response.continuousDays || 0)
    checkinStats.totalDays = Number(response.totalDays || 0)
    checkinStats.totalExp = Number(response.totalExp || 0)
    expProgress.value = response.expProgress || null
    const today = new Date().toISOString().split('T')[0]
    if (!checkinDays.value.includes(today)) {
      checkinDays.value = [...checkinDays.value, today].sort()
    }
    await userStore.fetchUserInfo()
    ElMessage.success(`签到成功，获得 ${todayExp.value} 点经验`)
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '签到失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCheckinStatus()
})

watch(currentMonth, () => {
  fetchCheckinStatus()
})
</script>

<style scoped>
.checkin-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
  padding: 32px;
  background: var(--primary-gradient);
  border-radius: 24px;
  color: white;
}

.page-header h1 {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}

.page-header p {
  font-size: 16px;
  opacity: 0.9;
}

.checkin-main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 32px;
}

.checkin-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 32px;
  box-shadow: var(--card-shadow);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.checkin-status {
  text-align: center;
  margin-bottom: 24px;
}

.checkin-status.checked-in {
  color: var(--success-color);
}

.status-icon {
  width: 80px;
  height: 80px;
  background: var(--bg-tertiary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.checkin-status.checked-in .status-icon {
  background: linear-gradient(135deg, var(--success-color) 0%, #34d399 100%);
}

.status-icon .el-icon {
  font-size: 40px;
  color: var(--text-secondary);
}

.checkin-status.checked-in .status-icon .el-icon {
  color: white;
}

.checkin-status h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.checkin-status p {
  font-size: 14px;
  color: var(--text-tertiary);
}

.checkin-stats {
  display: flex;
  justify-content: center;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 24px;
  width: 100%;
  padding: 20px 0;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
}

.stat-item {
  text-align: center;
  min-width: 100px;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-color);
}

.stat-label {
  font-size: 13px;
  color: var(--text-tertiary);
}

.checkin-btn {
  width: 220px;
  height: 48px;
  font-size: 16px;
  border-radius: 24px;
  background: var(--primary-gradient);
  border: none;
}

.checkin-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.checkin-btn:disabled {
  background: var(--bg-tertiary);
  color: var(--text-disabled);
}

.checkin-tip {
  margin-top: 14px;
  font-size: 13px;
  color: var(--text-secondary);
}

.calendar-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 24px;
  box-shadow: var(--card-shadow);
}

.calendar-card h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 12px;
}

.calendar-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.calendar-header .el-button {
  background: var(--bg-secondary);
  border: none;
  color: var(--text-secondary);
}

.calendar-header .el-button:hover {
  background: var(--bg-tertiary);
  color: var(--primary-color);
}

.calendar-card :deep(.el-calendar-table) {
  border-collapse: separate;
  border-spacing: 4px;
}

.calendar-card :deep(.el-calendar-table thead) {
  display: table-header-group;
}

.calendar-card :deep(.el-calendar-table th) {
  padding: 8px 0;
  font-size: 0;
  font-weight: 600;
  color: var(--text-secondary);
  text-align: center;
  background: var(--bg-secondary);
  border: none;
  position: relative;
}

.calendar-card :deep(.el-calendar-table th:nth-child(1))::after { content: '日'; font-size: 13px; }
.calendar-card :deep(.el-calendar-table th:nth-child(2))::after { content: '一'; font-size: 13px; }
.calendar-card :deep(.el-calendar-table th:nth-child(3))::after { content: '二'; font-size: 13px; }
.calendar-card :deep(.el-calendar-table th:nth-child(4))::after { content: '三'; font-size: 13px; }
.calendar-card :deep(.el-calendar-table th:nth-child(5))::after { content: '四'; font-size: 13px; }
.calendar-card :deep(.el-calendar-table th:nth-child(6))::after { content: '五'; font-size: 13px; }
.calendar-card :deep(.el-calendar-table th:nth-child(7))::after { content: '六'; font-size: 13px; }

.calendar-card :deep(.el-calendar-table td) {
  border: none;
  background: transparent;
}

.calendar-card :deep(.el-calendar-day) {
  height: 64px;
  padding: 0;
}

.calendar-cell {
  height: 100%;
  border-radius: 14px;
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-weight: 500;
  color: var(--text-primary);
}

.calendar-cell.checked {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.check-icon {
  font-size: 14px;
}

.rewards-section {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 32px;
  box-shadow: var(--card-shadow);
}

.rewards-section h3 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 24px;
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 18px;
}

.reward-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.reward-icon.basic { background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%); }
.reward-icon.continuous { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
.reward-icon.monthly { background: linear-gradient(135deg, #34d399 0%, #059669 100%); }
.reward-icon.special { background: linear-gradient(135deg, #f472b6 0%, #db2777 100%); }

.reward-icon .el-icon {
  font-size: 26px;
  color: white;
}

.reward-info h4 {
  margin: 0 0 6px;
  font-size: 17px;
  color: var(--text-primary);
}

.reward-info p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .checkin-page {
    padding: 16px;
  }

  .checkin-main {
    grid-template-columns: 1fr;
  }

  .checkin-card,
  .calendar-card,
  .rewards-section {
    padding: 20px;
  }
}
</style>
