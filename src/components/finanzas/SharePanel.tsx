import { fmt } from '@/stores/financeStore'
import { buildSplit } from '@/lib/finance/split'
import { parseEuroInput, roundEuros } from '@/lib/finance/money'
import type { TxSplit } from '@/lib/finance/types'

interface Props {
  open: boolean
  onToggle: () => void
  total: number
  mode: TxSplit['mode']
  onMode: (m: TxSplit['mode']) => void
  people: { name: string; value: string }[]
  onPeople: (p: { name: string; value: string }[]) => void
  knownNames: string[]
}

const MODES: [TxSplit['mode'], string][] = [['equal', 'Iguales'], ['pct', '%'], ['amount', 'Importes']]

// "👥 Compartir gasto": pagas tú el total, tu gasto es tu parte y el resto queda como "me debe".
export function SharePanel({ open, onToggle, total, mode, onMode, people, onPeople, knownNames }: Props) {
  const named = people.filter(p => p.name.trim())
  let preview: string | null = null
  let error: string | null = null
  if (open && named.length > 0 && total > 0) {
    try {
      const s = buildSplit(roundEuros(total), mode, named.map(p => ({ name: p.name, value: parseEuroInput(p.value) || 0 })))
      preview = `Tu parte: ${fmt(s.myShare)} · ${s.people.map(p => `${p.name} ${fmt(p.share)}`).join(' · ')}`
    } catch (e) {
      error = e instanceof Error ? e.message : 'Reparto inválido'
    }
  }

  const update = (i: number, patch: Partial<{ name: string; value: string }>) =>
    onPeople(people.map((p, j) => (j === i ? { ...p, ...patch } : p)))

  return (
    <div style={{ marginTop: 12 }}>
      <button type="button" onClick={onToggle}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 10, background: open ? 'var(--color-s2)' : 'transparent', border: '1px solid var(--color-border)', color: open ? 'var(--color-text)' : 'var(--color-dim)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        👥 Compartir gasto {open ? '▾' : '▸'}
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 6 }}>
            {MODES.map(([k, l]) => (
              <button key={k} type="button" onClick={() => onMode(k)}
                style={{ padding: 7, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                  background: mode === k ? 'rgba(91,138,240,0.12)' : 'var(--color-s1)',
                  color: mode === k ? 'var(--color-acc-blue)' : 'var(--color-sub)',
                  borderColor: mode === k ? 'rgba(91,138,240,0.3)' : 'var(--color-border)' }}>{l}</button>
            ))}
          </div>
          <datalist id="share-names">{knownNames.map(n => <option key={n} value={n} />)}</datalist>
          {people.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input className="inp" list="share-names" value={p.name} onChange={e => update(i, { name: e.target.value })} placeholder="Persona" style={{ flex: 2, marginBottom: 0 }} />
              {mode !== 'equal' && (
                <input className="inp" value={p.value} onChange={e => update(i, { value: e.target.value })} inputMode="decimal" placeholder={mode === 'pct' ? '%' : '€'} style={{ flex: 1, marginBottom: 0 }} />
              )}
              <button type="button" aria-label="Quitar persona" onClick={() => onPeople(people.length > 1 ? people.filter((_, j) => j !== i) : [{ name: '', value: '' }])}
                style={{ width: 34, borderRadius: 8, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
          <button type="button" onClick={() => onPeople([...people, { name: '', value: '' }])}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-acc-blue)', fontSize: 12, padding: '2px 0', cursor: 'pointer' }}>+ Persona</button>
          {preview && <div style={{ fontSize: 12, color: 'var(--color-acc-green)', marginTop: 6 }}>{preview}</div>}
          {error && <div style={{ fontSize: 12, color: 'var(--color-red)', marginTop: 6 }}>{error}</div>}
          <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 4 }}>El total sale de tu cuenta; en tus gastos solo cuenta tu parte y lo demás queda en 💸 Pufos como "me debe".</div>
        </div>
      )}
    </div>
  )
}
