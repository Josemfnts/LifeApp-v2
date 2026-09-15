import { useState } from 'react'
import { useFinanceStore, CAT_META, fmt } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { localISO } from '@/lib/finance/dates'
import { MONTHS_SH, exportCSV } from './shared'
import { TxRow } from './TxRow'

export function MovesTab() {
  const { txs, addTx, cuentas } = useFinanceStore()
  const toast = useToast()
  const [type, setType] = useState<'income' | 'expense'>('income')
  const [concept, setConcept] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Nómina')
  const [date, setDate] = useState(localISO())
  const [cuenta, setCuenta] = useState('')
  const [filter, setFilter] = useState('Todos')
  const [search, setSearch] = useState('')

  const incCats = ['Nómina','Freelance','Otros ingresos']
  const expCats = ['Vivienda','Alimentación','Transporte','Salud','Ocio','Ropa','Suscripciones','Deporte','Restaurantes','Viajes','Educación','Ahorro','Otros gastos']
  const cats = type === 'income' ? incCats : expCats

  function handleAdd() {
    const a = parseFloat(amount)
    if (!a || a <= 0) { toast.show('Introduce un importe'); return }
    addTx({ concept: concept.trim() || category, amount: a, category, date, note: '', cuenta, type })
    const cu = useFinanceStore.getState().cuentas.find(c => c.name === cuenta)
    const saldo = cu ? ` · ${cu.name}: ${fmt(cu.balance)}` : ''
    toast.show((type === 'income' ? `✓ Ingreso de ${fmt(a)} añadido` : `✓ Gasto de ${fmt(a)} añadido`) + saldo)
    setConcept(''); setAmount('')
  }

  const allCats = ['Todos', ...new Set(txs.map(t => t.category))]
  let filtered = txs.slice()
  if (filter !== 'Todos') filtered = filtered.filter(t => t.category === filter)
  if (search.trim()) filtered = filtered.filter(t =>
    t.concept.toLowerCase().includes(search.toLowerCase()) ||
    (t.note || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.cuenta || '').toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  )
  filtered.sort((a, b) => b.date.localeCompare(a.date))

  const byDate: Record<string, typeof filtered> = {}
  filtered.forEach(t => { const d = t.date; if (!byDate[d]) byDate[d] = []; byDate[d].push(t) })

  return (
    <div>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
          <button onClick={() => { setType('income'); setCategory('Nómina') }}
            style={{ padding: 9, borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', textAlign: 'center', cursor: 'pointer', border: '1px solid',
              background: type === 'income' ? 'rgba(82,183,136,0.12)' : 'var(--color-s2)',
              color: type === 'income' ? 'var(--color-acc-green)' : 'var(--color-dim)',
              borderColor: type === 'income' ? 'rgba(82,183,136,0.3)' : 'var(--color-border)' }}>↑ Ingreso</button>
          <button onClick={() => { setType('expense'); setCategory('Alimentación') }}
            style={{ padding: 9, borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', textAlign: 'center', cursor: 'pointer', border: '1px solid',
              background: type === 'expense' ? 'rgba(224,95,95,0.1)' : 'var(--color-s2)',
              color: type === 'expense' ? 'var(--color-red)' : 'var(--color-dim)',
              borderColor: type === 'expense' ? 'rgba(224,95,95,0.25)' : 'var(--color-border)' }}>↓ Gasto</button>
        </div>
        <input className="inp" value={concept} onChange={e => setConcept(e.target.value)} type="text" placeholder="Concepto" />
        <input className="inp" value={amount} onChange={e => setAmount(e.target.value)} type="number" step="0.01" placeholder="Importe en €" />
        <select className="inp" value={category} onChange={e => setCategory(e.target.value)}>
          {cats.map(c => <option key={c} value={c}>{CAT_META[c]?.icon || '•'} {c}</option>)}
        </select>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <input className="inp" value={date} onChange={e => setDate(e.target.value)} type="date" style={{ marginBottom: 0, fontSize: 13 }} />
          <select className="inp" value={cuenta} onChange={e => setCuenta(e.target.value)} style={{ marginBottom: 0, fontSize: 13 }}>
            <option value="">Cuenta…</option>
            {cuentas.map(cu => <option key={cu.name} value={cu.name}>{cu.name}</option>)}
          </select>
        </div>
        <button onClick={handleAdd} style={{ width: '100%', background: 'var(--color-acc-gold)', color: '#111', border: 'none', fontFamily: 'DM Sans,sans-serif', fontSize: 14, fontWeight: 700, padding: 11, borderRadius: 10, cursor: 'pointer', boxShadow: '0 2px 12px rgba(201,168,76,0.25)' }}>
          {type === 'income' ? 'Añadir ingreso' : 'Añadir gasto'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input className="inp" value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="🔍 Buscar movimientos..." style={{ marginBottom: 0 }} />
        <button onClick={() => exportCSV(txs, toast)} style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-sub)', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>📥 CSV</button>
      </div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }}>
        {allCats.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            style={{ flex: '0 0 auto', padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, border: '1px solid', whiteSpace: 'nowrap', cursor: 'pointer',
              background: filter === c ? 'rgba(201,168,76,0.1)' : 'var(--color-s1)',
              color: filter === c ? 'var(--color-acc-gold)' : 'var(--color-sub)',
              borderColor: filter === c ? 'rgba(201,168,76,0.3)' : 'var(--color-border)' }}>{c}</button>
        ))}
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--color-dim)' }}>Sin movimientos{filter !== 'Todos' ? ' en esta categoría' : ''}.</div>
        ) : Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).map(([d, txList]) => {
          const dt = new Date(d + 'T12:00:00')
          return (
            <div key={d}>
              <div style={{ padding: '8px 16px 0', fontSize: 10, fontWeight: 700, color: 'var(--color-dim)', letterSpacing: '0.5px', textTransform: 'uppercase', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                {dt.getDate()} {MONTHS_SH[dt.getMonth()]}
              </div>
              {txList.map(t => <TxRow key={`${d}-${t.id}`} tx={t} />)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
