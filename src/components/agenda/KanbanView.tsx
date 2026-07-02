import { useState } from 'react'
import { useAgendaStore, PRIORITY_COLORS } from '@/stores/agendaStore'
import { useToast } from '@/stores/toast'

export function KanbanView() {
  const { tasks, addTask } = useAgendaStore()
  const toast = useToast()
  const today = new Date().toISOString().slice(0, 10)
  const dayTasks = tasks[today] || []
  const [newText, setNewText] = useState('')

  const columns = [
    { key: 'todo', label: 'Por hacer', color: '#5b8af0', tasks: dayTasks.filter(t => !t.done) },
    { key: 'done', label: 'Hecho', color: '#52b788', tasks: dayTasks.filter(t => t.done) },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <input className="inp" value={newText} onChange={e => setNewText(e.target.value)} placeholder="Nueva tarea..." style={{ flex: 1, marginBottom: 0 }} />
        <button onClick={() => { if (!newText.trim()) return; addTask(today, { text: newText.trim(), time: '', color: 'blue', done: false }); setNewText(''); toast.show('✓ Añadida') }} className="btn-ghost" style={{ width: 'auto', padding: '10px 20px' }}>+ Añadir</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {columns.map(col => (
          <div key={col.key}>
            <div style={{ fontSize: 10, fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
              {col.label} <span style={{ color: 'var(--color-dim)', fontWeight: 500 }}>({col.tasks.length})</span>
            </div>
            {col.tasks.map((t, i) => (
              <div key={i} style={{
                background: 'var(--color-s1)', border: `1px solid ${col.color}33`, borderLeft: `3px solid ${col.color}`,
                borderRadius: 10, padding: 10, marginBottom: 6, fontSize: 12, fontWeight: 500, color: 'var(--color-text)',
                opacity: t.done ? 0.5 : 1, textDecoration: t.done ? 'line-through' : 'none',
              }}>
                {t.text}
                {t.priority && <div style={{ fontSize: 9, color: PRIORITY_COLORS[t.priority], marginTop: 4 }}>
                  {t.priority === 'high' ? '🔴 Alta' : t.priority === 'medium' ? '🟡 Media' : '🟢 Baja'}
                </div>}
              </div>
            ))}
            {col.tasks.length === 0 && <div style={{ padding: 20, fontSize: 11, color: 'var(--color-dim)', textAlign: 'center', background: 'var(--color-s2)', borderRadius: 10 }}>Vacío</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
