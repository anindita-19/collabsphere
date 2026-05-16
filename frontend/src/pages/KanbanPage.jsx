import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { RiAddLine, RiDeleteBinLine, RiAttachmentLine, RiMessage2Line, RiArrowLeftLine } from 'react-icons/ri'
import { tasksAPI } from '@/services/apiServices'
import { useWebSocket } from '@/hooks/useWebSocket'
import useAuthStore from '@/store/authStore'
import TaskModal from '@/components/ui/TaskModal'
import TaskDetailPanel from '@/components/kanban/TaskDetailPanel'
import { PriorityBadge } from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import { TaskCardSkeleton } from '@/components/ui/LoadingScreen'
import { formatDate } from '@/utils/helpers'

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: '#94a3b8' },
  { id: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { id: 'review', label: 'Review', color: '#8b5cf6' },
  { id: 'completed', label: 'Completed', color: '#10b981' },
]

export default function KanbanPage() {
  const { workspaceId, projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [draggingTask, setDraggingTask] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createStatus, setCreateStatus] = useState('todo')
  const [selectedTask, setSelectedTask] = useState(null)
  const [filters, setFilters] = useState({ priority: '', search: '' })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const loadTasks = useCallback(async () => {
    try {
      const res = await tasksAPI.getAll(projectId, {
        priority: filters.priority || undefined,
        search: filters.search || undefined,
      })
      setTasks(res.data)
    } catch {
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [projectId, filters])

  useEffect(() => { loadTasks() }, [loadTasks])

  const { isConnected } = useWebSocket(workspaceId, (msg) => {
    if (['task_created', 'task_updated', 'task_moved', 'task_deleted'].includes(msg.type)) {
      loadTasks()
    }
  })

  const handleDragStart = ({ active }) => {
    const task = tasks.find((t) => t.id === active.id)
    setDraggingTask(task || null)
  }

  const handleDragEnd = async ({ active, over }) => {
    setDraggingTask(null)
    if (!over) return

    const taskId = active.id
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    const overIsColumn = COLUMNS.some((c) => c.id === over.id)
    const overTask = !overIsColumn ? tasks.find((t) => t.id === over.id) : null
    const targetStatus = overIsColumn ? over.id : (overTask?.status ?? task.status)

    if (targetStatus === task.status && !overTask) return

    const columnTasks = tasks
      .filter((t) => t.status === targetStatus && t.id !== taskId)
      .sort((a, b) => a.position - b.position)

    const targetIndex = overTask
      ? columnTasks.findIndex((t) => t.id === over.id)
      : columnTasks.length

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: targetStatus, position: targetIndex } : t
      )
    )

    try {
      await tasksAPI.move(projectId, taskId, { status: targetStatus, position: targetIndex })
    } catch {
      toast.error('Failed to move task')
      loadTasks()
    }
  }

  const handleTaskSaved = (task) => {
    setTasks((prev) => {
      const exists = prev.find((t) => t.id === task.id)
      if (exists) return prev.map((t) => (t.id === task.id ? task : t))
      return [task, ...prev]
    })
    setShowCreateModal(false)
  }

  const handleTaskDeleted = async (taskId) => {
    if (!confirm('Delete this task?')) return
    try {
      await tasksAPI.delete(projectId, taskId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      setSelectedTask(null)
      toast.success('Task deleted')
    } catch {
      toast.error('Failed to delete task')
    }
  }

  const filteredTasks = tasks.filter((t) => {
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.priority && t.priority !== filters.priority) return false
    return true
  })

  return (
    <div className="h-full flex flex-col gap-4 -m-6 p-6">
      {/* ── Back link ───────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate(`/workspace/${workspaceId}/project/${projectId}`)}
        className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors w-fit -mb-1"
      >
        <RiArrowLeftLine size={15} />
        Back to Project
      </button>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          className="input max-w-xs"
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
        <select
          className="input max-w-[140px]"
          value={filters.priority}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          {isConnected && (
            <span className="text-xs text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
          <button
            onClick={() => { setCreateStatus('todo'); setShowCreateModal(true) }}
            className="btn-primary"
          >
            <RiAddLine size={16} />
            New Task
          </button>
        </div>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id)
            return (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={colTasks}
                loading={loading}
                onAddTask={() => { setCreateStatus(col.id); setShowCreateModal(true) }}
                onTaskClick={(task) => setSelectedTask(task)}
                onTaskDelete={handleTaskDeleted}
              />
            )
          })}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {draggingTask && (
            <div className="opacity-90 rotate-1 scale-105">
              <TaskCard task={draggingTask} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {showCreateModal && (
        <TaskModal
          projectId={projectId}
          task={null}
          defaultStatus={createStatus}
          onClose={() => setShowCreateModal(false)}
          onSaved={handleTaskSaved}
        />
      )}

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          projectId={projectId}
          workspaceId={workspaceId}
          onClose={() => setSelectedTask(null)}
          onUpdated={(t) => { handleTaskSaved(t); setSelectedTask(t) }}
          onDeleted={() => handleTaskDeleted(selectedTask.id)}
        />
      )}
    </div>
  )
}

// ── Column ────────────────────────────────────────────────────────────────────

function KanbanColumn({ column, tasks, loading, onAddTask, onTaskClick, onTaskDelete }) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className="flex-shrink-0 w-72 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: column.color }} />
          <span className="font-semibold text-surface-700 dark:text-surface-300 text-sm">
            {column.label}
          </span>
          <span className="bg-surface-100 dark:bg-surface-800 text-surface-500 text-xs px-2 py-0.5 rounded-full font-medium">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onAddTask}
          className="p-1 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-400 hover:text-primary-600 transition-colors"
        >
          <RiAddLine size={16} />
        </button>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setDropRef}
          className={`flex-1 rounded-xl p-2 space-y-2 min-h-32 overflow-y-auto max-h-[calc(100vh-320px)] transition-colors duration-150 ${
            isOver
              ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-400/40'
              : 'bg-surface-100/50 dark:bg-surface-800/30'
          }`}
        >
          {loading ? (
            <>
              <TaskCardSkeleton />
              <TaskCardSkeleton />
            </>
          ) : tasks.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-surface-300 dark:text-surface-600 text-xs">
              Drop tasks here
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                onDelete={() => onTaskDelete(task.id)}
              />
            ))
          )}
          <button
            onClick={onAddTask}
            className="w-full py-2 text-xs text-surface-400 hover:text-primary-600 flex items-center justify-center gap-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"
          >
            <RiAddLine size={14} />
            Add task
          </button>
        </div>
      </SortableContext>
    </div>
  )
}

// ── Task card ─────────────────────────────────────────────────────────────────

function TaskCard({ task, onClick, onDelete, isDragging = false }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.3 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-3 hover:shadow-md transition-all duration-150 group ${
        isDragging ? 'shadow-xl' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p
          {...attributes}
          {...listeners}
          onClick={onClick}
          className="text-sm font-medium text-surface-900 dark:text-surface-100 leading-snug flex-1 line-clamp-2 cursor-grab active:cursor-grabbing"
        >
          {task.title}
        </p>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-surface-300 hover:text-red-500 transition-all flex-shrink-0"
          >
            <RiDeleteBinLine size={13} />
          </button>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-surface-400 dark:text-surface-500 mb-2 line-clamp-1">
          {task.description}
        </p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <PriorityBadge priority={task.priority} />
        {task.tags?.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="badge bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex -space-x-1.5">
          {task.assignee_details?.slice(0, 3).map((a) => (
            <Avatar key={a.id} name={a.full_name} color={a.avatar_color} size="xs" />
          ))}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-surface-400">
          {task.comment_count > 0 && (
            <span className="flex items-center gap-0.5">
              <RiMessage2Line size={11} />
              {task.comment_count}
            </span>
          )}
          {task.file_count > 0 && (
            <span className="flex items-center gap-0.5">
              <RiAttachmentLine size={11} />
              {task.file_count}
            </span>
          )}
          {task.due_date && (
            <span className={new Date(task.due_date) < new Date() ? 'text-red-500' : ''}>
              {formatDate(task.due_date).replace('Today at ', '').split(',')[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}