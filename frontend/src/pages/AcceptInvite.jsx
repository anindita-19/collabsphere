import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { workspacesAPI, authAPI } from '@/services/apiServices'
import useAuthStore from '@/store/authStore'
import api from '@/services/api'

// Role badge colours matching CollabSphere design tokens
const ROLE_COLORS = {
  owner:  { bg: '#fef3c7', text: '#92400e', label: 'Owner' },
  admin:  { bg: '#ede9fe', text: '#5b21b6', label: 'Admin' },
  member: { bg: '#e0f2fe', text: '#0369a1', label: 'Member' },
  viewer: { bg: '#f1f5f9', text: '#475569', label: 'Viewer' },
}

// ── Register sub-form (shown when user has no account) ────────────────────
function RegisterForm({ defaultEmail, onSuccess }) {
  const [form, setForm] = useState({
    email: defaultEmail || '',
    username: '',
    full_name: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const res = await authAPI.register(form)
      const { access_token, user } = res.data
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      setAuth(user, access_token)
      onSuccess()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-4">
      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1.5">Full Name</label>
        <input
          className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all text-sm"
          placeholder="Jane Smith"
          value={form.full_name}
          onChange={set('full_name')}
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1.5">Username</label>
        <input
          className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all text-sm"
          placeholder="janesmith"
          value={form.username}
          onChange={set('username')}
          required
          minLength={3}
          maxLength={30}
          pattern="[a-zA-Z0-9_]+"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1.5">Email</label>
        <input
          type="email"
          className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all text-sm"
          value={form.email}
          onChange={set('email')}
          required
        />
        {defaultEmail && form.email !== defaultEmail && (
          <p className="text-xs text-amber-400 mt-1">
            ⚠ The invite was sent to {defaultEmail}. Use that email to join.
          </p>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1.5">Password</label>
        <input
          type="password"
          className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all text-sm"
          placeholder="Min. 8 characters"
          value={form.password}
          onChange={set('password')}
          required
          minLength={8}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all text-sm mt-1"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Creating account...
          </span>
        ) : 'Create Account & Join'}
      </button>
    </form>
  )
}

// ── Login sub-form ────────────────────────────────────────────────────────
function LoginForm({ defaultEmail, onSuccess }) {
  const [form, setForm] = useState({ email: defaultEmail || '', password: '' })
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authAPI.login(form)
      const { access_token, user } = res.data
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      setAuth(user, access_token)
      onSuccess()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-4">
      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1.5">Email</label>
        <input
          type="email"
          className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all text-sm"
          value={form.email}
          onChange={set('email')}
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1.5">Password</label>
        <input
          type="password"
          className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all text-sm"
          placeholder="Your password"
          value={form.password}
          onChange={set('password')}
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all text-sm mt-1"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Signing in...
          </span>
        ) : 'Sign In & Join'}
      </button>
    </form>
  )
}


// ── Main page ─────────────────────────────────────────────────────────────
export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const { user, token: authToken } = useAuthStore()
  const isLoggedIn = !!authToken

  const [invite, setInvite] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error | joining | done
  const [errorMsg, setErrorMsg] = useState('')
  const [mode, setMode] = useState('register') // register | login

  // 1. Validate token on mount
  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('No invite token found in the link.')
      return
    }

    workspacesAPI.getInvite(token)
      .then((res) => {
        setInvite(res.data)
        setStatus('ready')
        // If already logged in, go straight to joining
        if (isLoggedIn) setMode('join')
      })
      .catch((err) => {
        setStatus('error')
        setErrorMsg(err?.response?.data?.detail || 'Invalid or expired invite link.')
      })
  }, [token])

  // 2. After auth (register or login), confirm join
  const handleAuthSuccess = async () => {
    await joinWorkspace()
  }

  const joinWorkspace = async () => {
    setStatus('joining')
    try {
      await workspacesAPI.acceptInvite(token)
      setStatus('done')
      toast.success(`Welcome to "${invite.workspace_name}"! 🎉`)
      setTimeout(() => navigate(`/workspace/${invite.workspace_id}`), 1500)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err?.response?.data?.detail || 'Failed to join workspace.')
    }
  }

  // If already logged in and invite loaded, allow one-click join
  useEffect(() => {
    if (isLoggedIn && invite && status === 'ready') {
      setMode('join')
    }
  }, [isLoggedIn, invite, status])

  const roleInfo = invite ? (ROLE_COLORS[invite.role] || ROLE_COLORS.member) : null

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent-violet/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center text-white font-bold font-display shadow-lg shadow-primary-500/30">
            CS
          </div>
          <span className="font-display font-bold text-xl text-surface-100">CollabSphere</span>
        </div>

        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-8">

          {/* ── Loading ── */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <span className="w-8 h-8 border-2 border-surface-700 border-t-primary-500 rounded-full animate-spin" />
              <p className="text-surface-400 text-sm">Validating invite link…</p>
            </div>
          )}

          {/* ── Error ── */}
          {status === 'error' && (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">😕</div>
              <h2 className="font-display font-bold text-xl text-surface-100 mb-2">Invite issue</h2>
              <p className="text-surface-400 text-sm mb-6">{errorMsg}</p>
              <Link to="/login" className="btn-primary text-sm px-6 py-2.5">
                Go to Login
              </Link>
            </div>
          )}

          {/* ── Done ── */}
          {status === 'done' && (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="font-display font-bold text-xl text-surface-100 mb-2">You're in!</h2>
              <p className="text-surface-400 text-sm">Redirecting you to the workspace…</p>
            </div>
          )}

          {/* ── Joining spinner ── */}
          {status === 'joining' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <span className="w-8 h-8 border-2 border-surface-700 border-t-primary-500 rounded-full animate-spin" />
              <p className="text-surface-400 text-sm">Joining workspace…</p>
            </div>
          )}

          {/* ── Ready ── */}
          {status === 'ready' && invite && (
            <>
              {/* Invite card */}
              <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 mb-6">
                <p className="text-xs text-surface-500 mb-1">You were invited by</p>
                <p className="text-surface-200 font-medium text-sm">{invite.invited_by}</p>
                <div className="mt-3 pt-3 border-t border-surface-700">
                  <p className="text-xs text-surface-500 mb-1">Workspace</p>
                  <p className="text-surface-100 font-semibold">{invite.workspace_name}</p>
                </div>
                <div className="mt-3 pt-3 border-t border-surface-700 flex items-center gap-2">
                  <p className="text-xs text-surface-500">Your role:</p>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: roleInfo.bg, color: roleInfo.text }}
                  >
                    {roleInfo.label}
                  </span>
                </div>
              </div>

              {/* Already logged in — one-click join */}
              {mode === 'join' && isLoggedIn && (
                <div>
                  <p className="text-surface-400 text-sm mb-4 text-center">
                    Logged in as <strong className="text-surface-200">{user?.email}</strong>
                  </p>
                  {user?.email?.toLowerCase() !== invite.email.toLowerCase() && (
                    <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2 mb-4">
                      ⚠ This invite was sent to <strong>{invite.email}</strong>.
                      Please log in with that account to accept.
                    </p>
                  )}
                  <button
                    onClick={joinWorkspace}
                    className="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 rounded-xl transition-all text-sm"
                  >
                    Accept & Join Workspace
                  </button>
                  <button
                    onClick={() => { useAuthStore.getState().logout?.(); setMode('login') }}
                    className="w-full mt-2 text-surface-500 hover:text-surface-300 text-xs py-2 transition-colors"
                  >
                    Use a different account
                  </button>
                </div>
              )}

              {/* Not logged in — register or login */}
              {!isLoggedIn && (
                <>
                  <div className="flex rounded-xl overflow-hidden border border-surface-700 mb-1">
                    <button
                      onClick={() => setMode('register')}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        mode === 'register'
                          ? 'bg-primary-600 text-white'
                          : 'text-surface-400 hover:text-surface-200'
                      }`}
                    >
                      New to CollabSphere
                    </button>
                    <button
                      onClick={() => setMode('login')}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        mode === 'login'
                          ? 'bg-primary-600 text-white'
                          : 'text-surface-400 hover:text-surface-200'
                      }`}
                    >
                      Already have an account
                    </button>
                  </div>

                  {mode === 'register' && (
                    <RegisterForm
                      defaultEmail={invite.email}
                      onSuccess={handleAuthSuccess}
                    />
                  )}
                  {mode === 'login' && (
                    <LoginForm
                      defaultEmail={invite.email}
                      onSuccess={handleAuthSuccess}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}