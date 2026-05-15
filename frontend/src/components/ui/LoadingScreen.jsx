import { motion } from 'framer-motion'

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-surface-50 dark:bg-surface-950 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center text-white text-xl font-bold font-display shadow-lg shadow-primary-500/30">
          CS
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              className="w-2 h-2 rounded-full bg-primary-500"
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}

export function Skeleton({ className = '', lines = 1 }) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="bg-surface-200 dark:bg-surface-700 rounded-lg h-4 mb-2 last:mb-0"
          style={{ width: `${85 + Math.random() * 15}%` }}
        />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="card p-4 animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-surface-200 dark:bg-surface-700" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-surface-200 dark:bg-surface-700 rounded w-3/4" />
          <div className="h-2.5 bg-surface-200 dark:bg-surface-700 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-surface-200 dark:bg-surface-700 rounded" />
        <div className="h-3 bg-surface-200 dark:bg-surface-700 rounded w-5/6" />
      </div>
    </div>
  )
}

export function TaskCardSkeleton() {
  return (
    <div className="card p-3 animate-pulse space-y-2">
      <div className="h-4 bg-surface-200 dark:bg-surface-700 rounded w-4/5" />
      <div className="h-3 bg-surface-200 dark:bg-surface-700 rounded w-1/2" />
      <div className="flex gap-2">
        <div className="h-5 w-16 bg-surface-200 dark:bg-surface-700 rounded-full" />
        <div className="h-5 w-12 bg-surface-200 dark:bg-surface-700 rounded-full" />
      </div>
    </div>
  )
}
