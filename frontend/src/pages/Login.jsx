import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { RiEyeLine, RiEyeOffLine, RiArrowLeftLine } from 'react-icons/ri'
import { authAPI } from '@/services/apiServices'
import useAuthStore from '@/store/authStore'
import api from '@/services/api'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authAPI.login(form)
      const { access_token, user } = res.data
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      setAuth(user, access_token)
      toast.success(`Welcome back, ${user.full_name}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-primary-900 via-surface-900 to-surface-950 border-r border-surface-800">
        <Link to="/" className="flex items-center gap-2 text-surface-300 hover:text-surface-100 transition-colors">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center text-white text-sm font-bold">CS</div>
          <span className="font-display font-bold">CollabSphere</span>
        </Link>
        <div>
          <blockquote className="text-2xl font-display font-semibold text-surface-100 leading-snug mb-4">
            "Collaboration is the engine of great software teams."
          </blockquote>
          <p className="text-surface-400">— CollabSphere Team</p>
        </div>
        <div className="flex gap-3">
          {['🚀 Ship faster', '⚡ Real-time sync', '📊 Analytics', '🔐 Secure'].map((tag) => (
            <span key={tag} className="px-3 py-1.5 rounded-full bg-surface-800/80 border border-surface-700 text-surface-300 text-xs">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-surface-400 hover:text-surface-200 text-sm mb-8 transition-colors lg:hidden">
            <RiArrowLeftLine /> Back
          </Link>

          <div className="mb-8">
            <h1 className="font-display font-bold text-3xl text-surface-100 mb-2">Welcome back</h1>
            <p className="text-surface-400">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">Email</label>
              <input
                type="email"
                className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-3 text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all text-sm"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-3 pr-11 text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all text-sm"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
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
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-surface-500 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Create one free
            </Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-6 p-3 rounded-xl border border-surface-800 bg-surface-900/50">
            <p className="text-xs text-surface-500 text-center">
              Register a new account to get started — it's free!
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
