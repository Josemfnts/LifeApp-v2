import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type Theme = 'onyx' | 'cream' | 'abyss'

interface ThemeState { theme: Theme; set: (t: Theme) => void }

const ThemeContext = createContext<ThemeState>({ theme: 'onyx', set: () => {} })

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
    '--color-bg': '#f2efe9', '--color-s1': '#ffffff', '--color-s2': '#ece7df', '--color-s3': '#e3ddd2',
    '--color-border': 'rgba(28,24,18,0.09)', '--color-border2': 'rgba(28,24,18,0.15)',
    '--color-text': '#211e19', '--color-sub': '#6d685f', '--color-dim': '#a8a298',
    '--color-glass': 'rgba(246,243,237,0.85)',
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
    return (saved === 'cream' || saved === 'abyss' ? saved : 'onyx') as Theme
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
