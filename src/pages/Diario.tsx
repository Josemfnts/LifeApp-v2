import { useState } from 'react'
import { useToast } from '@/stores/toast'

export default function Diario() {
  const [entries, setEntries] = useState<{ date: string; text: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('journal_entries') || '[]') } catch { return [] }
  })
  const [text, setText] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const toast = useToast()
  const today = new Date().toISOString().slice(0, 10)

  const todayEntry = entries.find(e => e.date === today)
  const selectedEntry = selectedDate ? entries.find(e => e.date === selectedDate) : null

  function save() {
    if (!text.trim()) return
    const existing = entries.findIndex(e => e.date === today)
    let next: { date: string; text: string }[]
    if (existing >= 0) {
      next = [...entries]
      next[existing] = { date: today, text: text.trim() }
    } else {
      next = [...entries, { date: today, text: text.trim() }]
    }
    setEntries(next)
    localStorage.setItem('journal_entries', JSON.stringify(next))
    toast.show('✓ Entrada guardada')
  }

  const pastEntries = entries.filter(e => e.date !== today).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div>
      <div className="page-header">
        <div className="page-module" style={{ color: 'var(--color-acc-purple)' }}>Diario</div>
        <div className="page-title">Journal</div>
      </div>
      <div style={{ padding: 16 }}>
        <div className="sec-label">Hoy — {today}</div>
        <textarea
          className="inp"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="¿Qué tal el día? Escribe libremente..."
          style={{ height: 200, resize: 'vertical', fontFamily: 'DM Sans,sans-serif', fontSize: 14, lineHeight: 1.6 }}
        />
        <button onClick={save} className="btn-primary" style={{ background: 'var(--color-acc-purple)', marginBottom: 20 }}>Guardar entrada</button>

        {pastEntries.length > 0 && (
          <>
            <div className="sec-label">Entradas anteriores</div>
            {pastEntries.map((e, i) => (
              <div key={i} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 14, marginBottom: 8, cursor: 'pointer' }}
                onClick={() => { setSelectedDate(e.date); setText(e.text) }}>
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
