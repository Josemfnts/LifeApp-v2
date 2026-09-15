import { useFinanceStore, CAT_META, fmt } from '@/stores/financeStore'
import { useMemo } from 'react'
import { MerchantAvatar } from './MerchantAvatar'
import { SEED_MERCHANTS } from '@/lib/finance/merchants'

interface Props {
  tx: {
    id?: number
    concept: string
    category: string
    amount: number
    type: string
    note: string
    cuenta?: string
    kind?: string
    linkId?: string
    merchantId?: string
    split?: { myShare: number }
  }
  onClick?: (id: number) => void
}

export function TxRow({ tx, onClick }: Props) {
  const txs = useFinanceStore(s => s.txs)
  const merchants = useFinanceStore(s => s.merchants)
  const idx = txs.findIndex(t => t.id === tx.id)
  const meta = CAT_META[tx.category] || { icon: '📤', color: 'var(--color-dim)' }

  const merchant = useMemo(() => {
    if (!tx.merchantId) return null
    const all = [...merchants, ...SEED_MERCHANTS]
    return all.find(m => m.id === tx.merchantId) ?? null
  }, [tx.merchantId, merchants])

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

  if (tx.split) subtitle += ` · tu parte ${fmt(tx.split.myShare)}`

  let amountColor = tx.type === 'income' ? 'var(--color-acc-green)' : 'var(--color-red)'
  if (isTransfer) amountColor = 'var(--color-sub)'

  const handleClick = () => {
    if (tx.id !== undefined && onClick) onClick(tx.id)
  }

  return (
    <div onClick={handleClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: onClick ? 'pointer' : 'default' }}>
      {merchant ? (
        <MerchantAvatar merchant={merchant} category={tx.category} size={38} />
      ) : (
        <div style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0, background: meta.color + '18', border: '1px solid ' + meta.color + '30' }}>{isAdjust ? '⚖️' : meta.icon}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.concept}</div>
        <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 2 }}>{subtitle}</div>
      </div>
      <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, fontWeight: 400, flexShrink: 0, color: amountColor }}>
        {isTransfer ? '' : sign}{fmt(tx.amount)}
      </div>
      {onClick && idx >= 0 && (
        <span aria-hidden style={{ color: 'var(--color-dim)', fontSize: 18, paddingLeft: 4 }}>›</span>
      )}
    </div>
  )
}
