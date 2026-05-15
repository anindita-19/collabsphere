// Avatar component
import { getInitials } from '@/utils/helpers'

export default function Avatar({ name, color = '#6366f1', size = 'md', src = null }) {
  const sizeMap = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  }

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeMap[size]} rounded-full object-cover ring-2 ring-white dark:ring-surface-800`}
      />
    )
  }

  return (
    <div
      className={`${sizeMap[size]} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ring-2 ring-white dark:ring-surface-800`}
      style={{ backgroundColor: color }}
    >
      {getInitials(name)}
    </div>
  )
}
