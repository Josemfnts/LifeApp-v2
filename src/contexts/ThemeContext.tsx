import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type Theme = 'onyx' | 'cream' | 'abyss'

interface ThemeState { theme: Theme; set: (t: Theme) => void }

const ThemeContext = createContext<ThemeState>({ theme: 'onyx', set: () => {} })

const THEMES: Record<Theme, Record<string, string>> = {
  onyx: {
    '--color-bg': '#111318', '--color-s1': '#191c22', '--color-s2': '#1f2229',
    '--color-border': 'rgba(255,255,255,0.07)', '--color-border2': 'rgba(255,255,255,0.12)',
    '--color-text': '#e8e9ee', '--color-sub': '#8a8d96', '--color-dim': '#4a4d56',
  },
  cream: {
    '--color-bg': '#faf8f5', '--color-s1': '#ffffff', '--color-s2': '#f5f2ed',
    '--color-border': 'rgba(0,0,0,0.06)', '--color-border2': 'rgba(0,0,0,0.12)',
    '--color-text': '#1a1a2e', '--color-sub': '#6b6b7b', '--color-dim': '#9a9aad',
  },
  abyss: {
    '--color-bg': '#000000', '--color-s1': '#0a0a0a', '--color-s2': '#111111',
    '--color-border': 'rgba(255,255,255,0.04)', '--color-border2': 'rgba(255,255,255,0.08)',
    '--color-text': '#f0f0f0', '--color-sub': '#a0a0a0', '--color-dim': '#555555',
  },
}

const THEME_LABELS: Record<Theme, { name: string; icon: string; desc: string }> = {
  onyx: { name: 'Onyx', icon: '🌑', desc: 'Oscuro premium' },
  cream: { name: 'Cream', icon: '☀️', desc: 'Claro cálido' },
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
