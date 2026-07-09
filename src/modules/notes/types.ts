/** Documento BlockNote serializado (array de bloques). Se guarda tal cual en pages.content */
export type BlockDoc = unknown[];

export interface Page {
  id: string;
  user_id: string;
  parent_id: string | null;
  title: string;
  icon: string | null;
  content: BlockDoc | null;
  search_text: string | null;
  is_favorite: boolean;
  position: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Versión ligera para sidebar/listas (sin content) */
export type PageMeta = Omit<Page, "content" | "search_text">;

export interface PageLink {
  page_id: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

/** Nodo del árbol de la sidebar */
export interface PageNode extends PageMeta {
  children: PageNode[];
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";
