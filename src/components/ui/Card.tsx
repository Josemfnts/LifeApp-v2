import { type ReactNode } from 'react'
import { clsx } from 'clsx'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  padded?: boolean
}

export function Card({ children, className, onClick, padded }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl overflow-hidden',
        padded && 'p-4',
        onClick && 'cursor-pointer transition-colors duration-200 active:bg-white/[0.03]',
        className
      )}
    >
      {children}
    </div>
  )
}
