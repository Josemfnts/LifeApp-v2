import { useState } from 'react'
import { useToast } from '@/stores/toast'
import { loadFromStorage as load, saveToStorage as save } from '@/lib/storage'
import { NotesFor } from '@/components/notes/NotesFor'

interface KanbanCard {
  id: number
  text: string
  column: 'todo' | 'doing' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high'
  dueDate: string
  labels: string[]
  description: string
  projectId: number
}

interface KanbanProject {
  id: number
  name: string
  color: string
}

const PRIORITY_COLORS = { high: '#e05f5f', medium: '#c9a84c', low: '#52b788' }
const COLUMNS = [
  { key: 'todo' as const, label: 'Por hacer', color: '#5b8af0' },
  { key: 'doing' as const, label: 'En curso', color: '#c9a84c' },
  { key: 'review' as const, label: 'Revisar', color: '#9b7fe0' },
  { key: 'done' as const, label: 'Hecho', color: '#52b788' },
]
const LABELS = ['🐛 bug', '✨ feature', '📝 docs', '🎨 ui', '⚡ urgente', '🧹 refactor', '🔧 fix', '💡 idea']

const PROJECTS_KEY = 'kanban_projects_v1'
const CARDS_KEY = 'kanban_cards_v1'

export function KanbanView() {
  const toast = useToast()
  const [projects, setProjects] = useState<KanbanProject[]>(() => load(PROJECTS_KEY, []))
  const [cards, setCards] = useState<KanbanCard[]>(() => load(CARDS_KEY, []))
  const [activeProject, setActiveProject] = useState<number | null>(projects[0]?.id || null)
  const [showProjForm, setShowProjForm] = useState(false)
  const [projName, setProjName] = useState('')
  const [newCardText, setNewCardText] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null)
  const [editText, setEditText] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [editLabels, setEditLabels] = useState<string[]>([])

  const filteredCards = activeProject ? cards.filter(c => c.projectId === activeProject) : cards

  // Paleta de colores de proyecto; se asigna automáticamente por orden de
  // creación (antes había un selector manual que se cortaba en móvil).
  const PROJECT_PALETTE = ['#5b8af0', '#52b788', '#e07a5f', '#c9a84c', '#9b7fe0', '#e05f5f']

  function addProject() {
    if (!projName.trim()) return
    const color = PROJECT_PALETTE[projects.length % PROJECT_PALETTE.length]
    const p: KanbanProject = { id: Date.now(), name: projName.trim(), color }
    const next = [...projects, p]
    setProjects(next); save(PROJECTS_KEY, next)
    setActiveProject(p.id); setProjName(''); setShowProjForm(false)
    toast.show('✓ Proyecto creado')
  }

  function deleteProject(id: number) {
    const next = projects.filter(p => p.id !== id)
    const nextCards = cards.filter(c => c.projectId !== id)
    setProjects(next); setCards(nextCards)
    save(PROJECTS_KEY, next); save(CARDS_KEY, nextCards)
    if (activeProject === id) setActiveProject(next[0]?.id || null)
    toast.show('Proyecto eliminado')
  }

  function addCard() {
    if (!newCardText.trim() || !activeProject) return
    const card: KanbanCard = {
      id: Date.now(), text: newCardText.trim(), column: 'todo',
      priority: newPriority, dueDate: '', labels: [], description: '', projectId: activeProject,
    }
    const next = [...cards, card]
    setCards(next); save(CARDS_KEY, next)
    setNewCardText(''); toast.show('✓ Tarea añadida')
  }

  function moveCard(id: number, to: KanbanCard['column']) {
    const next = cards.map(c => c.id === id ? { ...c, column: to } : c)
    setCards(next); save(CARDS_KEY, next)
  }

  function deleteCard(id: number) {
    const next = cards.filter(c => c.id !== id)
    setCards(next); save(CARDS_KEY, next)
    setEditingCard(null); toast.show('Tarea eliminada')
  }

  function saveCardEdit() {
    if (!editingCard || !editText.trim()) return
    const next = cards.map(c => c.id === editingCard.id ? {
      ...c, text: editText.trim(), description: editDesc.trim(),
      dueDate: editDate, priority: editPriority, labels: editLabels,
    } : c)
    setCards(next); save(CARDS_KEY, next)
    setEditingCard(null); toast.show('✓ Tarea actualizada')
  }

  function openEdit(card: KanbanCard) {
    setEditingCard(card)
    setEditText(card.text); setEditDesc(card.description || '')
    setEditDate(card.dueDate || ''); setEditPriority(card.priority)
    setEditLabels(card.labels || [])
  }


  return (
    <div>
      {/* Project selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        {projects.map(p => (
          <button key={p.id} onClick={() => setActiveProject(p.id)}
            style={{ padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid', whiteSpace: 'nowrap',
              background: activeProject === p.id ? p.color + '22' : 'var(--color-s2)',
              color: activeProject === p.id ? p.color : 'var(--color-dim)',
              borderColor: activeProject === p.id ? p.color + '44' : 'var(--color-border)',
            }}>
            {p.name}
            <button onClick={e => { e.stopPropagation(); deleteProject(p.id) }}
              style={{ marginLeft: 6, background: 'none', border: 'none', color: 'var(--color-dim)', cursor: 'pointer', fontSize: 10 }}>✕</button>
          </button>
        ))}
        <button onClick={() => setShowProjForm(!showProjForm)}
          style={{ padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px dashed var(--color-border)', background: 'transparent', color: 'var(--color-dim)' }}>
          + Proyecto
        </button>
      </div>

      {showProjForm && (
        <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="inp" value={projName} onChange={e => setProjName(e.target.value)} placeholder="Nombre del proyecto..." style={{ flex: 1, minWidth: 0, marginBottom: 0 }} onKeyDown={e => { if (e.key === 'Enter') addProject() }} autoFocus />
          <button onClick={addProject} className="btn-ghost" style={{ width: 'auto', flexShrink: 0, padding: '8px 16px' }}>Crear</button>
        </div>
      )}

      {!activeProject ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-dim)', fontSize: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600, color: 'var(--color-sub)', marginBottom: 6 }}>Crea un proyecto para empezar</div>
          <div style={{ fontSize: 13 }}>Organiza tus tareas por proyecto con columnas Kanban</div>
        </div>
      ) : (
        <>
          {/* Quick add */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input className="inp" value={newCardText} onChange={e => setNewCardText(e.target.value)} placeholder="+ Nueva tarea..." style={{ flex: 1, marginBottom: 0 }} onKeyDown={e => { if (e.key === 'Enter') addCard() }} />
            <select className="inp" value={newPriority} onChange={e => setNewPriority(e.target.value as 'low' | 'medium' | 'high')} style={{ width: 54, marginBottom: 0, textAlign: 'center' }} title="Prioridad">
              <option value="low">🟢</option><option value="medium">🟡</option><option value="high">🔴</option>
            </select>
            <button onClick={addCard} className="btn-ghost" style={{ width: 'auto', padding: '10px 20px' }}>Añadir</button>
          </div>

          {/* Columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {COLUMNS.map(col => {
              const colCards = filteredCards.filter(c => c.column === col.key)
              return (
                <div key={col.key}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: col.color, letterSpacing: '0.2px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{col.label}</span>
                    <span style={{ color: 'var(--color-dim)', fontWeight: 500, flexShrink: 0 }}>{colCards.length}</span>
                  </div>
                  {colCards.map(card => (
                    <div key={card.id}
                      onClick={() => openEdit(card)}
                      style={{
                        background: 'var(--color-s1)', border: '1px solid var(--color-border)',
                        borderLeft: `3px solid ${PRIORITY_COLORS[card.priority]}`,
                        borderRadius: 10, padding: 10, marginBottom: 6, cursor: 'pointer',
                        transition: 'border-color 0.15s, opacity 0.15s',
                        opacity: card.column === 'done' ? 0.5 : 1,
                      }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4, textDecoration: card.column === 'done' ? 'line-through' : 'none' }}>
                        {card.text}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {card.labels?.map(l => <span key={l} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--color-s2)', color: 'var(--color-dim)' }}>{l}</span>)}
                      </div>
                      {card.dueDate && (
                        <div style={{ fontSize: 9, color: new Date(card.dueDate) < new Date() ? 'var(--color-red)' : 'var(--color-dim)', marginTop: 4 }}>
                          📅 {card.dueDate}
                        </div>
                      )}
                      {/* Move buttons */}
                      <div style={{ display: 'flex', gap: 3, marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: 6 }}>
                        {COLUMNS.filter(c => c.key !== card.column).slice(0, 2).map(c => (
                          <button key={c.key} onClick={e => { e.stopPropagation(); moveCard(card.id, c.key) }}
                            style={{ flex: 1, fontSize: 9, fontWeight: 600, padding: '2px 4px', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--color-border)', background: 'var(--color-s2)', color: 'var(--color-dim)', fontFamily: 'DM Sans,sans-serif' }}>
                            → {c.label.slice(0, 8)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {colCards.length === 0 && (
                    <div style={{ padding: 16, fontSize: 10, color: 'var(--color-dim)', textAlign: 'center', background: 'var(--color-s2)', borderRadius: 8 }}>Vacío</div>
                  )}
                </div>
              )
            })}
          </div>
          <NotesFor entityType="project" entityId={activeProject} defaultTitle={`Notas · ${projects.find(p => p.id === activeProject)?.name ?? 'Proyecto'}`} />
        </>
      )}

      {/* Card edit modal */}
      {editingCard && (
        <div onClick={e => { if (e.target === e.currentTarget) setEditingCard(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 40px', maxHeight: '85dvh', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, background: 'var(--color-border2)', borderRadius: 99, margin: '0 auto 16px' }} />
            <div style={{ fontFamily: 'DM Serif Display,serif', fontSize: 18, marginBottom: 14 }}>Editar tarea</div>
            <input className="inp" value={editText} onChange={e => setEditText(e.target.value)} placeholder="Título de la tarea" />
            <textarea className="inp" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Descripción..." style={{ height: 80, resize: 'vertical', fontFamily: 'DM Sans,sans-serif', fontSize: 14 }} />

            {/* Fecha y prioridad en filas independientes: el input date nativo de
                iOS es ancho y, en rejilla, se solapaba con el selector. */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 6 }}>Fecha límite</div>
            <input className="inp" value={editDate} onChange={e => setEditDate(e.target.value)} type="date" style={{ display: 'block', width: '100%', minWidth: 0 }} />
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 6 }}>Prioridad</div>
            <select className="inp" value={editPriority} onChange={e => setEditPriority(e.target.value as 'low' | 'medium' | 'high')} style={{ width: '100%', minWidth: 0, marginBottom: 8 }}>
              <option value="low">🟢 Baja</option><option value="medium">🟡 Media</option><option value="high">🔴 Alta</option>
            </select>

            {/* Barra de color de la prioridad */}
            <div style={{ height: 4, borderRadius: 99, marginBottom: 10, background: PRIORITY_COLORS[editPriority] }} />

            {/* Labels */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 6 }}>Etiquetas</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
              {LABELS.map(l => (
                <button key={l} onClick={() => setEditLabels(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])}
                  style={{ padding: '3px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: '1px solid', fontFamily: 'DM Sans,sans-serif',
                    background: editLabels.includes(l) ? 'rgba(91,138,240,0.15)' : 'var(--color-s2)',
                    color: editLabels.includes(l) ? 'var(--color-acc-blue)' : 'var(--color-dim)',
                    borderColor: editLabels.includes(l) ? 'rgba(91,138,240,0.3)' : 'var(--color-border)',
                  }}>{l}</button>
              ))}
            </div>

            {/* Column selector */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-dim)', marginBottom: 6 }}>Mover a columna</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
              {COLUMNS.map(c => (
                <button key={c.key} onClick={() => moveCard(editingCard.id, c.key)}
                  style={{ padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid',
                    background: editingCard.column === c.key ? c.color + '22' : 'var(--color-s2)',
                    color: editingCard.column === c.key ? c.color : 'var(--color-dim)',
                    borderColor: editingCard.column === c.key ? c.color + '44' : 'var(--color-border)',
                  }}>{c.label}</button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => setEditingCard(null)} className="btn-ghost" style={{ width: '100%', minWidth: 0 }}>Cancelar</button>
              <button onClick={saveCardEdit} className="btn-primary" style={{ background: 'var(--color-acc-blue)', width: '100%', minWidth: 0 }}>Guardar</button>
            </div>
            <button onClick={() => deleteCard(editingCard.id)} style={{ width: '100%', marginTop: 10, padding: 10, borderRadius: 10, background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>
              🗑 Eliminar tarea
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
