import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RiAddLine, RiProjectorLine, RiTeamLine, RiArrowRightLine, RiRocketLine } from 'react-icons/ri'
import useAuthStore from '@/store/authStore'
import { workspacesAPI } from '@/services/apiServices'
import { CardSkeleton } from '@/components/ui/LoadingScreen'
import EmptyState from '@/components/ui/EmptyState'
import WorkspaceModal from '@/components/ui/WorkspaceModal'
import { formatRelative } from '@/utils/helpers'

export default function Dashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    workspacesAPI.getAll()
      .then((res) => setWorkspaces(res.data))
      .finally(() => setLoading(false))
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-surface-900 dark:text-surface-100">
            {greeting}, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1 text-sm">
            Here's what's happening across your workspaces
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <RiAddLine size={16} />
          New Workspace
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Workspaces', value: workspaces.length, icon: '🏢', color: 'primary' },
          {
            label: 'Projects',
            value: workspaces.reduce((a, w) => a + (w.project_count || 0), 0),
            icon: '📁',
            color: 'violet',
          },
          {
            label: 'Team Members',
            value: [...new Set(workspaces.flatMap((w) => w.members?.map((m) => m.user_id) || []))].length,
            icon: '👥',
            color: 'cyan',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card p-5 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-2xl">
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-surface-900 dark:text-surface-100">
                {loading ? '—' : stat.value}
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-400">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Workspaces */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-surface-900 dark:text-surface-100">
            Your Workspaces
          </h2>
          <span className="text-sm text-surface-400">{workspaces.length} workspaces</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
          </div>
        ) : workspaces.length === 0 ? (
          <EmptyState
            icon="🚀"
            title="No workspaces yet"
            description="Create your first workspace to start collaborating with your team"
            action={
              <button onClick={() => setShowModal(true)} className="btn-primary">
                <RiAddLine size={16} />
                Create Workspace
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((ws, i) => (
              <motion.div
                key={ws.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => navigate(`/workspace/${ws.id}`)}
                className="card p-5 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm"
                      style={{ backgroundColor: ws.color + '20', border: `2px solid ${ws.color}40` }}
                    >
                      {ws.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-surface-900 dark:text-surface-100 text-sm group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {ws.name}
                      </h3>
                      <p className="text-xs text-surface-400">{ws.members?.length} member{ws.members?.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <RiArrowRightLine size={16} className="text-surface-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" />
                </div>

                {ws.description && (
                  <p className="text-xs text-surface-500 dark:text-surface-400 mb-4 line-clamp-2">
                    {ws.description}
                  </p>
                )}

                {/* Stats row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-surface-400">
                    <span className="flex items-center gap-1">
                      <RiProjectorLine size={13} />
                      {ws.project_count || 0} projects
                    </span>
                    <span className="flex items-center gap-1">
                      <RiTeamLine size={13} />
                      {ws.members?.length || 0} members
                    </span>
                  </div>
                  {/* Member avatars */}
                  <div className="flex -space-x-2">
                    {ws.members?.slice(0, 3).map((m) => (
                      <div
                        key={m.user_id}
                        className="w-6 h-6 rounded-full border-2 border-white dark:border-surface-800 flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ backgroundColor: m.avatar_color || '#6366f1' }}
                        title={m.full_name}
                      >
                        {m.full_name?.[0]}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Color bar */}
                <div className="mt-4 h-1 rounded-full opacity-40" style={{ backgroundColor: ws.color }} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <WorkspaceModal
          onClose={() => setShowModal(false)}
          onCreated={(ws) => {
            setWorkspaces((prev) => [ws, ...prev])
            setShowModal(false)
            navigate(`/workspace/${ws.id}`)
          }}
        />
      )}
    </div>
  )
}
