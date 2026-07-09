import { useMemo, useState, useEffect, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotesApi } from "./api";
import { usePagesTree } from "./hooks";
import { PageTree } from "./PageTree";
import { PageEditor } from "./PageEditor";
import type { PageMeta } from "./types";
import "./notes.css";

export interface NotesPanelProps {
  supabase: SupabaseClient;
  theme?: "light" | "dark";
  /** Botón "volver" de la barra superior (sale de la pantalla Notas) */
  onBack?: () => void;
}

const WIDE = 900;

/**
 * Pantalla "Notas" a pantalla completa: barra propia mínima, árbol en cajón
 * (drawer) deslizante y editor inmersivo. Buscador, favoritos, papelera,
 * drag&drop y "Diario de hoy".
 */
export function NotesPanel({ supabase, theme = "dark", onBack }: NotesPanelProps) {
  const api = useMemo(() => createNotesApi(supabase), [supabase]);
  const { tree, pages, loading, error, createPage, trashPage, patchLocal, toggleFavorite, movePage, refresh } =
    usePagesTree(api);

  const [pageId, setInternalId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== "undefined" ? window.innerWidth >= WIDE : true));

  // Al elegir una página, en móvil cerramos el cajón para que el editor ocupe todo.
  const selectPage = useCallback((id: string | null) => {
    setInternalId(id);
    if (typeof window !== "undefined" && window.innerWidth < WIDE) setSidebarOpen(false);
  }, []);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PageMeta[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const [trash, setTrash] = useState<PageMeta[]>([]);

  // Buscador debounced (título + texto plano)
  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.search(term).then(setResults).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query, api]);

  // Cargar papelera al abrirla
  useEffect(() => {
    if (showTrash) api.listTrash().then(setTrash).catch(() => setTrash([]));
  }, [showTrash, api]);

  const favorites = useMemo(() => pages.filter((p) => p.is_favorite), [pages]);
  const activeTitle = useMemo(() => {
    if (!pageId) return "Notas";
    return pages.find((p) => p.id === pageId)?.title || "Sin título";
  }, [pages, pageId]);

  const handleCreate = async (parentId: string | null) => {
    const page = await createPage(parentId);
    selectPage(page.id);
  };

  const handleTrash = async (id: string) => {
    await trashPage(id);
    if (pageId === id) setInternalId(null);
  };

  const handleRestore = useCallback(
    async (id: string) => {
      await api.restorePage(id);
      setTrash((t) => t.filter((x) => x.id !== id));
      await refresh();
    },
    [api, refresh]
  );

  const handleDeleteForever = useCallback(
    async (id: string) => {
      await api.deleteForever(id);
      setTrash((t) => t.filter((x) => x.id !== id));
      if (pageId === id) setInternalId(null);
    },
    [api, pageId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // "Diario de hoy": abre (o crea) la nota enganchada al día de hoy.
  const todayKey = new Date().toISOString().slice(0, 10);
  const openDiaryToday = async () => {
    const existing = await api.pagesForEntity("day", todayKey);
    const page = existing[0] ?? (await api.createLinkedPage("day", todayKey, `Diario · ${todayKey}`));
    await refresh();
    selectPage(page.id);
  };

  return (
    <div className="notes-screen">
      <header className="notes-topbar">
        {onBack && (
          <button className="notes-topbar__btn" onClick={onBack} title="Volver" aria-label="Volver">
            ‹
          </button>
        )}
        <button
          className={"notes-topbar__btn" + (sidebarOpen ? " notes-topbar__btn--active" : "")}
          onClick={() => setSidebarOpen((o) => !o)}
          title="Páginas"
          aria-label="Páginas"
        >
          ☰
        </button>
        <div className="notes-topbar__title">{activeTitle}</div>
        <button className="notes-topbar__btn" onClick={() => handleCreate(null)} title="Nueva página" aria-label="Nueva página">
          +
        </button>
      </header>

      {loading ? (
        <div className="lifeos-notes-empty">Cargando notas…</div>
      ) : error ? (
        <div className="lifeos-notes-empty">Error: {error}</div>
      ) : (
        <div className="notes-body">
          {sidebarOpen && <div className="notes-backdrop" onClick={() => setSidebarOpen(false)} />}
          <aside className={"notes-sidebar" + (sidebarOpen ? " notes-sidebar--open" : "")}>
            <button className="lifeos-notes__diary-today" onClick={openDiaryToday}>
              📓 Diario de hoy
            </button>
            <div className="lifeos-notes__toolbar">
              <input
                className="lifeos-notes__search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
              />
              <button
                className={"lifeos-notes__trash-toggle" + (showTrash ? " lifeos-notes__trash-toggle--active" : "")}
                title="Papelera"
                onClick={() => setShowTrash((s) => !s)}
              >
                🗑
              </button>
            </div>

            {showTrash ? (
              <div>
                <div className="lifeos-notes-tree__section">Papelera</div>
                {trash.length === 0 && <div className="lifeos-notes-trash__empty">Vacía.</div>}
                {trash.map((t) => (
                  <div key={t.id} className="lifeos-notes-trash__row">
                    <span className="lifeos-notes-trash__label">
                      {t.icon ?? "📄"} {t.title || "Sin título"}
                    </span>
                    <button title="Restaurar" onClick={() => handleRestore(t.id)}>
                      ↩
                    </button>
                    <button title="Borrar para siempre" onClick={() => handleDeleteForever(t.id)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : query.trim() ? (
              <div>
                <div className="lifeos-notes-tree__section">Resultados</div>
                {results.length === 0 && <div className="lifeos-notes-trash__empty">Sin coincidencias.</div>}
                {results.map((r) => (
                  <div
                    key={r.id}
                    className={"lifeos-notes-tree__row" + (r.id === pageId ? " lifeos-notes-tree__row--active" : "")}
                  >
                    <button className="lifeos-notes-tree__label" onClick={() => selectPage(r.id)} title={r.title}>
                      <span className="lifeos-notes-tree__icon">{r.icon ?? "📄"}</span>
                      {r.title || "Sin título"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {favorites.length > 0 && (
                  <div>
                    <div className="lifeos-notes-tree__section">★ Favoritos</div>
                    {favorites.map((f) => (
                      <div
                        key={f.id}
                        className={"lifeos-notes-tree__row" + (f.id === pageId ? " lifeos-notes-tree__row--active" : "")}
                      >
                        <button className="lifeos-notes-tree__label" onClick={() => selectPage(f.id)} title={f.title}>
                          <span className="lifeos-notes-tree__icon">{f.icon ?? "📄"}</span>
                          {f.title || "Sin título"}
                        </button>
                      </div>
                    ))}
                    <div className="lifeos-notes-tree__section">Páginas</div>
                  </div>
                )}
                <PageTree
                  tree={tree}
                  activeId={pageId}
                  onSelect={selectPage}
                  onCreateChild={handleCreate}
                  onTrash={handleTrash}
                  onToggleFav={toggleFavorite}
                  onMove={movePage}
                />
              </>
            )}
          </aside>

          <main className="notes-main">
            <div className="notes-editor-wrap">
              <PageEditor api={api} pageId={pageId} theme={theme} onTitleChange={(id, title) => patchLocal(id, { title })} />
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
