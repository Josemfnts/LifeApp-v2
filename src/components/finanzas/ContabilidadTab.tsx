import { useState } from 'react'
import { ChipTabs, EmptyState } from '@/components/ui'
import { PROJECTS, PROJECT_FILTER_ALL, type ProjectFilter } from '@/lib/finance/projects'

// F0 de Contabilidad por proyecto: solo la pantalla y el selector. Cero cálculos, cero cifras.
// Cobros / Gastos / Balance llegan en F1-F4.
export function ContabilidadTab() {
  const [project, setProject] = useState<ProjectFilter>(PROJECT_FILTER_ALL)
  const [view, setView] = useState<'mes' | 'anio'>('mes')

  const projectItems = [
    { key: PROJECT_FILTER_ALL, label: 'Todos' },
    ...PROJECTS.map(p => ({ key: p.id, label: p.label, color: p.color })),
  ] as const

  const viewItems = [
    { key: 'mes', label: 'Mes' },
    { key: 'anio', label: 'Año' },
  ] as const

  return (
    <div>
      <ChipTabs items={projectItems} value={project} onChange={setProject} variant="chips" />
      <ChipTabs items={viewItems} value={view} onChange={setView} variant="line" />

      <div key={view} className="animate-tab">
        {view === 'mes' ? (
          <>
            <section>
              <div className="sec-label">Cobros</div>
              <EmptyState message="Los cobros del mes llegan en la fase siguiente." />
            </section>
            <section style={{ marginTop: 20 }}>
              <div className="sec-label">Gastos</div>
              <EmptyState message="Los gastos del mes llegan en la fase siguiente." />
            </section>
            <section style={{ marginTop: 20 }}>
              <div className="sec-label">Balance</div>
              <EmptyState message="El balance del mes llega en la fase siguiente." />
            </section>
          </>
        ) : (
          <EmptyState message="El resumen anual por proyecto llega en la fase siguiente." />
        )}
      </div>
    </div>
  )
}