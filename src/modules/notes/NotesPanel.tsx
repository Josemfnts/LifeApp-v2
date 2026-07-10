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
    const p = pages.find((x) => x.id === pageId);
    return p ? `${p.icon ? p.icon + " " : ""}${p.title || "Sin título"}` : "Sin título";
  }, [pages, pageId]);

  // Miga de pan: cadena de ancestros de la página activa (raíz primero).
  const crumbs = useMemo(() => {
    if (!pageId) return [];
    const byId = new Map(pages.map((p) => [p.id, p]));
    const chain: PageMeta[] = [];
    let cur = byId.get(pageId);
    let guard = 0;
    while (cur && guard++ < 20) {
      chain.unshift(cur);
      cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    }
    return chain;
  }, [pages, pageId]);

  // Recientes para la pantalla de inicio (últimas editadas).
  const recents = useMemo(
    () => [...pages].sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || "")).slice(0, 6),
    [pages]
  );

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
            {pageId ? (
              <>
                {crumbs.length > 0 && (
                  <nav className="notes-crumbs" aria-label="Ruta">
                    <button className="notes-crumbs__item" onClick={() => selectPage(null)}>Notas</button>
                    {crumbs.map((c, i) => (
                      <span key={c.id} className="notes-crumbs__seg">
                        <span className="notes-crumbs__sep">›</span>
                        {i < crumbs.length - 1 ? (
                          <button className="notes-crumbs__item" onClick={() => selectPage(c.id)}>
                            {c.icon ? c.icon + " " : ""}{c.title || "Sin título"}
                          </button>
                        ) : (
                          <span className="notes-crumbs__item notes-crumbs__item--current">
                            {c.icon ? c.icon + " " : ""}{c.title || "Sin título"}
                          </span>
                        )}
                      </span>
                    ))}
                  </nav>
                )}
                <div className="notes-editor-wrap">
                  <PageEditor
                    api={api}
                    pageId={pageId}
                    theme={theme}
                    onTitleChange={(id, title) => patchLocal(id, { title })}
                    onIconChange={(id, icon) => patchLocal(id, { icon })}
                  />
                </div>
              </>
            ) : (
              /* Pantalla de inicio: acciones claras en vez de un editor vacío. */
              <div className="notes-home">
                <div className="notes-home__title">📚 Tus notas</div>
                <div className="notes-home__actions">
                  <button className="notes-home__action" onClick={openDiaryToday}>
                    <span className="notes-home__action-icon">📓</span>
                    <span>Diario de hoy</span>
                  </button>
                  <button className="notes-home__action" onClick={() => handleCreate(null)}>
                    <span className="notes-home__action-icon">＋</span>
                    <span>Nueva página</span>
                  </button>
                </div>
                {favorites.length > 0 && (
                  <>
                    <div className="notes-home__section">★ Favoritos</div>
                    <div className="notes-home__list">
                      {favorites.slice(0, 8).map((f) => (
                        <button key={f.id} className="notes-home__row" onClick={() => selectPage(f.id)}>
                          <span className="notes-home__row-icon">{f.icon ?? "📄"}</span>
                          <span className="notes-home__row-title">{f.title || "Sin título"}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {recents.length > 0 && (
                  <>
                    <div className="notes-home__section">Recientes</div>
                    <div className="notes-home__list">
                      {recents.map((r) => (
                        <button key={r.id} className="notes-home__row" onClick={() => selectPage(r.id)}>
                          <span className="notes-home__row-icon">{r.icon ?? "📄"}</span>
                          <span className="notes-home__row-title">{r.title || "Sin título"}</span>
                          <span className="notes-home__row-date">
                            {(r.updated_at || "").slice(0, 10)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <div className="notes-home__hint">
                  ☰ abre todas tus páginas · dentro de una nota, pulsa <kbd>/</kbd> para títulos, listas, tablas…
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
