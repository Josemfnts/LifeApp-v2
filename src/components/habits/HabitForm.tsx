import { useState } from 'react'
import { Input } from '@/components/ui'
import type { Habit } from '@/types'

interface HabitFormProps {
  onAdd: (h: Habit) => void
}

const EMOJIS = ['⭐', '💪', '🏃', '📚', '💧', '🧘', '🥗', '😴', '✍️', '🎯', '🚴', '🧠', '❤️', '🌿', '🎸', '💊']
const COLORS = ['var(--color-acc-purple)', 'var(--color-acc-blue)', 'var(--color-acc-green)', 'var(--color-acc-orange)', 'var(--color-acc-gold)', 'var(--color-red)', '#64b5f6']

export function HabitForm({ onAdd }: HabitFormProps) {
  const [emoji, setEmoji] = useState('⭐')
  const [color, setColor] = useState('var(--color-acc-purple)')
  const [name, setName] = useState('')
  const [type, setType] = useState<'bool' | 'count' | 'avoid'>('bool')
  const [freq, setFreq] = useState<Habit['freq']>('daily')
  const [goal, setGoal] = useState('1')
  const [unit, setUnit] = useState('')
  const [note, setNote] = useState('')
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [customEmoji, setCustomEmoji] = useState('')

  function handleSubmit() {
    if (!name.trim()) return
    onAdd({
      id: Date.now(),
      name: name.trim(),
      emoji: customEmoji.trim() || emoji,
      color,
      type,
      freq,
      goal: type === 'count' ? (parseFloat(goal) || 1) : 1,
      unit: type === 'count' ? (unit.trim() || 'veces') : '',
      note: note.trim(),
      days: freq === 'custom' ? days : [],
      createdAt: new Date().toISOString().slice(0, 10),
    })
    setName('')
    setNote('')
    setGoal('1')
    setUnit('')
    setCustomEmoji('')
  }

  return (
    <div className="bg-[var(--color-s1)] border border-[var(--color-border)] rounded-2xl p-4 mb-3.5">
      <div className="text-[11px] font-semibold text-[var(--color-dim)] uppercase tracking-[0.8px] mb-3">Nuevo hábito</div>

      <div className="text-xs text-[var(--color-sub)] mb-2 font-medium">Elige un emoji</div>
      <div className="flex gap-1.5 flex-wrap mb-2.5">
        {EMOJIS.map(e => (
          <button
            key={e}
            onClick={() => { setEmoji(e); setCustomEmoji('') }}
            className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center cursor-pointer transition-all border ${e === emoji && !customEmoji ? 'border-[var(--color-acc-purple)] bg-[var(--color-acc-purple)]/[0.15]' : 'border-transparent bg-[var(--color-s2)]'}`}
          >{e}</button>
        ))}
      </div>
      <Input value={customEmoji} onChange={setCustomEmoji} placeholder="O escribe tu propio emoji..." className="mb-2.5" />

      <Input value={name} onChange={setName} placeholder="Nombre del hábito (ej: Beber agua)" className="mb-2" />

      <div className="text-xs text-[var(--color-sub)] mb-2 font-medium">Color</div>
      <div className="flex gap-1.5 mb-2.5">
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-7 h-7 rounded-full cursor-pointer transition-all ${c === color ? 'border-[2.5px] border-[var(--color-text)] scale-115' : 'border-[2.5px] border-transparent'}`}
            style={{ background: c }}
          />
        ))}
      </div>

      <select
        value={type}
        onChange={e => setType(e.target.value as 'bool' | 'count')}
        className="w-full bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3.5 py-2.5 text-sm font-sans mb-2 cursor-pointer outline-none"
      >
        <option value="bool">✓ Hábito sí/no (completado o no)</option>
        <option value="avoid">🚫 Hábito a evitar (ej: no fumar, no azúcar)</option>
        <option value="count">🔢 Cantidad con objetivo</option>
      </select>

      {type === 'count' && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Input value={goal} onChange={setGoal} type="number" placeholder="Objetivo" min="1" />
          <Input value={unit} onChange={setUnit} placeholder="Unidad (ej: vasos, km)" />
        </div>
      )}

      <select
        value={freq}
        onChange={e => setFreq(e.target.value as Habit['freq'])}
        className="w-full bg-[var(--color-s2)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl px-3.5 py-2.5 text-sm font-sans mb-2 cursor-pointer outline-none"
      >
        <option value="daily">📅 Todos los días</option>
        <option value="weekdays">💼 Días laborables (L-V)</option>
        <option value="weekend">🏖️ Fin de semana</option>
        <option value="custom">⚙️ Personalizado</option>
      </select>

      {freq === 'custom' && (
        <div className="flex gap-1.5 mb-2">
          {[
            { d: 1, label: 'L' }, { d: 2, label: 'M' }, { d: 3, label: 'X' },
            { d: 4, label: 'J' }, { d: 5, label: 'V' }, { d: 6, label: 'S' }, { d: 0, label: 'D' },
          ].map(({ d, label }) => (
            <button
              key={d}
              onClick={() => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold font-sans cursor-pointer transition-all border ${
                days.includes(d) ? 'bg-[var(--color-acc-purple)]/[0.15] text-[var(--color-acc-purple)] border-[var(--color-acc-purple)]/[0.3]' : 'bg-[var(--color-s2)] text-[var(--color-dim)] border-[var(--color-border)]'
              }`}
            >{label}</button>
          ))}
        </div>
      )}

      <Input value={note} onChange={setNote} placeholder="Nota o recordatorio (opcional)" className="mb-2.5" />
      <button
        onClick={handleSubmit}
        className="w-full bg-[var(--color-acc-purple)] text-white border-none rounded-xl py-3.5 text-[15px] font-semibold font-sans cursor-pointer active:opacity-80"
      >
        Crear hábito
      </button>
    </div>
  )
}
