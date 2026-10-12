import { useMemo, useState } from 'react'
import { ChipTabs, EmptyState } from '@/components/ui'
import { EditTxSheet } from './EditTxSheet'
import { useFinanceStore, fmt } from '@/stores/financeStore'
import { localISO, monthKeyOf } from '@/lib/finance/dates'
import { PROJECTS, PROJECT_FILTER_ALL, type ProjectFilter } from '@/lib/finance/projects'
import { contaMonthView, contaYearView, type ContaMonthBlock, type ContaMonthStat } from '@/lib/finance/conta-view'

// F2.1 de Contabilidad por proyecto: el componente se limita a pintar el modelo de
// src/lib/finance/conta-view.ts. El signo y el color del dinero los decide la UI: el modelo
// solo devuelve números y la bandera `empty` por celda.
export function ContabilidadTab() {
  const [project, setProject] = useState<ProjectFilter>(PROJECT_FILTER_ALL)
  const [view, setView] = useState<'mes' | 'anio'>('mes')
  const [month, setMonth] = useState<string>(() => monthKeyOf(localISO()))
  const [editTxId, setEditTxId] = useState<number | null>(null)

  const txs = useFinanceStore(s => s.txs)
  const pufos = useFinanceStore(s => s.pufos)
  const today = useMemo(() => localISO(), [])

  const monthView = useMemo(
    () => contaMonthView({ txs, pufos, month, filter: project, today }),
    [txs, pufos, month, project, today],
  )

  const yearView = useMemo(
    () => contaYearView({ txs, pufos, year: Number(month.slice(0, 4)), filter: project }),
    [txs, pufos, month, project],
  )

  const projectItems = useMemo(
    () => [
      { key: PROJECT_FILTER_ALL, label: 'Todos' },
      ...PROJECTS.map(p => ({ key: p.id, label: p.label, color: p.color })),
    ] as const,
    [],
  )

  const viewItems = [
    { key: 'mes', label: 'Mes' },
    { key: 'anio', label: 'Año' },
  ] as const

  return (
    <div>
      <ChipTabs items={projectItems} value={project} onChange={setProject} variant="chips" />
      <ChipTabs items={viewItems} value={view} onChange={setView} variant="line" />

      <div key={`${view}-${project}-${month}`} className="animate-tab">
        {view === 'mes' ? (
          <MonthView
            label={monthView.nav.label}
            prev={monthView.nav.prev}
            next={monthView.nav.next}
            stats={monthView.stats}
            balanceAnio={monthView.balanceAnio}
            blocks={monthView.blocks}
            onPrev={() => monthView.nav.prev && setMonth(monthView.nav.prev)}
            onNext={() => monthView.nav.next && setMonth(monthView.nav.next)}
            onRowClick={id => id !== undefined && setEditTxId(id)}
          />
        ) : (
          <YearView
            yearLabel={String(yearView.year)}
            monthLabels={yearView.monthLabels}
            rows={yearView.rows}
            totalByMonth={yearView.totalByMonth}
            total={yearView.total}
            empty={yearView.empty}
            emptyMessage={yearView.emptyMessage}
          />
        )}
      </div>

      <EditTxSheet
        open={editTxId !== null}
        onClose={() => setEditTxId(null)}
        txId={editTxId}
      />
    </div>
  )
}

function toneColor(tone: ContaMonthStat['tone']): string {
  if (tone === 'pos') return 'var(--color-acc-green)'
  if (tone === 'neg') return 'var(--color-red)'
  return 'var(--color-text)'
}

// `mode` decide el signo POR LO QUE ES la cifra, no por su valor:
//   - 'pos'  → '+' a cualquier valor no cero (cobros, balance positivo, etc.)
//   - 'neg'  → '−' a cualquier valor no cero (gastos)
//   - 'auto' → '+' o '−' según el signo del valor (balance, balanceAnio)
//   - 'none' → sin signo (Te deben: dinero que aún no se ha movido)
// `0` se pinta a secas siempre.
function formatAmount(value: number, mode: 'pos' | 'neg' | 'auto' | 'none' = 'auto'): string {
  if (value === 0) return '0'
  if (mode === 'none') return fmt(Math.abs(value))
  const sign = mode === 'pos' ? '+' : mode === 'neg' ? '−' : value > 0 ? '+' : '−'
  return `${sign}${fmt(Math.abs(value))}`
}

function statSignMode(key: ContaMonthStat['key']): 'pos' | 'neg' | 'auto' {
  if (key === 'cobrado') return 'pos'
  if (key === 'gastado') return 'neg'
  return 'auto'
}

function blockSignMode(key: ContaMonthBlock['key']): 'pos' | 'neg' | 'none' {
  if (key === 'cobros') return 'pos'
  if (key === 'gastos') return 'neg'
  return 'none'
}

function rowAmountColor(key: ContaMonthBlock['key']): string {
  if (key === 'cobros') return 'var(--color-acc-green)'
  if (key === 'gastos') return 'var(--color-red)'
  return 'var(--color-text)'
}

interface MonthViewProps {
  label: string
  prev: string | null
  next: string | null
  stats: ContaMonthStat[]
  balanceAnio: number
  blocks: ContaMonthBlock[]
  onPrev: () => void
  onNext: () => void
  onRowClick: (id: number | undefined) => void
}

function MonthView({ label, prev, next, stats, balanceAnio, blocks, onPrev, onNext, onRowClick }: MonthViewProps) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', marginBottom: 8 }}>
        <button
          onClick={onPrev}
          disabled={!prev}
          style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-sub)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: prev ? 'pointer' : 'not-allowed', opacity: prev ? 1 : 0.4 }}
          aria-label="Mes anterior"
        >‹</button>
        <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 18, color: 'var(--color-text)' }}>{label}</div>
        <button
          onClick={onNext}
          disabled={!next}
          style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--color-s2)', border: '1px solid var(--color-border)', color: 'var(--color-sub)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: next ? 'pointer' : 'not-allowed', opacity: next ? 1 : 0.4 }}
          aria-label="Mes siguiente"
        >›</button>
      </div>

      <div className="stat-strip" style={{ marginBottom: 6 }}>
        {stats.map(s => (
          <div key={s.key}>
            <div className="stat-num" style={{ color: toneColor(s.tone) }}>{formatAmount(s.value, statSignMode(s.key))}</div>
            <div className="stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-dim)', textAlign: 'right', marginBottom: 14 }}>
        Acumulado del año: {formatAmount(balanceAnio, 'auto')}
      </div>

      {blocks.map(b => (
        <section key={b.key} style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="sec-label">{b.title}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-sub)' }}>{formatAmount(b.total, blockSignMode(b.key))}</div>
          </div>
          {b.empty ? (
            <EmptyState message={b.emptyMessage} />
          ) : (
            <div className="card">
              {b.rows.map(r => (
                <BlockRow
                  key={`${b.key}-${r.id ?? `${r.date}-${r.concept}`}`}
                  dateLabel={r.dateLabel}
                  concept={r.concept}
                  projectLabel={r.projectLabel}
                  amount={r.amount}
                  amountColor={rowAmountColor(b.key)}
                  signMode={blockSignMode(b.key)}
                  clickable={b.key !== 'pendientes' && r.id !== undefined}
                  onClick={() => onRowClick(r.id)}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </>
  )
}

interface BlockRowProps {
  dateLabel: string
  concept: string
  projectLabel: string
  amount: number
  amountColor: string
  signMode: 'pos' | 'neg' | 'none'
  clickable: boolean
  onClick: () => void
}

function BlockRow({ dateLabel, concept, projectLabel, amount, amountColor, signMode, clickable, onClick }: BlockRowProps) {
  return (
    <div
      onClick={clickable ? onClick : undefined}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: clickable ? 'pointer' : 'default' }}
    >
      <div style={{ width: 42, flexShrink: 0, fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'lowercase' }}>{dateLabel}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{concept}</div>
        {projectLabel && <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 2 }}>{projectLabel}</div>}
      </div>
      <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 20, fontWeight: 400, flexShrink: 0, color: amountColor }}>{formatAmount(amount, signMode)}</div>
      {clickable && <span aria-hidden style={{ color: 'var(--color-dim)', fontSize: 18, paddingLeft: 4 }}>›</span>}
    </div>
  )
}

interface YearViewProps {
  yearLabel: string
  monthLabels: string[]
  rows: ReturnType<typeof contaYearView>['rows']
  totalByMonth: ReturnType<typeof contaYearView>['totalByMonth']
  total: ReturnType<typeof contaYearView>['total']
  empty: boolean
  emptyMessage: string
}

function YearView({ yearLabel, monthLabels, rows, totalByMonth, total, empty, emptyMessage }: YearViewProps) {
  if (empty) {
    return (
      <div style={{ marginTop: 20 }}>
        <div className="sec-label" style={{ marginBottom: 8 }}>Año {yearLabel}</div>
        <EmptyState message={emptyMessage} />
      </div>
    )
  }
  return (
    <div style={{ marginTop: 20 }}>
      <div className="sec-label" style={{ marginBottom: 8 }}>Año {yearLabel}</div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600, fontSize: 12 }}>
          <thead>
            <tr>
              <th style={thStyle('left', true)}>Proyecto</th>
              {monthLabels.map(m => (
                <th key={m} style={thStyle('right', false)}>{m}</th>
              ))}
              <th style={thStyle('right', false)}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.project}>
                <td style={tdStickyStyle('left', true)}>{r.label}</td>
                {r.months.map(m => (
                  <td key={m.monthKey} style={tdStyle('right', false)}>
                    {m.empty ? ' ' : compact(m.balance)}
                  </td>
                ))}
                <td style={tdTotalStyle('right', r.total.balance)}>
                  {fmtSignedExact(r.total.balance)}
                </td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid var(--color-border)' }}>
              <td style={tdStickyStyle('left', true)}>Total</td>
              {totalByMonth.map(m => (
                <td key={m.monthKey} style={tdTotalStyle('right', m.balance)}>
                  {compact(m.balance)}
                </td>
              ))}
              <td style={tdTotalStyle('right', total.balance)}>
                {fmtSignedExact(total.balance)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function thStyle(align: 'left' | 'right', sticky: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    textAlign: align,
    padding: '6px 8px',
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--color-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-bg)',
    whiteSpace: 'nowrap',
  }
  if (!sticky) return base
  return { ...base, position: 'sticky', left: 0, zIndex: 1 }
}

function tdStyle(align: 'left' | 'right', bold: boolean): React.CSSProperties {
  return {
    textAlign: align,
    padding: '8px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    color: 'var(--color-text)',
    fontWeight: bold ? 600 : 400,
    whiteSpace: 'nowrap',
  }
}

// Sticky para la primera columna (etiquetas de proyecto). El total del año NO es sticky
// porque vive en la esquina derecha: ya queda visible con scroll horizontal.
function tdStickyStyle(align: 'left' | 'right', bold: boolean): React.CSSProperties {
  return {
    ...tdStyle(align, bold),
    position: 'sticky',
    left: 0,
    background: 'var(--color-bg)',
    zIndex: 1,
  }
}

function tdTotalStyle(align: 'left' | 'right', value: number): React.CSSProperties {
  const color = value > 0 ? 'var(--color-acc-green)' : value < 0 ? 'var(--color-red)' : 'var(--color-text)'
  return {
    ...tdStyle(align, true),
    color,
  }
}

function compact(value: number): string {
  if (value === 0) return '0'
  const abs = Math.abs(value)
  const sign = value > 0 ? '+' : '−'
  if (abs >= 1000) return `${sign}${Math.round(abs / 100) / 10}k`
  return `${sign}${Math.round(abs)}`
}

// Importe exacto (con decimales) para los totales anuales: la cifra que Josema va a leer.
// `0` se pinta a secas; el resto con `+`/`−` por valor.
function fmtSignedExact(value: number): string {
  if (value === 0) return '0'
  const sign = value > 0 ? '+' : '−'
  return `${sign}${fmt(Math.abs(value))}`
}
