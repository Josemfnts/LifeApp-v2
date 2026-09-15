import { useState } from 'react'
import { useFinanceStore, fmt, fmtShort } from '@/stores/financeStore'
import { localISO } from '@/lib/finance/dates'
import { sumEuros } from '@/lib/finance/money'
import { nextPaymentSplit } from '@/lib/finance/debts'
import { DebtSheet } from './DebtSheet'
import { DEBT_KIND } from './meta'

export function DebtsSection() {
  const debts = useFinanceStore(s => s.debts)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetId, setSheetId] = useState<string | null>(null)
  const today = localISO()

  const counted = debts.filter(d => d.includeInNw !== false)
  const total = sumEuros(counted.map(d => d.balance))
  const monthly = sumEuros(debts.map(d => nextPaymentSplit(d, today).total))

  function open(id: string | null) { setSheetId(id); setSheetOpen(true) }

  return (
    <div>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 20, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Deuda pendiente</div>
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 38, lineHeight: 1, color: total > 0 ? 'var(--color-red)' : 'var(--color-text)' }}>{fmt(total)}</div>
        <div style={{ fontSize: 12, color: 'var(--color-sub)', marginTop: 8 }}>Cuotas este mes: {fmt(monthly)}</div>
        <div style={{ fontSize: 10, color: 'var(--color-dim)', marginTop: 8 }}>Al pagar una cuota solo los intereses son gasto; el capital baja la deuda y tu patrimonio no cambia.</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Mis deudas</div>
        <button onClick={() => open(null)}
          style={{ background: 'rgba(91,138,240,0.1)', color: 'var(--color-acc-blue)', border: '1px solid rgba(91,138,240,0.2)', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>+ Añadir</button>
      </div>

      {debts.length === 0 ? (
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>💳</div>
          <div style={{ fontSize: 14, color: 'var(--color-sub)' }}>Sin deudas registradas</div>
          <div style={{ fontSize: 12, color: 'var(--color-dim)', marginTop: 6 }}>Hipotecas, préstamos o tarjetas con su cuadro de amortización.</div>
        </div>
      ) : (
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
          {debts.map(d => {
            const pct = d.principal > 0 ? Math.max(0, Math.min(100, (1 - d.balance / d.principal) * 100)) : 0
            const split = nextPaymentSplit(d, today)
            return (
              <div key={d.id} onClick={() => open(d.id)} style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', opacity: d.includeInNw === false ? 0.6 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: 'var(--color-s2)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{DEBT_KIND[d.kind].icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-dim)' }}>
                      {split.total > 0 ? `Próxima cuota ${fmt(split.total)} · ${fmtShort(split.interest)} intereses` : 'Pagada'}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 17, color: 'var(--color-red)', flexShrink: 0 }}>{fmtShort(d.balance)}</div>
                </div>
                <div style={{ height: 5, background: 'var(--color-s2)', borderRadius: 99, overflow: 'hidden', marginTop: 8 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-acc-green)', borderRadius: 99 }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-dim)', marginTop: 3, textAlign: 'right' }}>{pct.toFixed(1)}% amortizado</div>
              </div>
            )
          })}
        </div>
      )}

      <DebtSheet open={sheetOpen} debtId={sheetId} onClose={() => setSheetOpen(false)} />
    </div>
  )
}
