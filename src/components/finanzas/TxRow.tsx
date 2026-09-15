import { useFinanceStore, CAT_META, fmt } from '@/stores/financeStore'

export function TxRow({ tx }: { tx: { id?: number; concept: string; category: string; amount: number; type: string; note: string; cuenta?: string; kind?: string; linkId?: string } }) {
  const { removeTx, txs } = useFinanceStore()
  const idx = txs.findIndex(t => t.id === tx.id)
  const meta = CAT_META[tx.category] || { icon: '📤', color: 'var(--color-dim)' }
  const sign = tx.type === 'income' ? '+' : '−'
  const isTransfer = tx.kind === 'transfer'
  const isAdjust = tx.kind === 'adjust'
  let subtitle = tx.category
  if (tx.cuenta) subtitle += ' · ' + tx.cuenta
  else if (tx.note) subtitle += ' · ' + tx.note
  if (isTransfer && tx.linkId) {
    const other = txs.find(t => t.linkId === tx.linkId && t.id !== tx.id)
    if (other && other.cuenta && tx.cuenta) {
      const origin = tx.type === 'expense' ? tx.cuenta : other.cuenta
      const dest = tx.type === 'income' ? tx.cuenta : other.cuenta
      subtitle = `${origin} → ${dest}`
    }
  }
  let amountColor = tx.type === 'income' ? 'var(--color-acc-green)' : 'var(--color-red)'
  if (isTransfer) amountColor = 'var(--color-sub)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0, background: 'var(--color-s2)', border: '1px solid var(--color-border)' }}>{isAdjust ? '⚖️' : meta.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.concept}</div>
        <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 2 }}>{subtitle}</div>
      </div>
      <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, fontWeight: 400, flexShrink: 0, color: amountColor }}>
        {isTransfer ? '' : sign}{fmt(tx.amount)}
      </div>
      {idx >= 0 && (
        <button onClick={() => removeTx(idx)}
          style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
      )}
    </div>
  )
}
