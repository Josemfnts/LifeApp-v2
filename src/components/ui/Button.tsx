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

// El CTA primario se pinta con los tokens --color-primary / --color-on-primary:
// claro = tinta con texto blanco, oscuro = lima con texto tinta. El tema GLOBAL
// decide el color, NUNCA la ruta (Fase 1 inicial forzaba lima en Físico y se anuló).
const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-150 active:scale-[0.97] cursor-pointer border focus-visible:outline-2 focus-visible:outline-[var(--color-volt)] focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

const variants: Record<string, string> = {
  primary: 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)] shadow-[0_6px_18px_-8px_color-mix(in_srgb,var(--color-primary)_50%,transparent)] hover:brightness-95',
  ghost: 'bg-[var(--color-volt)]/[0.18] text-[var(--color-text)] border-[var(--color-volt)]/40 hover:bg-[var(--color-volt)]/[0.28]',
  danger: 'bg-[var(--color-red)]/[0.08] text-[var(--color-red)] border-[var(--color-red)]/20 hover:bg-[var(--color-red)]/[0.14]',
  accent: '',
}

const sizes: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3.5 text-base',
}

export function Button({ children, onClick, variant = 'primary', color, full, className, type = 'button', size = 'md' }: ButtonProps) {
  // color-mix() sustituye al `${color}18` que fallaba con variables CSS:
  // un valor arbitrario que llega por `color` se tiñe y contrasta con --color-on-accent.
  const style = color
    ? ({
        background: `color-mix(in srgb, ${color} 18%, transparent)`,
        color: 'var(--color-text)',
        borderColor: `color-mix(in srgb, ${color} 36%, transparent)`,
      } as React.CSSProperties)
    : undefined

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
