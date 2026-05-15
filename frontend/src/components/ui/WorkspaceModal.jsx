import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { workspacesAPI } from '@/services/apiServices'
import { PROJECT_COLORS } from '@/utils/helpers'

const EMOJIS = ['🚀', '⚡', '🔥', '💡', '🎯', '🌟', '🏆', '💎', '🎨', '🛠️', '📊', '🌈']

export default function WorkspaceModal({ onClose, onCreated, workspace = null }) {
  const isEdit = !!workspace
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: workspace?.name || '',
    description: workspace?.description || '',
    color: workspace?.color || '#6366f1',
    icon: workspace?.icon || '🚀',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    try {
      let result
      if (isEdit) {
        result = await workspacesAPI.update(workspace.id, form)
        toast.success('Workspace updated!')
      } else {
        result = await workspacesAPI.create(form)
        toast.success('Workspace created!')
      }
      onCreated(result.data)
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? 'Edit Workspace' : 'Create Workspace'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Icon picker */}
        <div>
          <label className="label">Icon</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setForm((f) => ({ ...f, icon: emoji }))}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                  form.icon === emoji
                    ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-950'
                    : 'hover:bg-surface-100 dark:hover:bg-surface-700'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
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

        {/* Preview */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: form.color + '20', border: `2px solid ${form.color}40` }}
          >
            {form.icon}
          </div>
          <div>
            <p className="font-medium text-surface-900 dark:text-surface-100 text-sm">
              {form.name || 'Workspace name'}
            </p>
            <p className="text-xs text-surface-400">{form.description || 'No description'}</p>
          </div>
        </div>

        <div>
          <label className="label">Name *</label>
          <input
            className="input"
            placeholder="e.g. Product Team"
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
            placeholder="What is this workspace for?"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Workspace'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
