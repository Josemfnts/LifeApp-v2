import { clsx } from 'clsx'

interface InputProps {
  value?: string
  onChange?: (val: string) => void
  placeholder?: string
  type?: string
  className?: string
  id?: string
  onFocus?: () => void
  min?: string | number
  max?: string | number
  step?: string
  style?: React.CSSProperties
}

export function Input({ value, onChange, placeholder, type = 'text', className, id, onFocus, min, max, step, style }: InputProps) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      onFocus={onFocus}
      min={min}
      max={max}
      step={step}
      style={style}
      className={clsx(
        'w-full bg-[var(--color-s1)] border border-[var(--color-border)] text-[var(--color-text)]',
        'rounded-xl px-3.5 py-2.5 text-base font-sans outline-none transition-colors',
        'placeholder:text-[var(--color-dim)]',
        'focus:border-[var(--color-ink)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-volt)_35%,transparent)]',
        className
      )}
    />
  )
}