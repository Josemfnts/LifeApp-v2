import { clsx } from 'clsx'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'done' | 'pending' | 'locked'
  className?: string
}

export function Badge({ children, variant = 'pending', className }: BadgeProps) {
  const variants = {
    done: 'bg-[#52b788]/[0.12] text-[#52b788] border-[#52b788]/[0.2]',
    pending: 'bg-[#5b8af0]/[0.08] text-[#5b8af0] border-[#5b8af0]/[0.15]',
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
