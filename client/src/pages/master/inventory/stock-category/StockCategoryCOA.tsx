import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { NotificationBanner } from '@/components/ui';
import type { StockCategoryType } from '@/types/api';

interface TreeItem {
  id: number;
  name: string;
  parentId?: number | null;
  children?: TreeItem[];
  rawData: any;
}

function buildTree(items: any[], idKey: string, parentKey: string): TreeItem[] {
  const map: Record<number, TreeItem> = {};
  const roots: TreeItem[] = [];

  items.forEach((item) => {
    const id = item[idKey];
    if (id) {
      map[id] = {
        id,
        name: item.name,
        parentId: item[parentKey],
        children: [],
        rawData: item,
      };
    }
  });

  items.forEach((item) => {
    const id = item[idKey];
    const parentId = item[parentKey];
    if (id && parentId && map[parentId]) {
      map[parentId].children!.push(map[id]);
    } else if (id) {
      roots.push(map[id]);
    }
  });

  return roots;
}

export default function StockCategoryCOA() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  // Data States
  const [stockCategories, setStockCategories] = useState<StockCategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View States
  const [showUnusedOnly, setShowUnusedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showChangeViewModal, setShowChangeViewModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);

  // Expansion States
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;
      setLoading(true);
      setError(null);
      try {
        const sc = await window.api.stockCategory.getAll(companyId);
        if (sc.success) setStockCategories(sc.stockCategories ?? []);
      } catch (err) {
        setError('Failed to load stock categories.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/master/coa');
      }
      if (e.key === 'F5' || e.key === 'f5') {
        e.preventDefault();
        navigate('/master/coa/unit');
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        setShowChangeViewModal((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        setShowExceptionModal((prev) => !prev);
      }
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        navigate('/master/create/stock-category');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleExpandAll = () => {
    const all: Record<number, boolean> = {};
    stockCategories.forEach((c) => {
      if (c.sc_id) all[c.sc_id] = true;
    });
    setExpandedCategories(all);
  };

  const handleCollapseAll = () => {
    setExpandedCategories({});
  };

  const categoryTree = useMemo(
    () => buildTree(stockCategories, 'sc_id', 'parent_category_id'),
    [stockCategories],
  );

  const filteredCategoryTree = useMemo(() => {
    const filterTree = (nodes: TreeItem[]): TreeItem[] => {
      return nodes
        .map((node) => {
          const children = node.children ? filterTree(node.children) : [];

          const q = searchQuery.toLowerCase();
          const categoryMatches = searchQuery.trim()
            ? node.name.toLowerCase().includes(q) ||
              (node.rawData.alias && node.rawData.alias.toLowerCase().includes(q))
            : true;

          // Categorization constraint: assume unused means is_active is false or has no active children
          const isCategoryUnused = !node.rawData.is_active;

          if (
            (searchQuery.trim() ? categoryMatches || children.length > 0 : true) &&
            (showUnusedOnly ? children.length > 0 || isCategoryUnused : true)
          ) {
            return {
              ...node,
              children,
            } as TreeItem;
          }
          return null;
        })
        .filter((n): n is TreeItem => n !== null);
    };

    return filterTree(categoryTree);
  }, [categoryTree, searchQuery, showUnusedOnly]);

  const toggleCategory = (id: number) => {
    setExpandedCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderCategoryTree = (nodes: TreeItem[], depth: number): React.ReactNode => {
    return nodes.map((node) => {
      const cId = node.id;
      const isExpanded = !!expandedCategories[cId];
      const hasChildren = node.children && node.children.length > 0;
      const raw = node.rawData as StockCategoryType;

      return (
        <div key={cId} className="flex flex-col">
          <div
            className="flex items-center min-h-[30px] hover:bg-zinc-50 border-b border-zinc-100/50 cursor-pointer select-none group"
            style={{ paddingLeft: depth * 20 + 8 }}
            onClick={() => navigate(`/master/alter/stock-category`, { state: { categoryId: cId } })}
          >
            <span
              className="w-5 flex items-center justify-center text-zinc-400 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) toggleCategory(cId);
              }}
            >
              {hasChildren ? (
                <span className="text-xs transition-transform duration-100 hover:text-zinc-700">
                  {isExpanded ? '▼' : '▶'}
                </span>
              ) : (
                <span className="text-[10px] opacity-30">•</span>
              )}
            </span>
            <div className="flex-1 flex items-center justify-between pr-4">
              <span className="font-semibold text-zinc-800 text-[13px] group-hover:text-sky-800 transition-colors">
                {node.name}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-400">
                  {raw.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {isExpanded && hasChildren && (
            <div className="flex flex-col">{renderCategoryTree(node.children!, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-800">
      {/* Header */}
      <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/master/coa')}
            className="text-xs text-zinc-500 hover:text-zinc-800 px-2 py-0.5 border border-zinc-200 rounded bg-white shadow-sm"
          >
            ← Back
          </button>
          <span className="font-bold text-sm text-zinc-800">
            Stock Categories Chart of Accounts
          </span>
          {showUnusedOnly && (
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 border border-emerald-200 rounded-full shadow-inner animate-pulse">
              Exception: Inactive / Unused
            </span>
          )}
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExpandAll}
            className="text-[11px] font-semibold text-zinc-600 hover:text-black px-2 py-1 border border-zinc-300 rounded bg-white shadow-sm"
          >
            Expand All
          </button>
          <button
            onClick={handleCollapseAll}
            className="text-[11px] font-semibold text-zinc-600 hover:text-black px-2 py-1 border border-zinc-300 rounded bg-white shadow-sm"
          >
            Collapse All
          </button>
          <button
            onClick={() => navigate('/master/create/stock-category')}
            className="text-[11px] font-semibold text-white bg-black hover:bg-zinc-800 px-3 py-1 rounded shadow-sm font-medium"
          >
            + Create Category
          </button>
        </div>
      </div>

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-white">
        {/* Left Side: Search & Content scrollable container */}
        <div className="flex-1 flex flex-col min-w-0 bg-white h-full">
          {/* Dynamic Filter Search Box */}
          <div className="px-4 py-1.5 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 select-none">
              Search:
            </span>
            <input
              type="text"
              placeholder="Search in stock categories tree..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-white border border-zinc-300 rounded px-2.5 py-1 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-zinc-400 hover:text-black font-bold px-1.5"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 bg-white px-4 py-2">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-xs text-zinc-400">
                Loading stock categories...
              </div>
            ) : (
              <div className="py-2">
                {filteredCategoryTree.length === 0 ? (
                  <div className="text-xs text-zinc-400 text-center py-8">
                    No matching stock categories found.
                  </div>
                ) : (
                  renderCategoryTree(filteredCategoryTree, 0)
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right-Hand Sidebar - Tally Signature Action Bar */}
        <div className="w-44 border-l border-zinc-200 bg-zinc-100 flex flex-col gap-1 p-2 shrink-0 select-none text-[11px] font-medium text-zinc-700">
          <button
            onClick={() => navigate('/master/coa/unit')}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">F5</span>
            <span>Next Category</span>
          </button>

          <button
            onClick={() => setShowChangeViewModal(true)}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Ctrl+H</span>
            <span>Change View</span>
          </button>

          <button
            onClick={() => setShowExceptionModal(true)}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Ctrl+J</span>
            <span>Exception Reports</span>
          </button>

          <button
            onClick={() => navigate('/master/create/stock-category')}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Alt+C</span>
            <span>Create Category</span>
          </button>

          <div className="flex-1"></div>

          <button
            onClick={() => navigate('/master/coa')}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-800 transition-colors text-left shadow-sm font-semibold mt-auto"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Esc</span>
            <span>Quit</span>
          </button>
        </div>
      </div>

      {/* Overlay: Change View Modal */}
      {showChangeViewModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white border border-zinc-300 rounded-lg shadow-xl w-80 overflow-hidden select-none">
            <div className="bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-750 border-b border-zinc-200 flex justify-between items-center">
              <span>Change View</span>
              <button
                onClick={() => setShowChangeViewModal(false)}
                className="text-zinc-400 hover:text-black font-semibold"
              >
                ✕
              </button>
            </div>
            <div className="p-1 flex flex-col text-xs">
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate('/master/coa/stock-group');
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Stock Groups & Items Tree
              </button>
              <button
                disabled
                className="w-full text-left px-3 py-2 rounded bg-zinc-100 font-bold text-zinc-450 cursor-not-allowed"
              >
                Stock Categories Tree (Active)
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate('/master/coa/unit');
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Units of Measure List
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate('/master/coa/godown');
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Godowns / Locations Tree
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate('/master/coa/group');
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors border-t border-zinc-100"
              >
                Groups Chart of Accounts
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate('/master/coa/ledger');
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Ledgers Chart of Accounts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay: Exception Reports Modal */}
      {showExceptionModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white border border-zinc-300 rounded-lg shadow-xl w-72 overflow-hidden select-none">
            <div className="bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-750 border-b border-zinc-200 flex justify-between items-center">
              <span>Exception Reports</span>
              <button
                onClick={() => setShowExceptionModal(false)}
                className="text-zinc-400 hover:text-black font-semibold"
              >
                ✕
              </button>
            </div>
            <div className="p-1 flex flex-col text-xs">
              <button
                onClick={() => {
                  setShowExceptionModal(false);
                  setShowUnusedOnly(true);
                }}
                className={`w-full text-left px-3 py-2 rounded transition-colors ${
                  showUnusedOnly
                    ? 'bg-zinc-100 text-black font-semibold'
                    : 'hover:bg-black hover:text-white'
                }`}
              >
                Show Inactive Categories Only
              </button>
              <button
                onClick={() => {
                  setShowExceptionModal(false);
                  setShowUnusedOnly(false);
                }}
                className={`w-full text-left px-3 py-2 rounded transition-colors border-t border-zinc-100 ${
                  !showUnusedOnly
                    ? 'bg-zinc-100 text-black font-semibold'
                    : 'hover:bg-black hover:text-white'
                }`}
              >
                Show All Categories
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-zinc-200 px-4 py-1.5 flex justify-between items-center bg-zinc-50 text-[10px] text-zinc-400">
        <span>Active Tab: Stock Categories</span>
        <span>Startup ERP Inventory Engine v2.0 (Keyboard Enabled)</span>
      </div>
    </div>
  );
}
