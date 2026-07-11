import type { SupabaseClient } from "@supabase/supabase-js";
import type { Page, PageMeta, BlockDoc } from "./types";

const META_COLS =
  "id,user_id,parent_id,title,icon,is_favorite,position,deleted_at,created_at,updated_at";

/**
 * Capa de datos del módulo Notas. Se inyecta el cliente Supabase
 * que Life OS ya tiene creado — el módulo no crea clientes propios.
 */
export function createNotesApi(supabase: SupabaseClient) {
  async function uid(): Promise<string> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new Error("Sin sesión");
    return data.user.id;
  }

  return {
    /** Todas las páginas vivas del usuario (sin contenido, para el árbol) */
    async listPages(): Promise<PageMeta[]> {
      const { data, error } = await supabase
        .from("pages")
        .select(META_COLS)
        .is("deleted_at", null)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PageMeta[];
    },

    /** Página completa (con contenido) */
    async getPage(id: string): Promise<Page> {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Page;
    },

    async createPage(opts?: {
      parentId?: string | null;
      title?: string;
      icon?: string | null;
    }): Promise<Page> {
      const { data, error } = await supabase
        .from("pages")
        .insert({
          user_id: await uid(),
          parent_id: opts?.parentId ?? null,
          title: opts?.title ?? "Sin título",
          icon: opts?.icon ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as Page;
    },

    /** Guardado del editor (contenido + título + texto de búsqueda) */
    async savePage(
      id: string,
      patch: Partial<{
        title: string;
        icon: string | null;
        content: BlockDoc;
        search_text: string;
        is_favorite: boolean;
        parent_id: string | null;
        position: number;
      }>
    ): Promise<void> {
      const { error } = await supabase.from("pages").update(patch).eq("id", id);
      if (error) throw error;
    },

    /** Papelera: soft delete (los hijos siguen colgando; se ocultan con la raíz) */
    async trashPage(id: string): Promise<void> {
      const { error } = await supabase
        .from("pages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },

    async restorePage(id: string): Promise<void> {
      const { error } = await supabase
        .from("pages")
        .update({ deleted_at: null })
        .eq("id", id);
      if (error) throw error;
    },

    async listTrash(): Promise<PageMeta[]> {
      const { data, error } = await supabase
        .from("pages")
        .select(META_COLS)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PageMeta[];
    },

    async deleteForever(id: string): Promise<void> {
      const { error } = await supabase.from("pages").delete().eq("id", id);
      if (error) throw error;
    },

    /** Buscador simple: título + texto plano del contenido */
    async search(term: string): Promise<PageMeta[]> {
      // Neutraliza los metacaracteres del filtro PostgREST `.or()` (coma,
      // paréntesis, comodines, backslash); sin esto una coma rompe el filtro (400).
      const clean = term.trim().replace(/[,()\\%*]/g, " ").replace(/\s+/g, " ").trim();
      if (!clean) return [];
      const q = `%${clean}%`;
      const { data, error } = await supabase
        .from("pages")
        .select(META_COLS)
        .is("deleted_at", null)
        .or(`title.ilike.${q},search_text.ilike.${q}`)
        .limit(20);
      if (error) throw error;
      return (data ?? []) as PageMeta[];
    },

    // ---- Cables página <-> entidad --------------------------------

    /** Páginas enganchadas a una entidad de Life OS (un entreno, un proyecto...) */
    async pagesForEntity(entityType: string, entityId: string): Promise<PageMeta[]> {
      const { data, error } = await supabase
        .from("page_links")
        .select(`page:pages!inner(${META_COLS})`)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);
      if (error) throw error;
      return ((data ?? []) as any[])
        .map((r) => r.page as PageMeta)
        .filter((p) => p && !p.deleted_at);
    },

    async linkPage(pageId: string, entityType: string, entityId: string): Promise<void> {
      const { error } = await supabase
        .from("page_links")
        .upsert({ page_id: pageId, entity_type: entityType, entity_id: entityId });
      if (error) throw error;
    },

    async unlinkPage(pageId: string, entityType: string, entityId: string): Promise<void> {
      const { error } = await supabase
        .from("page_links")
        .delete()
        .match({ page_id: pageId, entity_type: entityType, entity_id: entityId });
      if (error) throw error;
    },

    /** Atajo para el componente EntityNotes: crea página ya enganchada */
    async createLinkedPage(
      entityType: string,
      entityId: string,
      title?: string
    ): Promise<Page> {
      const page = await this.createPage({ title });
      await this.linkPage(page.id, entityType, entityId);
      return page;
    },
  };
}

export type NotesApi = ReturnType<typeof createNotesApi>;
