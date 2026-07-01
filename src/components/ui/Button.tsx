import { type ReactNode } from 'react'
import { clsx } from 'clsx'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger' | 'accent'
  color?: string
  full?: boolean
  className?: string
  type?: 'button' | 'submit'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ children, onClick, variant = 'primary', color, full, className, type = 'button', size = 'md' }: ButtonProps) {
  const base = 'font-semibold font-sans rounded-xl transition-all duration-150 active:scale-95 cursor-pointer border'

  const variants: Record<string, string> = {
    primary: 'bg-[var(--color-acc-blue)] text-white border-[var(--color-acc-blue)] shadow-lg shadow-[var(--color-acc-blue)]/25',
    ghost: 'bg-[var(--color-acc-blue)]/10 text-[var(--color-acc-blue)] border-[var(--color-acc-blue)]/25',
    danger: 'bg-[var(--color-red)]/10 text-[var(--color-red)] border-[var(--color-red)]/20',
    accent: 'text-[#111]',
  }

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  }

  const style = color ? { background: `${color}18`, color, borderColor: `${color}33` } : undefined

  return (
    <button
      type={type}
      onClick={onClick}
      className={clsx(base, variants[variant], sizes[size], full && 'w-full', className)}
      style={style}
    >
      {children}
    </button>
  )
}
