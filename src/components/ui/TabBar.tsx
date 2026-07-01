import { clsx } from 'clsx'

interface TabBarProps {
  tabs: { key: string; label: string }[]
  active: string
  onChange: (key: string) => void
  className?: string
}

export function TabBar({ tabs, active, onChange, className }: TabBarProps) {
  return (
    <div className={clsx('flex overflow-x-auto', className)}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={clsx(
            'flex-1 py-2.5 px-2 font-sans text-[13px] font-medium text-center cursor-pointer whitespace-nowrap transition-all duration-200',
            'border-b-2 bg-transparent',
            active === tab.key
              ? 'text-[var(--color-acc-blue)] border-[var(--color-acc-blue)]'
              : 'text-[var(--color-dim)] border-transparent'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
