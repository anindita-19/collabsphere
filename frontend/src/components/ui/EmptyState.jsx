import { motion } from 'framer-motion'

export default function EmptyState({ icon, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-400 text-3xl mb-4">
          {icon}
        </div>
      )}
      <h3 className="font-display font-semibold text-surface-900 dark:text-surface-100 text-lg mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-surface-500 dark:text-surface-400 text-sm max-w-sm mb-6">
          {description}
        </p>
      )}
      {action}
    </motion.div>
  )
}
