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
import { Calendar, CircleCheck, Trophy, Medal, Present } from '@element-plus/icons-vue'

const userStore = useUserStore()
const hasCheckedIn = ref(false)
const calendarDate = ref(new Date())
const userPoints = ref(150)

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
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
  padding: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  background: white;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.checkin-status {
  text-align: center;
  margin-bottom: 24px;
}

.checkin-status.checked-in {
  color: #67c23a;
}

.status-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #f0f2ff 0%, #e8ebff 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.checkin-status.checked-in .status-icon {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
}

.status-icon .el-icon {
  font-size: 40px;
  color: #667eea;
}

.checkin-status.checked-in .status-icon .el-icon {
  color: white;
}

.checkin-status h2 {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
}

.checkin-status p {
  font-size: 14px;
  color: #95a5a6;
}

.checkin-stats {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-bottom: 24px;
  width: 100%;
  padding: 20px 0;
  border-top: 1px solid #f0f2ff;
  border-bottom: 1px solid #f0f2ff;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #667eea;
}

.stat-label {
  font-size: 13px;
  color: #95a5a6;
}

.checkin-btn {
  width: 200px;
  height: 48px;
  font-size: 16px;
  border-radius: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.checkin-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.checkin-btn:disabled {
  background: #e0e0e0;
}

.calendar-card {
  background: white;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.1);
}

.calendar-card h3 {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 16px;
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
  color: #667eea;
  font-weight: 600;
}

.check-icon {
  position: absolute;
  bottom: 2px;
  right: 2px;
  font-size: 10px;
  color: #67c23a;
}

.rewards-section, .points-shop {
  background: white;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.1);
  margin-bottom: 24px;
}

.rewards-section h3, .points-shop h3 {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
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
  background: #f8f9ff;
  border-radius: 16px;
  transition: all 0.3s ease;
}

.reward-item:hover {
  background: #f0f2ff;
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.reward-icon.continuous {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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
  color: #2c3e50;
  margin-bottom: 4px;
}

.reward-info p {
  font-size: 13px;
  color: #667eea;
  font-weight: 500;
}

.shop-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.shop-item {
  background: #f8f9ff;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.shop-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
}

.item-image {
  height: 100px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  color: #2c3e50;
  margin-bottom: 4px;
}

.item-info p {
  font-size: 12px;
  color: #95a5a6;
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
  color: #667eea;
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
