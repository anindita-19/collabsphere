import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAppStore = create(
  persist(
    (set, get) => ({
      // Theme
      theme: 'light',
      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light'
        set({ theme: newTheme })
        document.documentElement.classList.toggle('dark', newTheme === 'dark')
      },
      initTheme: () => {
        const { theme } = get()
        document.documentElement.classList.toggle('dark', theme === 'dark')
      },

      // Active workspace
      activeWorkspace: null,
      setActiveWorkspace: (ws) => set({ activeWorkspace: ws }),

      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      // Notifications count
      unreadCount: 0,
      setUnreadCount: (count) => set({ unreadCount: count }),
      decrementUnread: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),

      // Online users in current workspace
      onlineUsers: [],
      setOnlineUsers: (users) => set({ onlineUsers: users }),

      // Command palette
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    }),
    {
      name: 'collabsphere-app',
      partialize: (state) => ({ theme: state.theme, sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
)

export default useAppStore
