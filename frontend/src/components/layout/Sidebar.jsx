import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RiDashboardLine, RiProjectorLine, RiTaskLine, RiBarChartLine,
  RiFileTextLine, RiBellLine, RiSettings3Line, RiUserLine,
  RiMenuFoldLine, RiMenuUnfoldLine, RiAddLine, RiArrowRightSLine,
  RiLogoutBoxLine, RiGlobeLine, RiGroupLine,
} from 'react-icons/ri'
import useAuthStore from '@/store/authStore'
import useAppStore from '@/store/appStore'
import { workspacesAPI } from '@/services/apiServices'
import Avatar from '@/components/ui/Avatar'
import WorkspaceModal from '@/components/ui/WorkspaceModal'
import { getInitials } from '@/utils/helpers'

const NAV_ITEMS = [
  { icon: RiDashboardLine, label: 'Dashboard', path: '/dashboard' },
  { icon: RiBellLine, label: 'Notifications', path: '/notifications', badge: true },
  { icon: RiUserLine, label: 'Profile', path: '/profile' },
  { icon: RiSettings3Line, label: 'Settings', path: '/settings' },
]

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, unreadCount, setActiveWorkspace, activeWorkspace } = useAppStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const params = useParams()

  const [workspaces, setWorkspaces] = useState([])
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false)
  const [expandedWs, setExpandedWs] = useState(null)
  const [projects, setProjects] = useState({})

  useEffect(() => {
    workspacesAPI.getAll().then((res) => {
      setWorkspaces(res.data)
      if (res.data.length > 0 && !activeWorkspace) {
        setActiveWorkspace(res.data[0])
      }
    })
  }, [])

  useEffect(() => {
    if (params.workspaceId) {
      setExpandedWs(params.workspaceId)
    }
  }, [params.workspaceId])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const W = sidebarCollapsed ? 64 : 260

  return (
    <>
      <motion.aside
        animate={{ width: W }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="h-screen flex flex-col bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 overflow-hidden flex-shrink-0 z-30"
        style={{ width: W }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-surface-200 dark:border-surface-800">
          <AnimatePresence mode="wait">
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center text-white text-xs font-bold font-display">
                  CS
                </div>
                <span className="font-display font-bold text-surface-900 dark:text-surface-100 text-base tracking-tight">
                  CollabSphere
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 transition-colors flex-shrink-0"
          >
            {sidebarCollapsed ? <RiMenuUnfoldLine size={18} /> : <RiMenuFoldLine size={18} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {/* Main nav */}
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'active' : ''} ${sidebarCollapsed ? 'justify-center px-2' : ''}`
              }
              title={sidebarCollapsed ? item.label : undefined}
            >
              <div className="relative flex-shrink-0">
                <item.icon size={18} />
                {item.badge && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}

          {/* Workspaces section */}
          {!sidebarCollapsed && (
            <div className="pt-4 pb-1">
              <div className="flex items-center justify-between px-3 mb-1">
                <span className="text-[10px] font-semibold text-surface-400 dark:text-surface-600 uppercase tracking-widest">
                  Workspaces
                </span>
                <button
                  onClick={() => setShowWorkspaceModal(true)}
                  className="p-0.5 rounded hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-400 hover:text-primary-600 transition-colors"
                  title="Create workspace"
                >
                  <RiAddLine size={14} />
                </button>
              </div>
              <div className="space-y-0.5">
                {workspaces.map((ws) => (
                  <WorkspaceItem
                    key={ws.id}
                    ws={ws}
                    expanded={expandedWs === ws.id}
                    onToggle={() => setExpandedWs(expandedWs === ws.id ? null : ws.id)}
                    params={params}
                  />
                ))}
              </div>
            </div>
          )}

          {sidebarCollapsed && (
            <div className="pt-4">
              {workspaces.slice(0, 5).map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => navigate(`/workspace/${ws.id}`)}
                  className="sidebar-item justify-center px-2 w-full"
                  title={ws.name}
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: ws.color || '#6366f1' }}
                  >
                    {ws.icon || ws.name[0]}
                  </div>
                </button>
              ))}
              <button
                onClick={() => setShowWorkspaceModal(true)}
                className="sidebar-item justify-center px-2 w-full"
                title="Create workspace"
              >
                <RiAddLine size={18} />
              </button>
            </div>
          )}
        </div>

        {/* User profile */}
        <div className="border-t border-surface-200 dark:border-surface-800 p-3">
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <Avatar
              name={user?.full_name}
              color={user?.avatar_color}
              size="sm"
            />
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
                  {user?.full_name}
                </p>
                <p className="text-xs text-surface-400 truncate">@{user?.username}</p>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-surface-400 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <RiLogoutBoxLine size={16} />
              </button>
            )}
          </div>
          {sidebarCollapsed && (
            <button
              onClick={handleLogout}
              className="sidebar-item justify-center px-2 w-full mt-2 hover:text-red-500"
              title="Logout"
            >
              <RiLogoutBoxLine size={18} />
            </button>
          )}
        </div>
      </motion.aside>

      {showWorkspaceModal && (
        <WorkspaceModal
          onClose={() => setShowWorkspaceModal(false)}
          onCreated={(ws) => {
            setWorkspaces((prev) => [ws, ...prev])
            setShowWorkspaceModal(false)
            navigate(`/workspace/${ws.id}`)
          }}
        />
      )}
    </>
  )
}

function WorkspaceItem({ ws, expanded, onToggle, params }) {
  const navigate = useNavigate()

  return (
    <div>
      <button
        onClick={() => { onToggle(); navigate(`/workspace/${ws.id}`) }}
        className={`sidebar-item w-full ${params.workspaceId === ws.id ? 'active' : ''}`}
      >
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: ws.color || '#6366f1' }}
        >
          {ws.icon || ws.name[0]}
        </div>
        <span className="flex-1 truncate text-left">{ws.name}</span>
        <RiArrowRightSLine
          size={14}
          className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        />
      </button>
    </div>
  )
}
