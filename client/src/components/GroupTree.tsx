import { useState } from "react";
import type { GroupType } from "@/types/api";

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
  groupNameMap?: Record<number, string>;
  title?: string;
  onCreate?: () => void;
  onClose?: () => void;
  showHeader?: boolean;
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
        className={`flex items-center min-h-[28px] cursor-pointer text-[13px] ${
          isSelected ? "bg-zinc-100" : "hover:bg-zinc-50"
        }`}
        style={{ paddingLeft: depth * 20 + 8 }}
        onClick={() => !readOnly && onSelect?.(node)}
      >
        <span className="w-5 flex items-center justify-center text-zinc-500 shrink-0">
          {hasChildren ? (
            <span
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="text-[10px] cursor-pointer"
            >
              {expanded ? "\u25BC" : "\u25B6"}
            </span>
          ) : (
            <span className="text-[10px] text-zinc-400">\u2022</span>
          )}
        </span>
        <span
          className={`truncate ${
            isSelected ? "font-semibold text-black" : "text-zinc-700"
          }`}
        >
          {node.name}
        </span>
        {showActions && !isProtected && (
          <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 ml-auto pr-2">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(node);
                }}
                className="text-[10px] text-zinc-500 hover:text-zinc-800"
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
                className="text-[10px] text-zinc-400 hover:text-zinc-800"
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
  title,
  onCreate,
  onClose,
  showHeader = false,
}: GroupTreeProps) {
  if (!tree || tree.length === 0) {
    return (
      <div className="text-sm text-zinc-400 p-4">No groups found</div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {showHeader && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-zinc-50 select-none">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            {title || "List of Groups"}
          </span>
          <div className="flex items-center gap-3">
            {onCreate && (
              <button
                onClick={onCreate}
                className="text-[11px] text-zinc-500 hover:text-zinc-800 font-medium transition-colors"
              >
                + Create
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="text-sm font-bold text-zinc-400 hover:text-zinc-800 transition-colors"
              >
                &times;
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
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
    </div>
  );
}
