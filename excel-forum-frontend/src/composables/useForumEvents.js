import { ref, onMounted, onUnmounted } from 'vue'
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'

export function useForumEvents(onEvent, onNotificationEvent) {
  const client = ref(null)
  const connected = ref(false)

  const connect = () => {
    const socket = new SockJS('/ws')

    client.value = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: (frame) => {
        connected.value = true
        console.log('Connected to forum events:', frame)

        // 订阅论坛事件频道
        client.value.subscribe('/topic/forum', (message) => {
          const event = JSON.parse(message.body)
          if (onEvent) {
            onEvent(event)
          }
        })

        // 订阅用户专属通知频道
        if (onNotificationEvent) {
          const userStr = localStorage.getItem('user')
          if (userStr) {
            try {
              const user = JSON.parse(userStr)
              if (user && user.id) {
                client.value.subscribe('/topic/notifications/user/' + user.id, (message) => {
                  const event = JSON.parse(message.body)
                  onNotificationEvent(event)
                })
              }
            } catch (e) {
              console.error('解析用户信息失败:', e)
            }
          }
        }
      },
      onDisconnect: () => {
        connected.value = false
        console.log('Disconnected from forum events')
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame)
        connected.value = false
      }
    })

    client.value.activate()
  }

  const disconnect = () => {
    if (client.value) {
      client.value.deactivate()
    }
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    connected,
    disconnect
  }
}
