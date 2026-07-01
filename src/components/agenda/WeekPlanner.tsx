import { useState } from 'react'
import { DAYS, COLOR_HEX, useAgendaStore } from '@/stores/agendaStore'
import type { RecurringTask, PendingTask } from '@/stores/agendaStore'
import { Input } from '@/components/ui'

export function WeekPlanner() {
  const addRecurring = useAgendaStore(s => s.addRecurring)
  const removeRecurring = useAgendaStore(s => s.removeRecurring)
  const addPending = useAgendaStore(s => s.addPending)
  const removePending = useAgendaStore(s => s.removePending)
  const recurring = useAgendaStore(s => s.recurring)
  const pending = useAgendaStore(s => s.pending)
  const addTask = useAgendaStore(s => s.addTask)
  const [subTab, setSubTab] = useState<'tareas' | 'planes'>('tareas')
  const [recText, setRecText] = useState('')
  const [recDay, setRecDay] = useState('1')
  const [recColor, setRecColor] = useState('blue')
  const [taskText, setTaskText] = useState('')
  const [taskColor, setTaskColor] = useState('blue')
  const order = [1, 2, 3, 4, 5, 6, 0]

  function handleAddRecurring() {
    if (!recText.trim()) return
    addRecurring(+recDay, { text: recText.trim(), color: recColor })
    setRecText('')
  }

  function handleAddAsPending() {
    if (!taskText.trim()) return
    addPending({ text: taskText.trim(), color: taskColor })
    setTaskText('')
  }

  return (
    <div>
      <div className="flex gap-1.5 mb-3.5">
        <button
          onClick={() => setSubTab('tareas')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer transition-all border ${
            subTab === 'tareas' ? 'bg-[#5b8af0]/15 text-[#5b8af0] border-[#5b8af0]/30' : 'bg-transparent text-[var(--color-dim)] border-[var(--color-border)]'
          }`}
        >✅ Tareas</button>
        <button
          onClick={() => setSubTab('planes')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer transition-all border ${
            subTab === 'planes' ? 'bg-[#5b8af0]/15 text-[#5b8af0] border-[#5b8af0]/30' : 'bg-transparent text-[var(--color-dim)] border-[var(--color-border)]'
          }`}
        >🗺 Planes</button>
      </div>

      {subTab === 'tareas' && (
        <>
          <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3">
            <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-3">Nueva tarea</div>
            <Input value={taskText} onChange={setTaskText} placeholder="¿Qué tienes que hacer?" className="mb-2" />
            <div className="flex gap-1.5 mb-2">
              {Object.entries(COLOR_HEX).map(([key, hex]) => (
                <button
                  key={key}
                  onClick={() => setTaskColor(key)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${taskColor === key ? 'border-white' : 'border-transparent'}`}
                  style={{ background: hex }}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleAddAsPending}
                className="py-2.5 rounded-xl text-xs font-semibold font-sans cursor-pointer bg-[#5b8af0]/10 text-[#5b8af0] border border-[#5b8af0]/25"
              >📋 Dejar pendiente</button>
              <button
                onClick={() => {
                  if (!taskText.trim()) return
                  const today = new Date().toISOString().slice(0, 10)
                  addTask(today, { text: taskText.trim(), time: '', color: taskColor, done: false })
                  setTaskText('')
                }}
                className="py-2.5 rounded-xl text-xs font-semibold font-sans cursor-pointer bg-[#5b8af0] text-white border-[#5b8af0] shadow-lg shadow-[#5b8af0]/25"
              >📅 Añadir al día</button>
            </div>
          </div>

          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5">
            Pendientes
            {pending.length > 0 && <span className="ml-2 text-[var(--color-text)]">({pending.length})</span>}
          </div>
          {pending.length === 0 ? (
            <div className="text-center py-8 text-[13px] text-[var(--color-dim)]">Sin tareas pendientes.</div>
          ) : (
            pending.map((p, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3.5 py-3 bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: COLOR_HEX[p.color] || COLOR_HEX.blue }} />
                <span className="flex-1 text-[13px] font-medium text-[var(--color-text)]">{p.text}</span>
                <button
                  onClick={() => {
                    const today = new Date().toISOString().slice(0, 10)
                    addTask(today, { text: p.text, time: '', color: p.color, done: false })
                    removePending(i)
                  }}
                  className="text-[10px] font-semibold px-2 py-1 rounded-md bg-[#52b788]/10 text-[#52b788] border border-[#52b788]/20 cursor-pointer"
                >→ Hoy</button>
                <button
                  onClick={() => removePending(i)}
                  className="w-6 h-6 rounded-lg bg-red-500/[0.08] text-[var(--color-red)] border border-red-500/[0.15] text-[11px] font-bold flex items-center justify-center cursor-pointer"
                >✕</button>
              </div>
            ))
          )}

          {/* Recurring tasks */}
          <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-2.5 mt-4">
            Tareas fijas (por día de la semana)
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <select
              value={recDay}
              onChange={e => setRecDay(e.target.value)}
              className="bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3 py-2.5 text-sm font-sans outline-none cursor-pointer"
            >
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
            <select
              value={recColor}
              onChange={e => setRecColor(e.target.value)}
              className="bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3 py-2.5 text-sm font-sans outline-none cursor-pointer"
            >
              {Object.entries(COLOR_HEX).map(([k]) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mb-2">
            <Input value={recText} onChange={setRecText} placeholder="Tarea fija..." className="flex-1 mb-0" />
            <button
              onClick={handleAddRecurring}
              className="px-4 py-2.5 rounded-xl bg-[#5b8af0]/10 text-[#5b8af0] border border-[#5b8af0]/25 text-xs font-semibold font-sans cursor-pointer"
            >+ Añadir</button>
          </div>

          {order.map(dow => {
            const tasks2 = recurring[dow] || []
            if (!tasks2.length) return null
            return (
              <div key={dow} className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl overflow-hidden mb-2">
                <div className="px-3.5 py-2.5 border-b border-[var(--color-border)] text-[11px] font-semibold text-[var(--color-sub)] uppercase tracking-wider"
                  style={{ borderLeft: `3px solid ${COLOR_HEX[tasks2[0]?.color] || COLOR_HEX.blue}`, paddingLeft: 11 }}>
                  {DAYS[dow]}
                </div>
                {tasks2.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-white/[0.03] last:border-b-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLOR_HEX[t.color] || COLOR_HEX.blue }} />
                    <span className="flex-1 text-[13px] font-medium text-[var(--color-text)]">{t.text}</span>
                    <button
                      onClick={() => removeRecurring(dow, idx)}
                      className="w-[26px] h-[26px] rounded-lg bg-red-500/[0.08] text-[var(--color-red)] border border-red-500/[0.15] text-[11px] font-bold flex items-center justify-center cursor-pointer"
                    >✕</button>
                  </div>
                ))}
              </div>
            )
          })}
        </>
      )}

      {subTab === 'planes' && (
        <div className="text-center py-16 text-[var(--color-dim)] text-sm">
          <div className="text-4xl mb-3">🗺</div>
          <div className="font-semibold text-[var(--color-sub)] mb-1">Planes en camino</div>
          <div>Viajes y actividades llegarán pronto.</div>
        </div>
      )}
    </div>
  )
}
