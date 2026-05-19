import { useState } from "react";
import type { GroupType } from "../src/types/api";

interface TreeNode extends GroupType {
  children?: TreeNode[];
}

interface GroupTreeProps {
  tree: TreeNode[];
  selectedId?: number | null;
  onSelect?: (group: GroupType) => void;
  readOnly?: boolean;
  showActions?: boolean;
  onEdit?: (group: GroupType) => void;
  onDelete?: (group: GroupType) => void;
}

function TreeNodeRow({
  node,
  depth,
  selectedId,
  onSelect,
  readOnly,
  showActions,
  onEdit,
  onDelete,
}: {
  node: TreeNode;
  depth: number;
  selectedId?: number | null;
  onSelect?: (group: GroupType) => void;
  readOnly?: boolean;
  showActions?: boolean;
  onEdit?: (group: GroupType) => void;
  onDelete?: (group: GroupType) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = node.group_id === selectedId;
  const isProtected = node.is_predefined === 1 || node.is_primary === 1;

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-1 py-0.5 cursor-pointer text-sm group ${
          isSelected ? "bg-zinc-100" : "hover:bg-zinc-50"
        }`}
        style={{ paddingLeft: depth * 16 + 4 }}
        onClick={() => !readOnly && onSelect?.(node)}
      >
        <span className="w-4 flex items-center justify-center text-zinc-400">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="text-xs leading-none"
            >
              {expanded ? "▾" : "▸"}
            </button>
          ) : (
            <span className="text-xs leading-none">·</span>
          )}
        </span>
        <span className={`flex-1 truncate ${isSelected ? "font-medium text-zinc-900" : "text-zinc-700"}`}>
          {node.name}
        </span>
        <span className="text-xs text-zinc-400 shrink-0">
          {node.is_primary === 1 ? "Primary" : node.is_predefined === 1 ? "Predefined" : "User"}
        </span>
        {showActions && !isProtected && (
          <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 pr-1">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(node);
                }}
                className="text-xs text-zinc-500 hover:text-zinc-800"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(node);
                }}
                className="text-xs text-zinc-400 hover:text-zinc-800"
              >
                Delete
              </button>
            )}
          </span>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeRow
              key={child.group_id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              readOnly={readOnly}
              showActions={showActions}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function GroupTree({
  tree,
  selectedId,
  onSelect,
  readOnly,
  showActions,
  onEdit,
  onDelete,
}: GroupTreeProps) {
  if (!tree || tree.length === 0) {
    return <div className="text-sm text-zinc-400 p-4">No groups found</div>;
  }

  return (
    <div className="overflow-y-auto max-h-full">
      {tree.map((node) => (
        <TreeNodeRow
          key={node.group_id}
          node={node}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
          readOnly={readOnly}
          showActions={showActions}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
