<template>
  <div class="checkin-page">
    <div class="page-header">
      <h1>积分签到</h1>
      <p>每日签到获取积分，兑换精彩奖励</p>
    </div>

    <div class="checkin-main">
      <div class="checkin-card">
        <div class="checkin-status" :class="{ 'checked-in': hasCheckedIn }">
          <div class="status-icon">
            <el-icon v-if="hasCheckedIn"><CircleCheck /></el-icon>
            <el-icon v-else><Calendar /></el-icon>
          </div>
          <h2>{{ hasCheckedIn ? '今日已签到' : '今日未签到' }}</h2>
          <p v-if="hasCheckedIn">明天再来吧~</p>
          <p v-else>点击下方按钮签到获取积分</p>
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
            <span class="stat-value">{{ checkinStats.totalPoints }}</span>
            <span class="stat-label">获得积分</span>
          </div>
        </div>

        <el-button 
          type="primary" 
          size="large" 
          class="checkin-btn"
          :disabled="hasCheckedIn"
          @click="handleCheckin"
        >
          {{ hasCheckedIn ? '已签到' : '立即签到' }}
        </el-button>
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
            <div class="calendar-cell" :class="{ 'checked': isCheckinDay(data.day) }">
              {{ data.day.split('-')[2] }}
              <el-icon v-if="isCheckinDay(data.day)" class="check-icon"><CircleCheck /></el-icon>
            </div>
          </template>
        </el-calendar>
      </div>
    </div>

    <div class="rewards-section">
      <h3>积分奖励规则</h3>
      <div class="rewards-grid">
        <div class="reward-item">
          <div class="reward-icon basic">
            <el-icon><Calendar /></el-icon>
          </div>
          <div class="reward-info">
            <h4>基础签到</h4>
            <p>+5 积分/天</p>
          </div>
        </div>
        <div class="reward-item">
          <div class="reward-icon continuous">
            <el-icon><Trophy /></el-icon>
          </div>
          <div class="reward-info">
            <h4>连续7天</h4>
            <p>额外 +20 积分</p>
          </div>
        </div>
        <div class="reward-item">
          <div class="reward-icon monthly">
            <el-icon><Medal /></el-icon>
          </div>
          <div class="reward-info">
            <h4>连续30天</h4>
            <p>额外 +100 积分</p>
          </div>
        </div>
        <div class="reward-item">
          <div class="reward-icon special">
            <el-icon><Present /></el-icon>
          </div>
          <div class="reward-info">
            <h4>特殊节日</h4>
            <p>双倍积分</p>
          </div>
        </div>
      </div>
    </div>

    <div class="points-shop">
      <h3>积分商城</h3>
      <div class="shop-grid">
        <div v-for="item in shopItems" :key="item.id" class="shop-item">
          <div class="item-image">
            <el-icon><Present /></el-icon>
          </div>
          <div class="item-info">
            <h4>{{ item.name }}</h4>
            <p>{{ item.description }}</p>
            <div class="item-footer">
              <span class="item-points">{{ item.points }} 积分</span>
              <el-button type="primary" size="small" :disabled="userPoints < item.points">
                兑换
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import { Calendar, CircleCheck, Trophy, Medal, Present, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

const userStore = useUserStore()
const hasCheckedIn = ref(false)
const calendarDate = ref(new Date())
const userPoints = ref(150)

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const checkinStats = reactive({
  continuousDays: 7,
  totalDays: 45,
  totalPoints: 320
})

const checkinDays = ref(['2026-03-28', '2026-03-27', '2026-03-26', '2026-03-25', '2026-03-24', '2026-03-23', '2026-03-22'])

const shopItems = ref([
  { id: 1, name: 'VIP会员7天', description: '享受VIP专属特权', points: 100 },
  { id: 2, name: '专属头像框', description: '个性化你的头像', points: 200 },
  { id: 3, name: '积分加倍卡', description: '下次签到双倍积分', points: 50 },
  { id: 4, name: '专属勋章', description: '展示你的成就', points: 300 }
])

const isCheckinDay = (day) => {
  return checkinDays.value.includes(day)
}

const formatCalendarTitle = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  return `${year}年${month}月`
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

const handleCheckin = () => {
  if (hasCheckedIn.value) return
  
  hasCheckedIn.value = true
  checkinStats.continuousDays += 1
  checkinStats.totalDays += 1
  checkinStats.totalPoints += 5
  userPoints.value += 5
  
  const today = new Date().toISOString().split('T')[0]
  checkinDays.value.unshift(today)
  
  ElMessage.success('签到成功！获得5积分')
}

onMounted(() => {
  const today = new Date().toISOString().split('T')[0]
  hasCheckedIn.value = checkinDays.value.includes(today)
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
  gap: 40px;
  margin-bottom: 24px;
  width: 100%;
  padding: 20px 0;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
}

.stat-item {
  text-align: center;
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
  width: 200px;
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

.calendar-card :deep(.el-calendar-table th:nth-child(1))::after {
  content: '日';
  font-size: 13px;
}

.calendar-card :deep(.el-calendar-table th:nth-child(2))::after {
  content: '一';
  font-size: 13px;
}

.calendar-card :deep(.el-calendar-table th:nth-child(3))::after {
  content: '二';
  font-size: 13px;
}

.calendar-card :deep(.el-calendar-table th:nth-child(4))::after {
  content: '三';
  font-size: 13px;
}

.calendar-card :deep(.el-calendar-table th:nth-child(5))::after {
  content: '四';
  font-size: 13px;
}

.calendar-card :deep(.el-calendar-table th:nth-child(6))::after {
  content: '五';
  font-size: 13px;
}

.calendar-card :deep(.el-calendar-table th:nth-child(7))::after {
  content: '六';
  font-size: 13px;
}

.calendar-card :deep(.el-calendar-table td) {
  border: none;
  padding: 0;
}

.calendar-card :deep(.el-calendar-day) {
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.calendar-card :deep(.el-calendar-day:hover) {
  background: var(--bg-tertiary);
}

.calendar-cell {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.calendar-cell.checked {
  color: var(--primary-color);
  font-weight: 600;
}

.check-icon {
  position: absolute;
  bottom: 2px;
  right: 2px;
  font-size: 10px;
  color: var(--success-color);
}

.rewards-section, .points-shop {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 24px;
  box-shadow: var(--card-shadow);
  margin-bottom: 24px;
}

.rewards-section h3, .points-shop h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.reward-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 16px;
  transition: all 0.3s ease;
}

.reward-item:hover {
  background: var(--bg-tertiary);
  transform: translateY(-2px);
}

.reward-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.reward-icon.basic {
  background: var(--primary-gradient);
}

.reward-icon.continuous {
  background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
}

.reward-icon.monthly {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.reward-icon.special {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.reward-icon .el-icon {
  font-size: 24px;
  color: white;
}

.reward-info h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.reward-info p {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.shop-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.shop-item {
  background: var(--bg-secondary);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.shop-item:hover {
  transform: translateY(-4px);
  box-shadow: var(--card-shadow);
}

.item-image {
  height: 100px;
  background: var(--primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-image .el-icon {
  font-size: 40px;
  color: white;
}

.item-info {
  padding: 16px;
}

.item-info h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.item-info p {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 12px;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-points {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary-color);
}

@media (max-width: 1024px) {
  .checkin-main {
    grid-template-columns: 1fr;
  }

  .rewards-grid, .shop-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .checkin-page {
    padding: 16px;
  }

  .rewards-grid, .shop-grid {
    grid-template-columns: 1fr;
  }

  .checkin-stats {
    gap: 20px;
  }
}
</style>
