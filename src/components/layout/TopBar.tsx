import { useState } from 'react'
import { getGreeting, formatDateSpanish } from '@/lib/dates'
import { getDisplayName, setDisplayName } from '@/lib/storage'
import { useXP } from '@/contexts/XPContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/stores/toast'
import { getGlobalLevel, calcCombinedStreak } from '@/lib/xp-engine'

const ALL_KEYS = [
  'josema_rpg_time_v4','josema_rpg_rec_v4',
  'lifeos_agenda_pending_v1','lifeos_agenda_shifts_v1',
  'josema_rpg_nutri_log','josema_rpg_nutri_goals','josema_rpg_foods','josema_rpg_nutri_recipes',
  'lifeos_nutri_body_v1','lifeos_nutri_menu_v1','lifeos_nutri_menu_plans_v1',
  'josema_rpg_xp_v1','josema_rpg_missions_v1',
  'lifeos_sessions_v1','lifeos_routines_v1','lifeos_exercises_v1','lifeos_prs_v1','lifeos_active_v1',
  'lifeos_finances_tx_v1','lifeos_finances_huchas_v1','lifeos_finances_pufos_v1',
  'lifeos_habits_v1','lifeos_habits_log_v1',
]

export function TopBar() {
  const { xp } = useXP()
  const { theme, toggle: toggleTheme } = useTheme()
  const toast = useToast()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [name, setName] = useState(getDisplayName())
  const greeting = getGreeting()
  const now = new Date()
  const dateStr = formatDateSpanish(now)
  const streak = calcCombinedStreak(xp)
  const lv = getGlobalLevel(xp)
  const grandTotal = Object.values(xp).reduce((s, a) => s + a.total, 0)
  const [storageInfo, setStorageInfo] = useState('')

  function calcStorage() {
    const labels: Record<string, string> = {
      'josema_rpg_time_v4': 'Agenda (tareas)',
      'josema_rpg_nutri_log': 'Nutrición (diario)',
      'lifeos_sessions_v1': 'Físico (sesiones)',
      'lifeos_finances_tx_v1': 'Finanzas',
      'lifeos_habits_v1': 'Hábitos',
      'lifeos_nutri_body_v1': 'Peso y composición',
    }
    const lines: string[] = []
    let total = 0
    Object.entries(labels).forEach(([k, label]) => {
      const v = localStorage.getItem(k)
      if (v) {
        let n = 1
        try { const p = JSON.parse(v); n = Array.isArray(p) ? p.length : Object.keys(p).length } catch {}
        total += v.length
        lines.push(`<span style="color:var(--color-text);font-weight:600">${n}</span> ${label}`)
      }
    })
    return lines.join('<br>') + '<br><br><span style="color:var(--color-dim)">~' + (total / 1024).toFixed(1) + ' KB</span>'
  }

  function handleSaveName() {
    setDisplayName(name)
    toast.show('✓ Nombre actualizado')
    setSettingsOpen(false)
  }

  function exportBackup() {
    const backup: { version: number; date: string; data: Record<string, unknown> } = { version: 1, date: new Date().toISOString(), data: {} }
    ALL_KEYS.forEach(k => { const v = localStorage.getItem(k); if (v) backup.data[k] = JSON.parse(v) })
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'lifeos-backup-' + new Date().toISOString().slice(0, 10) + '.json'
    a.click()
    URL.revokeObjectURL(a.href)
    toast.show('✓ Backup exportado')
  }

  function importBackup(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const backup = JSON.parse(e.target?.result as string) as { data?: Record<string, unknown> }
        if (!backup.data) { toast.show('❌ Archivo no válido'); return }
        Object.entries(backup.data).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)))
        toast.show('✓ Datos restaurados. Recargando...')
        setTimeout(() => window.location.reload(), 1200)
      } catch { toast.show('❌ Error al leer el archivo') }
    }
    reader.readAsText(file)
  }

  function clearAllData() {
    if (!confirm('¿Seguro? Se borrarán TODOS los datos de la app.')) return
    ALL_KEYS.forEach(k => localStorage.removeItem(k))
    localStorage.removeItem('lifeos_username_v1')
    setSettingsOpen(false)
    toast.show('Datos borrados. Recargando...')
    setTimeout(() => window.location.reload(), 1200)
  }

  return (
    <>
      <div className="page-header">
        <div className="greeting">{greeting}</div>
        <div className="greeting-name"><em>{getDisplayName()}</em></div>

        <div className="streak-row">
          <span style={{ fontSize: 16 }}>🔥</span>
          <span style={{ fontFamily: 'DM Serif Display,serif', fontSize: 16, color: '#c9a84c' }}>{streak}</span>
          <span style={{ fontSize: 11, color: 'var(--color-dim)', fontWeight: 600 }}>días de racha</span>
        </div>

        <div className="top-meta">
          <div className="date-chip">{dateStr}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="gear-btn" onClick={() => { setSettingsOpen(true); setStorageInfo(calcStorage()) }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <div className="level-pill">
              <div className="level-dot">{lv.level}</div>
              <div>
                <div className="level-text">Nivel {lv.level}</div>
                <div className="level-xp">{grandTotal} XP totales</div>
              </div>
            </div>
          </div>
        </div>

        <div className="xp-strip">
          <div className="xp-strip-fill" style={{ width: `${lv.pct}%` }} />
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSettingsOpen(false) }}>
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>Configuración</div>
                <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 22, marginTop: 2 }}>Ajustes</div>
              </div>
              <button onClick={() => setSettingsOpen(false)} className="gear-btn">✕</button>
            </div>

            <div style={{ margin: '16px 20px 0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>Perfil</div>
              <div style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 13, color: 'var(--color-sub)', marginBottom: 8 }}>Tu nombre en la app</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={name} onChange={e => setName(e.target.value)} type="text" className="inp" style={{ flex: 1, marginBottom: 0, fontSize: 15, fontWeight: 600 }} placeholder="Tu nombre..." />
                  <button onClick={handleSaveName} style={{ padding: '0 16px', borderRadius: 10, background: 'rgba(91,138,240,0.12)', color: 'var(--color-acc-blue)', border: '1px solid rgba(91,138,240,0.2)', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' }}>Guardar</button>
                </div>
              </div>
            </div>

            <div style={{ margin: '16px 20px 0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>Apariencia</div>
              <div style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Tema {theme === 'dark' ? 'oscuro' : 'claro'}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-sub)' }}>Alternar entre tema oscuro y claro</div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    style={{
                      width: 56, height: 28, borderRadius: 99, position: 'relative',
                      background: theme === 'dark' ? 'var(--color-acc-blue)' : 'var(--color-border2)',
                      border: 'none', cursor: 'pointer', transition: 'background 0.2s'
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 2,
                      width: 24, height: 24, borderRadius: '50%', background: 'white',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'transform 0.2s',
                      transform: theme === 'dark' ? 'translateX(28px)' : 'translateX(2px)'
                    }} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ margin: '16px 20px 0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>Datos</div>
              <div style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>Exportar copia de seguridad</div>
                <div style={{ fontSize: 12, color: 'var(--color-sub)', marginBottom: 12 }}>Descarga un archivo .json con todos tus datos</div>
                <button onClick={exportBackup} className="btn-ghost" style={{ background: 'rgba(91,138,240,0.1)', color: 'var(--color-acc-blue)', border: '1px solid rgba(91,138,240,0.2)', padding: 11, fontSize: 14, fontWeight: 600, borderRadius: 10, cursor: 'pointer', width: '100%' }}>📤 Exportar datos</button>
              </div>
              <div style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>Restaurar copia de seguridad</div>
                <div style={{ fontSize: 12, color: 'var(--color-sub)', marginBottom: 12 }}>Carga un backup .json para recuperar tus datos</div>
                <label style={{ display: 'block', width: '100%', background: 'rgba(82,183,136,0.1)', color: 'var(--color-acc-green)', border: '1px solid rgba(82,183,136,0.2)', fontFamily: 'DM Sans,sans-serif', fontSize: 14, fontWeight: 600, padding: 11, borderRadius: 10, cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box' }}>
                  📥 Importar backup
                  <input type="file" accept=".json" onChange={e => { const f = e.target.files?.[0]; if (f) importBackup(f) }} style={{ display: 'none' }} />
                </label>
              </div>
              <div style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 10 }}>Almacenamiento</div>
                <div style={{ fontSize: 12, color: 'var(--color-sub)', lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: storageInfo }} />
              </div>
            </div>

            <div style={{ margin: '16px 20px 0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-red)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>Zona de peligro</div>
              <div style={{ background: 'rgba(224,95,95,0.05)', border: '1px solid rgba(224,95,95,0.15)', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>Borrar todos los datos</div>
                <div style={{ fontSize: 12, color: 'var(--color-sub)', marginBottom: 12 }}>Esta acción es irreversible.</div>
                <button onClick={clearAllData} style={{ width: '100%', background: 'rgba(224,95,95,0.1)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.2)', fontFamily: 'DM Sans,sans-serif', fontSize: 14, fontWeight: 600, padding: 11, borderRadius: 10, cursor: 'pointer' }}>🗑 Borrar todo</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
