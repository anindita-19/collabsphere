import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import clsx from 'clsx'

export { clsx }

export function cn(...inputs) {
  return clsx(inputs)
}

export function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`
  if (isYesterday(d)) return `Yesterday at ${format(d, 'h:mm a')}`
  return format(d, 'MMM d, yyyy')
}

export function formatRelative(date) {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getPriorityColor(priority) {
  const colors = {
    low: 'priority-low',
    medium: 'priority-medium',
    high: 'priority-high',
    urgent: 'priority-urgent',
  }
  return colors[priority] || 'priority-medium'
}

export function getStatusColor(status) {
  const colors = {
    todo: 'status-todo',
    in_progress: 'status-in_progress',
    review: 'status-review',
    completed: 'status-completed',
  }
  return colors[status] || 'status-todo'
}

export function getStatusLabel(status) {
  const labels = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    completed: 'Completed',
  }
  return labels[status] || status
}

export function getPriorityLabel(priority) {
  return priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : ''
}

export function getFileIcon(contentType) {
  if (!contentType) return '📄'
  if (contentType.startsWith('image/')) return '🖼️'
  if (contentType === 'application/pdf') return '📕'
  if (contentType.includes('spreadsheet') || contentType.includes('excel')) return '📊'
  if (contentType.includes('word') || contentType.includes('document')) return '📝'
  if (contentType === 'text/plain') return '📃'
  if (contentType.includes('zip')) return '🗜️'
  return '📄'
}

export function truncate(text, length = 60) {
  if (!text) return ''
  return text.length > length ? text.slice(0, length) + '...' : text
}

export const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#14b8a6',
  '#f97316', '#84cc16',
]

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: '#10b981' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
]

export const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Completed' },
]
