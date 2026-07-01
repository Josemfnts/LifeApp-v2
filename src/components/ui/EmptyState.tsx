import { clsx } from 'clsx'

interface EmptyStateProps {
  message: string
  className?: string
}

export function EmptyState({ message, className }: EmptyStateProps) {
  return (
    <div className={clsx('text-center py-8 text-[13px] text-[var(--color-dim)]', className)}>
      {message}
    </div>
  )
}
