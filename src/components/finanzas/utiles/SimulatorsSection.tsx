import { useMemo, useState } from 'react'
import { useFinanceStore, fmt, netWorthExtras } from '@/stores/financeStore'
import { simulateLoan, simulateMortgage, simulateSavings, DISCLAIMER } from '@/lib/finance/simulators'
import { computeNetWorth } from '@/lib/finance/networth'
import { parseEuroInput, sumEuros } from '@/lib/finance/money'
import { isFlow } from '@/lib/finance/flow'
import { flowAmount } from '@/lib/finance/split'
import { localISO } from '@/lib/finance/dates'
import { prevMonthKey } from '@/lib/finance/budgets'
import { MiniLineChart, type LineSeries } from './MiniLineChart'

type Mode = 'loan' | 'mortgage' | 'savings'

const label = { fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 4, marginTop: 8 } as const
const stat = { fontSize: 10, color: 'var(--color-dim)' } as const
const statVal = { fontSize: 15, fontWeight: 700, color: 'var(--color-text)' } as const
const box = { background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginTop: 12 } as const
const num = (s: string) => { const n = parseEuroInput(s); return Number.isFinite(n) ? n : 0 }
const pct = (x: number | null) => (x === null ? '—' : `${(x * 100).toFixed(1).replace('.', ',')} %`)

function Field({ text, value, onChange, suffix }: { text: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <div>
      <div style={label}>{text}{suffix ? ` (${suffix})` : ''}</div>
      <input className="inp" value={value} onChange={e => onChange(e.target.value)} inputMode="decimal" />
    </div>
  )
}

export function SimulatorsSection() {
  const [mode, setMode] = useState<Mode>('mortgage')
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {([['loan', 'Préstamo'], ['mortgage', 'Hipoteca'], ['savings', 'Ahorro']] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setMode(k)}
            style={{ padding: 9, borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1px solid',
              background: mode === k ? 'rgba(91,138,240,0.12)' : 'var(--color-s1)',
              color: mode === k ? 'var(--color-acc-blue)' : 'var(--color-sub)',
              borderColor: mode === k ? 'rgba(91,138,240,0.3)' : 'var(--color-border)' }}>{l}</button>
        ))}
      </div>
      {mode === 'loan' && <LoanSim />}
      {mode === 'mortgage' && <MortgageSim />}
      {mode === 'savings' && <SavingsSim />}
      <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 14, lineHeight: 1.5 }}>{DISCLAIMER}</div>
    </div>
  )
}

function LoanSim() {
  const [amount, setAmount] = useState('15000')
  const [years, setYears] = useState('5')
  const [tin, setTin] = useState('7')
  const [fee, setFee] = useState('0')
  const [showRows, setShowRows] = useState(false)
  const sim = useMemo(() => simulateLoan({ amount: num(amount), years: num(years), tin: num(tin) / 100, openingFeePct: num(fee) / 100 }), [amount, years, tin, fee])
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field text="Importe" suffix="€" value={amount} onChange={setAmount} />
        <Field text="Plazo" suffix="años" value={years} onChange={setYears} />
        <Field text="TIN" suffix="%" value={tin} onChange={setTin} />
        <Field text="Comisión apertura" suffix="%" value={fee} onChange={setFee} />
      </div>
      <div style={{ ...box, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><div style={statVal}>{fmt(sim.payment)}</div><div style={stat}>Cuota mensual</div></div>
        <div><div style={statVal}>{fmt(sim.totalInterest)}</div><div style={stat}>Intereses totales</div></div>
        <div><div style={statVal}>{fmt(sim.openingFee)}</div><div style={stat}>Comisión</div></div>
        <div><div style={statVal}>{fmt(sim.totalCost)}</div><div style={stat}>Coste total</div></div>
      </div>
      {sim.schedule.length > 0 && (
        <button type="button" onClick={() => setShowRows(v => !v)} style={{ background: 'transparent', border: 'none', color: 'var(--color-acc-blue)', fontSize: 12, padding: '8px 0', cursor: 'pointer' }}>
          {showRows ? 'Ocultar cuadro' : 'Ver cuadro de amortización'}
        </button>
      )}
      {showRows && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, color: 'var(--color-sub)' }}>
            <thead><tr style={{ color: 'var(--color-dim)', textAlign: 'right' }}><th style={{ textAlign: 'left' }}>Mes</th><th>Cuota</th><th>Intereses</th><th>Capital</th><th>Pendiente</th></tr></thead>
            <tbody>
              {sim.schedule.map(r => (
                <tr key={r.n} style={{ textAlign: 'right', borderTop: '1px solid var(--color-border)' }}>
                  <td style={{ textAlign: 'left', padding: '3px 2px' }}>{r.n}</td><td>{fmt(r.payment)}</td><td>{fmt(r.interest)}</td><td>{fmt(r.principal)}</td><td>{fmt(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function MortgageSim() {
  const store = useFinanceStore()
  const [price, setPrice] = useState('250000')
  const [down, setDown] = useState('50000')
  const [years, setYears] = useState('30')
  const [tin, setTin] = useState('3')
  const [costs, setCosts] = useState('10')

  // Tu situación real, precargada: patrimonio, liquidez, activos/deudas e ingresos medios de 3 meses.
  const mine = useMemo(() => {
    const b = computeNetWorth(store.cuentas, netWorthExtras(store))
    let mk = localISO().slice(0, 7)
    const incomes: number[] = []
    for (let i = 0; i < 3; i++) {
      mk = prevMonthKey(mk)
      const month = mk
      incomes.push(sumEuros(store.txs.filter(t => t.type === 'income' && isFlow(t) && t.date.startsWith(month)).map(flowAmount)))
    }
    // Un saldo líquido negativo (cuenta en descubierto) es deuda, no activos en negativo: si no, el ratio
    // deuda/activos se dispara (visto en prod: 23.770 % con −32 € líquidos).
    return {
      netWorth: b.net,
      liquid: b.liquid,
      totalAssets: Math.max(0, b.liquid) + b.investments + b.property,
      totalDebt: b.debt + Math.max(0, -b.liquid),
      monthlyIncome: sumEuros(incomes) / 3,
    }
  }, [store])

  const sim = useMemo(() => simulateMortgage({
    price: num(price), downPayment: num(down), years: num(years), tin: num(tin) / 100, purchaseCostsPct: num(costs) / 100,
    netWorth: mine.netWorth, liquid: mine.liquid, totalAssets: mine.totalAssets, totalDebt: mine.totalDebt,
    monthlyIncome: mine.monthlyIncome > 0 ? mine.monthlyIncome : undefined,
  }), [price, down, years, tin, costs, mine])

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field text="Precio de la vivienda" suffix="€" value={price} onChange={setPrice} />
        <Field text="Entrada" suffix="€" value={down} onChange={setDown} />
        <Field text="Plazo" suffix="años" value={years} onChange={setYears} />
        <Field text="TIN" suffix="%" value={tin} onChange={setTin} />
        <Field text="Gastos de compra" suffix="% ITP/IVA, notaría…" value={costs} onChange={setCosts} />
      </div>
      <div style={{ ...box, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><div style={statVal}>{fmt(sim.payment)}</div><div style={stat}>Cuota mensual</div></div>
        <div><div style={statVal}>{fmt(sim.loan)}</div><div style={stat}>Préstamo</div></div>
        <div><div style={statVal}>{fmt(sim.upfrontCash)}</div><div style={stat}>Efectivo necesario (entrada + {fmt(sim.purchaseCosts)} gastos)</div></div>
        <div><div style={statVal}>{fmt(sim.totalInterest)}</div><div style={stat}>Intereses totales</div></div>
      </div>
      <div style={box}>
        <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6 }}>
          Tu patrimonio pasa de <strong>{fmt(sim.nwBefore)}</strong> a <strong>{fmt(sim.nwAfter)}</strong> (los gastos de compra se pierden; entrada y préstamo solo cambian de forma).
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-sub)', marginTop: 6 }}>Deuda / activos: {pct(sim.debtToAssetsBefore)} → {pct(sim.debtToAssetsAfter)}</div>
        <div style={{ fontSize: 12, color: 'var(--color-sub)' }}>
          Cuota sobre tus ingresos medios: {sim.paymentToIncome === null ? 'sin ingresos registrados en los últimos 3 meses' : pct(sim.paymentToIncome)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-sub)' }}>Liquidez tras la compra: {fmt(sim.liquidAfter)}</div>
        <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: sim.canAfford ? 'var(--color-acc-green)' : 'var(--color-red)' }}>
          {sim.canAfford ? '🟢 Con tus datos, es asumible' : `🔴 ${sim.liquidAfter < 0 ? 'No te llega la liquidez para la entrada y los gastos' : 'La cuota supera el 35 % de tus ingresos'}`}
        </div>
      </div>
    </>
  )
}

function SavingsSim() {
  const [initial, setInitial] = useState('1000')
  const [monthly, setMonthly] = useState('200')
  const [ret, setRet] = useState('7')
  const [years, setYears] = useState('15')
  const [inflation, setInflation] = useState('2')
  const points = useMemo(
    () => simulateSavings({ initial: num(initial), monthly: num(monthly), annualReturn: num(ret) / 100, years: Math.min(60, num(years)), inflation: num(inflation) / 100 }),
    [initial, monthly, ret, years, inflation],
  )
  const last = points[points.length - 1]
  const labels = useMemo(() => points.map(p => `Año ${p.year}`), [points])
  const series = useMemo<LineSeries[]>(() => [
    { label: 'Valor', data: points.map(p => p.value), colorVar: '--color-acc-green', fill: true },
    { label: 'Aportado', data: points.map(p => p.contributed), colorVar: '--color-acc-blue' },
    { label: 'Valor real (sin inflación)', data: points.map(p => p.realValue), colorVar: '--color-acc-gold', dashed: true },
  ], [points])
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field text="Capital inicial" suffix="€" value={initial} onChange={setInitial} />
        <Field text="Aportación mensual" suffix="€" value={monthly} onChange={setMonthly} />
        <Field text="Rentabilidad anual" suffix="%" value={ret} onChange={setRet} />
        <Field text="Años" value={years} onChange={setYears} />
        <Field text="Inflación" suffix="%" value={inflation} onChange={setInflation} />
      </div>
      <div style={{ ...box, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div><div style={statVal}>{fmt(last.value)}</div><div style={stat}>Valor final</div></div>
        <div><div style={statVal}>{fmt(last.contributed)}</div><div style={stat}>Aportado</div></div>
        <div><div style={statVal}>{fmt(last.realValue)}</div><div style={stat}>En euros de hoy</div></div>
      </div>
      <div style={box}>
        <MiniLineChart labels={labels} series={series} height={170} format={fmt} />
      </div>
    </>
  )
}
