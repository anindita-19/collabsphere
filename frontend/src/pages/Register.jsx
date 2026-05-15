import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { RiEyeLine, RiEyeOffLine } from 'react-icons/ri'
import { authAPI } from '@/services/apiServices'
import useAuthStore from '@/store/authStore'
import api from '@/services/api'

export default function Register() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ email: '', username: '', full_name: '', password: '' })

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
      toast.success(`Welcome to CollabSphere, ${user.full_name}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6">
      {/* Background gradient */}
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
          <div className="mb-6">
            <h1 className="font-display font-bold text-2xl text-surface-100 mb-1">Create your account</h1>
            <p className="text-surface-400 text-sm">Join and start collaborating today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">Full Name</label>
              <input
                className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all text-sm"
                placeholder="Jane Smith"
                value={form.full_name}
                onChange={set('full_name')}
                required
                minLength={1}
                maxLength={100}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set('email')}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-2.5 pr-11 text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all text-sm"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={set('password')}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                >
                  {showPassword ? <RiEyeOffLine size={18} /> : <RiEyeLine size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all text-sm mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-surface-500 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
