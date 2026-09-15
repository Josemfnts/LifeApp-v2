import { useState } from 'react'
import { CAT_META } from '@/stores/financeStore'
import { merchantLogoUrl, type Merchant } from '@/lib/finance/merchants'

interface Props {
  merchant?: Merchant | null
  category: string
  size?: number
}

export function MerchantAvatar({ merchant, category, size = 38 }: Props) {
  const meta = CAT_META[category] || { icon: '📤', color: 'var(--color-dim)' }
  const fallback = meta.icon
  const url = merchantLogoUrl(merchant?.domain)
  const [errored, setErrored] = useState(false)
  const radius = 11
  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    flexShrink: 0,
    background: 'var(--color-s2)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: Math.round(size * 0.45),
    overflow: 'hidden',
  }
  if (!url || errored || !merchant) {
    return <div style={containerStyle}>{fallback}</div>
  }
  return (
    <div style={containerStyle}>
      <img
        src={url}
        alt={merchant.name}
        width={size - 4}
        height={size - 4}
        onError={() => setErrored(true)}
        style={{ display: 'block', borderRadius: 4 }}
      />
    </div>
  )
}
