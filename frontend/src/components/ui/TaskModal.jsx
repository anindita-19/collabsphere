import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Modal from './Modal'
import Avatar from './Avatar'
import { tasksAPI, authAPI } from '@/services/apiServices'
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '@/utils/helpers'
import { RiUserAddLine, RiCloseLine } from 'react-icons/ri'
import { useDebounce } from '@/hooks/useAsync'

export default function TaskModal({ projectId, onClose, onSaved, task = null }) {
  const isEdit = !!task
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assignees: task?.assignees || [],
    due_date: task?.due_date ? task.due_date.slice(0, 10) : '',
    tags: task?.tags || [],
  })
  const [assigneeDetails, setAssigneeDetails] = useState(task?.assignee_details || [])
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [tagInput, setTagInput] = useState('')
  const debouncedSearch = useDebounce(userSearch, 300)

  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      authAPI.searchUsers(debouncedSearch).then((res) => setSearchResults(res.data))
    } else {
      setSearchResults([])
    }
  }, [debouncedSearch])

  const addAssignee = (user) => {
    if (form.assignees.includes(user.id)) return
    setForm((f) => ({ ...f, assignees: [...f.assignees, user.id] }))
    setAssigneeDetails((d) => [...d, user])
    setUserSearch('')
    setSearchResults([])
  }

  const removeAssignee = (userId) => {
    setForm((f) => ({ ...f, assignees: f.assignees.filter((id) => id !== userId) }))
    setAssigneeDetails((d) => d.filter((u) => u.id !== userId))
  }

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      if (!form.tags.includes(tagInput.trim())) {
        setForm((f) => ({ ...f, tags: [...f.tags, tagInput.trim()] }))
      }
      setTagInput('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    try {
      const payload = {
        ...form,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      }
      let result
      if (isEdit) {
        result = await tasksAPI.update(projectId, task.id, payload)
        toast.success('Task updated!')
      } else {
        result = await tasksAPI.create(projectId, payload)
        toast.success('Task created!')
      }
      onSaved(result.data)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? 'Edit Task' : 'New Task'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Title *</label>
          <input
            className="input text-base"
            placeholder="Task title..."
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            maxLength={200}
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input resize-none h-24"
            placeholder="Add details about this task..."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select
              className="input"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Due Date</label>
          <input
            type="date"
            className="input"
            value={form.due_date}
            onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
          />
        </div>

        {/* Assignees */}
        <div>
          <label className="label">Assignees</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {assigneeDetails.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-100 dark:bg-surface-700 text-xs"
              >
                <Avatar name={user.full_name} color={user.avatar_color} size="xs" />
                <span className="text-surface-700 dark:text-surface-300">{user.full_name}</span>
                <button
                  type="button"
                  onClick={() => removeAssignee(user.id)}
                  className="text-surface-400 hover:text-red-500 transition-colors"
                >
                  <RiCloseLine size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="relative">
            <input
              className="input"
              placeholder="Search users to assign..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg z-10 overflow-hidden">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => addAssignee(user)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
                  >
                    <Avatar name={user.full_name} color={user.avatar_color} size="sm" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{user.full_name}</p>
                      <p className="text-xs text-surface-400">@{user.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="label">Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }))}
                  className="hover:text-red-500"
                >
                  <RiCloseLine size={12} />
                </button>
              </span>
            ))}
          </div>
          <input
            className="input"
            placeholder="Add tag and press Enter..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={addTag}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
