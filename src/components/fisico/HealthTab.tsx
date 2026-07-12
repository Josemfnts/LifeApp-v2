import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchHealthMetrics, METRICS, METRIC_ORDER, type HealthMetricRow } from '@/lib/health'
import { Modal } from '@/components/ui'

// Pestaña Salud de Físico: pinta los datos diarios del reloj que el agregador
// (Terra/Vital) empuja a `health_metrics`. Mientras la conexión no esté configurada
// (faltan credenciales del agregador + Edge Function), el botón "Conectar reloj"
// explica el estado en vez de abrir el widget del agregador.
export function HealthTab() {
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [rows, setRows] = useState<HealthMetricRow[]>([])
  const [showConnect, setShowConnect] = useState(false)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!alive) return
      setHasSession(!!session)
      if (session) {
        const data = await fetchHealthMetrics(7)
        if (!alive) return
        setRows(data)
      }
      setChecking(false)
    })
    return () => { alive = false }
  }, [])

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

  // Agrupar por día (vienen ordenadas desc) y quedarnos con las métricas conocidas
  const byDate = new Map<string, HealthMetricRow[]>()
  for (const r of rows) {
    if (!METRICS[r.metric]) continue
    const list = byDate.get(r.date) ?? []
    list.push(r)
    byDate.set(r.date, list)
  }
  const dates = [...byDate.keys()]
  const latest = dates[0]
  const latestRows = latest ? [...byDate.get(latest)!].sort((a, b) => METRIC_ORDER.indexOf(a.metric) - METRIC_ORDER.indexOf(b.metric)) : []

  const fmtDay = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="animate-tab">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-sub)' }}>
          {latest ? `Último día con datos: ${fmtDay(latest)}` : 'Datos de tu reloj'}
        </div>
        <button onClick={() => setShowConnect(true)}
          style={{
            padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'DM Sans,sans-serif', border: '1px solid var(--color-red)4d',
            background: 'var(--color-red)26', color: 'var(--color-red)', whiteSpace: 'nowrap',
          }}
        >⌚ Conectar reloj</button>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px 20px', border: '1px dashed var(--color-border2)', borderRadius: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>😴👣❤️</div>
          <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 18, marginBottom: 6 }}>Aún no hay datos de salud</div>
          <div style={{ color: 'var(--color-sub)', fontSize: 13, lineHeight: 1.5, maxWidth: 320, margin: '0 auto' }}>
            Cuando conectes tu reloj, aquí verás cada día tu sueño, pasos, frecuencia cardíaca en reposo y estrés, sin hacer nada.
          </div>
        </div>
      ) : (
        <>
          {/* Tarjetas del último día */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {latestRows.map(r => {
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
                {[...byDate.get(d)!].sort((a, b) => METRIC_ORDER.indexOf(a.metric) - METRIC_ORDER.indexOf(b.metric)).map(r => {
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

      <Modal open={showConnect} onClose={() => setShowConnect(false)} title="Conectar reloj">
        <div style={{ padding: '0 20px 8px', color: 'var(--color-sub)', fontSize: 13, lineHeight: 1.6 }}>
          <p style={{ marginBottom: 10 }}>
            La sincronización automática con <b style={{ color: 'var(--color-text)' }}>Garmin</b> y{' '}
            <b style={{ color: 'var(--color-text)' }}>Amazfit</b> se hace a través de un agregador de salud
            (Terra/Vital), que empuja sueño, pasos, frecuencia cardíaca y estrés a tu cuenta cada día.
          </p>
          <p style={{ marginBottom: 10 }}>
            <b style={{ color: 'var(--color-acc-gold)' }}>Estado: pendiente de configurar.</b> Falta dar de alta
            la cuenta del agregador y activar la conexión en el servidor. Cuando esté, este botón abrirá la
            pantalla para vincular tu reloj con un toque.
          </p>
          <p style={{ marginBottom: 4 }}>
            Mientras tanto puedes importar entrenos sueltos con <b style={{ color: 'var(--color-text)' }}>“Importar
            actividad”</b> (fichero GPX/TCX) en la pestaña Running.
          </p>
        </div>
      </Modal>
    </div>
  )
}
