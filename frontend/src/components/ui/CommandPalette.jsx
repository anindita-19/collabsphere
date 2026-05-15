import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { RiSearchLine, RiArrowRightLine } from 'react-icons/ri'
import { workspacesAPI } from '@/services/apiServices'

export default function CommandPalette({ onClose }) {
  const [query, setQuery] = useState('')
  const [workspaces, setWorkspaces] = useState([])
  const [results, setResults] = useState([])
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    inputRef.current?.focus()
    workspacesAPI.getAll().then((res) => setWorkspaces(res.data))
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults(workspaces.slice(0, 5).map((ws) => ({
        type: 'workspace',
        label: ws.name,
        description: `${ws.project_count || 0} projects`,
        icon: ws.icon,
        action: () => navigate(`/workspace/${ws.id}`),
      })))
      return
    }

    const q = query.toLowerCase()
    const items = [
      ...workspaces
        .filter((ws) => ws.name.toLowerCase().includes(q))
        .map((ws) => ({
          type: 'workspace',
          label: ws.name,
          description: 'Workspace',
          icon: ws.icon,
          action: () => navigate(`/workspace/${ws.id}`),
        })),
      {
        type: 'nav',
        label: 'Go to Dashboard',
        description: 'Navigation',
        icon: '🏠',
        action: () => navigate('/dashboard'),
      },
      {
        type: 'nav',
        label: 'Go to Notifications',
        description: 'Navigation',
        icon: '🔔',
        action: () => navigate('/notifications'),
      },
      {
        type: 'nav',
        label: 'Go to Profile',
        description: 'Navigation',
        icon: '👤',
        action: () => navigate('/profile'),
      },
      {
        type: 'nav',
        label: 'Go to Settings',
        description: 'Navigation',
        icon: '⚙️',
        action: () => navigate('/settings'),
      },
    ].filter((item) => item.label.toLowerCase().includes(q))

    setResults(items.slice(0, 8))
  }, [query, workspaces])

  const handleSelect = (item) => {
    item.action()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -10 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-lg bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden"
        style={{ boxShadow: 'var(--shadow-modal)' }}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
          <RiSearchLine size={18} className="text-surface-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workspaces, projects, navigate..."
            className="flex-1 bg-transparent text-surface-900 dark:text-surface-100 placeholder:text-surface-400 outline-none text-sm"
          />
          <kbd className="px-2 py-1 rounded bg-surface-100 dark:bg-surface-700 text-surface-400 text-xs font-mono">
            ESC
          </kbd>
        </div>
        <div className="max-h-72 overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="text-center text-surface-400 text-sm py-8">No results found</p>
          ) : (
            results.map((item, i) => (
              <button
                key={i}
                onClick={() => handleSelect(item)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors text-left"
              >
                <span className="text-xl w-8 text-center">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{item.label}</p>
                  <p className="text-xs text-surface-400">{item.description}</p>
                </div>
                <RiArrowRightLine size={14} className="text-surface-300" />
              </button>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-surface-200 dark:border-surface-700 flex items-center gap-3 text-xs text-surface-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-700 font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-700 font-mono">↵</kbd>
            select
          </span>
        </div>
      </motion.div>
    </div>
  )
}
