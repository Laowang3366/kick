<template>
  <div class="post-detail">
    <div v-if="loading" class="loading">
      <el-skeleton :rows="10" animated />
    </div>
    <div v-else-if="postDeleted" class="deleted-notice">
      <el-empty description="该帖子已被删除">
        <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
      </el-empty>
    </div>
    <div v-else-if="post">
      <el-card class="post-card">
        <div class="post-header">
          <div class="author-section">
            <el-button @click="goBack" class="back-btn" circle>
              <el-icon><ArrowLeft /></el-icon>
            </el-button>
            <div class="author-avatar-wrapper">
              <el-avatar :src="post.author?.avatar" :size="60">
                {{ post.author?.username?.charAt(0) }}
              </el-avatar>
            </div>
            <div class="author-details">
              <div class="author-name-row">
                <span class="author-name" @click="$router.push(`/user/${post.author?.id}`)">
                  {{ post.author?.username }}
                </span>
                <LevelTag v-if="post.author?.level" :level="post.author?.level" :points="post.author?.points" :role="post.author?.role" />
                <template v-if="userStore.isAuthenticated && post.author?.id !== userStore.user.id">
                  <el-button 
                    v-if="!isFollowing"
                    type="primary" 
                    size="small" 
                    :loading="followLoading"
                    @click="handleFollow"
                  >
                    + 关注
                  </el-button>
                  <el-button 
                    v-else
                    size="small" 
                    :loading="followLoading"
                    @click="handleUnfollow"
                  >
                    已关注
                  </el-button>
                </template>
              </div>
              <div class="post-meta-info">
                <span class="time">{{ formatTime(post.createTime) }}</span>
                <span class="separator">·</span>
                <span class="forum">来自 {{ post.category?.name }}</span>
              </div>
            </div>
            <div class="admin-actions" v-if="canManagePost">
              <el-button size="small" @click="$router.push(`/post/${post.id}/edit`)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button type="danger" size="small" @click="deletePost">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
              <template v-if="userStore.user?.role === 'admin'">
                <el-button v-if="!post.isTop" size="small" @click="toggleTop">
                  置顶
                </el-button>
                <el-button v-else type="warning" size="small" @click="toggleTop">
                  取消置顶
                </el-button>
                <el-button v-if="!post.isEssence" size="small" @click="toggleEssence">
                  加精
                </el-button>
                <el-button v-else type="success" size="small" @click="toggleEssence">
                  取消加精
                </el-button>
                <el-button v-if="!post.isLocked" size="small" @click="toggleLock">
                  锁定
                </el-button>
                <el-button v-else type="warning" size="small" @click="toggleLock">
                  解锁
                </el-button>
              </template>
            </div>
          </div>
        </div>
        
        <div class="post-body">
          <div class="title-section">
            <div class="section-header">
              <span class="section-label">主题</span>
              <div class="title-tags">
                <el-tag v-if="post.isTop" type="danger" size="small">置顶</el-tag>
                <el-tag v-if="post.isEssence" type="success" size="small">精华</el-tag>
                <el-tag v-if="post.isLocked" type="warning" size="small">
                  <el-icon><Lock /></el-icon> 已锁定
                </el-tag>
              </div>
            </div>
            <h1 class="post-title">{{ post.title }}</h1>
          </div>
          
          <div class="content-section">
            <div class="section-header">
              <span class="section-label content-label">内容</span>
            </div>
            <div class="post-content" v-html="post.content" ref="contentRef"></div>
          </div>
        </div>
        
        <div class="post-tags" v-if="parsedTags.length">
          <el-tag v-for="tag in parsedTags" :key="tag" size="small" class="tag">
            {{ tag }}
          </el-tag>
        </div>
        <div class="post-attachments" v-if="parsedAttachments.length">
          <h4>附件：</h4>
          <div v-for="file in parsedAttachments" :key="file.url" class="attachment">
            <el-link :href="file.url" target="_blank">
              <el-icon><Document /></el-icon>
              {{ file.name }}
            </el-link>
            <el-button v-if="isExcelFile(file.name)" type="primary" size="small" @click="previewExcel(file)">
              预览
            </el-button>
          </div>
        </div>
        
        <div class="post-footer">
          <div class="post-stats">
            <span><el-icon><View /></el-icon> {{ post.viewCount || 0 }} 阅读</span>
            <span><el-icon><ChatDotRound /></el-icon> {{ post.replyCount || 0 }} 回复</span>
            <span><el-icon><Share /></el-icon> {{ post.shareCount || 0 }} 转发</span>
            <span><el-icon><Star /></el-icon> {{ post.favoriteCount || 0 }} 收藏</span>
          </div>
          <div class="post-actions">
            <el-button
              :type="post.isLiked ? 'primary' : 'default'"
              @click="toggleLike"
            >
              <el-icon><Star /></el-icon>
              {{ post.isLiked ? '已点赞' : '点赞' }}
            </el-button>
            <el-button @click="showShareDialog = true">
              <el-icon><Share /></el-icon>
              转发
            </el-button>
            <el-button
              :type="post.isFavorited ? 'warning' : 'default'"
              @click="toggleFavorite"
            >
              <el-icon><Collection /></el-icon>
              {{ post.isFavorited ? '已收藏' : '收藏' }}
            </el-button>
            <el-button v-if="!isOwnPost" @click="showReportDialog = true">
              <el-icon><Warning /></el-icon>
              举报
            </el-button>
          </div>
        </div>
      </el-card>

      <el-card class="replies-card">
        <template #header>
          <div class="replies-header">
            <h3>回复 ({{ totalReplies }})</h3>
            <div class="replies-filter">
              <el-radio-group v-model="replyFilter" size="small" @change="handleFilterChange">
                <el-radio-button value="all">全部</el-radio-button>
                <el-radio-button value="author">只看楼主</el-radio-button>
                <el-radio-button value="mine">我的回复</el-radio-button>
                <el-radio-button value="related">与我有关</el-radio-button>
              </el-radio-group>
            </div>
          </div>
        </template>
        <div v-if="repliesLoading" class="loading">
          <el-skeleton :rows="3" animated />
        </div>
        <div v-else-if="filteredReplies.length === 0" class="empty">
          <el-empty description="暂无回复" />
        </div>
        <div v-else>
          <div v-for="(reply, index) in filteredReplies" :key="reply.id" class="reply-item">
            <div class="reply-avatar">
              <el-avatar :src="reply.author?.avatar" :size="48">
                {{ reply.author?.username?.charAt(0) }}
              </el-avatar>
            </div>
            <div class="reply-body">
              <div class="reply-header">
                <div class="reply-user-info">
                  <div class="user-info-wrapper">
                    <span class="author-name" @click="$router.push(`/user/${reply.author?.id}`)">
                      {{ reply.author?.username }}
                    </span>
                    <LevelTag v-if="reply.author?.level" :level="reply.author?.level" :points="reply.author?.points" :role="reply.author?.role" />
                  </div>
                  <el-tag v-if="reply.author?.id === post?.userId" type="warning" size="small">楼主</el-tag>
                  <span class="floor">#{{ (replyPage - 1) * 10 + index + 1 }}</span>
                </div>
                <span class="time">{{ formatTime(reply.createTime) }}</span>
              </div>
              <div v-if="reply.quotedReply" class="quoted-content">
                <span class="quoted-label">引用 {{ reply.quotedReply.author?.username }}：</span>
                <div class="quoted-text" v-html="reply.quotedReply.content"></div>
              </div>
              <div class="reply-content" v-html="reply.content"></div>
              <div class="reply-footer">
                <div class="reply-tags">
                  <span 
                    class="like-tag" 
                    :class="{ 'is-liked': reply.isLiked }"
                    @click="toggleReplyLike(reply)"
                  >
                    <el-icon><Star /></el-icon>
                    {{ reply.likeCount || 0 }} 人觉得有用
                  </span>
                </div>
                <div class="reply-actions">
                  <el-button size="small" text @click="quoteReply(reply)">
                    <el-icon><ChatDotRound /></el-icon>
                    回复
                  </el-button>
                  <el-button
                    v-if="canSetBestAnswer(reply)"
                    size="small"
                    text
                    type="success"
                    @click="setBestAnswer(reply)"
                  >
                    <el-icon><Select /></el-icon>
                    最佳答案
                  </el-button>
                </div>
              </div>
            </div>
          </div>
          <div class="pagination">
            <el-pagination
              v-model:current-page="replyPage"
              :page-size="10"
              :total="totalReplies"
              layout="prev, pager, next"
              @current-change="fetchReplies"
            />
          </div>
        </div>
      </el-card>

      <el-card v-if="!post.isLocked" class="reply-box-card">
        <template #header>
          <div class="reply-box-header">
            <span>发表回复</span>
          </div>
        </template>
        <div class="reply-box">
          <div v-if="quotedReply" class="quoted-reply-box">
            <div class="quoted-reply-header">
              <span>回复 {{ quotedReply.author?.username }}</span>
              <el-button type="primary" link size="small" @click="quotedReply = null">
                <el-icon><Close /></el-icon>
                取消
              </el-button>
            </div>
            <div class="quoted-reply-content" v-html="quotedReply.content"></div>
          </div>
          <div class="reply-input-area">
            <el-input
              v-model="replyContent"
              type="textarea"
              :autosize="{ minRows: 3, maxRows: 6 }"
              placeholder="写下你的回复..."
              @keydown.enter.ctrl="submitReply"
              class="reply-textarea"
            />
            <div v-if="selectedImages.length > 0" class="selected-images">
              <div v-for="(img, index) in selectedImages" :key="index" class="preview-item">
                <img :src="img.preview" alt="preview" />
                <el-button
                  type="danger"
                  circle
                  size="small"
                  class="remove-btn"
                  @click="removeImage(index)"
                >
                  <el-icon><Close /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="reply-actions-bar">
              <div class="reply-tools">
                <el-popover
                  placement="top"
                  :width="320"
                  trigger="click"
                  v-model:visible="showEmojiPicker"
                >
                  <template #reference>
                    <el-button circle size="small" title="表情">
                      <el-icon><SemiSelect /></el-icon>
                    </el-button>
                  </template>
                  <div class="emoji-grid">
                    <span
                      v-for="emoji in emojiList"
                      :key="emoji"
                      class="emoji-item"
                      @click="insertEmoji(emoji)"
                    >
                      {{ emoji }}
                    </span>
                  </div>
                </el-popover>
                <el-popover
                  placement="top"
                  :width="200"
                  trigger="click"
                  v-model:visible="showAttachMenu"
                >
                  <template #reference>
                    <el-button circle size="small" title="附件">
                      <el-icon><Plus /></el-icon>
                    </el-button>
                  </template>
                  <div class="attach-menu">
                    <div class="attach-item" @click="triggerImageUpload">
                      <el-icon size="24"><Picture /></el-icon>
                      <span>图片</span>
                    </div>
                    <div class="attach-item" @click="openCamera">
                      <el-icon size="24"><Camera /></el-icon>
                      <span>拍照</span>
                    </div>
                  </div>
                </el-popover>
                <input
                  ref="imageInput"
                  type="file"
                  accept="image/*"
                  style="display: none"
                  @change="handleImageSelect"
                />
                <input
                  ref="cameraInput"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style="display: none"
                  @change="handleCameraCapture"
                />
              </div>
              <el-button type="primary" @click="submitReply" :loading="submitting" :disabled="!replyContent.trim() && !selectedImages.length">
                发送回复
              </el-button>
            </div>
          </div>
        </div>
      </el-card>

      <el-card v-else class="reply-box-card locked-notice">
        <div class="locked-message">
          <el-icon :size="24"><Lock /></el-icon>
          <span>该帖子已被锁定，无法回复</span>
        </div>
      </el-card>

      <el-dialog v-model="showReportDialog" title="举报" width="500px">
        <el-form :model="reportForm">
          <el-form-item label="举报原因">
            <el-select v-model="reportForm.reason" placeholder="请选择举报原因">
              <el-option label="垃圾广告" value="spam" />
              <el-option label="色情低俗" value="porn" />
              <el-option label="政治敏感" value="politics" />
              <el-option label="人身攻击" value="abuse" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>
          <el-form-item label="详细说明">
            <el-input v-model="reportForm.description" type="textarea" :rows="3" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showReportDialog = false">取消</el-button>
          <el-button type="primary" @click="submitReport">提交举报</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="showShareDialog" title="转发" width="500px">
        <div class="share-options">
          <div class="share-item" @click="copyLink">
            <el-icon size="32"><Link /></el-icon>
            <span>复制链接</span>
          </div>
          <div class="share-item" @click="shareToWechat">
            <el-icon size="32"><ChatDotRound /></el-icon>
            <span>微信</span>
          </div>
          <div class="share-item" @click="shareToWeibo">
            <el-icon size="32"><Promotion /></el-icon>
            <span>微博</span>
          </div>
          <div class="share-item" @click="shareToQQ">
            <el-icon size="32"><ChatRound /></el-icon>
            <span>QQ</span>
          </div>
        </div>
        <div class="share-link">
          <el-input v-model="shareLink" readonly>
            <template #append>
              <el-button @click="copyLink">复制</el-button>
            </template>
          </el-input>
        </div>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useForumEvents } from '../composables/useForumEvents'
import api from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import hljs from 'highlight.js'
import {
  View,
  ChatDotRound,
  Star,
  Collection,
  Warning,
  Edit,
  Delete,
  Document,
  Plus,
  Picture,
  Camera,
  Close,
  SemiSelect,
  ArrowLeft,
  Select,
  Share,
  Link,
  Promotion,
  ChatRound,
  Lock

} from '@element-plus/icons-vue'
import LevelTag from '../components/LevelTag.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const post = ref(null)
const replies = ref([])
const loading = ref(false)
const repliesLoading = ref(false)
const postDeleted = ref(false)
const replyPage = ref(1)
const totalReplies = ref(0)
const replyContent = ref('')
const quotedReply = ref(null)
const submitting = ref(false)
const contentRef = ref(null)
const imageInput = ref(null)
const cameraInput = ref(null)
const showEmojiPicker = ref(false)

const showAttachMenu = ref(false)
const selectedImages = ref([])
const replyFilter = ref('all')

const emojiList = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊',
  '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋',
  '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
  '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮', '🤯',
  '😱', '🥵', '🥶', '😰', '😥', '😢', '😭', '😤', '😡', '🤬',
  '👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '🎉', '❤️', '💔'
]

const showReportDialog = ref(false)
const showShareDialog = ref(false)
const reportTarget = ref({ type: 'post', id: null })
const reportForm = reactive({
  reason: '',
  description: ''
})

const isFollowing = ref(false)
const followLoading = ref(false)

const canManagePost = computed(() => {
  if (!userStore.isAuthenticated) return false
  if (userStore.user.role === 'admin') return true
  if (post.value?.author?.id === userStore.user.id) return true
  return false
})

const isOwnPost = computed(() => {
  if (!userStore.isAuthenticated) return false
  return post.value?.author?.id === userStore.user.id
})

const filteredReplies = computed(() => {
  if (!replies.value.length) return []
  if (replyFilter.value === 'all') return replies.value
  if (replyFilter.value === 'author') {
    return replies.value.filter(r => r.author?.id === post.value?.userId)
  }
  if (replyFilter.value === 'mine') {
    if (!userStore.isAuthenticated) return []
    return replies.value.filter(r => r.author?.id === userStore.user.id)
  }
  if (replyFilter.value === 'related') {
    if (!userStore.isAuthenticated) return []
    return replies.value.filter(r => 
      r.author?.id === userStore.user.id || 
      r.author?.id === post.value?.userId
    )
  }
  return replies.value
})

const shareLink = computed(() => {
  return window.location.origin + '/post/' + route.params.id
})

const parsedAttachments = computed(() => {
  if (!post.value?.attachments) return []
  try {
    if (typeof post.value.attachments === 'string') {
      return JSON.parse(post.value.attachments)
    }
    if (Array.isArray(post.value.attachments)) {
      return post.value.attachments
    }
  } catch (e) {
    console.error('解析附件失败:', e)
  }
  return []
})

const parsedTags = computed(() => {
  if (!post.value?.tags) return []
  try {
    if (Array.isArray(post.value.tags)) {
      return post.value.tags
    }
    if (typeof post.value.tags === 'string') {
      const parsed = JSON.parse(post.value.tags)
      return Array.isArray(parsed) ? parsed : []
    }
  } catch (e) {
    console.error('解析标签失败:', e)
  }
  return []
})

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const checkFollowStatus = async () => {
  if (!userStore.isAuthenticated || !post.value?.author?.id) return
  if (post.value.author.id === userStore.user.id) return
  
  try {
    const response = await api.get(`/users/${post.value.author.id}/is-following`)
    isFollowing.value = response.isFollowing
  } catch (error) {
    console.error('检查关注状态失败:', error)
  }
}

const handleFollow = async () => {
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  
  followLoading.value = true
  try {
    await api.post(`/users/${post.value.author.id}/follow`)
    isFollowing.value = true
    ElMessage.success('关注成功')
  } catch (error) {
    ElMessage.error('关注失败')
  } finally {
    followLoading.value = false
  }
}

const handleUnfollow = async () => {
  try {
    await ElMessageBox.confirm('确定要取消关注吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    followLoading.value = true
    try {
      await api.delete(`/users/${post.value.author.id}/follow`)
      isFollowing.value = false
      ElMessage.success('已取消关注')
    } catch (error) {
      ElMessage.error('取消关注失败')
    } finally {
      followLoading.value = false
    }
  } catch {
    // 用户取消操作
  }
}

const handleFilterChange = () => {
  replyPage.value = 1
}

const formatTime = (time) => {
  const date = new Date(time)
  return date.toLocaleString()
}

const isExcelFile = (filename) => {
  return /\.(xlsx|xlsm|xls)$/i.test(filename)
}

const highlightCode = () => {
  nextTick(() => {
    if (contentRef.value) {
      contentRef.value.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block)
      })
    }
  })
}

const fetchPost = async () => {
  loading.value = true
  postDeleted.value = false
  try {
    const response = await api.get(`/posts/${route.params.id}`)
    post.value = response.post
    
    if (post.value && (post.value.status === 1 || post.value.status === 2)) {
      postDeleted.value = true
      loading.value = false
      return
    }
    
    highlightCode()
    checkFollowStatus()
  } catch (error) {
    console.error('获取帖子详情失败:', error)
    if (error.response?.status === 404) {
      postDeleted.value = true
    } else {
      ElMessage.error('获取帖子详情失败')
    }
  } finally {
    loading.value = false
  }
}

const fetchReplies = async () => {
  repliesLoading.value = true
  try {
    const response = await api.get(`/posts/${route.params.id}/replies`, {
      params: {
        page: replyPage.value,
        limit: 10,
        filter: replyFilter.value === 'all' ? undefined : replyFilter.value
      }
    })
    replies.value = response.replies
    totalReplies.value = response.total
  } catch (error) {
    console.error('获取回复列表失败:', error)
  } finally {
    repliesLoading.value = false
  }
}

useForumEvents((event) => {
  console.log('Received forum event:', event)
  if ((event.type === 'POST_UPDATED' || event.type === 'POST_DELETED') && event.targetId === Number(route.params.id)) {
    fetchPost()
  }
})

const toggleLike = async () => {
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录')
    return
  }
  try {
    const response = await api.post('/likes', {
      targetType: 'post',
      targetId: post.value.id
    })
    post.value.isLiked = response.isLiked
    post.value.likeCount = response.likeCount
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const toggleFavorite = async () => {
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录')
    return
  }
  try {
    const response = await api.post('/favorites', {
      targetId: post.value.id
    })
    post.value.isFavorited = response.isFavorited
    post.value.favoriteCount = response.favoriteCount
    ElMessage.success(response.isFavorited ? '收藏成功' : '取消收藏')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const toggleTop = async () => {
  try {
    const response = await api.put(`/admin/posts/${post.value.id}/top`)
    post.value.isTop = response.isTop
    ElMessage.success(response.isTop ? '已置顶' : '已取消置顶')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const toggleEssence = async () => {
  try {
    const response = await api.put(`/admin/posts/${post.value.id}/essence`)
    post.value.isEssence = response.isEssence
    ElMessage.success(response.isEssence ? '已加精' : '已取消加精')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const toggleLock = async () => {
  try {
    const response = await api.put(`/admin/posts/${post.value.id}/lock`)
    post.value.isLocked = response.isLocked
    ElMessage.success(response.isLocked ? '已锁定' : '已解锁')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const deletePost = async () => {
  const { value: reason } = await ElMessageBox.prompt('请输入删除原因（可选）', '删除帖子', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    inputPlaceholder: '请输入删除原因',
    inputType: 'textarea',
    inputValidator: (value) => {
      return true
    }
  }).catch(() => {
    return { value: null }
  })
  
  if (reason === null) return
  
  try {
    await api.delete(`/posts/${post.value.id}`, {
      data: { reason: reason || '' }
    })
    ElMessage.success('删除成功')
    if (post.value.category?.id) {
      router.push(`/forum/${post.value.category.id}`)
    } else {
      router.push('/')
    }
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

const toggleReplyLike = async (reply) => {
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录')
    return
  }
  try {
    await api.post('/likes', {
      targetType: 'reply',
      targetId: reply.id
    })
    reply.isLiked = !reply.isLiked
    reply.likeCount += reply.isLiked ? 1 : -1
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const quoteReply = (reply) => {
  quotedReply.value = reply
  replyContent.value = ''
}

const canSetBestAnswer = (reply) => {
  if (!post.value) return false
  if (post.value.rewardPoints <= 0) return false
  if (post.value.author.id !== userStore.user.id) return false
  if (reply.isBestAnswer) return false
  return true
}

const setBestAnswer = async (reply) => {
  try {
    await api.put(`/posts/${post.value.id}/best-answer/${reply.id}`)
    replies.value.forEach(r => r.isBestAnswer = false)
    reply.isBestAnswer = true
    ElMessage.success('已设为最佳答案')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const insertEmoji = (emoji) => {
  replyContent.value += emoji
  showEmojiPicker.value = false
}

const triggerImageUpload = () => {
  showAttachMenu.value = false
  imageInput.value?.click()
}

const openCamera = () => {
  showAttachMenu.value = false
  cameraInput.value?.click()
}

const handleImageSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    addImage(file)
  }
  event.target.value = ''
}

const handleCameraCapture = (event) => {
  const file = event.target.files[0]
  if (file) {
    addImage(file)
  }
  event.target.value = ''
}

const addImage = (file) => {
  if (selectedImages.value.length >= 4) {
    ElMessage.warning('最多只能上传4张图片')
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    selectedImages.value.push({
      file: file,
      preview: e.target.result
    })
  }
  reader.readAsDataURL(file)
}

const removeImage = (index) => {
  selectedImages.value.splice(index, 1)
}

const submitReply = async () => {
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录')
    return
  }
  if (!replyContent.value.trim() && selectedImages.value.length === 0) {
    ElMessage.warning('请输入回复内容或选择图片')
    return
  }
  submitting.value = true
  try {
    const data = {
      postId: post.value.id,
      content: replyContent.value
    }
    if (quotedReply.value) {
      data.quotedReplyId = quotedReply.value.id
    }
    if (selectedImages.value.length > 0) {
      const imageUrls = []
      for (const img of selectedImages.value) {
        const formData = new FormData()
        formData.append('file', img.file)
        try {
          const res = await api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          if (res.url) {
            imageUrls.push(res.url)
          }
        } catch (e) {
          console.error('图片上传失败', e)
        }
      }
      if (imageUrls.length > 0) {
        data.content += '\n' + imageUrls.map(url => `![image](${url})`).join('\n')
      }
    }
    await api.post('/replies', data)
    ElMessage.success('回复成功')
    replyContent.value = ''
    quotedReply.value = null
    selectedImages.value = []
    fetchReplies()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '回复失败')
  } finally {
    submitting.value = false
  }
}

const submitReport = async () => {
  if (!reportForm.reason) {
    ElMessage.warning('请选择举报原因')
    return
  }
  try {
    await api.post('/reports', {
      targetType: reportTarget.value.type,
      targetId: reportTarget.value.id || post.value.id,
      reason: reportForm.reason,
      description: reportForm.description
    })
    ElMessage.success('举报成功')
    showReportDialog.value = false
    reportForm.reason = ''
    reportForm.description = ''
  } catch (error) {
    ElMessage.error('举报失败')
  }
}

const previewExcel = (file) => {
  // 这里可以实现Excel预览功能
  ElMessage.info('Excel预览功能开发中')
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(shareLink.value)
    ElMessage.success('链接已复制到剪贴板')
    showShareDialog.value = false
    await api.post(`/posts/${post.value.id}/share`)
    post.value.shareCount = (post.value.shareCount || 0) + 1
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const shareToWechat = () => {
  ElMessage.info('请使用微信扫描页面二维码分享')
  showShareDialog.value = false
}

const shareToWeibo = async () => {
  try {
    await api.post(`/posts/${post.value.id}/share`)
    post.value.shareCount = (post.value.shareCount || 0) + 1
  } catch (e) {}
  const url = encodeURIComponent(shareLink.value)
  const title = encodeURIComponent(post.value?.title || '分享帖子')
  window.open(`https://service.weibo.com/share/share.php?url=${url}&title=${title}`, '_blank')
  showShareDialog.value = false
}

const shareToQQ = async () => {
  try {
    await api.post(`/posts/${post.value.id}/share`)
    post.value.shareCount = (post.value.shareCount || 0) + 1
  } catch (e) {}
  const url = encodeURIComponent(shareLink.value)
  const title = encodeURIComponent(post.value?.title || '分享帖子')
  window.open(`https://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${title}`, '_blank')
  showShareDialog.value = false
}

watch(() => route.params.id, () => {
  fetchPost()
  fetchReplies()
}, { immediate: true })

onMounted(() => {
  fetchPost()
  fetchReplies()
})
</script>

<style scoped>
.post-detail {
  width: 100%;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.loading {
  padding: 20px;
}

.deleted-notice {
  padding: 60px 20px;
  text-align: center;
  background: white;
  border-radius: 24px;
  margin: 20px 0;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.1);
}

.post-card {
  margin-bottom: 24px;
  border: 2px solid rgba(102, 126, 234, 0.15);
  border-radius: 24px;
  box-shadow: 0 6px 30px rgba(102, 126, 234, 0.12);
  background: linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
  overflow: hidden;
  position: relative;
}

.post-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
  background-size: 200% 100%;
  animation: gradient-flow 3s ease infinite;
}

@keyframes gradient-flow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.post-card :deep(.el-card__body) {
  padding: 28px;
}

.post-header {
  margin-bottom: 0;
  padding-bottom: 20px;
  border-bottom: 2px solid rgba(102, 126, 234, 0.1);
}

.author-section {
  display: flex;
  align-items: flex-start;
  gap: 18px;
}

.back-btn {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  background: rgba(102, 126, 234, 0.1) !important;
  border: 1px solid rgba(102, 126, 234, 0.2) !important;
  color: #667eea !important;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(102, 126, 234, 0.2) !important;
  border-color: #667eea !important;
  transform: translateX(-2px);
}

.author-avatar-wrapper {
  flex-shrink: 0;
}

.author-avatar-wrapper .el-avatar {
  border: 3px solid rgba(102, 126, 234, 0.2);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
  transition: all 0.3s ease;
}

.author-avatar-wrapper .el-avatar:hover {
  border-color: #667eea;
  transform: scale(1.08);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
}

.author-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.author-name-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.author-name {
  font-size: 18px;
  font-weight: 700;
  color: #2c3e50;
  cursor: pointer;
  transition: color 0.3s;
}

.author-name:hover {
  color: #667eea;
}

.post-meta-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #888;
}

.separator {
  color: #ccc;
}

.admin-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-left: auto;
  flex-shrink: 0;
}

.admin-actions .el-button {
  border-radius: 10px;
  padding: 8px 16px;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.3s ease;
  border: 1px solid rgba(102, 126, 234, 0.2);
  background: white;
}

.admin-actions .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
  border-color: #667eea;
  color: #667eea;
}

.admin-actions .el-button--danger {
  background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
  border-color: rgba(245, 108, 108, 0.3);
  color: #f56c6c;
}

.admin-actions .el-button--danger:hover {
  background: linear-gradient(135deg, #f56c6c 0%, #e64545 100%);
  border-color: #f56c6c;
  color: white;
  box-shadow: 0 4px 12px rgba(245, 108, 108, 0.3);
}

.admin-actions .el-button--warning {
  background: linear-gradient(135deg, #fdf6ec 0%, #faecd8 100%);
  border-color: rgba(230, 162, 60, 0.3);
  color: #e6a23c;
}

.admin-actions .el-button--warning:hover {
  background: linear-gradient(135deg, #e6a23c 0%, #d4912a 100%);
  border-color: #e6a23c;
  color: white;
  box-shadow: 0 4px 12px rgba(230, 162, 60, 0.3);
}

.admin-actions .el-button--success {
  background: linear-gradient(135deg, #f0f9eb 0%, #e1f3d8 100%);
  border-color: rgba(103, 194, 58, 0.3);
  color: #67c23a;
}

.admin-actions .el-button--success:hover {
  background: linear-gradient(135deg, #67c23a 0%, #4caf50 100%);
  border-color: #67c23a;
  color: white;
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.3);
}

.post-body {
  padding: 24px 0;
}

.title-section,
.content-section {
  margin-bottom: 24px;
}

.content-section {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-label {
  display: inline-flex;
  align-items: center;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 6px;
  letter-spacing: 0.5px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
  color: #667eea;
  border-left: 4px solid #667eea;
}

.section-label.content-label {
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.12) 0%, rgba(76, 175, 80, 0.12) 100%);
  color: #67c23a;
  border-left: 4px solid #67c23a;
}

.title-tags {
  display: flex;
  gap: 8px;
}

.title-tags .el-tag {
  border-radius: 8px;
  font-weight: 600;
}

.post-title {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: #2c3e50;
  line-height: 1.5;
  padding-left: 4px;
}

.post-content {
  line-height: 1.9;
  font-size: 16px;
  color: #333;
  padding: 20px 24px;
  background: linear-gradient(135deg, #fafbff 0%, #f8f9ff 100%);
  border-radius: 16px;
  border: 1px solid rgba(102, 126, 234, 0.08);
  word-wrap: break-word;
  word-break: break-word;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

.post-content :deep(pre) {
  background: linear-gradient(135deg, #282c34 0%, #1a1d23 100%);
  color: #abb2bf;
  padding: 20px;
  border-radius: 14px;
  overflow-x: auto;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.post-content :deep(code) {
  background-color: rgba(102, 126, 234, 0.1);
  color: #667eea;
  padding: 0.2em 0.5em;
  border-radius: 6px;
  font-size: 0.9em;
}

.post-content :deep(blockquote) {
  border-left: 4px solid #667eea;
  padding: 16px 20px;
  margin: 16px 0;
  color: #555;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
  border-radius: 0 12px 12px 0;
}

.post-content :deep(img) {
  max-width: 100%;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  margin: 12px 0;
}

.post-content :deep(p) {
  margin: 0 0 16px;
}

.post-content :deep(h1),
.post-content :deep(h2),
.post-content :deep(h3),
.post-content :deep(h4) {
  margin: 24px 0 16px;
  color: #2c3e50;
}

.post-content :deep(ul),
.post-content :deep(ol) {
  padding-left: 24px;
  margin: 12px 0;
}

.post-content :deep(li) {
  margin: 8px 0;
}

.post-tags {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 2px solid rgba(102, 126, 234, 0.1);
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag {
  border-radius: 14px;
  padding: 6px 16px;
  font-weight: 500;
}

.post-attachments {
  margin-top: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border-radius: 16px;
  border: 1px solid rgba(102, 126, 234, 0.1);
}

.post-attachments h4 {
  margin: 0 0 14px;
  color: #667eea;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.post-attachments h4::before {
  content: '';
  width: 4px;
  height: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
}

.attachment {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 12px 16px;
  background: white;
  border-radius: 12px;
  border: 1px solid rgba(102, 126, 234, 0.1);
  transition: all 0.3s ease;
}

.attachment:hover {
  border-color: rgba(102, 126, 234, 0.3);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.post-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 2px solid rgba(102, 126, 234, 0.1);
  gap: 20px;
}

.post-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #888;
}

.post-stats span {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.post-stats span:hover {
  color: #667eea;
  background: linear-gradient(135deg, #e8ebff 0%, #e0e3ff 100%);
}

.post-stats span .el-icon {
  color: #667eea;
  font-size: 14px;
}

.post-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
}

.post-actions .el-button {
  border-radius: 10px;
  padding: 8px 16px;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.3s ease;
  border: 1px solid rgba(102, 126, 234, 0.15);
}

.post-actions .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
  border-color: #667eea;
}

.post-actions .el-button--primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: transparent;
}

.post-actions .el-button--primary:hover {
  opacity: 0.9;
}

.post-actions .el-button--warning {
  background: linear-gradient(135deg, #e6a23c 0%, #d4912a 100%);
  border-color: transparent;
  color: white;
}

.post-actions .el-button--warning:hover {
  opacity: 0.9;
}

.replies-card {
  margin-bottom: 24px;
  border: 2px solid rgba(102, 126, 234, 0.15);
  border-radius: 24px;
  box-shadow: 0 6px 30px rgba(102, 126, 234, 0.12);
  background: linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
  overflow: hidden;
  position: relative;
}

.replies-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
  background-size: 200% 100%;
  animation: gradient-flow 3s ease infinite;
}

.replies-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border-bottom: 2px solid rgba(102, 126, 234, 0.1);
  padding: 20px 28px;
}

.replies-card :deep(.el-card__body) {
  padding: 24px 28px;
}

.replies-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.replies-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #2c3e50;
  position: relative;
  padding-left: 16px;
}

.replies-header h3::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
}

.replies-filter {
  display: flex;
  gap: 10px;
}

.replies-filter :deep(.el-radio-button__inner) {
  border-radius: 10px;
  padding: 10px 18px;
  font-weight: 500;
}

.replies-filter :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
}

.reply-item {
  display: flex;
  gap: 18px;
  padding: 24px 0;
  border-bottom: 1px solid rgba(102, 126, 234, 0.08);
  transition: all 0.3s ease;
}

.reply-item:hover {
  background: linear-gradient(135deg, rgba(248, 249, 255, 0.5) 0%, rgba(240, 242, 255, 0.5) 100%);
  margin: 0 -28px;
  padding: 24px 28px;
  border-radius: 16px;
}

.reply-item:last-child {
  border-bottom: none;
}

.reply-avatar {
  flex-shrink: 0;
}

.reply-avatar .el-avatar {
  border: 2px solid rgba(102, 126, 234, 0.15);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.reply-body {
  flex: 1;
  min-width: 0;
}

.reply-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.reply-user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.reply-user-info .author-name {
  font-weight: 600;
  color: #667eea;
  cursor: pointer;
  font-size: 15px;
}

.reply-user-info .author-name:hover {
  color: #764ba2;
}

.floor {
  font-size: 13px;
  color: #999;
  background: rgba(102, 126, 234, 0.08);
  padding: 3px 10px;
  border-radius: 10px;
}

.time {
  font-size: 13px;
  color: #999;
}

.quoted-content {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border-left: 4px solid #667eea;
  padding: 14px 18px;
  margin-bottom: 14px;
  border-radius: 0 12px 12px 0;
}

.quoted-content .quoted-label {
  font-size: 13px;
  color: #667eea;
  margin-bottom: 8px;
  display: block;
  font-weight: 600;
}

.quoted-content .quoted-text {
  font-size: 14px;
  color: #555;
  line-height: 1.6;
}

.quoted-content .quoted-text :deep(img) {
  max-width: 100px;
  max-height: 60px;
  object-fit: cover;
  border-radius: 8px;
}

.reply-content {
  line-height: 1.8;
  margin-bottom: 14px;
  color: #333;
  text-align: left;
  font-size: 15px;
}

.reply-content :deep(img) {
  max-width: 100%;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.reply-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 14px;
  border-top: 1px solid rgba(102, 126, 234, 0.08);
}

.reply-tags {
  display: flex;
  gap: 12px;
}

.like-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  font-size: 13px;
  color: #888;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.like-tag:hover {
  background: linear-gradient(135deg, #e8ebff 0%, #e0e3ff 100%);
  color: #667eea;
  border-color: rgba(102, 126, 234, 0.2);
}

.like-tag.is-liked {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.reply-actions {
  display: flex;
  gap: 8px;
}

.reply-actions .el-button {
  border-radius: 10px;
}

.reply-box-card {
  margin-bottom: 24px;
  border: 2px solid rgba(102, 126, 234, 0.15);
  border-radius: 24px;
  box-shadow: 0 6px 30px rgba(102, 126, 234, 0.12);
  background: linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
  overflow: hidden;
  position: relative;
}

.reply-box-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
  background-size: 200% 100%;
  animation: gradient-flow 3s ease infinite;
}

.reply-box-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border-bottom: 2px solid rgba(102, 126, 234, 0.1);
  padding: 20px 28px;
}

.reply-box-card :deep(.el-card__body) {
  padding: 24px 28px;
}

.reply-box-header {
  font-size: 16px;
  font-weight: 700;
  color: #2c3e50;
}

.locked-notice {
  background: linear-gradient(135deg, #fef0f0 0%, #fde8e8 100%);
  border-color: rgba(245, 108, 108, 0.2);
}

.locked-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 36px;
  color: #f56c6c;
  font-size: 16px;
  font-weight: 600;
}

.reply-box {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quoted-reply-box {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border-left: 4px solid #667eea;
  padding: 16px 20px;
  border-radius: 0 14px 14px 0;
}

.quoted-reply-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 14px;
  color: #667eea;
  font-weight: 600;
}

.quoted-reply-content {
  font-size: 14px;
  color: #555;
  line-height: 1.6;
  max-height: 80px;
  overflow: hidden;
}

.quoted-reply-content :deep(img) {
  max-width: 100px;
  max-height: 50px;
  object-fit: cover;
  border-radius: 8px;
}

.reply-input-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reply-textarea {
  width: 100%;
}

.reply-textarea :deep(.el-textarea__inner) {
  resize: none;
  min-height: 100px;
  line-height: 1.7;
  padding: 16px 20px;
  border-radius: 16px;
  border: 2px solid rgba(102, 126, 234, 0.15);
  font-size: 15px;
  transition: all 0.3s ease;
}

.reply-textarea :deep(.el-textarea__inner:focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.selected-images {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.preview-item {
  position: relative;
  width: 80px;
  height: 80px;
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
  border: 2px solid rgba(102, 126, 234, 0.15);
}

.remove-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 22px;
  height: 22px;
  padding: 0;
}

.reply-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
}

.reply-tools {
  display: flex;
  gap: 10px;
}

.reply-tools .el-button {
  border-radius: 12px;
}

.reply-actions-bar > .el-button {
  border-radius: 14px;
  padding: 12px 28px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.reply-actions-bar > .el-button:hover {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.pagination {
  margin-top: 24px;
  text-align: center;
}

.pagination :deep(.el-pager li) {
  border-radius: 10px;
  margin: 0 4px;
  font-weight: 500;
}

.pagination :deep(.el-pager li.is-active) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.pagination :deep(.btn-prev),
.pagination :deep(.btn-next) {
  border-radius: 10px;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.emoji-item {
  font-size: 22px;
  cursor: pointer;
  padding: 6px;
  text-align: center;
  border-radius: 8px;
  transition: all 0.2s;
}

.emoji-item:hover {
  background: linear-gradient(135deg, #f0f2ff 0%, #e8ebff 100%);
  transform: scale(1.1);
}

.attach-menu {
  display: flex;
  gap: 20px;
  justify-content: center;
  padding: 12px 0;
}

.attach-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 24px;
  cursor: pointer;
  border-radius: 14px;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.attach-item:hover {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border-color: rgba(102, 126, 234, 0.2);
}

.attach-item span {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.share-options {
  display: flex;
  justify-content: space-around;
  padding: 24px 0;
  margin-bottom: 20px;
}

.share-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 18px 28px;
  cursor: pointer;
  border-radius: 16px;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.share-item:hover {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border-color: rgba(102, 126, 234, 0.2);
  transform: translateY(-4px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.15);
}

.share-item span {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.share-link {
  margin-top: 12px;
}

.share-link :deep(.el-input__wrapper) {
  border-radius: 14px;
}

@media (max-width: 768px) {
  .post-detail {
    padding: 16px;
  }

  .post-card :deep(.el-card__body),
  .replies-card :deep(.el-card__body),
  .reply-box-card :deep(.el-card__body) {
    padding: 20px;
  }

  .author-section {
    flex-wrap: wrap;
    gap: 14px;
  }

  .author-avatar-wrapper .el-avatar {
    width: 48px;
    height: 48px;
  }

  .author-name {
    font-size: 16px;
  }

  .post-meta-info {
    flex-wrap: wrap;
    gap: 8px;
    font-size: 13px;
  }

  .admin-actions {
    width: 100%;
    margin-left: 0;
    margin-top: 12px;
    justify-content: flex-start;
  }

  .admin-actions .el-button {
    padding: 6px 12px;
    font-size: 12px;
  }

  .post-title {
    font-size: 22px;
  }

  .section-label {
    font-size: 12px;
    padding: 5px 12px;
  }

  .post-content {
    padding: 16px;
    font-size: 15px;
  }

  .post-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .post-stats {
    flex-wrap: wrap;
    gap: 10px;
  }

  .post-stats span {
    padding: 4px 8px;
    font-size: 12px;
  }

  .post-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .post-actions .el-button {
    padding: 6px 12px;
    font-size: 12px;
  }

  .replies-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .replies-filter {
    width: 100%;
    overflow-x: auto;
  }

  .replies-filter .el-radio-group {
    flex-wrap: nowrap;
  }

  .reply-item {
    flex-direction: column;
    gap: 12px;
  }

  .reply-item:hover {
    margin: 0 -20px;
    padding: 20px;
  }

  .reply-avatar {
    display: none;
  }

  .reply-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .reply-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .emoji-grid {
    grid-template-columns: repeat(8, 1fr);
  }

  .share-options {
    flex-wrap: wrap;
    gap: 12px;
  }

  .share-item {
    padding: 14px 20px;
  }

  .reply-actions-bar {
    flex-direction: column;
    gap: 12px;
  }

  .reply-tools {
    width: 100%;
    justify-content: flex-start;
  }

  .reply-actions-bar > .el-button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .post-detail {
    padding: 12px;
  }

  .post-card :deep(.el-card__body),
  .replies-card :deep(.el-card__body),
  .reply-box-card :deep(.el-card__body) {
    padding: 16px;
  }

  .author-section {
    gap: 12px;
  }

  .author-avatar-wrapper .el-avatar {
    width: 40px;
    height: 40px;
  }

  .author-name {
    font-size: 14px;
  }

  .admin-actions {
    width: 100%;
    margin-left: 0;
    margin-top: 10px;
    justify-content: flex-start;
  }

  .admin-actions .el-button {
    padding: 5px 10px;
    font-size: 11px;
  }

  .post-footer {
    gap: 12px;
  }

  .post-stats {
    gap: 8px;
  }

  .post-stats span {
    padding: 3px 6px;
    font-size: 11px;
  }

  .post-actions {
    gap: 8px;
    width: 100%;
    justify-content: flex-start;
  }

  .post-actions .el-button {
    padding: 6px 10px;
    font-size: 11px;
  }

  .post-title {
    font-size: 18px;
  }

  .section-label {
    font-size: 11px;
    padding: 4px 10px;
  }

  .post-content {
    padding: 14px;
    font-size: 14px;
  }

  .reply-content {
    font-size: 14px;
  }

  .replies-filter .el-radio-button__inner {
    padding: 8px 14px;
    font-size: 12px;
  }

  .emoji-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}
</style>