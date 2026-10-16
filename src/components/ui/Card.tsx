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
        'bg-[var(--color-s1)] border border-[var(--color-border)] rounded-3xl overflow-hidden',
        'shadow-[var(--shadow-impulso)]',
        padded && 'p-5',
        onClick && 'cursor-pointer transition-colors duration-200 active:bg-[color-mix(in_srgb,var(--color-ink)_4%,transparent)]',
        className
      )}
    >
      {children}
    </div>
  )
}