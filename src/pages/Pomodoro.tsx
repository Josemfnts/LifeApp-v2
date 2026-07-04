import { useState, useEffect, useRef } from 'react'
import { useToast } from '@/stores/toast'

export default function Pomodoro() {
  const [mode, setMode] = useState<'focus' | 'break'>('focus')
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const toastShow = useToast(s => s.show)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current!)
            const newMode = mode === 'focus' ? 'break' : 'focus'
            setMode(newMode)
            setTimeLeft(newMode === 'focus' ? 25 * 60 : 5 * 60)
            if (mode === 'focus') {
              setSessions(s => s + 1)
              toastShow('🎉 ¡Sesión completada! Tómate un descanso.')
            } else {
              toastShow('⏰ Descanso terminado. ¡A trabajar!')
            }
            return newMode === 'focus' ? 25 * 60 : 5 * 60
          }
          return t - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, mode, toastShow])

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  return (
    <div>
      <div className="page-header">
        <div className="page-module" style={{ color: 'var(--color-red)' }}>Foco</div>
        <div className="page-title">Pomodoro</div>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', marginBottom: 24, marginTop: 20 }}>
          <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle cx="100" cy="100" r="90" fill="none" stroke={running ? (mode === 'focus' ? 'var(--color-red)' : 'var(--color-acc-green)') : 'var(--color-dim)'} strokeWidth="8"
              strokeDasharray={2 * Math.PI * 90}
              strokeDashoffset={2 * Math.PI * 90 * (1 - timeLeft / (mode === 'focus' ? 25 * 60 : 5 * 60))}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.9s linear' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 48, color: 'var(--color-text)', lineHeight: 1 }}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-sub)', marginTop: 4 }}>
              {mode === 'focus' ? 'Enfoque' : 'Descanso'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button onClick={() => setRunning(!running)}
            style={{ padding: '14px 32px', borderRadius: 16, fontSize: 16, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: 'none',
              background: running ? 'rgba(224,95,95,0.12)' : 'var(--color-red)',
              color: running ? 'var(--color-red)' : '#fff',
            }}>
            {running ? '⏸ Pausa' : '▶ Iniciar'}
          </button>
          <button onClick={() => { setRunning(false); setTimeLeft(25 * 60); setMode('focus') }}
            style={{ padding: '14px 24px', borderRadius: 16, fontSize: 16, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid var(--color-border)', background: 'var(--color-s1)', color: 'var(--color-dim)' }}>
            ↺
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', maxWidth: 300 }}>
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Sesiones hoy</div>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 28, color: 'var(--color-red)', lineHeight: 1 }}>{sessions}</div>
          </div>
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Modo</div>
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 28, color: mode === 'focus' ? 'var(--color-red)' : 'var(--color-acc-green)', lineHeight: 1 }}>{mode === 'focus' ? '🎯' : '☕'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
