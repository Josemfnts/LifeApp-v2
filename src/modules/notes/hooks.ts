import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NotesApi } from "./api";
import type { Page, PageMeta, PageNode, BlockDoc, SaveStatus } from "./types";

/** Lista plana -> árbol para la sidebar */
export function buildTree(pages: PageMeta[]): PageNode[] {
  const map = new Map<string, PageNode>();
  pages.forEach((p) => map.set(p.id, { ...p, children: [] }));
  const roots: PageNode[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

/** Árbol de páginas + operaciones de la sidebar */
export function usePagesTree(api: NotesApi) {
  const [pages, setPages] = useState<PageMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setPages(await api.listPages());
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Error cargando páginas");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const tree = useMemo(() => buildTree(pages), [pages]);

  const createPage = useCallback(
    async (parentId?: string | null) => {
      const page = await api.createPage({ parentId });
      await refresh();
      return page;
    },
    [api, refresh]
  );

  const trashPage = useCallback(
    async (id: string) => {
      await api.trashPage(id);
      await refresh();
    },
    [api, refresh]
  );

  /** Actualiza el título en el árbol sin refetch (lo llama el editor al escribir) */
  const patchLocal = useCallback((id: string, patch: Partial<PageMeta>) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  /** Marca/desmarca favorito (optimista, sin refetch) */
  const toggleFavorite = useCallback(
    async (id: string, next: boolean) => {
      patchLocal(id, { is_favorite: next });
      try {
        await api.savePage(id, { is_favorite: next });
      } catch {
        patchLocal(id, { is_favorite: !next }); // revierte si falla
      }
    },
    [api, patchLocal]
  );

  /** Reparenta una página (drag&drop en la sidebar). newParentId=null -> raíz.
   *  La coloca al final de su nuevo nivel (position = ahora). */
  const movePage = useCallback(
    async (id: string, newParentId: string | null) => {
      if (id === newParentId) return;
      // evita crear un ciclo: no soltar una página dentro de un descendiente suyo
      const descendants = new Set<string>();
      const collect = (pid: string) => {
        for (const c of pages.filter((p) => p.parent_id === pid)) {
          descendants.add(c.id);
          collect(c.id);
        }
      };
      collect(id);
      if (newParentId && descendants.has(newParentId)) return;

      await api.savePage(id, { parent_id: newParentId, position: Date.now() });
      await refresh();
    },
    [api, pages, refresh]
  );

  return { tree, pages, loading, error, refresh, createPage, trashPage, patchLocal, toggleFavorite, movePage };
}

const AUTOSAVE_MS = 800;

/** Página individual con autoguardado debounced y estado de guardado */
export function usePage(api: NotesApi, pageId: string | null) {
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Record<string, unknown>>({});

  useEffect(() => {
    setPage(null);
    pending.current = {};
    if (timer.current) clearTimeout(timer.current);
    if (!pageId) return;
    setLoading(true);
    api
      .getPage(pageId)
      .then(setPage)
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, [api, pageId]);

  const flush = useCallback(async () => {
    if (!pageId || Object.keys(pending.current).length === 0) return;
    const patch = pending.current;
    pending.current = {};
    setStatus("saving");
    try {
      await api.savePage(pageId, patch);
      setStatus("saved");
    } catch {
      setStatus("error");
      pending.current = { ...patch, ...pending.current }; // reintenta en el próximo save
    }
  }, [api, pageId]);

  /** Encola cambios; se guardan solos tras AUTOSAVE_MS sin teclear */
  const queueSave = useCallback(
    (patch: Partial<{ title: string; icon: string | null; content: BlockDoc; search_text: string }>) => {
      pending.current = { ...pending.current, ...patch };
      setPage((prev) => (prev ? ({ ...prev, ...patch } as Page) : prev));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, AUTOSAVE_MS);
    },
    [flush]
  );

  // Guardar al desmontar / cambiar de página
  useEffect(() => () => void flush(), [flush]);

  return { page, loading, status, queueSave, flush };
}
