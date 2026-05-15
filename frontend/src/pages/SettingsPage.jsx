import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  RiSunLine, RiMoonLine, RiComputerLine, RiLogoutBoxLine,
  RiShieldLine, RiBellLine, RiPaletteLine, RiInformationLine,
} from 'react-icons/ri'
import useAppStore from '@/store/appStore'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { theme, toggleTheme } = useAppStore()
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const Section = ({ title, icon: Icon, children }) => (
    <div className="card p-6 space-y-4">
      <h3 className="font-display font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
        <Icon size={17} className="text-surface-500" />
        {title}
      </h3>
      {children}
    </div>
  )

  const ToggleRow = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{label}</p>
        {description && <p className="text-xs text-surface-400 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-600'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <h1 className="font-display font-bold text-xl text-surface-900 dark:text-surface-100">Settings</h1>

      {/* Appearance */}
      <Section title="Appearance" icon={RiPaletteLine}>
        <div>
          <p className="text-sm font-medium text-surface-900 dark:text-surface-100 mb-3">Theme</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'light', label: 'Light', icon: RiSunLine },
              { id: 'dark', label: 'Dark', icon: RiMoonLine },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => { if (theme !== t.id) toggleTheme() }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === t.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                    : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
                }`}
              >
                <t.icon size={22} className={theme === t.id ? 'text-primary-600' : 'text-surface-500'} />
                <span className={`text-xs font-medium ${theme === t.id ? 'text-primary-700 dark:text-primary-300' : 'text-surface-500'}`}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon={RiBellLine}>
        <div className="space-y-1 divide-y divide-surface-100 dark:divide-surface-700">
          <ToggleRow
            label="Task assignments"
            description="Notify when you're assigned to a task"
            checked={true}
            onChange={() => toast('Notification preferences coming soon')}
          />
          <ToggleRow
            label="Task completions"
            description="Notify when tasks you created are completed"
            checked={true}
            onChange={() => toast('Notification preferences coming soon')}
          />
          <ToggleRow
            label="Comments"
            description="Notify when someone comments on your tasks"
            checked={true}
            onChange={() => toast('Notification preferences coming soon')}
          />
          <ToggleRow
            label="Workspace updates"
            description="Notify on workspace activity and invitations"
            checked={true}
            onChange={() => toast('Notification preferences coming soon')}
          />
        </div>
      </Section>

      {/* Security */}
      <Section title="Security" icon={RiShieldLine}>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-surface-100 dark:border-surface-700">
            <div>
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100">Password</p>
              <p className="text-xs text-surface-400">Last updated: Never</p>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="btn-secondary text-xs"
            >
              Change
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100">Active session</p>
              <p className="text-xs text-surface-400">Signed in as {user?.email}</p>
            </div>
            <span className="badge bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Active</span>
          </div>
        </div>
      </Section>

      {/* About */}
      <Section title="About CollabSphere" icon={RiInformationLine}>
        <div className="space-y-2 text-sm text-surface-500">
          <div className="flex justify-between">
            <span>Version</span>
            <span className="text-surface-700 dark:text-surface-300 font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Stack</span>
            <span className="text-surface-700 dark:text-surface-300 font-medium">FastAPI + React + MongoDB</span>
          </div>
          <div className="flex justify-between">
            <span>License</span>
            <span className="text-surface-700 dark:text-surface-300 font-medium">MIT</span>
          </div>
        </div>
      </Section>

      {/* Danger zone */}
      <div className="card p-6 border-red-200 dark:border-red-900/40">
        <h3 className="font-display font-semibold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
        <button
          onClick={handleLogout}
          className="btn-danger"
        >
          <RiLogoutBoxLine size={15} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
