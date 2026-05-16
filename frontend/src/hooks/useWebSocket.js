import { useEffect, useRef, useCallback, useState } from 'react'
import useAuthStore from '@/store/authStore'
import useAppStore from '@/store/appStore'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

export function useWebSocket(workspaceId, onMessage) {
  const wsRef = useRef(null)
  const reconnectRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const { token } = useAuthStore()
  const { setOnlineUsers, setUnreadCount } = useAppStore()

  const connect = useCallback(() => {
    if (!workspaceId || !token) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const url = `${WS_URL}/ws/${workspaceId}?token=${token}`
    const ws = new WebSocket(url)

    ws.onopen = () => {
      setIsConnected(true)
      // Request presence list
      ws.send(JSON.stringify({ type: 'presence_request' }))
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)

        if (message.type === 'presence_list') {
          setOnlineUsers(message.online_users || [])
        } else if (message.type === 'presence') {
          // Handle individual presence updates
        } else if (message.type === 'notification') {
          // Increment unread badge count in real time using functional updater
          setUnreadCount((prev) => prev + 1)
        }

        if (onMessage) onMessage(message)
      } catch (e) {
        console.error('WS parse error:', e)
      }
    }

    ws.onclose = (event) => {
      setIsConnected(false)
      wsRef.current = null
      if (event.code !== 1000 && event.code !== 4001 && event.code !== 4003) {
        // Auto-reconnect after 3s
        reconnectRef.current = setTimeout(connect, 3000)
      }
    }

    ws.onerror = () => {
      ws.close()
    }

    wsRef.current = ws
  }, [workspaceId, token])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectRef.current)
      if (wsRef.current) {
        wsRef.current.close(1000)
      }
    }
  }, [connect])

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const sendTyping = useCallback((isTyping) => {
    sendMessage({ type: 'typing', is_typing: isTyping })
  }, [sendMessage])

  return { isConnected, sendMessage, sendTyping }
}