// Estado del "chrome" (cabecera y barra inferior) según el scroll del contenido.
// En reposo orienta; al bajar se compacta la cabecera y se esconde la barra; al subir, arriba del
// todo o al final de la página vuelve. Puro para poder probarlo: el Shell lo aplica con data-atributos.

export interface ChromeState {
  collapsed: boolean
  navHidden: boolean
  lastTop: number
  anchor: number // posición donde cambió la dirección por última vez
  dir: -1 | 0 | 1
}

export const INITIAL_CHROME: ChromeState = { collapsed: false, navHidden: false, lastTop: 0, anchor: 0, dir: 0 }

export const CHROME_OPTS = {
  collapseAt: 48, // compacta la cabecera a partir de aquí…
  expandAt: 16, // …y solo la expande por debajo de esto (histéresis > lo que encoge la cabecera)
  hideAfter: 120, // cerca de arriba la barra siempre se ve
  threshold: 24, // px seguidos en una dirección antes de esconder o mostrar (ignora temblores)
  minScrollable: 160, // páginas cortas: ni se compacta ni se esconde nada
}

export function nextChrome(prev: ChromeState, scrollTop: number, maxTop: number, o = CHROME_OPTS): ChromeState {
  const t = Math.max(0, Math.min(scrollTop, Math.max(0, maxTop)))
  // Página corta: no se entra en modo compacto, pero si ya lo está no se fuerza a expandir salvo arriba
  // del todo. Compactar la cabecera acorta la página; expandirla por eso la alargaría otra vez → parpadeo.
  if (maxTop < o.minScrollable) {
    return { collapsed: prev.collapsed && t > o.expandAt, navHidden: false, lastTop: t, anchor: t, dir: 0 }
  }

  const d: -1 | 0 | 1 = t > prev.lastTop ? 1 : t < prev.lastTop ? -1 : 0
  let { anchor, dir } = prev
  if (d !== 0 && d !== prev.dir) {
    anchor = prev.lastTop
    dir = d
  }

  const collapsed = prev.collapsed ? t > o.expandAt : t > o.collapseAt

  let navHidden = prev.navHidden
  if (t <= o.hideAfter || t >= maxTop - 4) navHidden = false
  else if (dir === 1 && t - anchor >= o.threshold) navHidden = true
  else if (dir === -1 && anchor - t >= o.threshold) navHidden = false

  return { collapsed, navHidden, lastTop: t, anchor, dir }
}
