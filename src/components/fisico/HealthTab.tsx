import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  fetchHealthMetrics, fetchWearableAccounts, saveWearableAccount, deleteWearableAccount,
  requestWearableSync, METRICS, METRIC_ORDER, PROVIDERS,
  type HealthMetricRow, type WearableAccount, type WearableProvider,
} from '@/lib/health'
import { Input, Modal } from '@/components/ui'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/stores/toast'

// Guarda del botón "Actualizar": el conector pasa cada ~5 min y a las APIs no
// oficiales no les gustan los logins en ráfaga — 1 actualización manual / 10 min.
const SYNC_COOLDOWN_MS = 10 * 60 * 1000
// Tras pedir actualizar, re-consultamos datos y estado un rato por si ya entraron.
const POLL_EVERY_MS = 15_000
const POLL_TIMES = 8

const timeAgo = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'ahora mismo'
  if (mins < 60) return `hace ${mins} min`
  const h = Math.round(mins / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.round(h / 24)} d`
}

const STATUS_UI = {
  pending: { label: 'Conectando…', color: 'var(--color-acc-gold)' },
  connected: { label: '✓ Conectado', color: 'var(--color-acc-green)' },
  error: { label: 'Error', color: 'var(--color-red)' },
} as const

// Pestaña Salud de Físico: datos diarios del reloj. El usuario registra su reloj
// (credenciales Garmin/Zepp) en la hoja "Conectar reloj"; el conector del mini PC
// valida y sincroniza a `health_metrics`; aquí solo se lee y se deja la señal de
// "Actualizar" (sync_requested_at).
export function HealthTab() {
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [rows, setRows] = useState<HealthMetricRow[]>([])
  const [accounts, setAccounts] = useState<WearableAccount[]>([])
  const [showSheet, setShowSheet] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState<WearableProvider | null>(null)
  const [lastManualSync, setLastManualSync] = useState(0)
  const [polling, setPolling] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const toast = useToast()

  // Formulario de alta
  const [formProvider, setFormProvider] = useState<WearableProvider | null>(null)
  const [formEmail, setFormEmail] = useState('')
  const [formPass, setFormPass] = useState('')
  const [saving, setSaving] = useState(false)

  const reload = useCallback(async () => {
    const [metrics, accs] = await Promise.all([fetchHealthMetrics(7), fetchWearableAccounts()])
    setRows(metrics)
    setAccounts(accs)
    return accs
  }, [])

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!alive) return
      setHasSession(!!session)
      if (session) await reload()
      if (alive) setChecking(false)
    })
    return () => { alive = false; if (pollRef.current) clearInterval(pollRef.current) }
  }, [reload])

  // Tras "Actualizar" o un alta, re-consulta un rato hasta que el conector conteste.
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    setPolling(true)
    let n = 0
    pollRef.current = setInterval(async () => {
      n += 1
      const accs = await reload()
      const settled = accs.every(a => a.status !== 'pending' && (!a.sync_requested_at || !a.last_sync || a.last_sync >= a.sync_requested_at))
      if (n >= POLL_TIMES || (settled && n > 1)) {
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = null
        setPolling(false)
      }
    }, POLL_EVERY_MS)
  }, [reload])

  if (checking) {
    return <div className="animate-tab" style={{ color: 'var(--color-dim)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>Cargando…</div>
  }

  if (!hasSession) {
    return (
      <div className="animate-tab" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⌚</div>
        <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 20, marginBottom: 8 }}>Salud del reloj</div>
        <div style={{ color: 'var(--color-sub)', fontSize: 13, lineHeight: 1.5, maxWidth: 320, margin: '0 auto 18px' }}>
          Sueño, pasos, frecuencia cardíaca y estrés de tu Garmin o Amazfit, sincronizados automáticamente.
          Esta sección guarda los datos en tu cuenta, así que necesitas iniciar sesión.
        </div>
        <button onClick={() => window.dispatchEvent(new CustomEvent('show-login'))} className="btn-primary" style={{ background: 'var(--color-red)' }}>Iniciar sesión</button>
      </div>
    )
  }

  const connected = accounts.filter(a => a.status === 'connected')

  const onManualSync = async () => {
    if (Date.now() - lastManualSync < SYNC_COOLDOWN_MS) {
      toast.show('Espera unos minutos entre actualizaciones')
      return
    }
    const err = await requestWearableSync()
    if (err) { toast.show('No se pudo pedir la actualización'); return }
    setLastManualSync(Date.now())
    toast.show('Actualizando… los datos llegarán en unos minutos')
    startPolling()
  }

  const onSaveAccount = async () => {
    if (!formProvider || !formEmail.trim() || !formPass) { toast.show('Rellena email y contraseña'); return }
    setSaving(true)
    const err = await saveWearableAccount(formProvider, formEmail.trim(), formPass)
    setSaving(false)
    if (err) { toast.show('No se pudo guardar: ' + err); return }
    setFormProvider(null); setFormEmail(''); setFormPass('')
    toast.show('Reloj registrado — comprobando la conexión…')
    await reload()
    startPolling()
  }

  const onDisconnect = async (provider: WearableProvider) => {
    const err = await deleteWearableAccount(provider)
    if (err) { toast.show('No se pudo desconectar: ' + err); return }
    toast.show('Reloj desconectado')
    await reload()
  }

  // Agrupar métricas por día (vienen ordenadas desc), solo las conocidas
  const byDate = new Map<string, HealthMetricRow[]>()
  for (const r of rows) {
    if (!METRICS[r.metric]) continue
    const list = byDate.get(r.date) ?? []
    list.push(r)
    byDate.set(r.date, list)
  }
  const dates = [...byDate.keys()]
  const latest = dates[0]
  const sortMetrics = (list: HealthMetricRow[]) =>
    [...list].sort((a, b) => METRIC_ORDER.indexOf(a.metric) - METRIC_ORDER.indexOf(b.metric))

  const fmtDay = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="animate-tab">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-sub)', minWidth: 0 }}>
          {latest ? `Último día con datos: ${fmtDay(latest)}` : 'Datos de tu reloj'}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {connected.length > 0 && (
            <button onClick={onManualSync} disabled={polling} aria-label="Actualizar ahora"
              style={{
                padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'DM Sans,sans-serif', border: '1px solid var(--color-border2)',
                background: 'var(--color-s1)', color: polling ? 'var(--color-dim)' : 'var(--color-sub)',
              }}
            >{polling ? '⟳ Sincronizando…' : '⟳ Actualizar'}</button>
          )}
          <button onClick={() => setShowSheet(true)}
            style={{
              padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'DM Sans,sans-serif', border: '1px solid var(--color-red)4d',
              background: 'var(--color-red)26', color: 'var(--color-red)', whiteSpace: 'nowrap',
            }}
          >⌚ {accounts.length > 0 ? 'Mis relojes' : 'Conectar reloj'}</button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px 20px', border: '1px dashed var(--color-border2)', borderRadius: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>😴👣❤️</div>
          <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 18, marginBottom: 6 }}>
            {accounts.length === 0 ? 'Aún no hay datos de salud' : 'Esperando la primera sincronización'}
          </div>
          <div style={{ color: 'var(--color-sub)', fontSize: 13, lineHeight: 1.5, maxWidth: 320, margin: '0 auto' }}>
            {accounts.length === 0
              ? 'Conecta tu reloj con la cuenta de Garmin o Zepp y aquí verás cada día tu sueño, pasos, frecuencia cardíaca y estrés, sin hacer nada.'
              : 'Tu reloj ya está registrado. Los datos aparecerán tras la próxima pasada de sincronización (unos minutos).'}
          </div>
        </div>
      ) : (
        <>
          {/* Tarjetas del último día */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {sortMetrics(byDate.get(latest!)!).map(r => {
              const m = METRICS[r.metric]
              return (
                <div key={r.metric} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-dim)', marginBottom: 4 }}>{m.icon} {m.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: m.color, fontFamily: 'DM Sans,sans-serif' }}>{m.format(r.value)}</div>
                </div>
              )
            })}
          </div>

          {/* Días anteriores, compactos */}
          {dates.slice(1).map(d => (
            <div key={d} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-dim)', marginBottom: 6, textTransform: 'capitalize' }}>{fmtDay(d)}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {sortMetrics(byDate.get(d)!).map(r => {
                  const m = METRICS[r.metric]
                  return (
                    <span key={r.metric} style={{
                      fontSize: 12, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap',
                      background: 'var(--color-s1)', border: '1px solid var(--color-border)', color: 'var(--color-sub)',
                    }}>{m.icon} {m.format(r.value)}</span>
                  )
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Hoja "Conectar reloj / Mis relojes" ── */}
      <Modal open={showSheet} onClose={() => { setShowSheet(false); setFormProvider(null) }} title={accounts.length > 0 ? 'Mis relojes' : 'Conectar reloj'}>
        <div style={{ padding: '0 20px 8px' }}>
          {/* Relojes registrados */}
          {accounts.map(a => {
            const p = PROVIDERS[a.provider]
            const st = STATUS_UI[a.status]
            return (
              <div key={a.provider} style={{ background: 'var(--color-s2)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{p.icon} {p.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.email}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: st.color, whiteSpace: 'nowrap' }}>{st.label}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--color-dim)' }}>
                    {a.status === 'error' && a.error ? a.error : a.last_sync ? `Sincronizado ${timeAgo(a.last_sync)}` : 'Aún sin sincronizar'}
                  </span>
                  <button onClick={() => setConfirmDisconnect(a.provider)}
                    style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-red)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  >Desconectar</button>
                </div>
              </div>
            )
          })}

          {/* Alta: elegir proveedor */}
          {!formProvider ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-dim)', margin: '14px 0 8px' }}>
                {accounts.length > 0 ? 'Añadir otro reloj' : '¿Qué reloj tienes?'}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PROVIDERS) as WearableProvider[]).map(k => (
                  <button key={k} onClick={() => { setFormProvider(k); setFormEmail(''); setFormPass('') }}
                    disabled={accounts.some(a => a.provider === k)}
                    style={{
                      padding: '14px 8px', borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'DM Sans,sans-serif', border: '1px solid var(--color-border2)',
                      background: 'var(--color-s2)', color: 'var(--color-text)',
                      opacity: accounts.some(a => a.provider === k) ? 0.4 : 1,
                    }}
                  >{PROVIDERS[k].icon} {PROVIDERS[k].label}</button>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--color-dim)', lineHeight: 1.5, marginTop: 12 }}>
                La sincronización usa tu cuenta del fabricante y puede tardar unos minutos por pasada.
                Los datos entran solos cada mañana; con ⟳ Actualizar fuerzas una pasada extra.
              </div>
            </>
          ) : (
            /* Alta: credenciales del proveedor */
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{PROVIDERS[formProvider].icon} {PROVIDERS[formProvider].label}</div>
              <div style={{ fontSize: 12, color: 'var(--color-sub)', marginBottom: 12 }}>{PROVIDERS[formProvider].hint}</div>
              <div style={{ display: 'grid', gap: 8 }}>
                <Input type="email" placeholder="Email de la cuenta" value={formEmail} onChange={setFormEmail} />
                <Input type="password" placeholder="Contraseña de la cuenta" value={formPass} onChange={setFormPass} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                <button onClick={() => setFormProvider(null)} className="btn-ghost" style={{ width: '100%', minWidth: 0 }}>Atrás</button>
                <button onClick={onSaveAccount} disabled={saving} className="btn-primary" style={{ width: '100%', minWidth: 0, background: 'var(--color-red)' }}>
                  {saving ? 'Guardando…' : 'Conectar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDisconnect !== null}
        title="Desconectar reloj"
        message="Se borrarán las credenciales guardadas y dejará de sincronizar. Los datos de salud ya descargados se conservan."
        confirmLabel="Desconectar"
        danger
        onConfirm={() => { if (confirmDisconnect) onDisconnect(confirmDisconnect) }}
        onClose={() => setConfirmDisconnect(null)}
      />
    </div>
  )
}
