interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * Hoja de confirmación reutilizable con el estilo de la app (bottom-sheet),
 * en sustitución de los `confirm()` nativos que rompían el diseño.
 */
export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  danger, onConfirm, onClose,
}: ConfirmDialogProps) {
  if (!open) return null
  const accent = danger ? 'var(--color-red)' : 'var(--color-acc-blue)'
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 40px' }}>
        <div style={{ width: 36, height: 4, background: 'var(--color-border2)', borderRadius: 99, margin: '0 auto 16px' }} />
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 19, marginBottom: message ? 8 : 16 }}>{title}</div>
        {message && <div style={{ fontSize: 13.5, color: 'var(--color-sub)', lineHeight: 1.5, marginBottom: 18 }}>{message}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button onClick={onClose} className="btn-ghost" style={{ width: '100%', minWidth: 0 }}>{cancelLabel}</button>
          <button onClick={() => { onConfirm(); onClose() }} className="btn-primary" style={{ width: '100%', minWidth: 0, background: accent }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
