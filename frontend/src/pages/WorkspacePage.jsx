import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  RiAddLine, RiTeamLine, RiSettings3Line, RiArrowRightLine,
  RiCheckboxCircleLine, RiTimeLine, RiUserAddLine, RiChat1Line,
} from 'react-icons/ri'
import { workspacesAPI, projectsAPI } from '@/services/apiServices'
import useAuthStore from '@/store/authStore'
import useAppStore from '@/store/appStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import ProjectModal from '@/components/ui/ProjectModal'
import WorkspaceModal from '@/components/ui/WorkspaceModal'
import { CardSkeleton } from '@/components/ui/LoadingScreen'
import EmptyState from '@/components/ui/EmptyState'
import Avatar from '@/components/ui/Avatar'
import { formatRelative, getStatusColor, getStatusLabel } from '@/utils/helpers'
import InviteModal from '@/components/ui/InviteModal'
import WorkspaceChat from '@/components/chat/WorkspaceChat'

export default function WorkspacePage() {
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { setActiveWorkspace } = useAppStore()

  const [workspace, setWorkspace] = useState(null)
  const [projects, setProjects] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showChat, setShowChat] = useState(false)

  const { isConnected, sendMessage } = useWebSocket(workspaceId, (msg) => {
    if (msg.type === 'project_created') loadProjects()
    if (msg.type === 'project_deleted') loadProjects()
    if (msg.type === 'project_updated') loadProjects()
  })

  const loadWorkspace = async () => {
    try {
      const [wsRes, actRes] = await Promise.all([
        workspacesAPI.get(workspaceId),
        workspacesAPI.getActivity(workspaceId, 20),
      ])
      setWorkspace(wsRes.data)
      setActivity(actRes.data)
      setActiveWorkspace(wsRes.data)
    } catch {
      toast.error('Workspace not found')
      navigate('/dashboard')
    }
  }

  const loadProjects = async () => {
    const res = await projectsAPI.getAll(workspaceId)
    setProjects(res.data)
  }

  useEffect(() => {
    Promise.all([loadWorkspace(), loadProjects()]).finally(() => setLoading(false))
  }, [workspaceId])

  const isOwnerOrAdmin = workspace?.members?.find(
    (m) => m.user_id === user?.id && ['owner', 'admin'].includes(m.role)
  )

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
            style={{ backgroundColor: (workspace?.color || '#6366f1') + '20', border: `2px solid ${workspace?.color || '#6366f1'}40` }}
          >
            {workspace?.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-xl text-slate-900 dark:text-slate-100">
                {workspace?.name}
              </h1>
              {isConnected && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Connected" />
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{workspace?.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChat(!showChat)}
            className="btn-secondary"
          >
            <RiChat1Line size={15} />
            Chat
          </button>
          {isOwnerOrAdmin && (
            <>
              <button onClick={() => setShowInviteModal(true)} className="btn-secondary">
                <RiUserAddLine size={15} />
                Invite
              </button>
              <button onClick={() => setShowEditModal(true)} className="btn-ghost">
                <RiSettings3Line size={15} />
              </button>
            </>
          )}
          <button onClick={() => setShowProjectModal(true)} className="btn-primary">
            <RiAddLine size={15} />
            New Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Projects */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              Projects
              <span className="ml-2 text-sm font-normal text-slate-400">({projects.length})</span>
            </h2>
          </div>

          {projects.length === 0 ? (
            <EmptyState
              icon="📁"
              title="No projects yet"
              description="Create your first project to start organizing work"
              action={
                <button onClick={() => setShowProjectModal(true)} className="btn-primary">
                  <RiAddLine size={16} /> Create Project
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project, i) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  workspaceId={workspaceId}
                  index={i}
                  onClick={() => navigate(`/workspace/${workspaceId}/project/${project.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Members */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <RiTeamLine size={15} />
                Members ({workspace?.members?.length || 0})
              </h3>
              {isOwnerOrAdmin && (
                <button onClick={() => setShowInviteModal(true)} className="text-xs text-indigo-600 hover:text-indigo-700">
                  + Invite
                </button>
              )}
            </div>
            <div className="space-y-2">
              {workspace?.members?.map((m) => (
                <div key={m.user_id} className="flex items-center gap-2">
                  <Avatar name={m.full_name} color={m.avatar_color} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{m.full_name}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{m.role}</p>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${workspace?.online_users?.includes(m.user_id) ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card p-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-3 flex items-center gap-2">
              <RiTimeLine size={15} />
              Activity
            </h3>
            <div className="space-y-3">
              {activity.slice(0, 8).map((log) => (
                <div key={log.id} className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-700 dark:text-slate-300">{log.description}</p>
                    <p className="text-[10px] text-slate-400">{formatRelative(log.created_at)}</p>
                  </div>
                </div>
              ))}
              {activity.length === 0 && (
                <p className="text-xs text-slate-400">No activity yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat panel */}
      {showChat && (
        <WorkspaceChat workspaceId={workspaceId} onClose={() => setShowChat(false)} />
      )}

      {showProjectModal && (
        <ProjectModal
          workspaceId={workspaceId}
          onClose={() => setShowProjectModal(false)}
          onCreated={(p) => { setProjects((prev) => [p, ...prev]); setShowProjectModal(false) }}
        />
      )}
      {showEditModal && (
        <WorkspaceModal
          workspace={workspace}
          onClose={() => setShowEditModal(false)}
          onCreated={(ws) => { setWorkspace(ws); setShowEditModal(false) }}
        />
      )}
      {showInviteModal && (
        <InviteModal
          workspaceId={workspaceId}
          onClose={() => setShowInviteModal(false)}
          onInvited={() => { loadWorkspace(); setShowInviteModal(false) }}
        />
      )}
    </div>
  )
}

function ProjectCard({ project, workspaceId, index, onClick }) {
  const total = project.total_tasks || 0
  const completed = project.task_counts?.completed || 0
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      onClick={onClick}
      className="card p-5 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color || '#6366f1' }} />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {project.name}
          </h3>
        </div>
        <span className={`badge ${getStatusColor(project.status)} text-[10px]`}>
          {getStatusLabel(project.status)}
        </span>
      </div>

      {project.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{project.description}</p>
      )}

      {/* Task counts */}
      <div className="flex gap-2 mb-3 text-xs text-slate-400">
        <span>{project.task_counts?.todo || 0} todo</span>
        <span>·</span>
        <span>{project.task_counts?.in_progress || 0} active</span>
        <span>·</span>
        <span>{completed} done</span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>{total} tasks</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="h-full rounded-full"
            style={{ backgroundColor: project.color || '#6366f1' }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <RiCheckboxCircleLine size={12} />
            {completed}/{total}
          </span>
        </div>
        <RiArrowRightLine size={14} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </motion.div>
  )
}