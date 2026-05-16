import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { RiBarChartLine, RiTeamLine, RiCheckboxCircleLine, RiTimeLine, RiArrowLeftLine } from 'react-icons/ri'
import { analyticsAPI, projectsAPI } from '@/services/apiServices'
import { CardSkeleton } from '@/components/ui/LoadingScreen'
import Avatar from '@/components/ui/Avatar'

const PRIORITY_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  urgent: '#ef4444',
}

function StatCard({ label, value, sub, icon: Icon, color, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="card p-5 flex items-center gap-4"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color + '18' }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-surface-900 dark:text-surface-100">{value}</p>
        <p className="text-sm text-surface-500 dark:text-surface-400">{label}</p>
        {sub && <p className="text-xs text-surface-400 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-medium text-surface-900 dark:text-surface-100 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const { workspaceId, projectId } = useParams()
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState(null)
  const [projectAnalytics, setProjectAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      analyticsAPI.getWorkspace(workspaceId),
      projectsAPI.getAnalytics(workspaceId, projectId),
    ])
      .then(([wsRes, projRes]) => {
        setAnalytics(wsRes.data)
        setProjectAnalytics(projRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceId, projectId])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  const taskStatusData = [
    { name: 'To Do',       value: analytics?.task_counts?.todo        ?? 0, color: '#94a3b8' },
    { name: 'In Progress', value: analytics?.task_counts?.in_progress ?? 0, color: '#3b82f6' },
    { name: 'Review',      value: analytics?.task_counts?.review      ?? 0, color: '#8b5cf6' },
    { name: 'Completed',   value: analytics?.task_counts?.completed   ?? 0, color: '#10b981' },
  ]
  const pieHasData = taskStatusData.some((d) => d.value > 0)

  const priorityData = projectAnalytics?.priority_counts
    ? Object.entries(projectAnalytics.priority_counts).map(([k, v]) => ({
        name: k.charAt(0).toUpperCase() + k.slice(1),
        count: v,
        fill: PRIORITY_COLORS[k] ?? '#6366f1',
      }))
    : (analytics?.priority_data ?? []).map((d) => ({
        name: d.priority.charAt(0).toUpperCase() + d.priority.slice(1),
        count: d.count,
        fill: PRIORITY_COLORS[d.priority] ?? '#6366f1',
      }))

  const projectStatsData = analytics?.project_stats ?? []
  const memberStats = analytics?.member_stats ?? []

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">

      {/* ── Back link ───────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate(`/workspace/${workspaceId}/project/${projectId}`)}
        className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      >
        <RiArrowLeftLine size={15} />
        Back to Project
      </button>

      {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Tasks"
          value={analytics?.total_tasks ?? '—'}
          sub={`${analytics?.completed_tasks ?? 0} completed`}
          icon={RiCheckboxCircleLine}
          color="#6366f1"
          index={0}
        />
        <StatCard
          label="Completion Rate"
          value={`${analytics?.completion_rate ?? 0}%`}
          sub="across all projects"
          icon={RiBarChartLine}
          color="#10b981"
          index={1}
        />
        <StatCard
          label="Team Members"
          value={analytics?.member_count ?? '—'}
          sub={`${analytics?.online_users ?? 0} online now`}
          icon={RiTeamLine}
          color="#06b6d4"
          index={2}
        />
        <StatCard
          label="Active Projects"
          value={analytics?.active_projects ?? '—'}
          sub={`of ${analytics?.total_projects ?? 0} total`}
          icon={RiTimeLine}
          color="#f59e0b"
          index={3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-5"
        >
          <h3 className="font-display font-semibold text-surface-900 dark:text-surface-100 mb-4">
            Task Status Distribution
          </h3>
          {pieHasData ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={taskStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {taskStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-surface-600 dark:text-surface-400">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center text-surface-400 text-sm gap-2">
              <span className="text-3xl">📋</span>
              No tasks yet — create some on the Kanban board
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card p-5"
        >
          <h3 className="font-display font-semibold text-surface-900 dark:text-surface-100 mb-4">
            Tasks by Priority
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={priorityData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Tasks" radius={[6, 6, 0, 0]}>
                {priorityData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {projectStatsData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-5"
        >
          <h3 className="font-display font-semibold text-surface-900 dark:text-surface-100 mb-4">
            Project Progress Overview
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={projectStatsData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" name="Total" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {memberStats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card p-5"
        >
          <h3 className="font-display font-semibold text-surface-900 dark:text-surface-100 mb-4">
            Contributor Workload
          </h3>
          <div className="space-y-4">
            {memberStats.map((member) => {
              const rate = member.task_count > 0
                ? Math.round((member.completed / member.task_count) * 100)
                : 0
              return (
                <div key={member.user_id} className="flex items-center gap-4">
                  <Avatar name={member.full_name} color={member.avatar_color} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
                        {member.full_name}
                      </p>
                      <span className="text-xs text-surface-400 ml-2 flex-shrink-0">
                        {member.completed}/{member.task_count} tasks ({rate}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${rate}%` }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-violet"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {projectAnalytics?.recent_activity?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-5"
        >
          <h3 className="font-display font-semibold text-surface-900 dark:text-surface-100 mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {projectAnalytics.recent_activity.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-surface-700 dark:text-surface-300">{log.description}</p>
                  <p className="text-xs text-surface-400 mt-0.5">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}