import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { projectsAPI } from '@/services/apiServices'
import { PROJECT_COLORS } from '@/utils/helpers'

export default function ProjectModal({ workspaceId, onClose, onCreated, project = null }) {
  const isEdit = !!project
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    color: project?.color || '#6366f1',
    status: project?.status || 'active',
    due_date: project?.due_date ? project.due_date.slice(0, 10) : '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    try {
      const payload = {
        ...form,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      }
      let result
      if (isEdit) {
        result = await projectsAPI.update(workspaceId, project.id, payload)
        toast.success('Project updated!')
      } else {
        result = await projectsAPI.create(workspaceId, payload)
        toast.success('Project created!')
      }
      onCreated(result.data)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? 'Edit Project' : 'New Project'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Color</label>
          <div className="flex flex-wrap gap-2">
            {PROJECT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color }))}
                className={`w-7 h-7 rounded-full transition-all ${
                  form.color === color ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="label">Name *</label>
          <input
            className="input"
            placeholder="Project name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            maxLength={100}
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input resize-none h-20"
            placeholder="What is this project about?"
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
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
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
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
