import { clsx } from 'clsx'

interface ProgressBarProps {
  value: number
  color?: string
  className?: string
  height?: number
  animated?: boolean
}

export function ProgressBar({ value, color = 'var(--color-acc-blue)', className, height = 4, animated }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  const gradient = `linear-gradient(90deg, #5b8af0, #52b788, #c9a84c)`

  return (
    <div
      className={clsx('bg-white/[0.05] rounded-full overflow-hidden', className)}
      style={{ height }}
    >
      <div
        className={clsx('h-full rounded-full relative overflow-hidden', animated && 'transition-all duration-700 ease-out')}
        style={{
          width: `${pct}%`,
          background: pct > 0 ? color : 'transparent',
          ...(color === 'gradient' ? { background: gradient } : {}),
        }}
      >
        {animated && (
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              animation: 'shimmer 2.5s 1.5s ease infinite',
            }}
          />
        )}
      </div>
    </div>
  )
}
