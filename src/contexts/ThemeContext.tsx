import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeState>({ theme: 'dark', toggle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('lifeos_theme_v2')
    return (saved === 'light' ? 'light' : 'dark') as Theme
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('lifeos_theme_v2', theme)
    if (theme === 'light') {
      document.documentElement.style.setProperty('--color-bg', '#f5f5f7')
      document.documentElement.style.setProperty('--color-s1', '#ffffff')
      document.documentElement.style.setProperty('--color-s2', '#f0f0f3')
      document.documentElement.style.setProperty('--color-border', 'rgba(0,0,0,0.08)')
      document.documentElement.style.setProperty('--color-border2', 'rgba(0,0,0,0.14)')
      document.documentElement.style.setProperty('--color-text', '#1a1a2e')
      document.documentElement.style.setProperty('--color-sub', '#6b6b80')
      document.documentElement.style.setProperty('--color-dim', '#9a9aae')
    } else {
      document.documentElement.style.setProperty('--color-bg', '#111318')
      document.documentElement.style.setProperty('--color-s1', '#191c22')
      document.documentElement.style.setProperty('--color-s2', '#1f2229')
      document.documentElement.style.setProperty('--color-border', 'rgba(255,255,255,0.07)')
      document.documentElement.style.setProperty('--color-border2', 'rgba(255,255,255,0.12)')
      document.documentElement.style.setProperty('--color-text', '#e8e9ee')
      document.documentElement.style.setProperty('--color-sub', '#8a8d96')
      document.documentElement.style.setProperty('--color-dim', '#4a4d56')
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme(t => t === 'dark' ? 'light' : 'dark') }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
