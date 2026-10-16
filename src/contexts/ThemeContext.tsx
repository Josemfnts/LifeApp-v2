import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type Theme = 'onyx' | 'cream' | 'abyss'

interface ThemeState { theme: Theme; set: (t: Theme) => void }

const ThemeContext = createContext<ThemeState>({ theme: 'cream', set: () => {} })

// Acentos oscuros (onyx/abyss) y su variante ajustada para fondo claro (cream),
// con más profundidad para mantener contraste sobre papel.
const DARK_ACCENTS = {
  '--color-acc-blue': '#6d76f0', '--color-acc-green': '#48b586', '--color-acc-orange': '#dd7d55',
  '--color-acc-gold': '#c8a24e', '--color-acc-purple': '#9a82e8', '--color-red': '#df6560',
  '--color-yellow': '#c8a24e', '--color-blue': '#6d76f0',
}
const LIGHT_ACCENTS = {
  '--color-acc-blue': '#5a5fe0', '--color-acc-green': '#2f9d6e', '--color-acc-orange': '#c56a3f',
  '--color-acc-gold': '#a8842f', '--color-acc-purple': '#7a63d2', '--color-red': '#d24a40',
  '--color-yellow': '#a8842f', '--color-blue': '#5a5fe0',
}

const THEMES: Record<Theme, Record<string, string>> = {
  onyx: {
    '--color-bg': '#0d0e12', '--color-s1': '#17181d', '--color-s2': '#1f2027', '--color-s3': '#282a32',
    '--color-border': 'rgba(255,255,255,0.06)', '--color-border2': 'rgba(255,255,255,0.10)',
    '--color-text': '#eceef3', '--color-sub': '#9498a3', '--color-dim': '#565a66',
    '--color-glass': 'rgba(13,14,18,0.82)',
    ...DARK_ACCENTS,
  },
  cream: {
    '--color-bg': '#F4F3EB', '--color-s1': '#FFFFFF', '--color-s2': '#ECE7DF', '--color-s3': '#E3DDD2',
    '--color-border': 'rgba(24,27,16,0.08)', '--color-border2': 'rgba(24,27,16,0.14)',
    '--color-text': '#181B10', '--color-sub': '#4A4E3C', '--color-dim': '#8A8B7E',
    '--color-glass': 'rgba(244,243,235,0.82)',
    ...LIGHT_ACCENTS,
  },
  abyss: {
    '--color-bg': '#000000', '--color-s1': '#0b0b0d', '--color-s2': '#141416', '--color-s3': '#1c1c1f',
    '--color-border': 'rgba(255,255,255,0.05)', '--color-border2': 'rgba(255,255,255,0.09)',
    '--color-text': '#f2f2f4', '--color-sub': '#9a9aa2', '--color-dim': '#5a5a62',
    '--color-glass': 'rgba(0,0,0,0.85)',
    ...DARK_ACCENTS,
  },
}

const THEME_LABELS: Record<Theme, { name: string; icon: string; desc: string }> = {
  onyx: { name: 'Onyx', icon: '🌑', desc: 'Grafito premium' },
  cream: { name: 'Cream', icon: '☀️', desc: 'Papel cálido' },
  abyss: { name: 'Abyss', icon: '🕳️', desc: 'Negro OLED' },
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

  useEffect(() => {
    localStorage.setItem('lifeos_theme_v2', theme)
    const t = THEMES[theme]
    Object.entries(t).forEach(([k, v]) => document.documentElement.style.setProperty(k, v))
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