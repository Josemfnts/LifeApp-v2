import { useState } from "react";
import type { PageNode } from "./types";

export interface PageTreeProps {
  tree: PageNode[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreateChild: (parentId: string | null) => void;
  onTrash: (id: string) => void;
  onToggleFav: (id: string, next: boolean) => void;
  onMove: (id: string, newParentId: string | null) => void;
}

type NodeProps = { node: PageNode; depth: number } & Omit<PageTreeProps, "tree">;

function Node({
  node,
  depth,
  activeId,
  onSelect,
  onCreateChild,
  onTrash,
  onToggleFav,
  onMove,
}: NodeProps) {
  const [open, setOpen] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={
          "lifeos-notes-tree__row" +
          (node.id === activeId ? " lifeos-notes-tree__row--active" : "") +
          (dragOver ? " lifeos-notes-tree__row--drop" : "")
        }
        style={{ paddingLeft: 8 + depth * 14 }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", node.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          const id = e.dataTransfer.getData("text/plain");
          if (id && id !== node.id) onMove(id, node.id);
        }}
      >
        <button
          className="lifeos-notes-tree__chevron"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Contraer" : "Expandir"}
          style={{ visibility: hasChildren ? "visible" : "hidden" }}
        >
          {open ? "▾" : "▸"}
        </button>
        <button
          className="lifeos-notes-tree__label"
          onClick={() => onSelect(node.id)}
          title={node.title}
        >
          <span className="lifeos-notes-tree__icon">{node.icon ?? "📄"}</span>
          {node.title || "Sin título"}
        </button>
        <button
          className={
            "lifeos-notes-tree__fav" +
            (node.is_favorite ? " lifeos-notes-tree__fav--on" : "")
          }
          title={node.is_favorite ? "Quitar de favoritos" : "Marcar favorito"}
          onClick={() => onToggleFav(node.id, !node.is_favorite)}
        >
          {node.is_favorite ? "★" : "☆"}
        </button>
        <span className="lifeos-notes-tree__actions">
          <button title="Añadir subpágina" onClick={() => onCreateChild(node.id)}>
            +
          </button>
          <button title="Enviar a papelera" onClick={() => onTrash(node.id)}>
            🗑
          </button>
        </span>
      </div>
      {open &&
        node.children.map((child) => (
          <Node
            key={child.id}
            node={child}
            depth={depth + 1}
            activeId={activeId}
            onSelect={onSelect}
            onCreateChild={onCreateChild}
            onTrash={onTrash}
            onToggleFav={onToggleFav}
            onMove={onMove}
          />
        ))}
    </div>
  );
}

export function PageTree({
  tree,
  activeId,
  onSelect,
  onCreateChild,
  onTrash,
  onToggleFav,
  onMove,
}: PageTreeProps) {
  return (
    <nav
      className="lifeos-notes-tree"
      // soltar en el área vacía = mover a la raíz
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const id = e.dataTransfer.getData("text/plain");
        if (id) onMove(id, null);
      }}
    >
      {tree.map((node) => (
        <Node
          key={node.id}
          node={node}
          depth={0}
          activeId={activeId}
          onSelect={onSelect}
          onCreateChild={onCreateChild}
          onTrash={onTrash}
          onToggleFav={onToggleFav}
          onMove={onMove}
        />
      ))}
      <button className="lifeos-notes-tree__new" onClick={() => onCreateChild(null)}>
        + Nueva página
      </button>
    </nav>
  );
}
