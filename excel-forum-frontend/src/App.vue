<script setup>
import { onMounted } from 'vue'
import { useUserStore } from './stores/user'
import { useTheme } from './composables/useTheme'

const userStore = useUserStore()
const { initTheme } = useTheme()

onMounted(() => {
  initTheme()
  
  if (userStore.token && !userStore.user.id) {
    userStore.fetchUserInfo()
  }
})
</script>

<template>
  <router-view />
</template>
