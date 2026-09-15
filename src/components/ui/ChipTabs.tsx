import type { CSSProperties } from 'react'

export interface ChipTabItem<K extends string> {
  key: K
  label: string
  color?: string // color del activo; por defecto el azul de la app
}

// Navegación compacta en una línea (informe de mejora visual §6-7): 'chips' para categorías y
// 'line' para sub-pestañas. Sustituye a las filas de botones con borde. Estilos en globals.css.
export function ChipTabs<K extends string>({ items, value, onChange, variant = 'chips', color, style }: {
  items: readonly ChipTabItem<K>[]
  value: K
  onChange: (key: K) => void
  variant?: 'chips' | 'line'
  color?: string
  style?: CSSProperties
}) {
  return (
    <div className={variant === 'chips' ? 'chip-tabs' : 'line-tabs'} role="tablist" style={style}>
      {items.map(it => {
        const active = it.key === value
        const c = it.color ?? color
        return (
          <button key={it.key} type="button" role="tab" aria-selected={active}
            onClick={() => onChange(it.key)}
            className={variant === 'chips' ? `chip-tab${active ? ' active' : ''}` : `tab-btn${active ? ' active' : ''}`}
            style={c ? ({ '--chip-color': c } as CSSProperties) : undefined}>
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
