import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useFinanceStore, CAT_META } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { localISO } from '@/lib/finance/dates'
import { roundEuros, parseEuroInput } from '@/lib/finance/money'
import { matchMerchant, suggestCategory, type Merchant } from '@/lib/finance/merchants'
import { SEED_MERCHANTS } from '@/lib/finance/merchants'
import { MerchantAvatar } from './MerchantAvatar'

interface Props {
  open: boolean
  onClose: () => void
}

const INCOME_CATS = ['Nómina', 'Freelance', 'Otros ingresos']
const EXPENSE_CATS = ['Vivienda', 'Alimentación', 'Transporte', 'Salud', 'Ocio', 'Ropa', 'Suscripciones', 'Deporte', 'Restaurantes', 'Viajes', 'Educación', 'Ahorro', 'Otros gastos']

interface Suggestion {
  key: string
  label: string
  category: string
  merchant?: Merchant | null
}

export function QuickAddSheet({ open, onClose }: Props) {
  const merchants = useFinanceStore(s => s.merchants)
  const txs = useFinanceStore(s => s.txs)
  const cuentas = useFinanceStore(s => s.cuentas)
  const addTx = useFinanceStore(s => s.addTx)
  const toast = useToast()

  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [concept, setConcept] = useState('')
  const [category, setCategory] = useState('Otros gastos')
  const [cuenta, setCuenta] = useState('')
  const [date, setDate] = useState(localISO())
  const [showMore, setShowMore] = useState(false)

  const amountRef = useRef<HTMLInputElement>(null)
  const conceptRef = useRef<HTMLInputElement>(null)

  // Reinicia el formulario solo al ABRIR la hoja: si dependiera de cada cambio de txs, una
  // escritura de CompAI (espejo vivo) borraría lo que el usuario está tecleando.
  const wasOpen = useRef(false)
  useEffect(() => {
    const opening = open && !wasOpen.current
    wasOpen.current = open
    if (opening) {
      setType('expense')
      setAmount('')
      setConcept('')
      setShowMore(false)
      setDate(localISO())
      const last = txs.find(t => t.cuenta)
      setCuenta(last?.cuenta ?? '')
      setTimeout(() => amountRef.current?.focus(), 50)
    }
  }, [open, txs])

  useEffect(() => {
    if (type === 'income' && !INCOME_CATS.includes(category)) setCategory('Otros ingresos')
    if (type === 'expense' && !EXPENSE_CATS.includes(category)) setCategory('Otros gastos')
  }, [type, category])

  const allMerchants = useMemo<Merchant[]>(() => [...merchants, ...SEED_MERCHANTS], [merchants])

  const suggestions: Suggestion[] = useMemo(() => {
    const list: Suggestion[] = []
    for (const m of merchants) {
      list.push({ key: 'user:' + m.id, label: m.name, category: m.category ?? '', merchant: m })
    }
    for (const m of SEED_MERCHANTS) {
      list.push({ key: 'seed:' + m.id, label: m.name, category: m.category ?? '', merchant: m })
    }
    const seen = new Set<string>()
    const recent: Suggestion[] = []
    for (const t of txs) {
      const key = (t.concept || '').trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      const m = matchMerchant(t.concept, allMerchants)
      recent.push({ key: 'recent:' + key, label: t.concept, category: t.category, merchant: m ?? null })
      if (recent.length >= 8) break
    }
    return [...list.slice(0, 12), ...recent]
  }, [merchants, txs, allMerchants])

  const filteredSuggestions = useMemo(() => {
    const q = concept.trim().toLowerCase()
    if (!q) return suggestions.slice(0, 8)
    return suggestions.filter(s => s.label.toLowerCase().includes(q)).slice(0, 8)
  }, [suggestions, concept])

  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS

  function applySuggestion(s: Suggestion) {
    setConcept(s.label)
    if (s.category && cats.includes(s.category)) setCategory(s.category)
    else setCategory(suggestCategory(s.label, type, allMerchants))
    setTimeout(() => conceptRef.current?.focus(), 0)
  }

  function handleConceptChange(value: string) {
    setConcept(value)
    const cat = suggestCategory(value, type, allMerchants)
    if (cats.includes(cat)) setCategory(cat)
  }

  function handleSave() {
    const a = parseEuroInput(amount)
    if (!(a > 0)) { toast.show('Introduce un importe'); return }
    const trimmed = concept.trim()
    if (!trimmed) { toast.show('Introduce un concepto'); return }
    addTx({
      type,
      amount: roundEuros(a),
      category,
      concept: trimmed,
      date,
      note: '',
      cuenta: cuenta || undefined,
    })
    const cu = cuentas.find(c => c.name === cuenta)
    const extra = cu ? ` · ${cu.name}: ${fmt2(cu.balance)}` : ''
    toast.show((type === 'income' ? '✓ Ingreso de ' : '✓ Gasto de ') + fmt2(a) + ' añadido' + extra)
    onClose()
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo movimiento">
      <div style={{ padding: '0 20px 8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
          <button onClick={() => setType('income')}
            style={{ padding: 9, borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', textAlign: 'center', cursor: 'pointer', border: '1px solid',
              background: type === 'income' ? 'rgba(82,183,136,0.12)' : 'var(--color-s2)',
              color: type === 'income' ? 'var(--color-acc-green)' : 'var(--color-dim)',
              borderColor: type === 'income' ? 'rgba(82,183,136,0.3)' : 'var(--color-border)' }}>↑ Ingreso</button>
          <button onClick={() => setType('expense')}
            style={{ padding: 9, borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', textAlign: 'center', cursor: 'pointer', border: '1px solid',
              background: type === 'expense' ? 'rgba(224,95,95,0.1)' : 'var(--color-s2)',
              color: type === 'expense' ? 'var(--color-red)' : 'var(--color-dim)',
              borderColor: type === 'expense' ? 'rgba(224,95,95,0.25)' : 'var(--color-border)' }}>↓ Gasto</button>
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Importe (€)</div>
        <input
          ref={amountRef}
          className="inp"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          onKeyDown={handleKey}
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          autoFocus
          style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, padding: '12px 14px' }}
        />

        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 10 }}>Concepto</div>
        <input
          ref={conceptRef}
          className="inp"
          value={concept}
          onChange={e => handleConceptChange(e.target.value)}
          onKeyDown={handleKey}
          type="text"
          placeholder="Ej: Mercadona, Spotify, Repsol…"
          autoComplete="off"
        />
        {filteredSuggestions.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filteredSuggestions.map(s => (
              <button key={s.key} onClick={() => applySuggestion(s)} type="button"
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--color-s2)', border: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'left' }}>
                <MerchantAvatar merchant={s.merchant ?? null} category={s.category || 'Otros gastos'} size={28} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{s.label}</span>
                {s.category && <span style={{ fontSize: 10, color: 'var(--color-dim)' }}>{s.category}</span>}
              </button>
            ))}
          </div>
        )}

        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 6, marginTop: 12 }}>Categoría</div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {cats.map(c => {
            const active = category === c
            return (
              <button key={c} onClick={() => setCategory(c)} type="button"
                style={{ flex: '0 0 auto', padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', whiteSpace: 'nowrap',
                  background: active ? 'rgba(201,168,76,0.1)' : 'var(--color-s1)',
                  color: active ? 'var(--color-acc-gold)' : 'var(--color-sub)',
                  borderColor: active ? 'rgba(201,168,76,0.3)' : 'var(--color-border)' }}>
                {CAT_META[c]?.icon || '•'} {c}
              </button>
            )
          })}
        </div>

        <button onClick={() => setShowMore(v => !v)} type="button"
          style={{ marginTop: 14, width: '100%', padding: '8px 10px', borderRadius: 10, background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-dim)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
          {showMore ? '▾ Menos opciones' : '▸ Más opciones'}
        </button>

        {showMore && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 }}>Cuenta</div>
            <select className="inp" value={cuenta} onChange={e => setCuenta(e.target.value)}>
              <option value="">Sin cuenta</option>
              {cuentas.map(cu => <option key={cu.name} value={cu.name}>{cu.name}</option>)}
            </select>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 }}>Fecha</div>
            <input className="inp" value={date} onChange={e => setDate(e.target.value)} type="date" style={{ fontSize: 13 }} />
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '12px 20px 0' }}>
        <button onClick={onClose} className="btn-ghost" style={{ width: '100%' }}>Cancelar</button>
        <button onClick={handleSave} className="btn-primary" style={{ background: 'var(--color-acc-gold)', color: '#111', width: 'auto' }}>Guardar</button>
      </div>
    </Modal>
  )
}

function fmt2(n: number): string {
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €'
}
