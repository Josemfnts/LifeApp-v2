import { useState } from 'react'
import { useAgendaStore, PRIORITY_COLORS } from '@/stores/agendaStore'
import { useToast } from '@/stores/toast'

export function KanbanView() {
  const { tasks, addTask, toggleTask, removeTask } = useAgendaStore()
  const toast = useToast()
  const today = new Date().toISOString().slice(0, 10)
  const dayTasks = tasks[today] || []
  const [newText, setNewText] = useState('')

  function add() {
    if (!newText.trim()) return
    addTask(today, { text: newText.trim(), time: '', color: 'blue', done: false })
    setNewText('')
    toast.show('✓ Añadida')
  }

  const columns = [
    { key: 'todo', label: 'Por hacer', color: 'var(--color-acc-blue)', done: false },
    { key: 'done', label: 'Hecho', color: 'var(--color-acc-green)', done: true },
  ] as const

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input className="inp" value={newText} onChange={e => setNewText(e.target.value)} placeholder="Nueva tarea..." style={{ flex: 1, marginBottom: 0 }} onKeyDown={e => { if (e.key === 'Enter') add() }} />
        <button onClick={add} className="btn-ghost" style={{ width: 'auto', padding: '0 20px' }}>Añadir</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'start' }}>
        {columns.map(col => {
          const items = dayTasks.map((t, i) => ({ t, i })).filter(({ t }) => t.done === col.done)
          return (
            <div key={col.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.color }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{col.label}</span>
                <span style={{ fontSize: 11, color: 'var(--color-dim)', fontWeight: 600 }}>{items.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(({ t, i }) => (
                  <div key={i} onClick={() => toggleTask(today, i)}
                    style={{
                      background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${col.color}`,
                      borderRadius: 10, padding: '10px 12px', cursor: 'pointer', position: 'relative',
                      opacity: t.done ? 0.55 : 1, transition: 'opacity 0.15s',
                    }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-text)', textDecoration: t.done ? 'line-through' : 'none', paddingRight: 18, lineHeight: 1.35 }}>{t.text}</div>
                    {t.priority && (
                      <div style={{ fontSize: 9, fontWeight: 700, color: PRIORITY_COLORS[t.priority], textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 5 }}>
                        {t.priority === 'high' ? 'Alta' : t.priority === 'medium' ? 'Media' : 'Baja'}
                      </div>
                    )}
                    <button onClick={e => { e.stopPropagation(); removeTask(today, i); toast.show('Eliminada') }}
                      style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: 'var(--color-dim)', fontSize: 12, cursor: 'pointer', lineHeight: 1, padding: 2 }}>✕</button>
                  </div>
                ))}
                {items.length === 0 && (
                  <div style={{ padding: 18, fontSize: 11, color: 'var(--color-dim)', textAlign: 'center', background: 'var(--color-s2)', borderRadius: 10, border: '1px dashed var(--color-border)' }}>Vacío</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-dim)', marginTop: 16 }}>
        Toca una tarjeta para moverla entre columnas
      </div>
    </div>
  )
}
