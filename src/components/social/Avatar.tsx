import { initials } from './helpers'

export function Avatar({
  name, url, size = 36, color = 'var(--color-acc-purple)', onClick,
}: {
  name: string; url?: string | null; size?: number; color?: string; onClick?: () => void
}) {
  const style: React.CSSProperties = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.34, fontWeight: 700, color, overflow: 'hidden',
    background: `color-mix(in srgb, ${color} 22%, var(--color-s2))`,
    cursor: onClick ? 'pointer' : 'default',
  }
  if (url) {
    return (
      <div style={style} onClick={onClick}>
        <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }
  return <div style={style} onClick={onClick}>{initials(name)}</div>
}
