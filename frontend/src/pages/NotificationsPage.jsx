import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RiBellLine, RiCheckDoubleLine, RiDeleteBinLine } from 'react-icons/ri'
import { notificationsAPI } from '@/services/apiServices'
import useAppStore from '@/store/appStore'
import EmptyState from '@/components/ui/EmptyState'
import { formatRelative } from '@/utils/helpers'
import toast from 'react-hot-toast'

const TYPE_CONFIG = {
  task_assigned:    { icon: '🎯', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40' },
  task_completed:   { icon: '✅', color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40' },
  comment_added:    { icon: '💬', color: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800/40' },
  workspace_invite: { icon: '🏢', color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40' },
  invite_accepted:  { icon: '🤝', color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40' },
  project_updated:  { icon: '📋', color: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/40' },
  default:          { icon: '🔔', color: 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700' },
}

const getId = (n) => n.id ?? n._id ?? null

export default function NotificationsPage() {
  const { setUnreadCount } = useAppStore()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const fetchNotifications = useCallback(async () => {
    try {
      const r = await notificationsAPI.getAll()
      const data = Array.isArray(r.data) ? r.data : (r.data ?? [])
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.read).length)
    } catch (err) {
      console.error('[NotificationsPage] fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [setUnreadCount])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchNotifications()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchNotifications])

  const markAllRead = async () => {
    try {
      await notificationsAPI.markRead({ notification_ids: [] })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch (err) {
      console.error('[NotificationsPage] markAllRead failed:', err)
      toast.error('Failed to mark notifications as read')
    }
  }

  const markOneRead = async (n) => {
    const id = getId(n)
    if (!id) return
    try {
      await notificationsAPI.markRead({ notification_ids: [id] })
      setNotifications((prev) =>
        prev.map((item) => getId(item) === id ? { ...item, read: true } : item)
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch (err) {
      console.error('[NotificationsPage] markOneRead failed:', err)
    }
  }

  const deleteNotification = async (n) => {
    const id = getId(n)
    if (!id) return
    try {
      await notificationsAPI.delete(id)
      const wasUnread = n.read === false
      setNotifications((prev) => prev.filter((item) => getId(item) !== id))
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1))
    } catch (err) {
      console.error('[NotificationsPage] delete failed:', err)
      toast.error('Failed to delete notification')
    }
  }

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read
    if (filter === 'read') return n.read
    return true
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-surface-900 dark:text-surface-100">
            Notifications
          </h1>
          <p className="text-surface-500 dark:text-surface-400 text-sm mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary">
            <RiCheckDoubleLine size={15} />
            Mark all read
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-surface-200 dark:border-surface-800">
        {['all', 'unread', 'read'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              filter === f
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-4 animate-pulse flex gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-200 dark:bg-surface-700 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-surface-200 dark:bg-surface-700 rounded w-3/4" />
                <div className="h-3 bg-surface-200 dark:bg-surface-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<RiBellLine size={32} />}
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
          description="You're all caught up! Notifications will appear here when there's activity."
        />
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((n) => {
              const nid = getId(n)
              const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.default
              return (
                <motion.div
                  key={nid}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer group ${config.color} ${!n.read ? 'shadow-sm' : 'opacity-70'}`}
                  onClick={() => !n.read && markOneRead(n)}
                >
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 flex items-center justify-center text-xl flex-shrink-0">
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-surface-900 dark:text-surface-100">
                      {n.title}
                      {!n.read && (
                        <span className="ml-2 w-2 h-2 rounded-full bg-primary-500 inline-block align-middle" />
                      )}
                    </p>
                    <p className="text-sm text-surface-600 dark:text-surface-400 mt-0.5">{n.message}</p>
                    <p className="text-xs text-surface-400 mt-1">{formatRelative(n.created_at)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotification(n) }}
                    className="p-1.5 rounded-lg text-surface-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  >
                    <RiDeleteBinLine size={15} />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}