import { useNavigate, useLocation } from 'react-router-dom'
import { RiSearchLine, RiSunLine, RiMoonLine, RiNotification3Line, RiCommandLine } from 'react-icons/ri'
import useAppStore from '@/store/appStore'
import useAuthStore from '@/store/authStore'
import Avatar from '@/components/ui/Avatar'

export default function TopBar() {
  const { theme, toggleTheme, unreadCount, setCommandPaletteOpen } = useAppStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const getPageTitle = () => {
    const path = location.pathname
    if (path === '/dashboard') return 'Dashboard'
    if (path === '/notifications') return 'Notifications'
    if (path === '/profile') return 'Profile'
    if (path === '/settings') return 'Settings'
    if (path.includes('/kanban')) return 'Kanban Board'
    if (path.includes('/analytics')) return 'Analytics'
    if (path.includes('/docs')) return 'Documents'
    if (path.includes('/project/')) return 'Project'
    if (path.includes('/workspace/')) return 'Workspace'
    return 'CollabSphere'
  }

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 flex-shrink-0">
      <h1 className="font-display font-semibold text-surface-900 dark:text-surface-100 text-lg">
        {getPageTitle()}
      </h1>

      <div className="flex items-center gap-2">
        {/* Command palette trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors text-sm"
        >
          <RiSearchLine size={14} />
          <span>Search...</span>
          <div className="flex items-center gap-0.5 ml-2">
            <kbd className="px-1.5 py-0.5 rounded bg-surface-200 dark:bg-surface-700 text-surface-500 dark:text-surface-400 text-[10px] font-mono">⌘</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-surface-200 dark:bg-surface-700 text-surface-500 dark:text-surface-400 text-[10px] font-mono">K</kbd>
          </div>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 dark:text-surface-400 transition-colors"
        >
          {theme === 'dark' ? <RiSunLine size={18} /> : <RiMoonLine size={18} />}
        </button>

        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 dark:text-surface-400 transition-colors"
        >
          <RiNotification3Line size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Avatar */}
        <button onClick={() => navigate('/profile')} className="ml-1">
          <Avatar name={user?.full_name} color={user?.avatar_color} size="sm" />
        </button>
      </div>
    </header>
  )
}
