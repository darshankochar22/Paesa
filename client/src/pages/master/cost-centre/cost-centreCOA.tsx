import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import CostCentreFlatList from "@/components/CostCentreFlatList";
import type { CostCentreType } from "@/types/api";

interface TreeNode extends CostCentreType {
  children?: TreeNode[];
}

function CostCentreNode({
  node,
  depth = 0,
  selectedId,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedId?: number;
  onSelect: (cc: CostCentreType) => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = node.cc_id === selectedId;

  return (
    <div>
      <div
        className={`flex items-center min-h-[26px] cursor-pointer text-[12px] select-none hover:bg-zinc-50 ${
          isSelected ? "bg-zinc-100 font-bold text-black" : "text-zinc-700"
        }`}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        onClick={() => onSelect(node)}
      >
        <span className="mr-1.5 text-zinc-400 select-none">
          {hasChildren ? "▪" : "▫"}
        </span>
        <span className="truncate">{node.name}</span>
        {node.alias && (
          <span className="text-zinc-400 text-[10px] ml-2 font-normal">({node.alias})</span>
        )}
      </div>
      {hasChildren &&
        node.children!.map((child) => (
          <CostCentreNode
            key={child.cc_id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

export default function CostCentreCOA() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [costCentreTree, setCostCentreTree] = useState<TreeNode[]>([]);
  const [flatCCs, setFlatCCs] = useState<CostCentreType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [isFlatView, setIsFlatView] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCCId, setSelectedCCId] = useState<number | null>(null);

  const companyId = selectedCompany?.company_id;

  const loadData = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const [treeRes, allRes] = await Promise.all([
        window.api.costCentre.getTree(companyId),
        window.api.costCentre.getAll(companyId),
      ]);
      if (treeRes.success) {
        setCostCentreTree(treeRes.tree ?? []);
      }
      if (allRes.success) {
        setFlatCCs(allRes.costCentres ?? []);
      }
    } catch (e) {
      setError("Failed to load cost centres.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/master/coa");
      }
      if (e.key === "F5" || e.key === "f5") {
        e.preventDefault();
        setIsFlatView((prev) => !prev);
      }
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        navigate("/master/create/cost-centre");
      }
      if (e.altKey && e.key.toLowerCase() === "a" && selectedCCId) {
        e.preventDefault();
        navigate("/master/alter/cost-centre");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, selectedCCId]);

  const filteredFlatCCs = useMemo(() => {
    let list = [...flatCCs];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (cc) =>
          cc.name.toLowerCase().includes(q) ||
          (cc.alias && cc.alias.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [flatCCs, searchQuery]);

  const filteredCCTree = useMemo(() => {
    if (!searchQuery.trim()) return costCentreTree;
    const q = searchQuery.toLowerCase();
    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .map((node) => {
          const children = node.children ? filterNodes(node.children) : [];
          const matchesQuery =
            node.name.toLowerCase().includes(q) ||
            (node.alias && node.alias.toLowerCase().includes(q));
          if (matchesQuery || children.length > 0) {
            return { ...node, children } as TreeNode;
          }
          return null;
        })
        .filter((n): n is TreeNode => n !== null);
    };
    return filterNodes(costCentreTree);
  }, [costCentreTree, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-800 font-mono text-[12px]">
      {/* Header Title Bar */}
      <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between select-none font-sans shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/master/coa"
            className="text-xs text-zinc-500 hover:text-zinc-800 px-2 py-0.5 border border-zinc-200 rounded bg-white shadow-sm"
          >
            &larr; Back
          </Link>
          <span className="font-bold text-sm text-zinc-800">
            {isFlatView ? "List of Cost Centres" : "Chart of Accounts: Cost Centres"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/master/create/cost-centre"
            className="text-[11px] font-semibold text-white bg-black hover:bg-zinc-800 px-3 py-1 rounded shadow-sm"
          >
            + Create Cost Centre
          </Link>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center font-sans shrink-0">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold">
            dismiss
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-white">
        {/* Left Side: Search & Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-white h-full border-r border-zinc-100">
          {/* Search Box */}
          <div className="px-4 py-1.5 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-2 font-sans shrink-0">
            <span className="text-[10px] mercantile-label font-bold text-zinc-400 select-none">Search:</span>
            <input
              type="text"
              placeholder="Type cost centre name to filter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-white border border-zinc-300 rounded px-2.5 py-1 text-xs text-zinc-850 focus:outline-none focus:border-zinc-500 shadow-inner font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-zinc-400 hover:text-black font-bold px-1.5"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 bg-white py-1">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-xs text-zinc-400 font-sans italic">Loading cost centres...</div>
            ) : isFlatView ? (
              <CostCentreFlatList
                costCentres={filteredFlatCCs}
                selectedId={selectedCCId}
                onSelect={(cc) => setSelectedCCId(cc.cc_id ?? null)}
                showHeader={false}
              />
            ) : filteredCCTree.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-xs text-zinc-400 font-sans italic">No matching cost centres found.</div>
            ) : (
              filteredCCTree.map((node) => (
                <CostCentreNode
                  key={node.cc_id}
                  node={node}
                  depth={0}
                  selectedId={selectedCCId ?? undefined}
                  onSelect={(cc) => setSelectedCCId(cc.cc_id ?? null)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right-Hand Sidebar — Tally Action Bar */}
        <div className="w-44 border-l border-zinc-200 bg-zinc-100 flex flex-col gap-1 p-2 shrink-0 select-none text-[11px] font-medium text-zinc-700 font-sans">
          <button
            onClick={() => setIsFlatView((prev) => !prev)}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">F5</span>
            <span>{isFlatView ? "Tree View" : "Alphabetical List"}</span>
          </button>

          <button
            onClick={() => navigate("/master/create/cost-centre")}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Alt+C</span>
            <span>Create Master</span>
          </button>

          {selectedCCId && (
            <button
              onClick={() => navigate("/master/alter/cost-centre")}
              className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
            >
              <span className="font-bold text-zinc-900 text-[10px]">Alt+A</span>
              <span>Alter Master</span>
            </button>
          )}

          <div className="flex-1" />

          <button
            onClick={() => navigate("/master/coa")}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-800 transition-colors text-left shadow-sm font-semibold mt-auto"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Esc</span>
            <span>Quit</span>
          </button>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="border-t border-zinc-200 px-4 py-1.5 flex justify-between items-center bg-zinc-50 text-[10px] text-zinc-400 select-none font-sans shrink-0">
        <span>Total Cost Centres: {flatCCs.length}</span>
        <span>Startup ERP</span>
      </div>
    </div>
  );
}