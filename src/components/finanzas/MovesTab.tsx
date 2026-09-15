import { useState } from 'react'
import { useFinanceStore, CAT_META } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { MONTHS_SH, exportCSV } from './shared'
import { TxRow } from './TxRow'
import { QuickAddSheet } from './QuickAddSheet'
import { EditTxSheet } from './EditTxSheet'
import { ImportSheet } from './import/ImportSheet'
import { ImportsHistorySheet } from './import/ImportsHistorySheet'
import { Modal } from '@/components/ui/Modal'

export function MovesTab() {
  const txs = useFinanceStore(s => s.txs)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Todos')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [showSearch, setShowSearch] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const importsCount = useFinanceStore(s => s.imports.length)
  const toast = useToast()

  const allCats = ['Todos', ...Array.from(new Set(txs.map(t => t.category)))]

  let filtered = txs.slice()
  if (filter !== 'Todos') filtered = filtered.filter(t => t.category === filter)
  if (typeFilter !== 'all') {
    if (typeFilter === 'income') filtered = filtered.filter(t => t.type === 'income' && t.kind !== 'transfer' && t.kind !== 'adjust')
    else filtered = filtered.filter(t => t.type === 'expense' && t.kind !== 'transfer' && t.kind !== 'adjust')
  }
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter(t =>
      t.concept.toLowerCase().includes(q) ||
      (t.note || '').toLowerCase().includes(q) ||
      (t.cuenta || '').toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    )
  }
  filtered.sort((a, b) => b.date.localeCompare(a.date))

  const byDate: Record<string, typeof filtered> = {}
  filtered.forEach(t => { const d = t.date; if (!byDate[d]) byDate[d] = []; byDate[d].push(t) })

  const filterCount = (filter !== 'Todos' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--color-dim)' }}>
          {filtered.length} {filtered.length === 1 ? 'movimiento' : 'movimientos'}
        </div>
        <button onClick={() => setShowSearch(v => !v)}
          style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-s1)', border: '1px solid var(--color-border)', color: showSearch ? 'var(--color-acc-gold)' : 'var(--color-sub)', cursor: 'pointer', fontSize: 16 }}>🔍</button>
        <button onClick={() => setFilterOpen(true)}
          style={{ position: 'relative', width: 36, height: 36, borderRadius: 10, background: 'var(--color-s1)', border: '1px solid var(--color-border)', color: filterCount > 0 ? 'var(--color-acc-gold)' : 'var(--color-sub)', cursor: 'pointer', fontSize: 16 }}>⚙
          {filterCount > 0 && <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 99, background: 'var(--color-acc-gold)', color: '#111', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{filterCount}</span>}
        </button>
        <button onClick={() => setImportOpen(true)} title="Importar extracto" aria-label="Importar extracto"
          style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-s1)', border: '1px solid var(--color-border)', color: 'var(--color-sub)', cursor: 'pointer', fontSize: 16 }}>⬆</button>
        <button onClick={() => setQuickAddOpen(true)}
          style={{ background: 'var(--color-acc-gold)', color: '#111', border: 'none', borderRadius: 10, padding: '0 14px', height: 36, fontSize: 13, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>+ Añadir</button>
      </div>

      {showSearch && (
        <input className="inp" autoFocus value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="🔍 Buscar movimientos…" style={{ marginBottom: 10 }} />
      )}

      {txs.length > 0 && (
        <div style={{ display: 'flex', gap: 14, padding: '0 0 10px' }}>
          {importsCount > 0 && (
            <button onClick={() => setHistoryOpen(true)}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-acc-blue)', fontSize: 12, fontWeight: 600, padding: 0, cursor: 'pointer' }}>
              Importaciones ({importsCount})
            </button>
          )}
          <button onClick={() => exportCSV(txs, toast)}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-sub)', fontSize: 12, fontWeight: 600, padding: 0, cursor: 'pointer' }}>
            Exportar CSV
          </button>
        </div>
      )}

      <div className="card">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--color-dim)' }}>
            {txs.length === 0 ? 'Sin movimientos todavía. Toca "+ Añadir" para empezar.' : 'Sin movimientos con ese filtro.'}
          </div>
        ) : Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).map(([d, txList]) => {
          const dt = new Date(d + 'T12:00:00')
          return (
            <div key={d}>
              <div style={{ padding: '8px 16px 0', fontSize: 10, fontWeight: 700, color: 'var(--color-dim)', letterSpacing: '0.5px', textTransform: 'uppercase', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                {dt.getDate()} {MONTHS_SH[dt.getMonth()]}
              </div>
              {txList.map(t => <TxRow key={`${d}-${t.id}`} tx={t} onClick={(id) => setEditId(id)} />)}
            </div>
          )
        })}
      </div>

      <Modal open={filterOpen} onClose={() => setFilterOpen(false)} title="Filtrar movimientos">
        <div style={{ padding: '0 20px 8px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 6 }}>Tipo</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
            {([
              { k: 'all' as const, label: 'Todos' },
              { k: 'income' as const, label: 'Ingresos' },
              { k: 'expense' as const, label: 'Gastos' },
            ]).map(o => {
              const active = typeFilter === o.k
              return (
                <button key={o.k} onClick={() => setTypeFilter(o.k)}
                  style={{ padding: 9, borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid',
                    background: active ? 'rgba(201,168,76,0.1)' : 'var(--color-s2)',
                    color: active ? 'var(--color-acc-gold)' : 'var(--color-sub)',
                    borderColor: active ? 'rgba(201,168,76,0.3)' : 'var(--color-border)' }}>{o.label}</button>
              )
            })}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 6 }}>Categoría</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {allCats.map(c => {
              const active = filter === c
              return (
                <button key={c} onClick={() => setFilter(c)}
                  style={{ padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', whiteSpace: 'nowrap',
                    background: active ? 'rgba(201,168,76,0.1)' : 'var(--color-s1)',
                    color: active ? 'var(--color-acc-gold)' : 'var(--color-sub)',
                    borderColor: active ? 'rgba(201,168,76,0.3)' : 'var(--color-border)' }}>
                  {c === 'Todos' ? c : `${CAT_META[c as keyof typeof CAT_META]?.icon || '•'} ${c}`}
                </button>
              )
            })}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '12px 20px 0' }}>
          <button onClick={() => { setFilter('Todos'); setTypeFilter('all') }}
            className="btn-ghost" style={{ width: '100%' }}>Limpiar</button>
          <button onClick={() => setFilterOpen(false)} className="btn-primary" style={{ background: 'var(--color-acc-blue)', width: 'auto' }}>Aplicar</button>
        </div>
      </Modal>

      <QuickAddSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      <EditTxSheet open={editId !== null} onClose={() => setEditId(null)} txId={editId} />
      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} />
      <ImportsHistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  )
}
