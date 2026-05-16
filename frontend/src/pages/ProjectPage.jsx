import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, NavLink, useLocation, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  RiKanbanView, RiBarChartLine, RiFileTextLine,
  RiDeleteBinLine, RiArrowLeftLine,
  RiEditLine, RiCalendarLine,
} from 'react-icons/ri'
import { projectsAPI } from '@/services/apiServices'
import ProjectModal from '@/components/ui/ProjectModal'
import { getStatusColor, getStatusLabel, formatDate } from '@/utils/helpers'
import { CardSkeleton } from '@/components/ui/LoadingScreen'

export default function ProjectPage() {
  const { workspaceId, projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)

  const fetchProject = useCallback(() => {
    projectsAPI.get(workspaceId, projectId)
      .then((res) => setProject(res.data))
      .catch(() => { toast.error('Project not found'); navigate(`/workspace/${workspaceId}`) })
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => { fetchProject() }, [fetchProject])

  // Auto-redirect to kanban if on the base project path
  useEffect(() => {
    if (!loading && project) {
      const isBasePath = location.pathname === `/workspace/${workspaceId}/project/${projectId}` ||
                         location.pathname === `/workspace/${workspaceId}/project/${projectId}/`
      if (isBasePath) {
        navigate(`/workspace/${workspaceId}/project/${projectId}/kanban`, { replace: true })
      }
    }
  }, [loading, project, location.pathname])

  const handleDelete = async () => {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return
    try {
      await projectsAPI.delete(workspaceId, projectId)
      toast.success('Project deleted')
      navigate(`/workspace/${workspaceId}`)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete project')
    }
  }

  if (loading) return <div className="max-w-6xl mx-auto"><CardSkeleton /></div>

  const total = project?.total_tasks || 0
  const completed = project?.task_counts?.completed || 0
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  const tabs = [
    { label: 'Kanban Board', path: 'kanban', icon: RiKanbanView },
    { label: 'Analytics', path: 'analytics', icon: RiBarChartLine },
    { label: 'Documents', path: 'docs', icon: RiFileTextLine },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate(`/workspace/${workspaceId}`)}
        className="flex items-center gap-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 text-sm transition-colors"
      >
        <RiArrowLeftLine size={16} />
        Back to workspace
      </button>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl" style={{ backgroundColor: project?.color || '#6366f1', opacity: 0.8 }} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-xl text-surface-900 dark:text-surface-100">
                  {project?.name}
                </h1>
                <span className={`badge ${getStatusColor(project?.status)}`}>
                  {getStatusLabel(project?.status)}
                </span>
              </div>
              {project?.description && (
                <p className="text-surface-500 dark:text-surface-400 text-sm mt-0.5">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEdit(true)} className="btn-ghost">
              <RiEditLine size={15} />
              Edit
            </button>
            <button onClick={handleDelete} className="btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
              <RiDeleteBinLine size={15} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Total Tasks', value: total },
            { label: 'Completed', value: completed },
            { label: 'In Progress', value: project?.task_counts?.in_progress || 0 },
            { label: 'Progress', value: `${progress}%` },
          ].map((s) => (
            <div key={s.label} className="text-center p-3 bg-surface-50 dark:bg-surface-700/50 rounded-xl">
              <p className="font-display font-bold text-xl text-surface-900 dark:text-surface-100">{s.value}</p>
              <p className="text-xs text-surface-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-surface-400">
            <span>Completion</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8 }}
              className="h-full rounded-full"
              style={{ backgroundColor: project?.color || '#6366f1' }}
            />
          </div>
        </div>

        {project?.due_date && (
          <div className="flex items-center gap-2 mt-4 text-xs text-surface-400">
            <RiCalendarLine size={13} />
            Due: {formatDate(project.due_date)}
          </div>
        )}
      </div>

      {/* Sub-navigation */}
      <div className="flex items-center gap-1 border-b border-surface-200 dark:border-surface-800">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={`/workspace/${workspaceId}/project/${projectId}/${tab.path}`}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                isActive
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:border-surface-300'
              }`
            }
          >
            <tab.icon size={15} />
            {tab.label}
          </NavLink>
        ))}
      </div>

      {/* Pass fetchProject down so KanbanPage can trigger a stats refresh */}
      <Outlet context={{ onTaskMoved: fetchProject }} />

      {showEdit && (
        <ProjectModal
          workspaceId={workspaceId}
          project={project}
          onClose={() => setShowEdit(false)}
          onCreated={(p) => { setProject(p); setShowEdit(false) }}
        />
      )}
    </div>
  )
}