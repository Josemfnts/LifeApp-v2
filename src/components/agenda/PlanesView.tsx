import { useState } from 'react'
import { useToast } from '@/stores/toast'
import { saveToCloud } from '@/lib/sync'

interface Viaje { id: number; destino: string; cuando: string; tipo: string; nota: string; presupuesto: string }
interface Actividad { id: number; nombre: string; cuando: string; categoria: string; nota: string }
interface Proyecto { id: number; nombre: string; tareas: { text: string; done: boolean }[]; color: string }
interface ListaItem { id: number; text: string; done: boolean }

export function PlanesView() {
  const [subtab, setSubtab] = useState<'viajes' | 'actividades' | 'compras' | 'inbox' | 'proyectos'>('viajes')
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', marginBottom: 14 }}>
        {([
          { k: 'viajes' as const, l: '✈️ Viajes' },
          { k: 'actividades' as const, l: '🎯 Actividades' },
          { k: 'compras' as const, l: '🛒 Compra' },
          { k: 'inbox' as const, l: '💡 Ideas' },
          { k: 'proyectos' as const, l: '📋 Proyectos' },
        ]).map(s => (
          <button key={s.k} onClick={() => setSubtab(s.k)}
            style={{ flex: '0 0 auto', whiteSpace: 'nowrap', padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              fontFamily: 'DM Sans,sans-serif', cursor: 'pointer', border: '1px solid',
              background: subtab === s.k ? 'rgba(91,138,240,0.15)' : 'transparent',
              color: subtab === s.k ? 'var(--color-acc-blue)' : 'var(--color-dim)',
              borderColor: subtab === s.k ? 'rgba(91,138,240,0.3)' : 'var(--color-border)' }}>{s.l}</button>
        ))}
      </div>
      {subtab === 'viajes' && <ViajesTab />}
      {subtab === 'actividades' && <ActividadesTab />}
      {subtab === 'compras' && <ComprasTab />}
      {subtab === 'inbox' && <InboxTab />}
      {subtab === 'proyectos' && <ProyectosTab />}
    </div>
  )
}

function load<T>(k: string, f: T): T { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : f } catch { return f } }
function save(k: string, v: unknown) { localStorage.setItem(k, JSON.stringify(v)); saveToCloud(k, v) }

const VIAJES_KEY = 'lifeos_viajes_v1'
const ACTIVIDADES_KEY = 'lifeos_actividades_v1'
const COMPRAS_KEY = 'lifeos_compras_v1'
const INBOX_KEY = 'lifeos_inbox_v1'
const PROYECTOS_KEY = 'lifeos_proyectos_v1'

function ViajesTab() {
  const [viajes, setViajes] = useState<Viaje[]>(() => load(VIAJES_KEY, []))
  const toast = useToast()
  const [d, setD] = useState(''); const [c, setC] = useState(''); const [t, setT] = useState('city'); const [n, setN] = useState(''); const [p, setP] = useState('')
  function add() { if (!d.trim()) return; setViajes(v => { const nv = [...v, { id: Date.now(), destino: d.trim(), cuando: c.trim(), tipo: t, nota: n.trim(), presupuesto: p.trim() }]; save(VIAJES_KEY, nv); return nv }); setD(''); setC(''); setN(''); setP(''); toast.show('✓ Viaje añadido') }

  return (
    <div>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <div className="sec-label" style={{ marginBottom: 10 }}>Añadir viaje</div>
        <input className="inp" value={d} onChange={e => setD(e.target.value)} placeholder="Destino (ej: Pirineos, Roma...)" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <input className="inp" value={c} onChange={e => setC(e.target.value)} placeholder="Cuándo (ej: verano 26)" style={{ marginBottom: 0 }} />
          <select className="inp" value={t} onChange={e => setT(e.target.value)} style={{ marginBottom: 0 }}>
            {['city','nature','beach','culture','gastro','adventure'].map(o => <option key={o} value={o}>{{city:'🏙 Ciudad',nature:'🏔 Naturaleza',beach:'🏖 Playa',culture:'🏛 Cultura',gastro:'🍽 Gastronómico',adventure:'🧗 Aventura'}[o]}</option>)}
          </select>
        </div>
        <input className="inp" value={p} onChange={e => setP(e.target.value)} placeholder="Presupuesto (opcional)" />
        <input className="inp" value={n} onChange={e => setN(e.target.value)} placeholder="Nota (quién lo recomendó, qué ver...)" />
        <button onClick={add} className="btn-primary">+ Añadir viaje</button>
      </div>
      {viajes.map(v => (
        <div key={v.id} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12, marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>{{city:'🏙',nature:'🏔',beach:'🏖',culture:'🏛',gastro:'🍽',adventure:'🧗'}[v.tipo]}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{v.destino}</div>
            <div style={{ fontSize: 11, color: 'var(--color-sub)' }}>{v.cuando}{v.presupuesto ? ' · ' + v.presupuesto + '€' : ''}</div>
            {v.nota && <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 2 }}>{v.nota}</div>}
          </div>
          <button onClick={() => { setViajes(vs => vs.filter(x => x.id !== v.id)); save(VIAJES_KEY, viajes.filter(x => x.id !== v.id)); toast.show('Eliminado') }}
            style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
        </div>
      ))}
    </div>
  )
}

function ActividadesTab() {
  const [acts, setActs] = useState<Actividad[]>(() => load(ACTIVIDADES_KEY, []))
  const toast = useToast()
  const [n, setN] = useState(''); const [c, setC] = useState(''); const [cat, setCat] = useState('sport'); const [nota, setNota] = useState('')
  function add() { if (!n.trim()) return; setActs(a => { const na = [...a, { id: Date.now(), nombre: n.trim(), cuando: c.trim(), categoria: cat, nota: nota.trim() }]; save(ACTIVIDADES_KEY, na); return na }); setN(''); setC(''); setNota(''); toast.show('✓ Actividad añadida') }

  return (
    <div>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <div className="sec-label" style={{ marginBottom: 10 }}>Añadir actividad</div>
        <input className="inp" value={n} onChange={e => setN(e.target.value)} placeholder="Actividad (ej: Escalada, Concierto...)" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <input className="inp" value={c} onChange={e => setC(e.target.value)} placeholder="Cuándo" style={{ marginBottom: 0 }} />
          <select className="inp" value={cat} onChange={e => setCat(e.target.value)} style={{ marginBottom: 0 }}>
            {['sport','culture','food','music','learn','social','other'].map(o => <option key={o} value={o}>{{sport:'🏃 Deporte',culture:'🎭 Cultura',food:'🍽 Gastro',music:'🎵 Música',learn:'📚 Aprender',social:'👥 Social',other:'✨ Otro'}[o]}</option>)}
          </select>
        </div>
        <input className="inp" value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota (dónde, con quién...)" />
        <button onClick={add} className="btn-primary" style={{ background: 'var(--color-acc-blue)' }}>+ Añadir actividad</button>
      </div>
      {acts.map(a => (
        <div key={a.id} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12, marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>{{sport:'🏃',culture:'🎭',food:'🍽',music:'🎵',learn:'📚',social:'👥',other:'✨'}[a.categoria]}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{a.nombre}</div>
            <div style={{ fontSize: 11, color: 'var(--color-sub)' }}>{a.cuando}{a.nota ? ' · ' + a.nota : ''}</div>
          </div>
          <button onClick={() => { setActs(as => as.filter(x => x.id !== a.id)); save(ACTIVIDADES_KEY, acts.filter(x => x.id !== a.id)); toast.show('Eliminado') }}
            style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
        </div>
      ))}
    </div>
  )
}

function ComprasTab() {
  const [items, setItems] = useState<ListaItem[]>(() => load(COMPRAS_KEY, []))
  const toast = useToast()
  const [text, setText] = useState('')
  function add() { if (!text.trim()) return; setItems(i => { const ni = [{ id: Date.now(), text: text.trim(), done: false }, ...i]; save(COMPRAS_KEY, ni); return ni }); setText(''); toast.show('✓ Añadido') }
  function toggle(id: number) { setItems(i => { const ni = i.map(x => x.id === id ? { ...x, done: !x.done } : x); save(COMPRAS_KEY, ni); return ni }) }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <input className="inp" value={text} onChange={e => setText(e.target.value)} placeholder="Añadir a la lista..." style={{ flex: 1, marginBottom: 0 }} onKeyDown={e => { if (e.key === 'Enter') add() }} />
        <button onClick={add} className="btn-ghost" style={{ width: 'auto', padding: '10px 20px', background: 'var(--color-acc-blue)', color: '#fff', border: 'none', borderRadius: 10 }}>+</button>
      </div>
      {items.filter(i => !i.done).map(i => (
        <div key={i.id} onClick={() => toggle(i.id)} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, border: '1.5px solid var(--color-border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text)' }}>{i.text}</span>
        </div>
      ))}
      {items.filter(i => i.done).length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="sec-label">Comprado ({items.filter(i => i.done).length})</div>
          {items.filter(i => i.done).map(i => (
            <div key={i.id} onClick={() => toggle(i.id)} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', opacity: 0.5 }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: '#166534', border: '1.5px solid var(--color-acc-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontSize: 11, flexShrink: 0 }}>✓</div>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--color-dim)', textDecoration: 'line-through' }}>{i.text}</span>
              <button onClick={e => { e.stopPropagation(); setItems(is => is.filter(x => x.id !== i.id)); save(COMPRAS_KEY, items.filter(x => x.id !== i.id)) }}
                style={{ background: 'none', border: 'none', color: 'var(--color-dim)', cursor: 'pointer', fontSize: 12 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InboxTab() {
  const [ideas, setIdeas] = useState<{ id: number; text: string; date: string }[]>(() => load(INBOX_KEY, []))
  const toast = useToast()
  const [text, setText] = useState('')
  function add() { if (!text.trim()) return; setIdeas(i => { const ni = [{ id: Date.now(), text: text.trim(), date: new Date().toISOString().slice(0, 10) }, ...i]; save(INBOX_KEY, ni); return ni }); setText(''); toast.show('✓ Idea guardada') }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <input className="inp" value={text} onChange={e => setText(e.target.value)} placeholder="Captura una idea..." style={{ flex: 1, marginBottom: 0 }} onKeyDown={e => { if (e.key === 'Enter') add() }} />
        <button onClick={add} className="btn-ghost" style={{ width: 'auto', padding: '10px 20px', background: 'var(--color-acc-purple)', color: '#fff', border: 'none', borderRadius: 10 }}>+</button>
      </div>
      {ideas.map(i => (
        <div key={i.id} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '12px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text)' }}>{i.text}</div>
            <div style={{ fontSize: 10, color: 'var(--color-dim)', marginTop: 2 }}>{i.date}</div>
          </div>
          <button onClick={() => { setIdeas(is => is.filter(x => x.id !== i.id)); save(INBOX_KEY, ideas.filter(x => x.id !== i.id)) }}
            style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
        </div>
      ))}
    </div>
  )
}

function ProyectosTab() {
  const [projs, setProjs] = useState<Proyecto[]>(() => load(PROYECTOS_KEY, []))
  const toast = useToast()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#5b8af0')
  function add() { if (!name.trim()) return; setProjs(p => { const np = [...p, { id: Date.now(), nombre: name.trim(), tareas: [], color }]; save(PROYECTOS_KEY, np); return np }); setName(''); toast.show('✓ Proyecto creado') }
  function addTarea(pid: number, text: string) {
    setProjs(p => { const np = p.map(x => x.id === pid ? { ...x, tareas: [...x.tareas, { text, done: false }] } : x); save(PROYECTOS_KEY, np); return np })
  }
  function toggleTarea(pid: number, tidx: number) {
    setProjs(p => { const np = p.map(x => x.id === pid ? { ...x, tareas: x.tareas.map((t, i) => i === tidx ? { ...t, done: !t.done } : t) } : x); save(PROYECTOS_KEY, np); return np })
  }

  return (
    <div>
      <div style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <div className="sec-label" style={{ marginBottom: 10 }}>Nuevo proyecto</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del proyecto..." style={{ flex: 1, marginBottom: 0 }} />
          <div style={{ display: 'flex', gap: 4 }}>
            {['#5b8af0','#52b788','#e07a5f','#c9a84c','#9b7fe0'].map(c => (
              <button key={c} onClick={() => setColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', border: color === c ? '2.5px solid var(--color-text)' : '2.5px solid transparent', background: c, cursor: 'pointer' }} />
            ))}
          </div>
          <button onClick={add} className="btn-ghost" style={{ width: 'auto', padding: '10px 16px', background: 'var(--color-acc-blue)', color: '#fff', border: 'none', borderRadius: 10 }}>Crear</button>
        </div>
      </div>
      {projs.map(p => {
        const done = p.tareas.filter(t => t.done).length
        const pct = p.tareas.length > 0 ? Math.round(done / p.tareas.length * 100) : 0
        return (
          <div key={p.id} style={{ background: 'var(--color-s1)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{p.nombre}</div>
                <div style={{ fontSize: 11, color: 'var(--color-dim)', marginTop: 2 }}>{p.tareas.length} tareas · {pct}%</div>
              </div>
              <button onClick={() => { setProjs(ps => ps.filter(x => x.id !== p.id)); save(PROYECTOS_KEY, projs.filter(x => x.id !== p.id)) }}
                style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(224,95,95,0.08)', color: 'var(--color-red)', border: '1px solid rgba(224,95,95,0.15)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
            </div>
            {p.tareas.length > 0 && (
              <div style={{ padding: '4px 14px' }}>
                {p.tareas.map((t, i) => (
                  <div key={i} onClick={() => toggleTarea(p.id, i)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', borderBottom: i < p.tareas.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${t.done ? p.color : 'var(--color-border2)'}`, background: t.done ? p.color + '33' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>{t.done ? '✓' : ''}</div>
                    <span style={{ flex: 1, fontSize: 12, color: t.done ? 'var(--color-dim)' : 'var(--color-text)', textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.03)', background: 'var(--color-s2)', display: 'flex', gap: 6 }}>
              <input className="inp" placeholder="Nueva tarea..." style={{ flex: 1, marginBottom: 0, padding: '6px 10px', fontSize: 12 }} onKeyDown={e => { if (e.key === 'Enter') { addTarea(p.id, (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = '' } }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
