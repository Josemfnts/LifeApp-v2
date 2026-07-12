import { type ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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

  // Portal a body + z alto: si se renderiza dentro de una página (dentro de #sw)
  // sin esto quedaría por debajo de la nav-bar (z-1000) y la barra interceptaría
  // los clics del botón inferior. paddingBottom con safe-area para el home indicator.
  return createPortal(
    <div
      className="fixed inset-0 z-[9000] flex items-end justify-center bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={ref}
        className={clsx(
          'bg-[var(--color-s1)] border border-[var(--color-border)] rounded-t-3xl w-full max-w-lg max-h-[88dvh] overflow-y-auto',
          'animate-slideUp'
        )}
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 bg-[var(--color-border2)] rounded-full" />
        </div>
        {title && (
          <div className="px-5 pt-3 pb-2 flex items-center justify-between">
            <div className="font-serif text-[22px]">{title}</div>
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
    </div>,
    document.body
  )
}
