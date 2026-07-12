import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { PageTitleBar, NotificationBanner } from '@/components/ui';
import GroupTree from '@/components/GroupTree';
import type { GroupType } from '@/types/api';

export default function GroupAlter() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [groupTree, setGroupTree] = useState<(GroupType & { children?: GroupType[] })[]>([]);
  const [flatGroups, setFlatGroups] = useState<GroupType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const companyId = selectedCompany?.company_id;

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const [treeRes, allRes] = await Promise.all([
          window.api.group.getTree(companyId),
          window.api.group.getAll(companyId),
        ]);
        if (cancelled) return;
        if (treeRes.success && treeRes.tree) setGroupTree(treeRes.tree ?? []);
        if (allRes.success && allRes.groups) setFlatGroups(allRes.groups ?? []);
      } catch (e) {
        if (!cancelled) setError('Failed to load groups.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const groupNameMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const g of flatGroups) {
      if (g.group_id != null) map[g.group_id] = g.name;
    }
    return map;
  }, [flatGroups]);

  const handleSelect = (group: GroupType) => {
    navigate(`/master/alter/group/${group.group_id}`);
  };

  const handleEdit = (group: GroupType) => {
    navigate(`/master/alter/group/${group.group_id}`);
  };

  const handleDelete = async (group: GroupType) => {
    if (!group.group_id) return;
    if (group.is_predefined || group.is_primary) {
      setError('Cannot delete protected groups.');
      return;
    }
    if (!confirm(`Delete group "${group.name}"?`)) return;
    try {
      const res = await window.api.group.delete(group.group_id);
      if (res.success) {
        setSuccess(`Group "${group.name}" deleted.`);
        const treeRes = await window.api.group.getTree(companyId!);
        if (treeRes.success && treeRes.tree) setGroupTree(treeRes.tree ?? []);
      } else {
        setError(res.error || 'Failed to delete group.');
      }
    } catch (e) {
      setError('Unexpected error during delete.');
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <PageTitleBar
        title="Group Alteration"
        subtitle={selectedCompany?.name}
        actions={
          <button
            onClick={() => navigate('/master/alter')}
            className="text-zinc-400 hover:text-white text-[11px] transition-colors"
          >
            ← Back
          </button>
        }
      />
      <div className="flex-1 p-6">
        {error && (
          <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
        )}
        {success && (
          <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
        )}

        <div className="border rounded overflow-hidden max-w-2xl">
          <div className="px-4 py-3 border-b bg-zinc-50 text-sm font-medium text-zinc-600">
            Groups
          </div>
          <GroupTree
            tree={groupTree}
            readOnly={false}
            showActions={true}
            onSelect={handleSelect}
            onEdit={handleEdit}
            onDelete={handleDelete}
            groupNameMap={groupNameMap}
          />
        </div>
      </div>
    </div>
  );
}
