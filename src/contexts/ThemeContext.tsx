import { createContext, useContext, useState, useLayoutEffect, type ReactNode } from 'react'

type Theme = 'onyx' | 'cream' | 'abyss'

interface ThemeState { theme: Theme; set: (t: Theme) => void }

const ThemeContext = createContext<ThemeState>({ theme: 'cream', set: () => {} })

// Tokens IMPULSO por tema — todos los temas se adaptan a la guía, no hay "acentos
// oscuros fijos" copiados de la versión anterior. La marca (volt/ink) no cambia entre
// temas; lo que cambia es la superficie y el texto. CTA: claro = tinta/texto blanco;
// oscuro = lima/texto tinta; abyss igual que onyx pero con negros más profundos.
// `acc-blue` es un legado del tema anterior (era el color de marca antiguo); en claro
// se sustituye por un verde profundo legible, en oscuro por lima, para no tener un
// azul que no existe en la paleta IMPULSO.
const THEMES: Record<Theme, Record<string, string>> = {
  // CREAM — papel cálido (tema claro, default de nuevas instalaciones).
  cream: {
    '--color-bg': '#F4F3EB',
    '--color-s1': '#FFFFFF',
    '--color-s2': '#ECE7DF',
    '--color-s3': '#E3DDD2',
    '--color-border': 'rgba(24,27,16,0.08)',
    '--color-border2': 'rgba(24,27,16,0.14)',
    '--color-text': '#181B10',
    '--color-sub': '#4A4E3C',
    '--color-dim': '#6B6E5C',
    '--color-glass': 'rgba(244,243,235,0.82)',
    // CTA: tinta con texto blanco (alto contraste sobre papel).
    '--color-primary': '#181B10',
    '--color-on-primary': '#FFFFFF',
    // Marca, fija.
    '--color-volt': '#C9F43C',
    '--color-volt-deep': '#8FCE12',
    '--color-volt-soft': '#EFF8D2',
    '--color-ink': '#181B10',
    '--color-ink-soft': '#4A4E3C',
    '--color-on-accent': '#181B10',
    // Acentos legados — variantes aptas para papel.
    '--color-acc-blue': '#2F7A4D',     // legacy: verde profundo legible (era azul de marca)
    '--color-acc-green': '#0E7B6E',
    '--color-acc-orange': '#C45A2A',
    '--color-acc-gold': '#A07420',
    '--color-acc-purple': '#6A4FC8',
    '--color-red': '#C24338',
    '--color-yellow': '#A07420',
    '--color-blue': '#2F7A4D',
    // Datos semánticos — legibles sobre papel.
    '--color-teal': '#0E7B6E',
    '--color-amber': '#C77800',
    '--color-coral': '#C24338',
    '--color-night': '#6A4FC8',
    '--color-money': '#1F7A4D',
  },
  // ONYX — noche cálida IMPULSO (#0D0F08 con superficies cálidas).
  onyx: {
    '--color-bg': '#0D0F08',
    '--color-s1': '#171B10',
    '--color-s2': '#22271A',
    '--color-s3': '#2C3220',
    '--color-border': 'rgba(255,255,255,0.08)',
    '--color-border2': 'rgba(255,255,255,0.14)',
    '--color-text': '#F4F3EB',
    '--color-sub': '#C7CDB6',
    '--color-dim': '#8A8B7E',
    '--color-glass': 'rgba(13,15,8,0.78)',
    // CTA: lima con texto tinta (única forma legible sobre fondo oscuro cálido).
    '--color-primary': '#C9F43C',
    '--color-on-primary': '#181B10',
    '--color-volt': '#C9F43C',
    '--color-volt-deep': '#8FCE12',
    '--color-volt-soft': '#1F2A0A',
    '--color-ink': '#181B10',
    '--color-ink-soft': '#4A4E3C',
    '--color-on-accent': '#181B10',
    // Acentos legados — sobre fondo oscuro, los tonos joya apagados siguen funcionando.
    '--color-acc-blue': '#C9F43C',     // legacy: lima (no hay azul IMPULSO)
    '--color-acc-green': '#2FB8A6',
    '--color-acc-orange': '#F0A22E',
    '--color-acc-gold': '#C8A24E',
    '--color-acc-purple': '#9B7BF0',
    '--color-red': '#F26D5B',
    '--color-yellow': '#C8A24E',
    '--color-blue': '#C9F43C',
    '--color-teal': '#2FB8A6',
    '--color-amber': '#F0A22E',
    '--color-coral': '#F26D5B',
    '--color-night': '#9B7BF0',
    '--color-money': '#3FCC85',
  },
  // ABYSS — negro OLED con neutros cálidos; misma marca lima que onyx.
  abyss: {
    '--color-bg': '#000000',
    '--color-s1': '#0B0D08',
    '--color-s2': '#161A10',
    '--color-s3': '#1F2418',
    '--color-border': 'rgba(255,255,255,0.05)',
    '--color-border2': 'rgba(255,255,255,0.09)',
    '--color-text': '#F4F3EB',
    '--color-sub': '#B8BBA8',
    '--color-dim': '#9A9D8A',
    '--color-glass': 'rgba(0,0,0,0.85)',
    '--color-primary': '#C9F43C',
    '--color-on-primary': '#181B10',
    '--color-volt': '#C9F43C',
    '--color-volt-deep': '#8FCE12',
    '--color-volt-soft': '#1F2A0A',
    '--color-ink': '#181B10',
    '--color-ink-soft': '#4A4E3C',
    '--color-on-accent': '#181B10',
    '--color-acc-blue': '#C9F43C',
    '--color-acc-green': '#2FB8A6',
    '--color-acc-orange': '#F0A22E',
    '--color-acc-gold': '#C8A24E',
    '--color-acc-purple': '#9B7BF0',
    '--color-red': '#F26D5B',
    '--color-yellow': '#C8A24E',
    '--color-blue': '#C9F43C',
    '--color-teal': '#2FB8A6',
    '--color-amber': '#F0A22E',
    '--color-coral': '#F26D5B',
    '--color-night': '#9B7BF0',
    '--color-money': '#3FCC85',
  },
}

// Etiquetas visibles — el campo `icon` se mantiene como string para no romper
// consumidores existentes (TopBar.tsx pinta el emoji). Fase 2 los sustituye por lucide.
const THEME_LABELS: Record<Theme, { name: string; icon: string; desc: string }> = {
  onyx:  { name: 'Oscuro',     icon: '🌑', desc: 'Noche cálida IMPULSO' },
  cream: { name: 'Claro',      icon: '☀️', desc: 'Papel cálido' },
  abyss: { name: 'Negro OLED', icon: '🕳️', desc: 'Negro profundo, marca lima' },
}

// `color-scheme` nativo del navegador (formularios, scrollbars, autofill).
// onyx/abyss son oscuros, cream es claro. Marca el comportamiento UA en cada cambio.
const COLOR_SCHEME: Record<Theme, 'light' | 'dark'> = {
  cream: 'light',
  onyx: 'dark',
  abyss: 'dark',
}

export { THEME_LABELS }
export type { Theme }

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('lifeos_theme_v2')
    // Nuevas instalaciones → cream (experiencia por defecto del rediseño IMPULSO).
    // Las preferencias guardadas válidas (onyx/cream/abyss) se respetan.
    return (saved === 'onyx' || saved === 'cream' || saved === 'abyss' ? saved : 'cream') as Theme
  })

  // Publicar los tokens antes de los efectos de gráficos que leen estilos computados.
  useLayoutEffect(() => {
    localStorage.setItem('lifeos_theme_v2', theme)
    const t = THEMES[theme]
    const root = document.documentElement
    Object.entries(t).forEach(([k, v]) => root.style.setProperty(k, v))
    // Marca el tema en <html> para selectores CSS por-tema y para UA.
    root.setAttribute('data-theme', theme)
    root.style.colorScheme = COLOR_SCHEME[theme]
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t['--color-bg'])
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, set: setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
