import { ref, onMounted, onUnmounted } from 'vue'
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'

export function useForumEvents(onEvent) {
  const client = ref(null)
  const connected = ref(false)

  const connect = () => {
    const socket = new SockJS('http://localhost:8080/ws')
    
    client.value = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: (frame) => {
        connected.value = true
        console.log('Connected to forum events:', frame)
        
        client.value.subscribe('/topic/forum', (message) => {
          const event = JSON.parse(message.body)
          if (onEvent) {
            onEvent(event)
          }
        })
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
