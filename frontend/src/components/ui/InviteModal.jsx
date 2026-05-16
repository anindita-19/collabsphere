import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { workspacesAPI } from '@/services/apiServices'

export default function InviteModal({ workspaceId, onClose, onInvited }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', role: 'member' })
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await workspacesAPI.inviteMember(workspaceId, form)
      setSent(true)
      toast.success(`Invite sent to ${form.email}!`)
      onInvited?.()
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Failed to send invite'
      toast.error(detail)
    } finally {
      setLoading(false)
    }
  }

  const handleSendAnother = () => {
    setForm({ email: '', role: 'member' })
    setSent(false)
  }

  return (
    <Modal isOpen onClose={onClose} title="Invite Member" size="sm">
      {sent ? (
        /* ── Success state ── */
        <div className="text-center py-4">
          <div className="text-4xl mb-3">📨</div>
          <h3 className="font-semibold text-surface-100 mb-1">Invite sent!</h3>
          <p className="text-surface-400 text-sm mb-6">
            An email with a join link was sent to{' '}
            <strong className="text-surface-200">{form.email}</strong>.
            The link expires in 7 days.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">
              Done
            </button>
            <button onClick={handleSendAnother} className="btn-primary flex-1 justify-center">
              Invite Another
            </button>
          </div>
        </div>
      ) : (
        /* ── Form ── */
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              className="input"
              placeholder="colleague@example.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              autoFocus
            />
            <p className="text-xs text-surface-500 mt-1.5">
              They'll receive an email with a link to join — even if they don't have an account yet.
            </p>
          </div>
          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              <option value="viewer">Viewer — Read only</option>
              <option value="member">Member — Can edit tasks</option>
              <option value="admin">Admin — Full access</option>
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 justify-center"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending…
                </span>
              ) : (
                'Send Invite'
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}