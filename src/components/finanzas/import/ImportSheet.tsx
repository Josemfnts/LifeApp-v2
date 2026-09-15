import { useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useFinanceStore, CAT_META, fmt } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import { decodeBankFile } from '@/lib/finance/import/decode'
import { isN43, parseN43 } from '@/lib/finance/import/n43'
import { splitCSV, guessMapping, applyMapping, type CsvMapping } from '@/lib/finance/import/csv'
import { markDuplicates } from '@/lib/finance/import/dedupe'
import type { ImportRow } from '@/lib/finance/import/types'
import { matchMerchant, suggestCategory, SEED_MERCHANTS } from '@/lib/finance/merchants'
import { MerchantAvatar } from '../MerchantAvatar'

interface Props {
  open: boolean
  onClose: () => void
}

interface Parsed {
  format: 'n43' | 'csv'
  rows: ImportRow[]
  errors: string[]
  check?: { ok: boolean; message: string }
  finalBalance?: number
}

type Step = 'pick' | 'map' | 'review'

const INCOME_CATS = Object.entries(CAT_META).filter(([, m]) => m.type === 'income').map(([c]) => c)
const EXPENSE_CATS = Object.entries(CAT_META).filter(([, m]) => m.type === 'expense').map(([c]) => c)

const label = { fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4 } as const
const chip = { fontSize: 11, padding: '3px 6px', marginTop: 4, borderRadius: 8, background: 'var(--color-s2)', color: 'var(--color-sub)', border: '1px solid var(--color-border)', maxWidth: 150 } as const

export function ImportSheet({ open, onClose }: Props) {
  const cuentas = useFinanceStore(s => s.cuentas)
  const txs = useFinanceStore(s => s.txs)
  const merchants = useFinanceStore(s => s.merchants)
  const importMaps = useFinanceStore(s => s.importMaps)
  const applyImport = useFinanceStore(s => s.applyImport)
  const adjustBalance = useFinanceStore(s => s.adjustBalance)
  const saveImportMap = useFinanceStore(s => s.saveImportMap)
  const toast = useToast()

  const [step, setStep] = useState<Step>('pick')
  const [cuenta, setCuenta] = useState('')
  const [filename, setFilename] = useState('')
  const [csvRows, setCsvRows] = useState<string[][] | null>(null)
  const [mapping, setMapping] = useState<CsvMapping | null>(null)
  const [bankName, setBankName] = useState('')
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [catOverride, setCatOverride] = useState<Record<number, string>>({})
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [adjustToFinal, setAdjustToFinal] = useState(false)
  const [showDups, setShowDups] = useState(false)

  const cuentaSel = cuenta || cuentas[0]?.name || ''
  const allMerchants = useMemo(() => [...merchants, ...SEED_MERCHANTS], [merchants])

  function reset() {
    setStep('pick'); setFilename(''); setCsvRows(null); setMapping(null); setBankName('')
    setParsed(null); setCatOverride({}); setSelected(new Set()); setAdjustToFinal(false); setShowDups(false)
  }
  function close() { reset(); onClose() }

  function toReview(p: Parsed) {
    setParsed(p); setCatOverride({}); setSelected(new Set()); setStep('review')
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    let text: string
    try {
      text = decodeBankFile(await file.arrayBuffer())
    } catch {
      toast.show('No se pudo leer el fichero')
      return
    }
    setFilename(file.name)
    if (isN43(text)) {
      const r = parseN43(text)
      toReview({ format: 'n43', rows: r.rows, errors: r.errors, check: r.check, finalBalance: r.finalBalance })
      return
    }
    const rows = splitCSV(text)
    setCsvRows(rows)
    // Primero los mapeos guardados de otras veces; luego el que se adivina por las cabeceras.
    for (const [bank, m] of Object.entries(importMaps)) {
      const r = applyMapping(rows, m)
      const expected = Math.max(1, Math.floor((rows.length - m.headerRow - 1) * 0.8))
      if (r.rows.length >= expected) {
        setMapping(m); setBankName(bank)
        toReview({ format: 'csv', rows: r.rows, errors: r.errors })
        return
      }
    }
    const guess = guessMapping(rows)
    if (guess) {
      const r = applyMapping(rows, guess)
      if (r.rows.length > 0) {
        setMapping(guess)
        toReview({ format: 'csv', rows: r.rows, errors: r.errors })
        return
      }
    }
    setMapping(guess ?? { headerRow: 0, date: 0, concept: 1, amount: 2 })
    setStep('map')
  }

  function previewMapping() {
    if (!csvRows || !mapping) return
    const r = applyMapping(csvRows, mapping)
    if (r.rows.length === 0) { toast.show('Con esas columnas no sale ningún movimiento válido'); return }
    toReview({ format: 'csv', rows: r.rows, errors: r.errors })
  }

  const marked = useMemo(
    () => (parsed && cuentaSel ? markDuplicates(parsed.rows, txs, cuentaSel) : []),
    [parsed, txs, cuentaSel],
  )
  const fresh = useMemo(
    () => marked
      .map((m, i) => ({ ...m, i }))
      .filter(m => !m.duplicate)
      .map(m => {
        const type: 'income' | 'expense' = m.row.amount >= 0 ? 'income' : 'expense'
        return {
          ...m,
          type,
          merchant: matchMerchant(m.row.concept, allMerchants),
          category: catOverride[m.i] ?? suggestCategory(m.row.concept, type, allMerchants),
        }
      }),
    [marked, allMerchants, catOverride],
  )
  const dups = marked.filter(m => m.duplicate)

  function toggle(i: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function applyBulk(cat: string) {
    if (!cat) return
    setCatOverride(prev => {
      const next = { ...prev }
      selected.forEach(i => { next[i] = cat })
      return next
    })
    setSelected(new Set())
  }

  function handleApply() {
    if (!parsed || !cuentaSel) return
    if (fresh.length === 0) { toast.show('No hay movimientos nuevos que importar'); return }
    const rec = applyImport({
      cuenta: cuentaSel,
      filename,
      format: parsed.format,
      skipped: dups.length,
      rows: fresh.map(f => ({
        date: f.row.date, amount: f.row.amount, concept: f.row.concept,
        category: f.category, key: f.key, merchantId: f.merchant?.id,
      })),
    })
    // El ajuste va DESPUÉS de aplicar: así apunta solo la diferencia que quede.
    if (parsed.format === 'n43' && adjustToFinal && parsed.finalBalance !== undefined) {
      adjustBalance(cuentaSel, parsed.finalBalance)
    }
    if (parsed.format === 'csv' && mapping && bankName.trim()) saveImportMap(bankName, mapping)
    toast.show(`✓ ${rec.imported} movimientos importados${dups.length ? ` · ${dups.length} duplicados omitidos` : ''}`)
    close()
  }

  const colCount = csvRows ? Math.max(0, ...csvRows.slice(0, 20).map(r => r.length)) : 0
  const cols = mapping
    ? Array.from({ length: colCount }, (_, i) => ({ i, name: (csvRows?.[mapping.headerRow]?.[i] ?? '').trim() || `Columna ${i + 1}` }))
    : []

  function colSelect(text: string, field: 'date' | 'concept' | 'amount' | 'debit' | 'credit' | 'balance', optional: boolean) {
    if (!mapping) return null
    const value = mapping[field]
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={label}>{text}</div>
        <select className="inp" value={value === undefined ? '' : String(value)}
          onChange={e => setMapping({ ...mapping, [field]: e.target.value === '' ? undefined : Number(e.target.value) })}>
          {optional && <option value="">—</option>}
          {cols.map(c => <option key={c.i} value={c.i}>{c.name}</option>)}
        </select>
      </div>
    )
  }

  const title = step === 'pick' ? '⬆ Importar extracto' : step === 'map' ? 'Columnas del CSV' : 'Revisar importación'

  return (
    <Modal open={open} onClose={close} title={title}>
      <div style={{ padding: '0 20px 8px' }}>
        {step === 'pick' && (
          cuentas.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--color-sub)', padding: '8px 0 16px' }}>
              Crea antes una cuenta en Patrimonio para importar sus movimientos.
            </div>
          ) : (
            <>
              <div style={label}>Cuenta</div>
              <select className="inp" value={cuentaSel} onChange={e => setCuenta(e.target.value)}>
                {cuentas.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <div style={{ ...label, marginTop: 10 }}>Fichero del banco</div>
              <input className="inp" type="file" accept=".n43,.q43,.aeb,.txt,.csv"
                onChange={e => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
              <div style={{ fontSize: 12, color: 'var(--color-dim)', lineHeight: 1.5, marginTop: 6 }}>
                Norma 43 (N43/AEB/CSB 43: la exportan BBVA, Santander, CaixaBank, Sabadell, ING…) o CSV
                (Revolut, Trade Republic y cualquier banco). Si solo tienes Excel, guárdalo como CSV.
                Antes de importar verás qué entra y qué se omite por duplicado.
              </div>
            </>
          )
        )}

        {step === 'map' && mapping && csvRows && (
          <>
            <div style={{ fontSize: 12, color: 'var(--color-sub)', marginBottom: 10 }}>
              No he reconocido las columnas de «{filename}». Indica cuál es cada una.
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={label}>Fila de cabecera</div>
              <select className="inp" value={mapping.headerRow} onChange={e => setMapping({ ...mapping, headerRow: Number(e.target.value) })}>
                {csvRows.slice(0, 15).map((r, i) => (
                  <option key={i} value={i}>{i + 1}: {r.join(' · ').slice(0, 60)}</option>
                ))}
              </select>
            </div>
            {colSelect('Fecha', 'date', false)}
            {colSelect('Concepto', 'concept', false)}
            {colSelect('Importe (con signo)', 'amount', true)}
            {mapping.amount === undefined && (
              <>
                {colSelect('Cargo', 'debit', true)}
                {colSelect('Abono', 'credit', true)}
              </>
            )}
            {colSelect('Saldo (opcional)', 'balance', true)}
            <div style={{ ...label, marginTop: 6 }}>Muestra</div>
            <div style={{ fontSize: 11, color: 'var(--color-sub)', background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 8, marginBottom: 10 }}>
              {csvRows.slice(mapping.headerRow + 1, mapping.headerRow + 4).map((r, i) => (
                <div key={i} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.join(' · ')}</div>
              ))}
            </div>
            <div style={label}>Recordar estas columnas para el banco (opcional)</div>
            <input className="inp" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Ej: BBVA" />
          </>
        )}

        {step === 'review' && parsed && (
          <>
            <div style={label}>Cuenta</div>
            <select className="inp" value={cuentaSel} onChange={e => setCuenta(e.target.value)}>
              {cuentas.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>

            <div style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 600, margin: '10px 0 6px' }}>
              {fresh.length} nuevos · {dups.length} omitidos por duplicados
            </div>
            {parsed.check && (
              <div style={{
                fontSize: 12, lineHeight: 1.45, borderRadius: 10, padding: '8px 10px', marginBottom: 8,
                color: parsed.check.ok ? 'var(--color-acc-green)' : 'var(--color-acc-gold)',
                background: 'var(--color-s2)', border: '1px solid var(--color-border)',
              }}>
                {parsed.check.ok ? parsed.check.message : `⚠️ ${parsed.check.message}`}
              </div>
            )}
            {parsed.errors.map((e, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--color-dim)', marginBottom: 4 }}>• {e}</div>
            ))}
            {parsed.format === 'csv' && (
              <button type="button" onClick={() => setStep('map')}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-acc-blue)', fontSize: 12, padding: '2px 0 8px', cursor: 'pointer' }}>
                Cambiar columnas
              </button>
            )}
            {parsed.format === 'n43' && parsed.finalBalance !== undefined && (
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--color-sub)', margin: '4px 0 10px' }}>
                <input type="checkbox" checked={adjustToFinal} onChange={e => setAdjustToFinal(e.target.checked)} />
                <span>Ajustar el saldo de «{cuentaSel}» a {fmt(parsed.finalBalance)} (saldo final del extracto)</span>
              </label>
            )}

            {selected.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 8px' }}>
                <span style={{ fontSize: 12, color: 'var(--color-sub)' }}>{selected.size} seleccionados →</span>
                <select className="inp" value="" onChange={e => applyBulk(e.target.value)} style={{ marginBottom: 0, flex: 1 }}>
                  <option value="">Cambiar categoría…</option>
                  {[...EXPENSE_CATS, ...INCOME_CATS].map(c => <option key={c} value={c}>{CAT_META[c]?.icon} {c}</option>)}
                </select>
              </div>
            )}

            <div>
              {fresh.map(f => {
                const list = f.type === 'income' ? INCOME_CATS : EXPENSE_CATS
                const opts = list.includes(f.category) ? list : [f.category, ...list]
                return (
                  <div key={f.i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <input type="checkbox" checked={selected.has(f.i)} onChange={() => toggle(f.i)} aria-label="Seleccionar movimiento" />
                    <MerchantAvatar merchant={f.merchant} category={f.category} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.row.concept || '(sin concepto)'}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-dim)' }}>{f.row.date}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: f.type === 'income' ? 'var(--color-acc-green)' : 'var(--color-red)' }}>
                        {f.type === 'income' ? '+' : '−'}{fmt(Math.abs(f.row.amount))}
                      </div>
                      <select value={f.category} onChange={e => setCatOverride(p => ({ ...p, [f.i]: e.target.value }))} style={chip}>
                        {opts.map(c => <option key={c} value={c}>{CAT_META[c]?.icon || '•'} {c}</option>)}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>

            {dups.length > 0 && (
              <>
                <button type="button" onClick={() => setShowDups(v => !v)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-dim)', fontSize: 12, padding: '10px 0 4px', cursor: 'pointer' }}>
                  {showDups ? '▾' : '▸'} {dups.length} duplicados (no se importan)
                </button>
                {showDups && dups.map((d, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--color-dim)', padding: '4px 0' }}>
                    <span style={{ flexShrink: 0 }}>{d.row.date}</span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.row.concept}</span>
                    <span style={{ flexShrink: 0 }}>{fmt(d.row.amount)}</span>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '12px 20px 0' }}>
        <button onClick={step === 'map' ? () => setStep('pick') : close} className="btn-ghost" style={{ width: '100%' }}>
          {step === 'map' ? 'Atrás' : 'Cancelar'}
        </button>
        {step === 'map' && (
          <button onClick={previewMapping} className="btn-primary" style={{ background: 'var(--color-acc-blue)', width: 'auto' }}>Previsualizar</button>
        )}
        {step === 'review' && (
          <button onClick={handleApply} disabled={fresh.length === 0} className="btn-primary" style={{ background: 'var(--color-acc-gold)', color: 'var(--color-bg)', width: 'auto' }}>
            Importar {fresh.length}
          </button>
        )}
      </div>
    </Modal>
  )
}
