import { type ReactNode, useEffect, useRef } from 'react'
import { clsx } from 'clsx'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

export function Modal({ open, onClose, children, title }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={ref}
        className={clsx(
          'bg-[var(--color-s1)] border border-[var(--color-border)] rounded-t-3xl w-full max-w-lg max-h-[88dvh] overflow-y-auto pb-8',
          'animate-slideUp'
        )}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 bg-[var(--color-border2)] rounded-full" />
        </div>
        {title && (
          <div className="px-5 pt-3 pb-2 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-wider">
                Configuración
              </div>
              <div className="font-serif text-[22px] mt-1">{title}</div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-dim)] flex items-center justify-center text-base cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
