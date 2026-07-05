// src/pages/reports/accounts/LedgerSelect.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';

export default function LedgerSelect() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedCompany?.company_id) return;
    (window as any).api.ledger
      .getAll(selectedCompany.company_id)
      .then((res: any) => {
        if (res.success) {
          const list = res.ledgers || res.data || [];
          const sorted = [...list].sort((a: any, b: any) =>
            (a.name || '').localeCompare(b.name || ''),
          );
          setLedgers(sorted);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedCompany?.company_id]);

  const handleSelect = (ledger: any) => {
    navigate(`/reports/accounts/ledger?ledger_id=${ledger.ledger_id}`);
  };

  // Keyboard nav
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate(-1);
        return;
      }
      if (ledgers.length === 0) return;
      const currentIdx = selectedId ? ledgers.findIndex((l) => l.ledger_id === selectedId) : -1;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = ledgers[currentIdx + 1];
        if (next) setSelectedId(next.ledger_id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = ledgers[currentIdx - 1];
        if (prev) setSelectedId(prev.ledger_id);
      } else if (e.key === 'Enter' && selectedId) {
        const ledger = ledgers.find((l) => l.ledger_id === selectedId);
        if (ledger) handleSelect(ledger);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [ledgers, selectedId]);

  return (
    <Card size="sm" className="w-96 mx-auto mt-10 text-xs">
      <CardHeader className="gap-1 pb-1">
        <div className="text-[11px] italic text-zinc-500 flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-zinc-900">
            Gateway
          </Link>
          <span>&gt;</span>
          <Link to="/reports/display-more" className="hover:underline hover:text-zinc-900">
            Display More Reports
          </Link>
          <span>&gt;</span>
          <Link to="/reports/account-books" className="hover:underline hover:text-zinc-900">
            Account Books
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">Select Ledger</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Column header */}
        <div className="px-4 py-1.5 bg-zinc-100 border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-500 select-none">
          Name of Ledger
        </div>

        <div
          onClick={() => navigate('/master/create/ledger')}
          className="px-4 py-1.5 cursor-pointer text-[12px] font-mono font-bold select-none border-b border-zinc-200 text-right hover:bg-zinc-50 transition-colors"
        >
          Create
        </div>

        {loading ? (
          <div className="px-4 py-6 text-zinc-400 text-center font-mono text-[11px]">
            Loading...
          </div>
        ) : ledgers.length === 0 ? (
          <div className="px-4 py-6 text-zinc-400 text-center font-mono text-[11px]">
            No ledgers found
          </div>
        ) : (
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
            {ledgers.map((ledger) => {
              const isSelected = ledger.ledger_id === selectedId;
              return (
                <div
                  key={ledger.ledger_id}
                  onClick={() => handleSelect(ledger)}
                  onMouseEnter={() => setSelectedId(ledger.ledger_id)}
                  className={`px-4 py-1 cursor-pointer text-[12px] font-mono select-none border-b border-zinc-50 transition-colors ${
                    isSelected
                      ? 'bg-[#e4e4e7] text-zinc-950 font-bold'
                      : 'text-zinc-700 hover:bg-[#e4e4e7] hover:text-zinc-950'
                  }`}
                >
                  {ledger.name || ledger.ledger_name}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
