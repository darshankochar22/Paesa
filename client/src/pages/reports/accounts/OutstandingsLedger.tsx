import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

export default function OutstandingsLedgerSelect() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [ledgers, setLedgers] = React.useState<Array<{ ledger_id: number; ledger_name: string }>>([]);
  const [search, setSearch] = React.useState("");
  const [focusedIndex, setFocusedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
    if (!selectedCompany?.company_id) return;
    (window as any).api.ledger.getAll(selectedCompany.company_id).then((res: any) => {
      if (res?.success) setLedgers(res.ledgers.map((l: any) => ({ ledger_id: l.ledger_id, ledger_name: l.ledger_name })));
    });
  }, [selectedCompany?.company_id]);

  const filtered = ledgers.filter(l => l.ledger_name.toLowerCase().includes(search.toLowerCase()));

  React.useEffect(() => { setFocusedIndex(0); }, [search]);

  const select = (l: { ledger_id: number; ledger_name: string }) => {
    navigate(`/reports/accounts/outstandings-ledger?ledger_id=${l.ledger_id}&ledger_name=${encodeURIComponent(l.ledger_name)}`);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIndex(p => Math.min(filtered.length - 1, p + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIndex(p => Math.max(0, p - 1)); }
    else if (e.key === "Enter" && filtered[focusedIndex]) select(filtered[focusedIndex]);
    else if (e.key === "Escape") navigate(-1);
  };

  return (
    <div className="flex-1 flex items-start justify-center pt-16 bg-white/60">
      <div className="bg-white border border-zinc-300 shadow-lg w-96 font-mono text-[11px]">
        <div className="bg-[#e5eff5] px-4 py-2 font-bold text-zinc-800 border-b border-zinc-300">Select Ledger</div>
        <div className="px-4 py-2 border-b border-zinc-200">
          <div className="text-zinc-600 mb-1">Name of Ledger</div>
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={onKey}
            className="w-full border border-[#ffcc00] bg-[#fffce8] px-2 py-0.5 text-[11px] font-mono focus:outline-none"
          />
        </div>
        <div className="bg-[#003366] text-white px-4 py-0.5 text-[10px] font-bold flex justify-between">
          <span>List of Ledgers</span>
          <span className="text-zinc-300 cursor-pointer">Create</span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.map((l, idx) => (
            <div
              key={l.ledger_id}
              className={`px-4 py-0.5 cursor-pointer ${idx === focusedIndex ? "bg-[#ffcc00] font-bold text-zinc-950" : "hover:bg-zinc-100 text-zinc-800"}`}
              onClick={() => select(l)}
            >
              {l.ledger_name}
            </div>
          ))}
        </div>
        <div className="border-t border-zinc-200 px-4 py-1 flex gap-6 text-[10px] text-zinc-600">
          <span><span className="font-bold">Q:</span> Quit</span>
          <span><span className="font-bold">A:</span> Accept</span>
        </div>
      </div>
    </div>
  );
}