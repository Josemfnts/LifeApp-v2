import { useState } from 'react'
import { useHabits } from '@/hooks/useHabits'
import { useToast } from '@/stores/toast'
import { WeeklyStrip } from '@/components/habits/WeeklyStrip'
import { HabitTodayCard } from '@/components/habits/HabitTodayCard'
import { HabitForm } from '@/components/habits/HabitForm'
import { HabitStats } from '@/components/habits/HabitStats'

export default function Habitos() {
  const { habits, log, getLogValue, activeToday, doneToday, pctToday, today, addHabit, removeHabit, setLogValue } = useHabits()
  const toast = useToast()
  const [tab, setTab] = useState<'today' | 'manage' | 'stats'>('today')

  const todayDate = new Date()
  const dateLabel = ['D','L','M','X','J','V','S'][todayDate.getDay()]+' '+todayDate.getDate()+' '+['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][todayDate.getMonth()]

  function handleToggle(id: number) { const cur = getLogValue(today, id); setLogValue(today, id, cur ? 0 : 1); toast.show(cur ? 'Hábito desmarcado' : '✓ Hábito completado') }
  function handleIncrement(id: number, d: number) { const cur = getLogValue(today, id); setLogValue(today, id, Math.max(0, cur + d)) }
  function handleSetFull(id: number) { const cur = getLogValue(today, id); const h = habits.find(h => h.id === id); const g = h?.goal || 1; setLogValue(today, id, cur >= g ? 0 : g); toast.show(cur >= g ? 'Hábito desmarcado' : '✓ Hábito completado') }

  return (
    <div>
      <div className="page-header">
        <div className="page-module" style={{ color: 'var(--color-acc-purple)' }}>Hábitos</div>
        <div className="page-title">Mis hábitos</div>
        <div className="tab-bar">
          {([
            { k: 'today' as const, l: 'Hoy' },
            { k: 'manage' as const, l: 'Gestionar' },
            { k: 'stats' as const, l: 'Estadísticas' },
          ]).map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} className={`tab-btn${tab === t.k ? ' active' : ''}`}>
              {t.l}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: 16 }}>
        {tab === 'today' && (
          <>
            <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div className="sec-label" style={{ marginBottom: 4 }}>Progreso de hoy</div>
                  <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 28, lineHeight: 1 }}>
                    <span style={{ color: 'var(--color-acc-purple)' }}>{doneToday}</span>
                    <span style={{ fontSize: 16, color: 'var(--color-sub)' }}> / {activeToday.length}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 36, color: 'var(--color-acc-purple)', lineHeight: 1 }}>{pctToday}%</div>
                  <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 2 }}>{dateLabel}</div>
                </div>
              </div>
              <div className="pbar-track">
                <div className="pbar-fill" style={{ width: `${pctToday}%`, background: 'linear-gradient(90deg,var(--color-acc-purple),#c9a84c)' }} />
              </div>
            </div>
            {habits.length > 0 && <WeeklyStrip habits={habits} getLogValue={getLogValue} />}
            {activeToday.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-sub)', marginBottom: 6 }}>Sin hábitos todavía</div>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>Ve a <strong style={{ color: 'var(--color-acc-purple)' }}>Gestionar</strong><br />y crea tu primer hábito</div>
              </div>
            ) : (
              activeToday.map(h => (
                <HabitTodayCard key={h.id} habit={h} val={getLogValue(today, h.id)} log={log}
                  onToggle={handleToggle} onIncrement={handleIncrement} onSetFull={handleSetFull} />
              ))
            )}
          </>
        )}
        {tab === 'manage' && (
          <>
            <HabitForm onAdd={h => { addHabit(h); toast.show('✓ Hábito creado') }} />
            <div className="sec-label">Mis hábitos</div>
            {habits.length === 0 ? (
              <div className="empty-state">Sin hábitos todavía.<br />Crea el primero arriba.</div>
            ) : (
              habits.map(h => {
                const fl = { daily: 'Todos los días', weekdays: 'L–V', weekend: 'S–D', custom: 'Personalizado' }[h.freq] || h.freq
                return (
                  <div key={h.id} className="card" style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: h.color + '18', border: '1px solid ' + h.color + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{h.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{h.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-dim)', marginTop: 2 }}>{fl} · {h.type === 'count' ? `Meta: ${h.goal} ${h.unit}` : 'Sí/No'}{h.note ? ' · ' + h.note : ''}</div>
                      </div>
                      <button onClick={() => { removeHabit(h.id); toast.show('Hábito eliminado') }}
                        style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}
        {tab === 'stats' && <HabitStats habits={habits} log={log} />}
      </div>
    </div>
  )
}
