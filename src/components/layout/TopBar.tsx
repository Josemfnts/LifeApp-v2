import { useState } from 'react'
import { getGreeting, formatDateSpanish } from '@/lib/dates'
import { getDisplayName, setDisplayName } from '@/lib/storage'
import { useXP } from '@/contexts/XPContext'
import { useTheme, THEME_LABELS, type Theme } from '@/contexts/ThemeContext'
import { useToast } from '@/stores/toast'
import { getGlobalLevel, calcCombinedStreak } from '@/lib/xp-engine'
import { supabase, signOut } from '@/lib/supabase'
import { requestPermission } from '@/lib/notifications'
import { ALL_STORAGE_KEYS, STORAGE_LABELS } from '@/lib/storageKeys'

export function TopBar() {
  const { xp } = useXP()
  const { theme, set: setTheme } = useTheme()
  const toast = useToast()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [name, setName] = useState(getDisplayName())
  const [session, setSession] = useState<{ user: { email?: string } } | null>(null)
  const greeting = getGreeting()
  const now = new Date()
  const dateStr = formatDateSpanish(now)
  const streak = calcCombinedStreak(xp)
  const lv = getGlobalLevel(xp)
  const grandTotal = Object.values(xp).reduce((s, a) => s + a.total, 0)
  const [storageInfo, setStorageInfo] = useState<{ n: number; label: string }[]>([])
  const [storageTotalKb, setStorageTotalKb] = useState(0)

  function calcStorage(): { lines: { n: number; label: string }[]; totalKb: number } {
    const lines: { n: number; label: string }[] = []
    let total = 0
    Object.entries(STORAGE_LABELS).forEach(([k, label]) => {
      const v = localStorage.getItem(k)
      if (v) {
        let n = 1
        try { const p = JSON.parse(v); n = Array.isArray(p) ? p.length : Object.keys(p).length } catch {}
        total += v.length
        lines.push({ n, label })
      }
    })
    return { lines, totalKb: total / 1024 }
  }

  function handleSaveName() {
    setDisplayName(name)
    toast.show('✓ Nombre actualizado')
    setSettingsOpen(false)
  }

  function exportBackup() {
    const backup: { version: number; date: string; data: Record<string, unknown> } = { version: 1, date: new Date().toISOString(), data: {} }
    ALL_STORAGE_KEYS.forEach(k => { const v = localStorage.getItem(k); if (v) backup.data[k] = JSON.parse(v) })
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
    ALL_STORAGE_KEYS.forEach(k => localStorage.removeItem(k))
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
          <span style={{ fontFamily: 'DM Serif Display,serif', fontSize: 16, color: 'var(--color-acc-gold)' }}>{streak}</span>
          <span style={{ fontSize: 11, color: 'var(--color-dim)', fontWeight: 600 }}>días de racha</span>
        </div>

        <div className="top-meta">
          <div className="date-chip">{dateStr}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="gear-btn" onClick={async () => {
              setSettingsOpen(true)
              const info = calcStorage()
              setStorageInfo(info.lines)
              setStorageTotalKb(info.totalKb)
              const { data } = await supabase.auth.getSession()
              setSession(data.session)
            }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(Object.entries(THEME_LABELS) as [Theme, { name: string; icon: string; desc: string }][]).map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => setTheme(key)}
                    style={{
                      background: theme === key ? 'var(--color-s2)' : 'var(--color-s1)',
                      border: theme === key ? '1px solid var(--color-acc-blue)' : '1px solid var(--color-border)',
                      borderRadius: 14, padding: 14,
                      display: 'flex', alignItems: 'center', gap: 12,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    <span style={{ fontSize: 28 }}>{t.icon}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-sub)' }}>{t.desc}</div>
                    </div>
                    {theme === key && <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', background: 'var(--color-acc-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff' }}>✓</div>}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ margin: '16px 20px 0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>Cuenta</div>
              <div style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14 }}>
                {session ? (
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--color-sub)', marginBottom: 4 }}>Conectado como</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>{session.user.email}</div>
                    <button onClick={async () => { await signOut(); window.location.reload() }}
                      style={{ width: '100%', background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', fontFamily: 'DM Sans,sans-serif', fontSize: 14, fontWeight: 600, padding: 11, borderRadius: 10, cursor: 'pointer' }}>Cerrar sesión</button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: 'var(--color-sub)', marginBottom: 10 }}>Sincroniza tus datos en la nube</div>
                    <button onClick={() => { setSettingsOpen(false); window.dispatchEvent(new CustomEvent('show-login')) }}
                      style={{ width: '100%', background: 'rgba(91,138,240,0.12)', color: 'var(--color-acc-blue)', border: '1px solid rgba(91,138,240,0.2)', fontFamily: 'DM Sans,sans-serif', fontSize: 14, fontWeight: 600, padding: 11, borderRadius: 10, cursor: 'pointer' }}>🔐 Iniciar sesión</button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ margin: '16px 20px 0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>Notificaciones</div>
              <div style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>Recordatorios diarios</div>
                <div style={{ fontSize: 12, color: 'var(--color-sub)', marginBottom: 12 }}>Recibe avisos de hábitos y tareas pendientes</div>
                {[
                  { key: 'lifeos_notif_habits', label: 'Hábitos pendientes' },
                  { key: 'lifeos_notif_agenda', label: 'Tareas del día' },
                ].map(n => {
                  const enabled = localStorage.getItem(n.key) === 'true'
                  return (
                    <div key={n.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--color-sub)' }}>{n.label}</span>
                      <button
                        onClick={async () => {
                          if (!enabled) {
                            const ok = await requestPermission()
                            if (!ok) { toast.show('Permiso denegado'); return }
                          }
                          localStorage.setItem(n.key, String(!enabled))
                          toast.show(enabled ? 'Notificación desactivada' : '✓ Notificación activada')
                        }}
                        style={{
                          width: 48, height: 26, borderRadius: 99, position: 'relative',
                          background: enabled ? 'var(--color-acc-blue)' : 'var(--color-border2)',
                          border: 'none', cursor: 'pointer', transition: 'background 0.2s',
                        }}>
                        <div style={{ position: 'absolute', top: 2, width: 22, height: 22, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s', transform: enabled ? 'translateX(24px)' : 'translateX(2px)' }} />
                      </button>
                    </div>
                  )
                })}
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
                <div style={{ fontSize: 12, color: 'var(--color-sub)', lineHeight: 1.8 }}>
                  {storageInfo.map((item, i) => (
                    <div key={i}><span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{item.n}</span> {item.label}</div>
                  ))}
                  <div style={{ color: 'var(--color-dim)', marginTop: 8 }}>~{storageTotalKb.toFixed(1)} KB</div>
                </div>
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
