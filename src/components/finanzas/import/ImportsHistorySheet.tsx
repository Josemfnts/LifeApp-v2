import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useFinanceStore } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'

interface Props {
  open: boolean
  onClose: () => void
}

export function ImportsHistorySheet({ open, onClose }: Props) {
  const imports = useFinanceStore(s => s.imports)
  const undoImport = useFinanceStore(s => s.undoImport)
  const toast = useToast()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const target = imports.find(r => r.id === confirmId)

  return (
    <>
      <Modal open={open} onClose={onClose} title="Importaciones">
        <div style={{ padding: '0 20px 8px' }}>
          {imports.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--color-dim)', padding: '8px 0 16px' }}>
              Todavía no has importado ningún extracto.
            </div>
          ) : imports.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: r.undone ? 'var(--color-dim)' : 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.format === 'n43' ? '🏦' : '📄'} {r.filename}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 2 }}>
                  {r.date} · {r.cuenta} · {r.imported} importados{r.skipped ? ` · ${r.skipped} duplicados` : ''}
                </div>
              </div>
              {r.undone ? (
                <span style={{ fontSize: 11, color: 'var(--color-dim)' }}>Deshecha</span>
              ) : (
                <button onClick={() => setConfirmId(r.id)}
                  style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'var(--color-s2)', color: 'var(--color-red)', border: '1px solid var(--color-border)' }}>
                  Deshacer
                </button>
              )}
            </div>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!target}
        title="Deshacer importación"
        message={target ? `Se borrarán los movimientos importados de «${target.filename}» y se revertirán los saldos de ${target.cuenta}.` : ''}
        confirmLabel="Deshacer"
        danger
        onConfirm={() => {
          if (!confirmId) return
          const n = undoImport(confirmId)
          toast.show(`✓ Importación deshecha · ${n} movimientos eliminados`)
        }}
        onClose={() => setConfirmId(null)}
      />
    </>
  )
}
