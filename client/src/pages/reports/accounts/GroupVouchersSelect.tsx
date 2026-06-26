import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shadcn/card";

export default function GroupSelect() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedCompany?.company_id) return;
    (window as any).api.group.getAll(selectedCompany.company_id).then((res: any) => {
      if (res.success) {
        const list = res.groups || res.data || [];
        const sorted = [...list].sort((a: any, b: any) =>
          (a.name || "").localeCompare(b.name || "")
        );
        setGroups(sorted);
      }
    }).finally(() => setLoading(false));
  }, [selectedCompany?.company_id]);

  const handleSelect = (group: any) => {
    navigate(`/reports/accounts/group-vouchers/${group.group_id}`);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { navigate(-1); return; }
      if (groups.length === 0) return;
      const currentIdx = selectedId ? groups.findIndex(g => g.group_id === selectedId) : -1;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = groups[currentIdx + 1];
        if (next) setSelectedId(next.group_id);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = groups[currentIdx - 1];
        if (prev) setSelectedId(prev.group_id);
      } else if (e.key === "Enter" && selectedId) {
        const group = groups.find(g => g.group_id === selectedId);
        if (group) handleSelect(group);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [groups, selectedId]);

  return (
    <Card size="sm" className="w-96 mx-auto mt-10 text-xs">
      <CardHeader className="gap-1 pb-1">
        <div className="text-[11px] italic text-zinc-500 flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-zinc-900">Gateway of Tally</Link>
          <span>&gt;</span>
          <Link to="/reports/display-more" className="hover:underline hover:text-zinc-900">Display More Reports</Link>
          <span>&gt;</span>
          <Link to="/reports/account-books" className="hover:underline hover:text-zinc-900">Account Books</Link>
        </div>
        <CardTitle className="text-base font-semibold">Select Group for Vouchers</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-4 py-1.5 bg-zinc-100 border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-500 select-none">
          Name of Group
        </div>
        <div
          onClick={() => navigate("/master/create/group")}
          className="px-4 py-1.5 cursor-pointer text-[12px] font-mono font-bold select-none border-b border-zinc-200 text-right hover:bg-zinc-50 transition-colors"
        >
          Create
        </div>
        {loading ? (
          <div className="px-4 py-6 text-zinc-400 text-center font-mono text-[11px]">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="px-4 py-6 text-zinc-400 text-center font-mono text-[11px]">No groups found</div>
        ) : (
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
            {groups.map((group) => {
              const isSelected = group.group_id === selectedId;
              return (
                <div
                  key={group.group_id}
                  onClick={() => handleSelect(group)}
                  onMouseEnter={() => setSelectedId(group.group_id)}
                  className={`px-4 py-1 cursor-pointer text-[12px] font-mono select-none border-b border-zinc-50 transition-colors ${
                    isSelected
                      ? "bg-[#e4e4e7] text-zinc-950 font-bold"
                      : "text-zinc-700 hover:bg-[#e4e4e7] hover:text-zinc-950"
                  }`}
                >
                  {group.name}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}