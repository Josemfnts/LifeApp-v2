/** El tema de la app se aplica por CSS custom properties (sin data-theme).
 *  Deducimos light/dark por la luminancia del fondo para pasárselo a BlockNote. */
export function detectEditorTheme(): 'light' | 'dark' {
  try {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim()
    const m = bg.match(/^#?([0-9a-fA-F]{6})$/)
    if (m) {
      const n = parseInt(m[1], 16)
      const lum = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)
      return lum > 140 ? 'light' : 'dark'
    }
  } catch { /* fallback abajo */ }
  return 'dark'
}
