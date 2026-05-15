import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  RiRocketLine, RiTeamLine, RiBarChartLine, RiFileTextLine,
  RiArrowRightLine, RiCheckLine, RiFlashlightLine,
} from 'react-icons/ri'

const FEATURES = [
  { icon: RiRocketLine, title: 'Kanban Boards', desc: 'Drag-and-drop task management with custom workflows' },
  { icon: RiTeamLine, title: 'Team Collaboration', desc: 'Real-time updates, comments, and live presence' },
  { icon: RiBarChartLine, title: 'Analytics', desc: 'Track productivity, completion rates, and team velocity' },
  { icon: RiFileTextLine, title: 'Documentation', desc: 'Markdown docs attached to every project' },
  { icon: RiFlashlightLine, title: 'Real-time', desc: 'WebSocket-powered live updates across your team' },
  { icon: RiCheckLine, title: 'Assignments', desc: 'Assign, track, and notify contributors instantly' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative flex items-center justify-between px-8 py-5 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold">
            CS
          </div>
          <span className="font-bold text-lg">CollabSphere</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="text-slate-400 hover:text-slate-100 text-sm font-medium transition-colors px-4 py-2"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/register')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Get Started Free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative text-center py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
            <RiFlashlightLine size={12} />
            Production-ready collaboration platform
          </div>
          <h1 className="font-bold text-5xl md:text-7xl leading-tight mb-6 max-w-4xl mx-auto">
            Where great teams{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              build together
            </span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            CollabSphere combines Kanban workflows, real-time collaboration, documentation,
            and analytics into one unified workspace for startup teams.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => navigate('/register')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-500/25 text-base"
            >
              Start for free
              <RiArrowRightLine />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium px-8 py-3.5 rounded-xl transition-colors border border-slate-700 text-base"
            >
              Sign in
            </button>
          </div>
        </motion.div>

        {/* Mock UI preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 max-w-5xl mx-auto"
        >
          <div className="relative rounded-2xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-sm overflow-hidden"
            style={{ boxShadow: '0 0 80px rgba(99,102,241,0.15)' }}>
            {/* Mock header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
              </div>
              <div className="flex-1 mx-4 h-6 rounded-md bg-slate-800 flex items-center px-3">
                <span className="text-slate-600 text-xs font-mono">app.collabsphere.io/workspace</span>
              </div>
            </div>

            {/* Mock kanban */}
            <div className="flex gap-4 p-6 overflow-hidden h-64">
              {['To Do', 'In Progress', 'Review', 'Done'].map((col, ci) => (
                <div key={col} className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">{col}</div>
                  <div className="space-y-2">
                    {Array.from({ length: ci === 0 ? 3 : ci === 1 ? 2 : ci === 2 ? 2 : 1 }).map((_, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg border border-slate-700/50 bg-slate-800/50"
                      >
                        <div className="h-2.5 rounded bg-slate-600/80 w-4/5 mb-2" />
                        <div className="h-2 rounded bg-slate-700 w-3/5" />
                        <div className="flex gap-1.5 mt-2">
                          <div className={`h-4 w-10 rounded-full ${
                            ci === 0 ? 'bg-emerald-500/30' : ci === 1 ? 'bg-amber-500/30' : 'bg-red-500/30'
                          }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-bold text-3xl md:text-4xl mb-4">Everything your team needs</h2>
            <p className="text-slate-400 text-lg">Powerful features built for modern startup workflows</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-indigo-500/30 hover:bg-slate-800/50 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:bg-indigo-500/20 transition-colors">
                  <f.icon size={20} />
                </div>
                <h3 className="font-semibold text-slate-100 mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="font-bold text-3xl md:text-4xl mb-4">
            Ready to collaborate?
          </h2>
          <p className="text-slate-400 mb-8">
            Join thousands of teams shipping faster with CollabSphere.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold px-10 py-4 rounded-xl transition-all hover:opacity-90 hover:shadow-xl hover:shadow-indigo-500/30 text-base"
          >
            Get started for free →
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8 px-6 text-center text-slate-600 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold">CS</div>
          <span className="font-semibold text-slate-400">CollabSphere</span>
        </div>
        <p>Built with FastAPI, React & MongoDB</p>
      </footer>
    </div>
  )
}