<template>
  <div class="center-page">
    <section class="hero-panel">
      <div class="hero-main">
        <el-avatar :src="overview.user?.avatar" :size="88" class="hero-avatar">
          {{ overview.user?.username?.charAt(0) }}
        </el-avatar>
        <div class="hero-copy">
          <div class="hero-title-row">
            <h1>{{ overview.user?.username || userStore.username }}</h1>
            <el-tag v-if="genderTag" :type="genderTag.type" effect="light" round>{{ genderTag.label }}</el-tag>
            <el-tag :type="accountStatusTag" effect="dark" round>{{ overview.accountStatus?.label || '正常' }}</el-tag>
          </div>
          <div class="hero-meta">
            <LevelTag v-if="overview.user?.level" :level="overview.user.level" :points="overview.user.points" :role="overview.user.role" />
            <span v-if="overview.user?.email" class="hero-meta-item">{{ overview.user.email }}</span>
            <span class="hero-meta-item">加入时间 {{ formatTime(overview.user?.createTime) }}</span>
          </div>
          <p class="hero-bio">{{ overview.user?.bio || '还没有设置个性签名' }}</p>
          <div class="hero-tags" v-if="expertiseList.length">
            <el-tag v-for="tag in expertiseList" :key="tag" effect="plain" round>{{ tag }}</el-tag>
          </div>
        </div>
      </div>
      <div v-if="isSelfView || userStore.isAuthenticated" class="hero-actions">
        <template v-if="isSelfView">
        <el-button type="primary" @click="router.push('/post/create')">发布新帖</el-button>
        <el-button @click="showEditDialog = true">编辑资料</el-button>
        </template>
        <template v-else>
          <el-button
            v-if="!isFollowing"
            type="primary"
            :loading="followLoading"
            @click="handleFollow"
          >
            关注
          </el-button>
          <el-button
            v-else
            :loading="followLoading"
            @click="handleUnfollow"
          >
            已关注
          </el-button>
          <el-button v-if="canSendMessage" @click="sendMessage">私信</el-button>
        </template>
      </div>
      <div class="hero-status">
        <el-icon><InfoFilled /></el-icon>
        <span>{{ overview.accountStatus?.description || '当前账号状态正常。' }}</span>
      </div>
      <div class="hero-stats">
        <button
          v-for="card in statCards"
          :key="card.key"
          type="button"
          class="hero-stat hero-stat-button"
          @click="openStatDetail(card.key)"
        >
          <span class="hero-stat-value">{{ card.value }}</span>
          <span class="hero-stat-label">{{ card.label }}</span>
          <span class="hero-stat-hint">{{ card.hint }}</span>
        </button>
      </div>
    </section>

    <div class="center-layout">
      <div class="center-main">
        <el-card class="panel-card">
          <template #header>
            <div class="panel-header">
              <div>
                <div class="panel-title">内容管理</div>
                <div class="panel-subtitle">{{ contentSubtitle }}</div>
              </div>
            </div>
          </template>

          <el-tabs v-model="contentTab" class="content-tabs">
            <el-tab-pane :label="tabLabel('published')" name="published" />
            <el-tab-pane v-if="isSelfView" :label="tabLabel('pending')" name="pending" />
            <el-tab-pane v-if="isSelfView" :label="tabLabel('rejected')" name="rejected" />
            <el-tab-pane v-if="isSelfView" :label="tabLabel('drafts')" name="drafts" />
            <el-tab-pane :label="tabLabel('favorites')" name="favorites" />
            <el-tab-pane v-if="isSelfView" :label="tabLabel('replies')" name="replies" />
            <el-tab-pane v-if="isSelfView" :label="tabLabel('history')" name="history" />
            <el-tab-pane :label="tabLabel('following')" name="following" />
            <el-tab-pane :label="tabLabel('followers')" name="followers" />
            <el-tab-pane v-if="isSelfView" label="账号与隐私" name="privacy" />
          </el-tabs>

          <div v-loading="currentContent.loading" class="content-body">
            <template v-if="isPostTab">
              <div v-if="currentContent.records.length" class="item-list">
                <article v-for="post in currentContent.records" :key="post.id" class="content-item">
                  <div class="item-top">
                    <div>
                      <router-link :to="`/post/${post.id}`" class="item-title">{{ post.title }}</router-link>
                      <div class="item-meta">
                        <span>{{ post.category?.name || '未分类' }}</span>
                        <span>{{ formatTime(post.updateTime || post.createTime) }}</span>
                      </div>
                    </div>
                    <div class="item-tags">
                      <el-tag v-if="contentTab === 'pending'" type="warning" effect="light">待审核</el-tag>
                      <el-tag v-if="contentTab === 'rejected'" type="danger" effect="light">未通过</el-tag>
                      <el-tag v-if="post.isTop" type="danger" effect="light">置顶</el-tag>
                      <el-tag v-if="post.isEssence" type="success" effect="light">精华</el-tag>
                    </div>
                  </div>
                  <p class="item-preview">{{ stripText(post.content) }}</p>
                  <div class="item-footer">
                    <span>浏览 {{ post.viewCount || 0 }}</span>
                    <span>回复 {{ post.replyCount || 0 }}</span>
                    <span>收藏 {{ post.favoriteCount || 0 }}</span>
                    <span v-if="post.reviewReason">原因：{{ post.reviewReason }}</span>
                  </div>
                  <div class="item-actions">
                    <el-button size="small" @click="router.push(`/post/${post.id}`)">查看</el-button>
                    <el-button v-if="isSelfView" size="small" @click="router.push(`/post/${post.id}/edit`)">编辑</el-button>
                  </div>
                </article>
              </div>
            </template>

            <template v-else-if="contentTab === 'drafts'">
              <div v-if="currentContent.records.length" class="item-list">
                <article v-for="draft in currentContent.records" :key="draft.id" class="content-item">
                  <div class="item-top">
                    <div>
                      <div class="item-title">{{ draft.title || '未命名草稿' }}</div>
                      <div class="item-meta">
                        <span>{{ draft.status === 'editing' ? '继续编辑中' : '已暂存' }}</span>
                        <span>{{ formatTime(draft.updateTime || draft.createTime) }}</span>
                      </div>
                    </div>
                    <el-tag :type="draftExpireTag(draft)" effect="light">{{ draftExpireText(draft) }}</el-tag>
                  </div>
                  <p class="item-preview">{{ stripText(draft.content) }}</p>
                  <div class="item-footer">
                    <span>有效至 {{ formatTime(getDraftExpireTime(draft)) }}</span>
                  </div>
                  <div class="item-actions">
                    <el-button size="small" @click="router.push(`/drafts/${draft.id}/edit`)">继续编辑</el-button>
                    <el-button size="small" @click="router.push('/drafts')">查看草稿列表</el-button>
                  </div>
                </article>
              </div>
            </template>

            <template v-else-if="contentTab === 'replies'">
              <div v-if="currentContent.records.length" class="item-list">
                <article v-for="reply in currentContent.records" :key="reply.id" class="content-item">
                  <div class="item-top">
                    <div>
                      <router-link :to="`/post/${reply.post?.id}`" class="item-title">{{ reply.post?.title || '帖子已不存在' }}</router-link>
                      <div class="item-meta">
                        <span>{{ formatTime(reply.createdAt || reply.createTime) }}</span>
                      </div>
                    </div>
                  </div>
                  <p class="item-preview">{{ stripText(reply.content) }}</p>
                  <div class="item-actions">
                    <el-button size="small" @click="router.push(`/post/${reply.post?.id}`)">查看帖子</el-button>
                  </div>
                </article>
              </div>
            </template>

            <template v-else-if="contentTab === 'following' || contentTab === 'followers'">
              <div v-if="currentContent.records.length" class="item-list">
                <article v-for="user in currentContent.records" :key="user.id" class="content-item user-content-item">
                  <div class="user-content-main" @click="router.push(`/center/${user.id}`)">
                    <el-avatar :src="user.avatar" :size="52" class="user-content-avatar">
                      {{ user.username?.charAt(0) }}
                    </el-avatar>
                    <div class="user-content-copy">
                      <div class="item-title">{{ user.username }}</div>
                      <div class="item-meta">
                        <span>{{ user.bio || '这个人很懒，还没有留下签名' }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="item-actions">
                    <el-button size="small" @click="router.push(`/center/${user.id}`)">查看主页</el-button>
                    <el-button
                      v-if="isSelfView && contentTab === 'following'"
                      size="small"
                      type="danger"
                      plain
                      @click="cancelFollowing(user)"
                    >
                      取消关注
                    </el-button>
                  </div>
                </article>
              </div>
            </template>

            <template v-else-if="contentTab === 'privacy'">
              <div class="privacy-panel">
                <div class="privacy-panel-header">
                  <div class="content-overview-title">账号与隐私</div>
                  <div class="content-overview-subtitle">账户状态已经显示在上方，这里集中查看隐私开关</div>
                </div>
                <div class="privacy-list integrated-privacy-list">
                  <div class="privacy-row"><span>公开资料</span><el-tag :type="overview.privacy?.publicProfile ? 'success' : 'info'" effect="light">{{ overview.privacy?.publicProfile ? '已开启' : '已关闭' }}</el-tag></div>
                  <div class="privacy-row"><span>在线状态</span><el-tag :type="overview.privacy?.showOnlineStatus ? 'success' : 'info'" effect="light">{{ overview.privacy?.showOnlineStatus ? '可见' : '隐藏' }}</el-tag></div>
                  <div class="privacy-row"><span>私信权限</span><el-tag :type="overview.privacy?.allowMessages ? 'success' : 'warning'" effect="light">{{ overview.privacy?.allowMessages ? '允许接收' : '已关闭' }}</el-tag></div>
                  <div class="privacy-row"><span>关注列表</span><el-tag :type="overview.privacy?.showFollowing ? 'success' : 'info'" effect="light">{{ overview.privacy?.showFollowing ? '公开' : '隐藏' }}</el-tag></div>
                  <div class="privacy-row"><span>粉丝列表</span><el-tag :type="overview.privacy?.showFollowers ? 'success' : 'info'" effect="light">{{ overview.privacy?.showFollowers ? '公开' : '隐藏' }}</el-tag></div>
                </div>
              </div>
            </template>

            <template v-else>
              <div v-if="currentContent.records.length" class="item-list">
                <article v-for="post in currentContent.records" :key="post.id" class="content-item">
                  <div class="item-top">
                    <div>
                      <router-link :to="`/post/${post.id}`" class="item-title">{{ post.title }}</router-link>
                      <div class="item-meta">
                        <span>{{ post.category?.name || '未分类' }}</span>
                        <span>{{ formatTime(post.updateTime || post.createTime) }}</span>
                      </div>
                    </div>
                  </div>
                  <p class="item-preview">{{ stripText(post.content) }}</p>
                  <div class="item-footer">
                    <span>浏览 {{ post.viewCount || 0 }}</span>
                    <span>回复 {{ post.replyCount || 0 }}</span>
                  </div>
                  <div class="item-actions">
                    <el-button size="small" @click="router.push(`/post/${post.id}`)">查看</el-button>
                  </div>
                </article>
              </div>
            </template>

            <el-empty v-if="!currentContent.loading && !currentContent.records.length" :description="emptyText" />
          </div>

          <div class="panel-pagination" v-if="currentContent.total > currentContent.size">
            <el-pagination v-model:current-page="currentContent.page" :page-size="currentContent.size" :total="currentContent.total" layout="prev, pager, next" @current-change="loadCurrentContent" />
          </div>
        </el-card>

      </div>
    </div>

    <el-dialog v-model="showEditDialog" title="编辑资料" width="520px">
      <el-form :model="editForm" label-width="84px">
        <el-form-item label="头像">
          <div class="avatar-edit-wrapper">
            <div class="avatar-preview" @click="triggerAvatarUpload">
              <img v-if="editForm.avatar" :src="editForm.avatar" alt="头像预览" />
              <div v-else class="avatar-fallback">
                {{ editForm.username?.charAt(0) || overview.user?.username?.charAt(0) }}
              </div>
            </div>
            <el-upload
              ref="avatarUploadRef"
              class="avatar-upload-hidden"
              action="/api/upload"
              name="file"
              :headers="uploadHeaders"
              :show-file-list="false"
              :on-success="handleAvatarSuccess"
              :on-error="handleAvatarError"
              :before-upload="beforeAvatarUpload"
              :auto-upload="true"
            />
            <div class="avatar-edit-actions">
              <el-button type="primary" plain @click="triggerAvatarUpload">更换头像</el-button>
              <span class="avatar-hint">支持 JPG / PNG / GIF / WebP，大小不超过 2MB</span>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="editForm.username" maxlength="20" show-word-limit placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="个性签名">
          <el-input
            v-model="editForm.bio"
            type="textarea"
            :rows="4"
            maxlength="120"
            show-word-limit
            placeholder="写一句展示给大家的话"
          />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="editForm.gender">
            <el-radio value="">保密</el-radio>
            <el-radio value="male">男</el-radio>
            <el-radio value="female">女</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" :loading="savingProfile" @click="saveProfile">保存资料</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showStatDialog" :title="activeStatDetail.title" width="460px">
      <div class="stat-detail-card">
        <div class="stat-detail-value">{{ activeStatDetail.value }}</div>
        <div class="stat-detail-description">{{ activeStatDetail.description }}</div>
        <div class="stat-detail-list">
          <div v-for="item in activeStatDetail.items" :key="item.label" class="stat-detail-row">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showStatDialog = false">关闭</el-button>
        <el-button v-if="activeStatDetail.action" type="primary" @click="handleStatAction">
          {{ activeStatDetail.action.label }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import api from '../api'
import LevelTag from '../components/LevelTag.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const overview = ref({ user: {}, stats: {}, privacy: {}, accountStatus: {}, recentDraft: null, recentNotifications: [] })
const contentTab = ref('published')
const showEditDialog = ref(false)
const showStatDialog = ref(false)
const savingProfile = ref(false)
const avatarUploadRef = ref(null)
const activeStatKey = ref('following')
const followLoading = ref(false)
const isFollowing = ref(false)
const editForm = reactive({
  avatar: '',
  username: '',
  bio: '',
  gender: ''
})
const contentState = reactive({
  published: { page: 1, size: 6, total: 0, records: [], loading: false },
  pending: { page: 1, size: 6, total: 0, records: [], loading: false },
  rejected: { page: 1, size: 6, total: 0, records: [], loading: false },
  drafts: { page: 1, size: 6, total: 0, records: [], loading: false },
  favorites: { page: 1, size: 6, total: 0, records: [], loading: false },
  replies: { page: 1, size: 6, total: 0, records: [], loading: false },
  history: { page: 1, size: 6, total: 0, records: [], loading: false },
  following: { page: 1, size: 6, total: 0, records: [], loading: false },
  followers: { page: 1, size: 6, total: 0, records: [], loading: false },
  privacy: { page: 1, size: 6, total: 0, records: [], loading: false }
})

const routeProfileId = computed(() => {
  const rawId = route.params.id
  if (rawId === undefined || rawId === null || rawId === '') {
    return null
  }
  const parsed = Number(rawId)
  return Number.isNaN(parsed) ? null : parsed
})
const isSelfView = computed(() => routeProfileId.value == null || routeProfileId.value === Number(userStore.user?.id))
const isPublicView = computed(() => routeProfileId.value != null && !isSelfView.value)
const profileUserId = computed(() => routeProfileId.value || Number(userStore.user?.id || overview.value.user?.id || 0))
const currentContent = computed(() => contentState[contentTab.value])
const isPostTab = computed(() => ['published', 'pending', 'rejected'].includes(contentTab.value))
const canSendMessage = computed(() => !isSelfView.value && overview.value.user?.allowMessages !== false)
const canShowFollowing = computed(() => isSelfView.value || overview.value.privacy?.showFollowing !== false)
const canShowFollowers = computed(() => isSelfView.value || overview.value.privacy?.showFollowers !== false)
const contentSubtitle = computed(() => (
  isSelfView.value
    ? '统一查看已发布、待审核、未通过、草稿、收藏、回复和历史记录'
    : '查看该用户公开展示的已发布、收藏、关注和粉丝列表'
))
const expertiseList = computed(() => {
  const expertise = overview.value.user?.expertise
  if (Array.isArray(expertise)) return expertise
  if (typeof expertise === 'string' && expertise) return expertise.split(',').map(item => item.trim()).filter(Boolean)
  return []
})
const genderTag = computed(() => {
  if (overview.value.user?.gender === 'male') {
    return { label: '男', type: 'primary' }
  }
  if (overview.value.user?.gender === 'female') {
    return { label: '女', type: 'danger' }
  }
  return null
})
const accountStatusTag = computed(() => {
  const status = overview.value.accountStatus?.status
  if (status === 2) return 'danger'
  if (status === 1) return 'warning'
  return 'success'
})
const currentExperience = computed(() => {
  const progress = overview.value.expProgress
  if (progress) {
    return {
      current: Number(progress.currentInLevel || 0),
      total: progress.maxLevel ? 'MAX' : Number(progress.totalInLevel || 0),
      remaining: Number(progress.remainingExp || 0),
      totalExp: Number(progress.exp || 0),
      maxLevel: !!progress.maxLevel
    }
  }
  const exp = Number(overview.value.user?.exp || 0)
  const thresholds = [0, 100, 500, 1000, 5000, 10000]
  let currentIndex = 0
  for (let index = 0; index < thresholds.length; index += 1) {
    if (exp >= thresholds[index]) {
      currentIndex = index
    }
  }
  const currentThreshold = thresholds[currentIndex]
  const nextThreshold = thresholds[Math.min(currentIndex + 1, thresholds.length - 1)]
  if (currentIndex === thresholds.length - 1) {
    return {
      current: exp - currentThreshold,
      total: 'MAX',
      remaining: 0,
      totalExp: exp,
      maxLevel: true
    }
  }
  return {
    current: Math.max(exp - currentThreshold, 0),
    total: Math.max(nextThreshold - currentThreshold, 0),
    remaining: Math.max(nextThreshold - exp, 0),
    totalExp: exp,
    maxLevel: false
  }
})
const currentExperienceText = computed(() => `${currentExperience.value.current}/${currentExperience.value.total}`)
const statCards = computed(() => [
  {
    key: 'following',
    label: '关注',
    value: overview.value.stats?.followingCount || 0,
    hint: '查看关注详情'
  },
  {
    key: 'followers',
    label: '粉丝',
    value: overview.value.stats?.followerCount || 0,
    hint: '查看粉丝概况'
  },
  {
    key: 'likes',
    label: '获赞',
    value: overview.value.stats?.receivedLikeCount || 0,
    hint: '查看获赞详情'
  },
  {
    key: 'points',
    label: '积分',
    value: overview.value.user?.points || 0,
    hint: '查看积分说明'
  },
  {
    key: 'experience',
    label: '当前经验',
    value: currentExperienceText.value,
    hint: '查看升级进度'
  }
])
const activeStatDetail = computed(() => {
  const stats = overview.value.stats || {}
  const user = overview.value.user || {}
  switch (activeStatKey.value) {
    case 'following':
      return {
        title: '关注详情',
        value: stats.followingCount || 0,
        description: isSelfView.value ? '这里汇总了你当前关注的用户与板块情况。' : '这里汇总了该用户公开展示的关注信息。',
        items: [
          { label: '关注用户', value: stats.followingCount || 0 },
          { label: '关注板块', value: stats.categoryFollowCount || 0 }
        ],
        action: { label: '查看关注列表', type: 'following-tab' }
      }
    case 'followers':
      return {
        title: '粉丝详情',
        value: stats.followerCount || 0,
        description: isSelfView.value ? '这里展示当前关注你的用户数量。' : '这里展示当前关注该用户的公开粉丝数量。',
        items: [
          { label: '当前粉丝数', value: stats.followerCount || 0 },
          { label: '近七天新增', value: stats.recentFollowerCount || 0 }
        ],
        action: { label: '查看粉丝列表', type: 'followers-tab' }
      }
    case 'likes':
      return {
        title: '获赞详情',
        value: stats.receivedLikeCount || 0,
        description: '获赞数量由帖子获赞和回复获赞共同组成。',
        items: [
          { label: '帖子获赞', value: stats.postLikeCount || 0 },
          { label: '回复获赞', value: stats.replyLikeCount || 0 },
          { label: '总获赞', value: stats.receivedLikeCount || 0 }
        ],
        action: isSelfView.value ? { label: '查看点赞通知', type: 'notifications' } : null
      }
    case 'points':
      return {
        title: '积分详情',
        value: user.points || 0,
        description: '积分会随着发帖、回复、签到和练习等行为累计。',
        items: [
          { label: '当前积分', value: user.points || 0 },
          { label: '当前等级', value: user.level || '暂无等级' },
          { label: '未读消息', value: stats.unreadMessages || 0 }
        ],
        action: isSelfView.value ? { label: '前往签到', type: 'checkin' } : null
      }
    case 'experience':
      return {
        title: '经验详情',
        value: currentExperienceText.value,
        description: currentExperience.value.maxLevel
          ? '你已经处于最高经验阶段。'
          : '继续参与论坛互动和练习，可以更快提升等级。',
        items: [
          { label: '当前等级', value: user.level || '暂无等级' },
          { label: '累计经验', value: currentExperience.value.totalExp || 0 },
          { label: '当前阶段', value: currentExperienceText.value },
          {
            label: '升级还需',
            value: currentExperience.value.maxLevel
              ? '0'
              : currentExperience.value.remaining
          }
        ],
        action: null
      }
    default:
      return {
        title: '统计详情',
        value: '--',
        description: '',
        items: [],
        action: null
      }
  }
})
const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})
const emptyText = computed(() => ({
  published: '还没有已发布的帖子',
  pending: '当前没有待审核的帖子',
  rejected: '当前没有未通过的帖子',
  drafts: '当前没有草稿',
  favorites: '还没有收藏内容',
  replies: '还没有发表回复',
  history: '还没有浏览历史',
  following: canShowFollowing.value ? '还没有关注任何用户' : '对方已隐藏关注列表',
  followers: canShowFollowers.value ? '当前还没有粉丝' : '对方已隐藏粉丝列表',
  privacy: '暂无账号与隐私信息'
}[contentTab.value]))
const tabLabelMap = {
  published: '已发布',
  pending: '待审核',
  rejected: '未通过',
  drafts: '草稿',
  favorites: '收藏',
  replies: '回复',
  history: '历史',
  following: '我的关注',
  followers: '粉丝列表'
}
const tabCount = (tab) => {
  const stats = overview.value.stats || {}
  switch (tab) {
    case 'published':
      return Number(stats.publishedPosts || 0)
    case 'pending':
      return Number(stats.pendingPosts || 0)
    case 'rejected':
      return Number(stats.rejectedPosts || 0)
    case 'drafts':
      return Number(stats.draftCount || 0)
    case 'favorites':
      return Number(stats.favoriteCount || 0)
    case 'replies':
      return Number(stats.replyCount || 0)
    case 'history':
      return Number(stats.historyCount || 0)
    case 'following':
      return Number(stats.followingCount || 0)
    case 'followers':
      return Number(stats.followerCount || 0)
    default:
      return 0
  }
}
const tabDisplayName = (tab) => {
  if (tab === 'following' && isPublicView.value) {
    return '他的关注'
  }
  return tabLabelMap[tab]
}
const tabLabel = (tab) => `${tabDisplayName(tab)} (${tabCount(tab)})`
const openStatDetail = (key) => {
  activeStatKey.value = key
  showStatDialog.value = true
}
const handleStatAction = () => {
  const actionType = activeStatDetail.value.action?.type
  showStatDialog.value = false
  if (actionType === 'following-tab') {
    contentTab.value = 'following'
    return
  }
  if (actionType === 'followers-tab') {
    contentTab.value = 'followers'
    return
  }
  if (actionType === 'notifications') {
    router.push('/notifications')
    return
  }
  if (actionType === 'checkin') {
    router.push('/checkin')
    return
  }
  if (actionType === 'practice') {
    router.push('/practice')
  }
}

const formatTime = (value) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
const stripText = (content) => {
  const normalized = `${content || ''}`.replace(/```[\s\S]*?```/g, ' [代码块] ').replace(/!\[[^\]]*]\([^)]*\)/g, ' [图片] ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!normalized) return '暂无内容'
  return normalized.length > 120 ? `${normalized.slice(0, 120)}...` : normalized
}
const getDraftExpireTime = (draft) => {
  const base = new Date(draft.updateTime || draft.createTime)
  if (Number.isNaN(base.getTime())) return ''
  return new Date(base.getTime() + 10 * 24 * 60 * 60 * 1000)
}
const draftExpireText = (draft) => {
  const expireTime = getDraftExpireTime(draft)
  if (!expireTime) return '有效期未知'
  const days = Math.ceil((expireTime.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  if (days <= 0) return '即将清理'
  if (days === 1) return '剩余 1 天'
  return `剩余 ${days} 天`
}
const draftExpireTag = (draft) => {
  const expireTime = getDraftExpireTime(draft)
  if (!expireTime) return 'info'
  const days = Math.ceil((expireTime.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  if (days <= 2) return 'danger'
  if (days <= 5) return 'warning'
  return 'success'
}
const resetContentState = () => {
  Object.values(contentState).forEach(state => {
    state.page = 1
    state.total = 0
    state.records = []
    state.loading = false
  })
}
const fetchOverview = async () => {
  if (isSelfView.value) {
    overview.value = await api.get('/users/center/overview')
    return
  }
  overview.value = await api.get(`/users/${profileUserId.value}/center-overview`)
}
const loadCurrentContent = async () => {
  const state = currentContent.value
  state.loading = true
  try {
    const targetUserId = profileUserId.value
    if (!targetUserId) {
      state.records = []
      state.total = 0
      return
    }
    if (['published', 'pending', 'rejected'].includes(contentTab.value)) {
      const response = isSelfView.value
        ? await api.get('/users/center/posts', { params: { bucket: contentTab.value, page: state.page, limit: state.size } })
        : await api.get(`/users/${targetUserId}/posts`, { params: { page: state.page, limit: state.size } })
      state.records = response.records || []
      if (!isSelfView.value) {
        state.records = response.posts || []
      }
      state.total = response.total || 0
      return
    }
    if (contentTab.value === 'drafts') {
      const response = await api.get('/drafts', { params: { page: state.page, size: state.size, sort: 'latest' } })
      state.records = response.records || []
      state.total = response.total || 0
      return
    }
    if (contentTab.value === 'favorites') {
      const response = await api.get(`/users/${targetUserId}/favorites`, { params: { page: state.page, limit: state.size } })
      state.records = response.posts || []
      state.total = response.total || 0
      return
    }
    if (contentTab.value === 'replies') {
      const response = await api.get(`/users/${targetUserId}/replies`, { params: { page: state.page, limit: state.size } })
      state.records = response.replies || []
      state.total = response.total || 0
      return
    }
    if (contentTab.value === 'following') {
      if (!canShowFollowing.value) {
        state.records = []
        state.total = 0
        return
      }
      const response = await api.get(`/users/${targetUserId}/following`, { params: { page: state.page, limit: state.size } })
      state.records = response.users || []
      state.total = response.total || 0
      return
    }
    if (contentTab.value === 'followers') {
      if (!canShowFollowers.value) {
        state.records = []
        state.total = 0
        return
      }
      const response = await api.get(`/users/${targetUserId}/followers`, { params: { page: state.page, limit: state.size } })
      state.records = response.users || []
      state.total = response.total || 0
      return
    }
    if (contentTab.value === 'privacy') {
      state.records = [overview.value.privacy || {}]
      state.total = 1
      return
    }
    const response = await api.get(`/users/${userStore.user.id}/view-history`, { params: { page: state.page, limit: state.size } })
    state.records = response.posts || []
    state.total = response.total || 0
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载内容失败')
  } finally {
    state.loading = false
  }
}
const cancelFollowing = async (targetUser) => {
  try {
    await api.delete(`/users/${targetUser.id}/follow`)
    ElMessage.success('已取消关注')
    const followingState = contentState.following
    followingState.records = followingState.records.filter(user => user.id !== targetUser.id)
    followingState.total = Math.max((followingState.total || 0) - 1, 0)
    if (overview.value.stats) {
      overview.value.stats.followingCount = Math.max(Number(overview.value.stats.followingCount || 0) - 1, 0)
    }
    if (!followingState.records.length && followingState.page > 1) {
      followingState.page -= 1
      await loadCurrentContent()
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '取消关注失败')
  }
}
const checkFollowStatus = async () => {
  if (!isPublicView.value || !userStore.isAuthenticated || !profileUserId.value) {
    isFollowing.value = false
    return
  }
  try {
    const response = await api.get(`/users/${profileUserId.value}/is-following`)
    isFollowing.value = !!response.isFollowing
  } catch {
    isFollowing.value = false
  }
}
const refreshProfileData = async () => {
  await fetchOverview()
  await checkFollowStatus()
  await loadCurrentContent()
}
const handleFollow = async () => {
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  if (!profileUserId.value) {
    return
  }
  followLoading.value = true
  try {
    await api.post(`/users/${profileUserId.value}/follow`)
    ElMessage.success('关注成功')
    isFollowing.value = true
    await refreshProfileData()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '关注失败')
  } finally {
    followLoading.value = false
  }
}
const handleUnfollow = async () => {
  if (!profileUserId.value) {
    return
  }
  try {
    await ElMessageBox.confirm('确定要取消关注吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  followLoading.value = true
  try {
    await api.delete(`/users/${profileUserId.value}/follow`)
    ElMessage.success('已取消关注')
    isFollowing.value = false
    await refreshProfileData()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '取消关注失败')
  } finally {
    followLoading.value = false
  }
}
const sendMessage = () => {
  if (!profileUserId.value) {
    return
  }
  if (!canSendMessage.value) {
    ElMessage.warning('对方已关闭私信')
    return
  }
  router.push({ path: '/messages', query: { userId: profileUserId.value } })
}

const beforeAvatarUpload = (file) => {
  const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isImage) {
    ElMessage.error('头像只能是 JPG/PNG/GIF/WebP 格式')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('头像大小不能超过 2MB')
    return false
  }
  return true
}

const triggerAvatarUpload = () => {
  const uploadInput = avatarUploadRef.value?.$el?.querySelector('input[type="file"]')
  if (uploadInput) {
    uploadInput.click()
  }
}

const handleAvatarSuccess = (response) => {
  editForm.avatar = response.url
  ElMessage.success('头像上传成功')
}

const handleAvatarError = () => {
  ElMessage.error('头像上传失败，请重试')
}

const saveProfile = async () => {
  savingProfile.value = true
  try {
    await userStore.updateProfile({
      username: editForm.username,
      bio: editForm.bio,
      avatar: editForm.avatar,
      gender: editForm.gender || null
    })
    await fetchOverview()
    showEditDialog.value = false
    ElMessage.success('资料已更新')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '保存资料失败')
  } finally {
    savingProfile.value = false
  }
}

watch(contentTab, () => {
  contentState[contentTab.value].page = 1
  loadCurrentContent()
})

watch(showEditDialog, (visible) => {
  if (!visible) {
    return
  }
  editForm.avatar = overview.value.user?.avatar || ''
  editForm.username = overview.value.user?.username || ''
  editForm.bio = overview.value.user?.bio || ''
  editForm.gender = overview.value.user?.gender || ''
})

watch(() => route.params.id, async () => {
  resetContentState()
  contentTab.value = 'published'
  if (userStore.token && !userStore.user?.id) {
    await userStore.fetchUserInfo()
  }
  if (routeProfileId.value && routeProfileId.value === Number(userStore.user?.id)) {
    router.replace('/center')
    return
  }
  try {
    await fetchOverview()
    await checkFollowStatus()
    await loadCurrentContent()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '个人中心加载失败')
  }
}, { immediate: true })
</script>

<style scoped>
.center-page {
  padding: 24px;
  max-width: 1380px;
  margin: 0 auto;
  background:
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.12), transparent 24%),
    linear-gradient(160deg, #f7f9ff 0%, #eef4ff 100%);
}

.hero-panel {
  padding: 28px;
  border-radius: 28px;
  background: linear-gradient(135deg, #14213d 0%, #2243a0 42%, #1f8fff 100%);
  color: #fff;
  box-shadow: 0 24px 50px rgba(27, 67, 156, 0.24);
}

.hero-main {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.hero-avatar {
  border: 3px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
  flex-shrink: 0;
}

.hero-copy {
  flex: 1;
  min-width: 0;
}

.hero-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-title-row h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  color: #ffffff;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: 12px;
}

.hero-meta-item {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.82);
}

.hero-bio {
  margin: 16px 0 0;
  max-width: 760px;
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.7;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.hero-stat {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.hero-stat-button {
  appearance: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.hero-stat-button:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.16);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
}

.hero-stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.1;
}

.hero-stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
}

.hero-stat-hint {
  margin-top: 2px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.hero-tags :deep(.el-tag) {
  color: #dbeafe;
  border-color: rgba(219, 234, 254, 0.3);
  background: rgba(255, 255, 255, 0.1);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 22px;
}

.hero-actions :deep(.el-button) {
  border-radius: 999px;
}

.hero-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.92);
  font-size: 13px;
}

.panel-card {
  border-radius: 22px;
}

.center-layout {
  display: block;
  margin-top: 20px;
}

.center-main,
.center-side {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.center-side {
  min-width: 0;
}

.panel-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.16);
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.06);
}

.panel-card :deep(.el-card__header) {
  padding: 20px 22px 0;
  border-bottom: none;
}

.panel-card :deep(.el-card__body) {
  padding: 18px 22px 22px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.panel-subtitle {
  margin-top: 6px;
  color: #64748b;
  font-size: 13px;
}

.content-tabs {
  margin-top: -4px;
}

.content-overview-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.content-overview-subtitle {
  margin-top: 6px;
  color: #64748b;
  font-size: 13px;
}

.content-body {
  min-height: 320px;
}

.privacy-panel {
  padding: 4px 0;
}

.privacy-panel-header {
  margin-bottom: 14px;
}

.stat-detail-card {
  border-radius: 18px;
  padding: 18px;
  background: linear-gradient(180deg, #f8fbff 0%, #f3f7ff 100%);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.stat-detail-value {
  font-size: 30px;
  font-weight: 700;
  color: #0f172a;
}

.stat-detail-description {
  margin-top: 8px;
  color: #64748b;
  line-height: 1.6;
}

.stat-detail-list {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stat-detail-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.14);
  color: #334155;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.content-item,
.timeline-card,
.mini-item {
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: #f8fbff;
}

.content-item {
  padding: 16px 18px;
  border-radius: 18px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.item-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.item-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  text-decoration: none;
}

.item-title:hover {
  color: #2563eb;
}

.item-meta,
.item-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
}

.item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.item-preview {
  margin: 12px 0 0;
  line-height: 1.7;
  color: #334155;
}

.item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.user-content-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.user-content-main {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  cursor: pointer;
}

.user-content-avatar {
  flex-shrink: 0;
}

.user-content-copy {
  min-width: 0;
}

.panel-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.privacy-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.integrated-privacy-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.privacy-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #f8fbff;
  border: 1px solid rgba(148, 163, 184, 0.14);
}

.avatar-edit-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-preview {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
  border: 3px solid rgba(37, 99, 235, 0.14);
  background: #eef4ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  font-size: 28px;
  font-weight: 700;
  color: #2563eb;
}

.avatar-edit-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.avatar-hint {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
}

.avatar-upload-hidden {
  display: none;
}

@media (max-width: 1100px) {
  .integrated-privacy-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .center-page {
    padding: 16px;
  }

  .hero-panel {
    padding: 22px 18px;
  }

  .hero-main {
    flex-direction: column;
  }

  .hero-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .item-top,
  .privacy-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .user-content-item {
    align-items: flex-start;
  }

  .user-content-main {
    width: 100%;
  }

  .avatar-edit-wrapper {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
