import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { workspacesAPI } from '@/services/apiServices'

export default function InviteModal({ workspaceId, onClose, onInvited }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', role: 'member' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await workspacesAPI.inviteMember(workspaceId, form)
      toast.success('Invitation sent!')
      onInvited()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to invite member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Invite Member" size="sm">
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
          />
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
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
            {loading ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
