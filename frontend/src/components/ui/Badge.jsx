import { getPriorityColor, getStatusColor, getPriorityLabel, getStatusLabel } from '@/utils/helpers'

export function PriorityBadge({ priority }) {
  return (
    <span className={`badge ${getPriorityColor(priority)}`}>
      {getPriorityLabel(priority)}
    </span>
  )
}

export function StatusBadge({ status }) {
  return (
    <span className={`badge ${getStatusColor(status)}`}>
      {getStatusLabel(status)}
    </span>
  )
}

export function Badge({ children, color = 'default', className = '' }) {
  const colorMap = {
    default: 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400',
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    violet: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
  }
  return (
    <span className={`badge ${colorMap[color]} ${className}`}>{children}</span>
  )
}
