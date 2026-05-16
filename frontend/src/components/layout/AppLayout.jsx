import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import useAppStore from '@/store/appStore'
import useAuthStore from '@/store/authStore'
import { notificationsAPI } from '@/services/apiServices'
import CommandPalette from '@/components/ui/CommandPalette'
import { useKeyboard } from '@/hooks/useAsync'

export default function AppLayout() {
  const { sidebarCollapsed, setUnreadCount, commandPaletteOpen, setCommandPaletteOpen } = useAppStore()
  const { initAuth } = useAuthStore()

  useEffect(() => {
    // MUST call initAuth first — it restores the Authorization header from
    // the persisted token. Without this, every API call after a page refresh
    // goes out without a token and the backend returns 401 silently.
    initAuth()

    // Now safe to make API calls — header is set synchronously by initAuth
    notificationsAPI.getUnreadCount()
      .then((res) => setUnreadCount(res.data.count))
      .catch(() => {})

    const interval = setInterval(() => {
      notificationsAPI.getUnreadCount()
        .then((res) => setUnreadCount(res.data.count))
        .catch(() => {})
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Keyboard shortcut for command palette
  useKeyboard('k', () => setCommandPaletteOpen(true), [])

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50 dark:bg-surface-950">
      <Sidebar />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300`}>
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
      {commandPaletteOpen && <CommandPalette onClose={() => setCommandPaletteOpen(false)} />}
    </div>
  )
}