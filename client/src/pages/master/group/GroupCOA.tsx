import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { NotificationBanner } from '@/components/ui';
import GroupTree from '@/components/GroupTree';
import GroupFlatList from '@/components/GroupFlatList';
import type { GroupType } from '@/types/api';

interface TreeNode extends GroupType {
  children?: TreeNode[];
}

export default function GroupCOA() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [groupTree, setGroupTree] = useState<TreeNode[]>([]);
  const [flatGroups, setFlatGroups] = useState<GroupType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [isFlatView, setIsFlatView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const companyId = selectedCompany?.company_id;

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [treeRes, allRes] = await Promise.all([
          window.api.group.getTree(companyId),
          window.api.group.getAll(companyId),
        ]);
        if (cancelled) return;
        if (treeRes.success) {
          setGroupTree(treeRes.tree ?? []);
        }
        if (allRes.success) {
          setFlatGroups(allRes.groups ?? []);
        }
      } catch (e) {
        if (!cancelled) setError('Failed to load groups.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/master/coa');
      }
      if (e.key === 'F5' || e.key === 'f5') {
        e.preventDefault();
        setIsFlatView((prev) => !prev);
      }
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        navigate('/master/create/group');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const filteredFlatGroups = useMemo(() => {
    let list = [...flatGroups];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((g) => g.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [flatGroups, searchQuery]);

  const filteredGroupTree = useMemo(() => {
    if (!searchQuery.trim()) return groupTree;
    const q = searchQuery.toLowerCase();
    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .map((node) => {
          const children = node.children ? filterNodes(node.children) : [];
          const matchesQuery = node.name.toLowerCase().includes(q);
          if (matchesQuery || children.length > 0) {
            return { ...node, children } as TreeNode;
          }
          return null;
        })
        .filter((n): n is TreeNode => n !== null);
    };
    return filterNodes(groupTree);
  }, [groupTree, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-800">
      {/* Header Title Bar */}
      <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <Link
            to="/master/coa"
            className="text-xs text-zinc-500 hover:text-zinc-800 px-2 py-0.5 border border-zinc-200 rounded bg-white shadow-sm"
          >
            &larr; Back
          </Link>
          <span className="font-bold text-sm text-zinc-800">
            {isFlatView ? 'List of Groups' : 'Chart of Accounts: Groups'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/master/create/group"
            className="text-[11px] font-semibold text-white bg-black hover:bg-zinc-800 px-3 py-1 rounded shadow-sm"
          >
            + Create Group
          </Link>
        </div>
      </div>

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-white">
        {/* Left Side: Search & Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-white h-full">
          {/* Search Box */}
          <div className="px-4 py-1.5 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 select-none">
              Search:
            </span>
            <input
              type="text"
              placeholder="Type group name to filter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-white border border-zinc-300 rounded px-2.5 py-1 text-xs text-zinc-850 focus:outline-none focus:border-zinc-500 shadow-inner"
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

          <div className="flex-1 overflow-y-auto min-h-0 bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-xs text-zinc-400">
                Loading groups...
              </div>
            ) : isFlatView ? (
              /* Flat Alphabetical List View — Tally style (Image 1) */
              <GroupFlatList
                groups={filteredFlatGroups}
                selectedId={selectedGroupId}
                onSelect={(group) => setSelectedGroupId(group.group_id ?? null)}
                showHeader={false}
              />
            ) : (
              /* Group-wise Hierarchical Tree View — Tally style (Image 2) */
              <div className="py-1">
                {filteredGroupTree.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-xs text-zinc-400">
                    No matching groups found.
                  </div>
                ) : (
                  <GroupTree
                    tree={filteredGroupTree}
                    selectedId={selectedGroupId ?? undefined}
                    onSelect={(group) => setSelectedGroupId(group.group_id ?? null)}
                    showHeader={false}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right-Hand Sidebar — Tally Action Bar */}
        <div className="w-44 border-l border-zinc-200 bg-zinc-100 flex flex-col gap-1 p-2 shrink-0 select-none text-[11px] font-medium text-zinc-700">
          <button
            onClick={() => setIsFlatView((prev) => !prev)}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">F5</span>
            <span>{isFlatView ? 'Group-wise Tree' : 'Alphabetical Flat'}</span>
          </button>

          <button
            onClick={() => navigate('/master/create/group')}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Alt+C</span>
            <span>Create Master</span>
          </button>

          <div className="flex-1" />

          <button
            onClick={() => navigate('/master/coa')}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-800 transition-colors text-left shadow-sm font-semibold mt-auto"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Esc</span>
            <span>Quit</span>
          </button>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="border-t border-zinc-200 px-4 py-1.5 flex justify-between items-center bg-zinc-50 text-[10px] text-zinc-400 select-none">
        <span>Total Groups: {isFlatView ? filteredFlatGroups.length : flatGroups.length}</span>
        <span>COA Engine v2.0</span>
      </div>
    </div>
  );
}
