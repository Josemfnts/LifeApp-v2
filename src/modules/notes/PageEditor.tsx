import { useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import * as locales from "@blocknote/core/locales";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import type { NotesApi } from "./api";
import { usePage } from "./hooks";
import type { BlockDoc } from "./types";

/** Saca texto plano del documento BlockNote (para pages.search_text) */
export function extractPlainText(blocks: any[]): string {
  const out: string[] = [];
  const walk = (bs: any[]) => {
    for (const b of bs ?? []) {
      if (Array.isArray(b.content)) {
        for (const c of b.content) {
          if (typeof c?.text === "string") out.push(c.text);
        }
      }
      if (Array.isArray(b.children) && b.children.length) walk(b.children);
    }
  };
  walk(blocks);
  return out.join(" ").slice(0, 20000); // límite sano
}

const STATUS_LABEL: Record<string, string> = {
  idle: "",
  saving: "Guardando…",
  saved: "Guardado",
  error: "Error al guardar — reintenta escribiendo",
};

/** Set curado de emojis para el icono de página (sin dependencias externas) */
const EMOJIS = [
  "📄", "📝", "📓", "📔", "📕", "📗", "📘", "📙",
  "📚", "🗒️", "💡", "🎯", "📌", "📅", "📋", "✅",
  "🏋️", "🏃", "💪", "🧘", "🍎", "🥗", "🍳", "🛒",
  "💰", "📈", "✈️", "🏠", "❤️", "🔥", "⭐", "🧠",
  "🎬", "🎵", "🛠️", "🎁", "🌱", "☀️", "🌙", "📷",
];

function IconPicker({ current, onPick }: { current: string | null; onPick: (icon: string | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lifeos-notes-icon">
      <button
        className="lifeos-notes-icon__btn"
        title="Cambiar icono"
        aria-label="Cambiar icono"
        onClick={() => setOpen((o) => !o)}
      >
        {current || "📄"}
      </button>
      {open && (
        <>
          <div className="lifeos-notes-icon__backdrop" onClick={() => setOpen(false)} />
          <div className="lifeos-notes-icon__pop">
            <div className="lifeos-notes-icon__grid">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  className={"lifeos-notes-icon__cell" + (e === current ? " lifeos-notes-icon__cell--on" : "")}
                  onClick={() => { onPick(e); setOpen(false); }}
                >
                  {e}
                </button>
              ))}
            </div>
            {current && (
              <button className="lifeos-notes-icon__clear" onClick={() => { onPick(null); setOpen(false); }}>
                Quitar icono
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface InnerProps {
  api: NotesApi;
  pageId: string;
  initialContent?: BlockDoc | null;
  title: string;
  icon: string | null;
  onTitleChange: (t: string) => void;
  onIconChange: (icon: string | null) => void;
  onDocChange: (doc: BlockDoc, plain: string) => void;
  statusLabel: string;
  theme?: "light" | "dark";
}

/** Editor interno: se monta una vez por página (key=pageId desde fuera) */
function EditorInner({
  initialContent,
  title,
  icon,
  onTitleChange,
  onIconChange,
  onDocChange,
  statusLabel,
  theme = "dark",
}: InnerProps) {
  const editor = useCreateBlockNote({
    // Menú "/" y toda la UI del editor en español.
    dictionary: locales.es,
    // BlockNote no admite array vacío como initialContent
    initialContent:
      initialContent && (initialContent as any[]).length > 0
        ? (initialContent as any)
        : undefined,
  });

  const isEmptyDoc = !initialContent || (initialContent as any[]).length === 0;

  return (
    <div className="lifeos-notes-editor">
      <div className="lifeos-notes-editor__head">
        <IconPicker current={icon} onPick={onIconChange} />
        <input
          className="lifeos-notes-editor__title"
          value={title}
          placeholder="Sin título"
          // Página recién creada: foco directo al título para nombrarla al vuelo.
          autoFocus={title === "Sin título"}
          onFocus={(e) => { if (e.target.value === "Sin título") e.target.select(); }}
          onChange={(e) => onTitleChange(e.target.value)}
        />
        <span className="lifeos-notes-editor__status">{statusLabel}</span>
      </div>
      {isEmptyDoc && (
        <div className="lifeos-notes-editor__hint">
          Escribe, o pulsa <kbd>/</kbd> para insertar títulos, listas, tablas…
        </div>
      )}
      <BlockNoteView
        editor={editor}
        theme={theme}
        onChange={() => {
          const doc = editor.document as unknown as BlockDoc;
          onDocChange(doc, extractPlainText(doc as any[]));
        }}
      />
    </div>
  );
}

export interface PageEditorProps {
  api: NotesApi;
  pageId: string | null;
  theme?: "light" | "dark";
  /** Para refrescar el título en la sidebar sin refetch */
  onTitleChange?: (id: string, title: string) => void;
  /** Para refrescar el icono en la sidebar sin refetch */
  onIconChange?: (id: string, icon: string | null) => void;
}

/** Componente público: carga la página, autoguarda, remonta el editor al cambiar de página */
export function PageEditor({ api, pageId, theme, onTitleChange, onIconChange }: PageEditorProps) {
  const { page, loading, status, queueSave } = usePage(api, pageId);

  if (!pageId)
    return <div className="lifeos-notes-empty">Elige una página o crea una nueva.</div>;
  if (loading || !page)
    return <div className="lifeos-notes-empty">Cargando…</div>;

  return (
    <EditorInner
      key={page.id} // remonta BlockNote al cambiar de página
      api={api}
      pageId={page.id}
      initialContent={page.content}
      title={page.title}
      icon={page.icon}
      statusLabel={STATUS_LABEL[status]}
      theme={theme}
      onTitleChange={(t) => {
        queueSave({ title: t });
        onTitleChange?.(page.id, t);
      }}
      onIconChange={(icon) => {
        queueSave({ icon });
        onIconChange?.(page.id, icon);
      }}
      onDocChange={(doc, plain) => queueSave({ content: doc, search_text: plain })}
    />
  );
}
