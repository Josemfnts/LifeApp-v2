import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotesApi } from "./api";
import { PageEditor } from "./PageEditor";
import type { PageMeta } from "./types";
import "./notes.css";

export interface EntityNotesProps {
  supabase: SupabaseClient;
  /** Tipo de entidad de Life OS: 'workout' | 'project' | 'position' | 'goal' | 'day' | ... */
  entityType: string;
  /** Id de la entidad. Admite uuid, número o clave de fecha ('2026-07-09') */
  entityId: string;
  /** Título por defecto al crear la primera nota, p.ej. "Notas · Push 09/07" */
  defaultTitle?: string;
  theme?: "light" | "dark";
}

/**
 * EL CABLE. Suelta este componente en cualquier pantalla existente de
 * Life OS (detalle de entreno, proyecto, posición de trading, día del
 * diario) y esa entidad pasa a tener notas tipo Notion pegadas a ella.
 *
 *   <EntityNotes supabase={supabase} entityType="workout" entityId={workout.id} />
 */
export function EntityNotes({
  supabase,
  entityType,
  entityId,
  defaultTitle,
  theme = "dark",
}: EntityNotesProps) {
  const api = useMemo(() => createNotesApi(supabase), [supabase]);
  const [notes, setNotes] = useState<PageMeta[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setNotes(await api.pagesForEntity(entityType, entityId));
    } finally {
      setLoading(false);
    }
  }, [api, entityType, entityId]);

  useEffect(() => {
    setOpenId(null);
    setLoading(true);
    refresh();
  }, [refresh]);

  const handleCreate = async () => {
    const page = await api.createLinkedPage(entityType, entityId, defaultTitle);
    await refresh();
    setOpenId(page.id);
  };

  const handleUnlink = async (pageId: string) => {
    await api.unlinkPage(pageId, entityType, entityId);
    if (openId === pageId) setOpenId(null);
    await refresh();
  };

  if (loading) return null;

  return (
    <section className="lifeos-entity-notes">
      <header className="lifeos-entity-notes__head">
        <h4>Notas</h4>
        <button className="lifeos-entity-notes__add" onClick={handleCreate}>
          + Nota
        </button>
      </header>

      {notes.length === 0 && (
        <p className="lifeos-entity-notes__hint">
          Sin notas todavía. Crea una y quedará pegada a esta pantalla.
        </p>
      )}

      <ul className="lifeos-entity-notes__list">
        {notes.map((n) => (
          <li key={n.id}>
            <button
              className={
                "lifeos-entity-notes__item" +
                (openId === n.id ? " lifeos-entity-notes__item--open" : "")
              }
              onClick={() => setOpenId(openId === n.id ? null : n.id)}
            >
              {n.icon ?? "📄"} {n.title || "Sin título"}
            </button>
            <button
              className="lifeos-entity-notes__unlink"
              title="Desenganchar de esta pantalla (la nota no se borra)"
              onClick={() => handleUnlink(n.id)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {openId && (
        <div className="lifeos-entity-notes__editor">
          <PageEditor api={api} pageId={openId} theme={theme} />
        </div>
      )}
    </section>
  );
}
