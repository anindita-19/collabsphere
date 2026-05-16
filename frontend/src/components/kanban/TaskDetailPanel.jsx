import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  RiCloseLine, RiEditLine, RiDeleteBinLine, RiSendPlaneLine,
  RiAttachmentLine, RiDownload2Line, RiHistoryLine,
} from 'react-icons/ri'
import { tasksAPI, filesAPI } from '@/services/apiServices'
import useAuthStore from '@/store/authStore'
import Avatar from '@/components/ui/Avatar'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { formatDate, formatRelative, formatFileSize, getFileIcon } from '@/utils/helpers'
import TaskModal from '@/components/ui/TaskModal'
import toast from 'react-hot-toast'

export default function TaskDetailPanel({ task, projectId, workspaceId, onClose, onUpdated, onDeleted }) {
  const { user } = useAuthStore()
  const [comments, setComments] = useState([])
  const [files, setFiles] = useState([])
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => {
    if (!task?.id) return
    tasksAPI.getComments(projectId, task.id).then((r) => setComments(r.data))
    filesAPI.getTaskFiles(task.id).then((r) => setFiles(r.data))
  }, [task?.id])

  const handleComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setSending(true)
    try {
      const res = await tasksAPI.addComment(projectId, task.id, { content: commentText })
      setComments((prev) => [...prev, res.data])
      setCommentText('')
    } catch {
      toast.error('Failed to send comment')
    } finally {
      setSending(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    try {
      await tasksAPI.deleteComment(projectId, task.id, commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch {
      toast.error('Failed to delete comment')
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('task_id', task.id)
    formData.append('project_id', projectId)
    formData.append('workspace_id', workspaceId)
    try {
      const res = await filesAPI.upload(formData)
      setFiles((prev) => [...prev, res.data])
      toast.success('File uploaded!')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDeleteFile = async (fileId) => {
    try {
      await filesAPI.delete(fileId)
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
    } catch {
      toast.error('Failed to delete file')
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-surface-900 border-l border-surface-200 dark:border-surface-700 z-40 flex flex-col overflow-hidden"
        style={{ boxShadow: 'var(--shadow-modal)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-2">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowEdit(true)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-400 transition-colors">
              <RiEditLine size={16} />
            </button>
            <button onClick={onDeleted} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-surface-400 hover:text-red-500 transition-colors">
              <RiDeleteBinLine size={16} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-400 transition-colors">
              <RiCloseLine size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Task info */}
          <div className="p-5 border-b border-surface-200 dark:border-surface-700">
            <h2 className="font-display font-semibold text-surface-900 dark:text-surface-100 text-lg mb-2 leading-snug">
              {task.title}
            </h2>
            {task.description && (
              <p className="text-surface-600 dark:text-surface-400 text-sm leading-relaxed mb-4">{task.description}</p>
            )}
            <div className="space-y-2 text-sm">
              {task.due_date && (
                <div className="flex items-center gap-2 text-surface-500">
                  <RiHistoryLine size={14} />
                  Due: <span className={new Date(task.due_date) < new Date() ? 'text-red-500' : ''}>{formatDate(task.due_date)}</span>
                </div>
              )}
              {task.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {task.tags.map((tag) => (
                    <span key={tag} className="badge bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400">{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Assignees */}
            {task.assignee_details?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-surface-400 mb-2">Assignees</p>
                <div className="flex flex-wrap gap-2">
                  {task.assignee_details.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 px-2 py-1 rounded-full bg-surface-100 dark:bg-surface-800">
                      <Avatar name={a.full_name} color={a.avatar_color} size="xs" />
                      <span className="text-xs text-surface-700 dark:text-surface-300">{a.full_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Files */}
          <div className="p-5 border-b border-surface-200 dark:border-surface-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm text-surface-900 dark:text-surface-100 flex items-center gap-2">
                <RiAttachmentLine size={14} />
                Files ({files.length})
              </h3>
              <label className="cursor-pointer text-xs text-primary-600 hover:text-primary-700 font-medium">
                {uploading ? 'Uploading...' : '+ Upload'}
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
            <div className="space-y-2">
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg bg-surface-50 dark:bg-surface-800 group">
                  <span className="text-lg">{getFileIcon(f.content_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-surface-900 dark:text-surface-100 truncate">{f.original_name}</p>
                    <p className="text-[10px] text-surface-400">{formatFileSize(f.size)}</p>
                  </div>
                  <a
                    href={filesAPI.download(f.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded text-surface-400 hover:text-primary-600 transition-colors"
                  >
                    <RiDownload2Line size={14} />
                  </a>
                  {f.uploaded_by === user?.id && (
                    <button
                      onClick={() => handleDeleteFile(f.id)}
                      className="p-1 rounded text-surface-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <RiDeleteBinLine size={14} />
                    </button>
                  )}
                </div>
              ))}
              {files.length === 0 && <p className="text-xs text-surface-400">No files attached</p>}
            </div>
          </div>

          {/* Comments */}
          <div className="p-5">
            <h3 className="font-medium text-sm text-surface-900 dark:text-surface-100 mb-3">
              Comments ({comments.length})
            </h3>
            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3 group">
                  <Avatar name={c.author?.full_name} color={c.author?.avatar_color} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-surface-900 dark:text-surface-100">{c.author?.full_name}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-surface-400">{formatRelative(c.created_at)}</span>
                        {c.user_id === user?.id && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="p-0.5 rounded text-surface-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <RiDeleteBinLine size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-surface-700 dark:text-surface-300 mt-0.5 leading-relaxed">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Comment input */}
        <div className="border-t border-surface-200 dark:border-surface-700 p-4">
          <form onSubmit={handleComment} className="flex items-end gap-2">
            <Avatar name={user?.full_name} color={user?.avatar_color} size="sm" />
            <div className="flex-1">
              <textarea
                className="input resize-none h-20 text-sm"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleComment(e) }}
              />
            </div>
            <button type="submit" disabled={!commentText.trim() || sending} className="btn-primary self-end">
              <RiSendPlaneLine size={15} />
            </button>
          </form>
        </div>
      </motion.div>

      {showEdit && (
        <TaskModal
          projectId={projectId}
          task={task}
          onClose={() => setShowEdit(false)}
          onSaved={(t) => { onUpdated(t); setShowEdit(false) }}
        />
      )}
    </>
  )
}