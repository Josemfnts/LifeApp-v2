import { useState } from 'react'
import { useHabits, isHabitDone } from '@/hooks/useHabits'
import { useToast } from '@/stores/toast'
import { WeeklyStrip } from '@/components/habits/WeeklyStrip'
import { HabitTodayCard } from '@/components/habits/HabitTodayCard'
import { HabitForm } from '@/components/habits/HabitForm'
import { HabitStats } from '@/components/habits/HabitStats'
import { ProgressBar } from '@/components/ui'

export default function Habitos() {
  const {
    habits, log, getLogValue, activeToday, doneToday, pctToday, today,
    addHabit, removeHabit, setLogValue,
  } = useHabits()

  const toast = useToast()
  const [tab, setTab] = useState<'today' | 'manage' | 'stats'>('today')

  const todayDate = new Date()
  const dateLabel = ['D', 'L', 'M', 'X', 'J', 'V', 'S'][todayDate.getDay()] +
    ' ' + todayDate.getDate() +
    ' ' + ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][todayDate.getMonth()]

  function handleToggle(id: number) {
    const cur = getLogValue(today, id)
    setLogValue(today, id, cur ? 0 : 1)
    toast.show(cur ? 'Hábito desmarcado' : '✓ Hábito completado')
  }

  function handleIncrement(id: number, delta: number) {
    const cur = getLogValue(today, id)
    setLogValue(today, id, Math.max(0, cur + delta))
  }

  function handleSetFull(id: number) {
    const cur = getLogValue(today, id)
    const h = habits.find(h => h.id === id)
    const goal = h?.goal || 1
    setLogValue(today, id, cur >= goal ? 0 : goal)
    toast.show(cur >= goal ? 'Hábito desmarcado' : '✓ Hábito completado')
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-module" style={{ color: 'var(--color-acc-purple)' }}>Hábitos</div>
        <div className="page-title">Mis hábitos</div>
        <div className="flex mt-0.5">
          {(['today', 'manage', 'stats'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-[13px] font-medium text-center cursor-pointer border-b-2 transition-all bg-transparent font-sans whitespace-nowrap ${
                tab === t ? 'text-[#9b7fe0] border-[#9b7fe0]' : 'text-[var(--color-dim)] border-transparent'
              }`}
            >
              {t === 'today' ? 'Hoy' : t === 'manage' ? 'Gestionar' : 'Estadísticas'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {tab === 'today' && (
          <>
            <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-1">Progreso de hoy</div>
                  <div className="font-serif text-[28px] leading-none">
                    <span className="text-[#9b7fe0]">{doneToday}</span>
                    <span className="text-base text-[var(--color-sub)]"> / {activeToday.length}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-serif text-[36px] text-[#9b7fe0] leading-none">{pctToday}%</div>
                  <div className="text-[11px] text-[var(--color-dim)] mt-0.5">{dateLabel}</div>
                </div>
              </div>
              <ProgressBar value={pctToday} color="gradient" height={6} animated />
            </div>

            {habits.length > 0 && (
              <WeeklyStrip habits={habits} getLogValue={getLogValue} />
            )}

            {activeToday.length === 0 ? (
              <div className="text-center py-12 text-[var(--color-dim)]">
                <div className="text-[40px] mb-3">✨</div>
                <div className="text-base font-semibold text-[var(--color-sub)] mb-1.5">Sin hábitos todavía</div>
                <div className="text-[13px] leading-relaxed">
                  Ve a <strong className="text-[#9b7fe0]">Gestionar</strong><br />y crea tu primer hábito
                </div>
              </div>
            ) : (
              activeToday.map(h => {
                const val = getLogValue(today, h.id)
                return (
                  <HabitTodayCard
                    key={h.id}
                    habit={h}
                    val={val}
                    log={log}
                    onToggle={handleToggle}
                    onIncrement={handleIncrement}
                    onSetFull={handleSetFull}
                  />
                )
              })
            )}
          </>
        )}

        {tab === 'manage' && (
          <>
            <HabitForm onAdd={h => { addHabit(h); toast.show('✓ Hábito creado') }} />

            <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-3">Mis hábitos</div>
            {habits.length === 0 ? (
              <div className="text-center py-12 text-[var(--color-dim)] text-[13px]">
                Sin hábitos todavía.<br />Crea el primero arriba.
              </div>
            ) : (
              habits.map(h => {
                const freqLabel = { daily: 'Todos los días', weekdays: 'L–V', weekend: 'S–D', custom: 'Personalizado' }[h.freq] || h.freq
                return (
                  <div key={h.id} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl overflow-hidden mb-2">
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <div className="w-11 h-11 rounded-[14px] flex items-center justify-center text-[22px]" style={{ background: h.color + '18', border: '1px solid ' + h.color + '30' }}>
                        {h.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[var(--color-text)]">{h.name}</div>
                        <div className="text-xs text-[var(--color-dim)] mt-0.5">
                          {freqLabel} · {h.type === 'count' ? `Meta: ${h.goal} ${h.unit}` : 'Sí/No'}{h.note ? ' · ' + h.note : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => { removeHabit(h.id); toast.show('Hábito eliminado') }}
                        className="w-8 h-8 rounded-lg bg-red-500/[0.08] text-[var(--color-red)] border border-red-500/[0.15] text-[11px] font-bold flex items-center justify-center cursor-pointer active:bg-red-500/[0.18]"
                      >✕</button>
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}

        {tab === 'stats' && (
          <HabitStats habits={habits} log={log} />
        )}
      </div>
    </div>
  )
}
