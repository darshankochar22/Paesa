import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { filterPartyLedgers } from '@/lib/outstandingParties';

export default function OutstandingsLedgerSelect() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [ledgers, setLedgers] = React.useState<Array<{ ledger_id: number; ledger_name: string }>>(
    [],
  );
  const [search, setSearch] = React.useState('');
  const [focusedIndex, setFocusedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
    const cid = selectedCompany?.company_id;
    if (!cid) return;
    // Only ledgers created under Sundry Debtors / Sundry Creditors are valid parties,
    // so we need the groups tree to resolve sub-groups too.
    Promise.all([
      (window as any).api.ledger.getAll(cid),
      (window as any).api.group.getAll(cid),
    ]).then(([ledRes, grpRes]: any[]) => {
      if (!ledRes?.success) return;
      const groups = grpRes?.success ? grpRes.groups || [] : [];
      setLedgers(
        filterPartyLedgers(ledRes.ledgers || [], groups).map((l: any) => ({
          ledger_id: l.ledger_id,
          ledger_name: l.name,
        })),
      );
    });
  }, [selectedCompany?.company_id]);

  const filtered = ledgers.filter((l) =>
    l.ledger_name.toLowerCase().includes(search.toLowerCase()),
  );

  React.useEffect(() => {
    setFocusedIndex(0);
  }, [search]);

  const select = (l: { ledger_id: number; ledger_name: string }) => {
    navigate(
      `/reports/accounts/outstandings-ledger?ledger_id=${l.ledger_id}&ledger_name=${encodeURIComponent(l.ledger_name)}`,
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
          Select Ledger
        </div>
        <div className="px-4 py-2 border-b border-gray-200">
          <div className="text-black mb-1">Name of Ledger</div>
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onKey}
            className="w-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-mono focus:outline-none"
          />
        </div>
        <div className="bg-black text-white px-4 py-0.5 text-[10px] font-bold flex justify-between">
          <span>List of Ledgers</span>
          <span className="text-black cursor-pointer">Create</span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.map((l, idx) => (
            <div
              key={l.ledger_id}
              className={`px-4 py-0.5 cursor-pointer ${idx === focusedIndex ? 'bg-black/[0.06] font-bold text-black' : 'hover:bg-black/[0.03] text-black'}`}
              onClick={() => select(l)}
            >
              {l.ledger_name}
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
