import { useState } from 'react'
import { NotesFor } from '@/components/notes/NotesFor'
import { useToast } from '@/stores/toast'
import { loadFromStorage, saveToStorage } from '@/lib/storage'
import { useRemoteChange } from '@/lib/mirror'
import { STORE_KEYS } from '@/lib/storageKeys'

export default function Diario() {
  const [entries, setEntries] = useState<{ date: string; text: string }[]>(() =>
    loadFromStorage(STORE_KEYS.journal_entries, [])
  )

  // Espejo vivo: recarga las entradas si cambian en la nube.
  useRemoteChange([STORE_KEYS.journal_entries], () => {
    setEntries(loadFromStorage(STORE_KEYS.journal_entries, []))
  })
  const today = new Date().toISOString().slice(0, 10)
  const [text, setText] = useState('')
  const [editingDate, setEditingDate] = useState(today)
  const toast = useToast()

  function save() {
    if (!text.trim()) return
    const existing = entries.findIndex(e => e.date === editingDate)
    let next: { date: string; text: string }[]
    if (existing >= 0) {
      next = [...entries]
      next[existing] = { date: editingDate, text: text.trim() }
    } else {
      next = [...entries, { date: editingDate, text: text.trim() }]
    }
    setEntries(next)
    // saveToStorage y no localStorage a pelo: también sube el diario a la nube.
    saveToStorage(STORE_KEYS.journal_entries, next)
    toast.show(editingDate === today ? '✓ Entrada guardada' : `✓ Entrada del ${editingDate} actualizada`)
    if (editingDate !== today) { setEditingDate(today); setText('') }
  }

  const pastEntries = entries.filter(e => e.date !== today).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div>
      <div className="page-header">
        <div className="page-module" style={{ color: 'var(--color-acc-purple)' }}>Diario</div>
        <div className="page-title">Journal</div>
      </div>
      <div style={{ padding: 16 }}>
        <div className="sec-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{editingDate === today ? `Hoy — ${today}` : `Editando — ${editingDate}`}</span>
          {editingDate !== today && (
            <button onClick={() => { setEditingDate(today); setText('') }}
              style={{ background: 'none', border: 'none', color: 'var(--color-acc-purple)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Volver a hoy
            </button>
          )}
        </div>
        <textarea
          className="inp"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="¿Qué tal el día? Escribe libremente..."
          style={{ height: 200, resize: 'vertical', fontFamily: 'DM Sans,sans-serif', fontSize: 14, lineHeight: 1.6 }}
        />
        <button onClick={save} className="btn-primary" style={{ background: 'var(--color-acc-purple)', marginBottom: 20 }}>
          {editingDate === today ? 'Guardar entrada' : 'Actualizar entrada'}
        </button>

        <NotesFor entityType="day" entityId={editingDate} defaultTitle={`Notas · ${editingDate}`} />

        {pastEntries.length > 0 && (
          <>
            <div className="sec-label">Entradas anteriores</div>
            {pastEntries.map((e, i) => (
              <div key={i}
                style={{
                  background: editingDate === e.date ? 'var(--color-s2)' : 'var(--color-s1)',
                  border: editingDate === e.date ? '1px solid var(--color-acc-purple)' : '1px solid var(--color-border)',
                  borderRadius: 12, padding: 14, marginBottom: 8, cursor: 'pointer',
                }}
                onClick={() => { setEditingDate(e.date); setText(e.text) }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-sub)', marginBottom: 6 }}>{e.date}</div>
                <div style={{ fontSize: 13, color: 'var(--color-dim)', whiteSpace: 'pre-wrap', overflow: 'hidden', maxHeight: 60 }}>{e.text.slice(0, 150)}{e.text.length > 150 ? '...' : ''}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
