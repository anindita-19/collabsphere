import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { RiEditLine, RiSaveLine, RiLockPasswordLine } from 'react-icons/ri'
import { authAPI } from '@/services/apiServices'
import useAuthStore from '@/store/authStore'
import Avatar from '@/components/ui/Avatar'
import { PROJECT_COLORS } from '@/utils/helpers'

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    bio: user?.bio || '',
    avatar_color: user?.avatar_color || '#6366f1',
    timezone: user?.timezone || 'UTC',
  })
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const res = await authAPI.updateProfile(form)
      updateUser(res.data)
      setEditing(false)
      toast.success('Profile updated!')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Passwords do not match')
      return
    }
    setSavingPassword(true)
    try {
      await authAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      toast.success('Password changed successfully!')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to change password')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h1 className="font-display font-bold text-xl text-surface-900 dark:text-surface-100">Profile</h1>

      {/* Profile Card */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <Avatar
              name={editing ? form.full_name : user?.full_name}
              color={editing ? form.avatar_color : user?.avatar_color}
              size="xl"
            />
            <div>
              <h2 className="font-display font-semibold text-xl text-surface-900 dark:text-surface-100">
                {user?.full_name}
              </h2>
              <p className="text-surface-400">@{user?.username}</p>
              <p className="text-surface-500 text-sm">{user?.email}</p>
            </div>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn-secondary">
              <RiEditLine size={15} />
              Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input
              className="input"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              disabled={!editing}
              maxLength={100}
            />
          </div>

          <div>
            <label className="label">Bio</label>
            <textarea
              className="input resize-none h-20"
              placeholder={editing ? 'Tell us about yourself...' : 'No bio yet'}
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              disabled={!editing}
            />
          </div>

          {editing && (
            <div>
              <label className="label">Avatar Color</label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, avatar_color: color }))}
                    className={`w-8 h-8 rounded-full transition-all ${
                      form.avatar_color === color ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">Timezone</label>
            <select
              className="input"
              value={form.timezone}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
              disabled={!editing}
            >
              {Intl.supportedValuesOf('timeZone').map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          {editing && (
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setForm({ full_name: user?.full_name, bio: user?.bio, avatar_color: user?.avatar_color, timezone: user?.timezone })
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button type="submit" disabled={savingProfile} className="btn-primary flex-1 justify-center">
                <RiSaveLine size={15} />
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Password Change */}
      <div className="card p-6">
        <h3 className="font-display font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2 mb-5">
          <RiLockPasswordLine size={18} />
          Change Password
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className="input"
              placeholder="Enter current password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm((f) => ({ ...f, current_password: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className="input"
              placeholder="Min. 8 characters"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm((f) => ({ ...f, new_password: e.target.value }))}
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className="input"
              placeholder="Confirm new password"
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm((f) => ({ ...f, confirm_password: e.target.value }))}
              required
              minLength={8}
            />
          </div>
          <button type="submit" disabled={savingPassword} className="btn-primary">
            {savingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Account Info */}
      <div className="card p-6">
        <h3 className="font-display font-semibold text-surface-900 dark:text-surface-100 mb-4">Account Info</h3>
        <div className="space-y-3 text-sm">
          {[
            { label: 'Email', value: user?.email },
            { label: 'Username', value: `@${user?.username}` },
            { label: 'Member since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-surface-100 dark:border-surface-700 last:border-0">
              <span className="text-surface-500">{item.label}</span>
              <span className="text-surface-900 dark:text-surface-100 font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
