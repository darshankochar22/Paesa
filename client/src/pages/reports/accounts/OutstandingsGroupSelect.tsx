import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { filterPartyGroups } from '@/lib/outstandingParties';

export default function OutstandingsGroupSelect() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [groups, setGroups] = React.useState<Array<{ group_id: number; group_name: string }>>([]);
  const [search, setSearch] = React.useState('');
  const [focusedIndex, setFocusedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
    if (!selectedCompany?.company_id) return;
    (window as any).api.group.getAll(selectedCompany.company_id).then((res: any) => {
      if (res?.success) {
        // Only Sundry Debtors / Sundry Creditors (and sub-groups under them) are valid parties.
        setGroups(
          filterPartyGroups(res.groups || []).map((g: any) => ({
            group_id: g.group_id,
            group_name: g.name,
          })),
        );
      }
    });
  }, [selectedCompany?.company_id]);

  const filtered = groups.filter((g) => g.group_name.toLowerCase().includes(search.toLowerCase()));
  React.useEffect(() => {
    setFocusedIndex(0);
  }, [search]);

  const select = (g: { group_id: number; group_name: string }) => {
    navigate(
      `/reports/accounts/outstandings-group?group_id=${g.group_id}&group_name=${encodeURIComponent(g.group_name)}`,
    );
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((p) => Math.min(filtered.length - 1, p + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((p) => Math.max(0, p - 1));
    } else if (e.key === 'Enter' && filtered[focusedIndex]) select(filtered[focusedIndex]);
    else if (e.key === 'Escape') navigate(-1);
  };

  return (
    <div className="flex-1 flex items-start justify-center pt-16 bg-white">
      <div className="bg-white border border-gray-200 shadow-lg w-96 font-mono text-[11px]">
        <div className="bg-white px-4 py-2 font-bold text-black border-b border-gray-200">
          Select Group
        </div>
        <div className="px-4 py-2 border-b border-gray-200">
          <div className="text-black mb-1">Name of Group</div>
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onKey}
            className="w-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-mono focus:outline-none"
          />
        </div>
        <div className="bg-black text-white px-4 py-0.5 text-[10px] font-bold flex justify-between">
          <span>List of Groups</span>
          <span className="text-black cursor-pointer">Create</span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.map((g, idx) => (
            <div
              key={g.group_id}
              className={`px-4 py-0.5 cursor-pointer ${idx === focusedIndex ? 'bg-black/[0.06] font-bold text-black' : 'hover:bg-black/[0.03] text-black'}`}
              onClick={() => select(g)}
            >
              {g.group_name}
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 px-4 py-1 flex gap-6 text-[10px] text-black">
          <span>
            <span className="font-bold">Q:</span> Quit
          </span>
          <span>
            <span className="font-bold">A:</span> Accept
          </span>
        </div>
      </div>
    </div>
  );
}
