import { clsx } from 'clsx'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'done' | 'pending' | 'locked'
  className?: string
}

export function Badge({ children, variant = 'pending', className }: BadgeProps) {
  const variants = {
    done: 'bg-[var(--color-acc-green)]/[0.12] text-[var(--color-acc-green)] border-[var(--color-acc-green)]/[0.2]',
    pending: 'bg-[var(--color-acc-blue)]/[0.08] text-[var(--color-acc-blue)] border-[var(--color-acc-blue)]/[0.15]',
    locked: 'bg-transparent text-[var(--color-dim)] border-[var(--color-border)]',
  }

  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide border',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}
