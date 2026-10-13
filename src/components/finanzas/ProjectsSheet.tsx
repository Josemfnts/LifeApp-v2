import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, ConfirmDialog } from '@/components/ui'
import { useFinanceStore } from '@/stores/financeStore'
import { useToast } from '@/stores/toast'
import {
  OTHER_PROJECT,
  selectActiveProjects,
  type ProjectDef,
  type ProjectId,
} from '@/lib/finance/projects'

interface Props {
  open: boolean
  onClose: () => void
}

// Hoja para que Josema gestione su catálogo de proyectos de Contabilidad:
// añadir uno nuevo (ej. "3D"), renombrar (ej. "Clocks" → "Clocks Barber"),
// archivar (fuera del selector, pero el histórico sigue siendo suyo) y
// desarchivar. Los errores que devuelven las funciones puras se enseñan tal
// cual en un toast: nada de inventar textos.
//
// El cajón "Otros" siempre se ve al final y no se puede tocar (es donde caen
// los movimientos sin proyecto).
export function ProjectsSheet({ open, onClose }: Props) {
  const projects = useFinanceStore(s => s.projects)
  const addProject = useFinanceStore(s => s.addProject)
  const renameProject = useFinanceStore(s => s.renameProject)
  const archiveProject = useFinanceStore(s => s.archiveProject)
  const toast = useToast()

  const [newLabel, setNewLabel] = useState('')
  const [editingId, setEditingId] = useState<ProjectId | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [confirmArchiveId, setConfirmArchiveId] = useState<ProjectId | null>(null)
  // Refresco el input "nuevo" cada vez que se abre la hoja (mismo patrón que
  // QuickAddSheet/ContaAddSheet: si dependiera del store, una escritura del
  // espejo vivo podría pisar lo que Josema está tecleando).
  const wasOpen = useRef(false)
  useEffect(() => {
    const opening = open && !wasOpen.current
    wasOpen.current = open
    if (opening) {
      setNewLabel('')
      setEditingId(null)
      setEditingLabel('')
      setConfirmArchiveId(null)
    }
  }, [open])

  const activeList = useMemo(() => selectActiveProjects(projects), [projects])
  const archivedList = useMemo(() => projects.filter(p => p.archived), [projects])

  function handleAdd() {
    const label = newLabel.trim()
    if (!label) return
    const r = addProject(label)
    if (!r.ok) { toast.show(r.error ?? 'No se pudo añadir'); return }
    setNewLabel('')
    toast.show(`✓ Proyecto "${label}" añadido`)
  }

  function startRename(p: ProjectDef) {
    setEditingId(p.id)
    setEditingLabel(p.label)
  }

  function commitRename() {
    if (!editingId) return
    const next = editingLabel.trim()
    if (!next) { setEditingId(null); return }
    const r = renameProject(editingId, next)
    if (!r.ok) { toast.show(r.error ?? 'No se pudo renombrar'); return }
    setEditingId(null)
    setEditingLabel('')
    toast.show('✓ Proyecto renombrado')
  }

  function cancelRename() {
    setEditingId(null)
    setEditingLabel('')
  }

  const confirmTarget = confirmArchiveId !== null
    ? projects.find(p => p.id === confirmArchiveId) ?? null
    : null

  return (
    <Modal open={open} onClose={onClose} title="Proyectos">
      <div style={{ padding: '0 20px 8px' }}>
        <div className="sec-label" style={{ marginBottom: 8 }}>Activos</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {activeList.map(p => (
            <ProjectRow
              key={p.id}
              project={p}
              editing={editingId === p.id}
              editingLabel={editingLabel}
              onStartRename={() => startRename(p)}
              onChangeEditing={setEditingLabel}
              onCommitRename={commitRename}
              onCancelRename={cancelRename}
              onArchive={() => setConfirmArchiveId(p.id)}
            />
          ))}
          {activeList.length === 1 && activeList[0].id === OTHER_PROJECT && (
            <div style={{ fontSize: 12, color: 'var(--color-dim)', padding: '12px 4px' }}>
              Aún no tienes proyectos. Añade el primero abajo.
            </div>
          )}
        </div>

        <div className="sec-label" style={{ marginBottom: 8 }}>Añadir proyecto</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          <input
            className="inp"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            placeholder="Ej: 3D"
            style={{ flex: 1 }}
          />
          <button
            onClick={handleAdd}
            disabled={newLabel.trim().length === 0}
            className="btn-primary"
            style={{
              background: newLabel.trim().length === 0 ? 'var(--color-s2)' : 'var(--color-acc-gold)',
              color: newLabel.trim().length === 0 ? 'var(--color-dim)' : '#111',
              cursor: newLabel.trim().length === 0 ? 'not-allowed' : 'pointer',
              padding: '0 16px',
            }}
          >Añadir</button>
        </div>

        {archivedList.length > 0 && (
          <>
            <div className="sec-label" style={{ marginBottom: 8 }}>Archivados</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {archivedList.map(p => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  editing={false}
                  editingLabel=""
                  onStartRename={() => startRename(p)}
                  onChangeEditing={setEditingLabel}
                  onCommitRename={commitRename}
                  onCancelRename={cancelRename}
                  onArchive={() => archiveProject(p.id, false)}
                  archiveLabel="Reactivar"
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, padding: '12px 20px 0' }}>
        <button onClick={onClose} className="btn-ghost" style={{ width: '100%' }}>Listo</button>
      </div>

      <ConfirmDialog
        open={confirmTarget !== null}
        title="Archivar proyecto"
        message={confirmTarget ? `Vas a archivar "${confirmTarget.label}". Saldrá del selector pero sus movimientos y pendientes siguen sumando en su fila.` : ''}
        confirmLabel="Archivar"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (!confirmTarget) return
          const r = archiveProject(confirmTarget.id, true)
          if (!r.ok) toast.show(r.error ?? 'No se pudo archivar')
          else toast.show(`✓ "${confirmTarget.label}" archivado`)
          setConfirmArchiveId(null)
        }}
        onClose={() => setConfirmArchiveId(null)}
      />
    </Modal>
  )
}

interface ProjectRowProps {
  project: ProjectDef
  editing: boolean
  editingLabel: string
  onStartRename: () => void
  onChangeEditing: (v: string) => void
  onCommitRename: () => void
  onCancelRename: () => void
  onArchive: () => void
  archiveLabel?: string
}

function ProjectRow({ project, editing, editingLabel, onStartRename, onChangeEditing, onCommitRename, onCancelRename, onArchive, archiveLabel = 'Archivar' }: ProjectRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        background: 'var(--color-s2)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
      }}
    >
      {project.color && (
        <span aria-hidden style={{
          width: 8,
          height: 8,
          borderRadius: 99,
          background: project.color,
          flexShrink: 0,
        }} />
      )}
      {editing ? (
        <input
          autoFocus
          className="inp"
          value={editingLabel}
          onChange={e => onChangeEditing(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onCommitRename()
            else if (e.key === 'Escape') onCancelRename()
          }}
          onBlur={onCommitRename}
          style={{ flex: 1, padding: '6px 10px', fontSize: 14 }}
        />
      ) : (
        <div style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--color-text)', fontWeight: 500 }}>
          {project.label}
          <span style={{ fontSize: 11, color: 'var(--color-dim)', marginLeft: 6 }}>· {project.id}</span>
        </div>
      )}
      {!editing && (
        <>
          <button
            type="button"
            onClick={onStartRename}
            aria-label={`Renombrar ${project.label}`}
            style={chipBtn}
          >✎</button>
          <button
            type="button"
            onClick={onArchive}
            aria-label={`${archiveLabel} ${project.label}`}
            style={chipBtn}
          >{archiveLabel === 'Reactivar' ? '↺' : '⤓'}</button>
        </>
      )}
    </div>
  )
}

const chipBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  background: 'var(--color-s1)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-sub)',
  fontSize: 14,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}