import { useState, useEffect } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { Button } from '@/components/shadcn/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/shadcn/table';
import { EmptyState } from '@/components/blocks/EmptyState';
import { cn } from '@/lib/utils';

interface MasterRow {
  id: number;
  name: string;
  taxability_type: string;
  gst_rate: number;
  hsn: string;
  gst_applicability: string;
  status: string;
}

type MasterType = 'group' | 'ledger' | 'stock_group' | 'stock_item';

const MASTER_TYPES: Array<{ key: MasterType; label: string; group: string }> = [
  { key: 'group', label: 'Groups', group: 'Accounting Masters' },
  { key: 'ledger', label: 'Ledgers', group: 'Accounting Masters' },
  { key: 'stock_group', label: 'Stock Groups', group: 'Inventory Masters' },
  { key: 'stock_item', label: 'Stock Items', group: 'Inventory Masters' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-04-01" → "1-Apr-26" (the applicable-from date shown against every master).
function fmtDate(iso?: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${d}-${MONTHS[m - 1]}-${String(y).slice(-2)}`;
}

// Order the status buckets: taxable rates ascending, then special buckets, then unset.
function statusOrder(status: string): number {
  const m = status.match(/^GST Rate-([\d.]+)%$/);
  if (m) return Number(m[1]);
  const tail: Record<string, number> = {
    Exempt: 1000,
    'Nil Rated': 1001,
    'Non-GST': 1002,
    'GST Rate Details Not Provided': 2000,
    'GST Not Applicable': 3000,
  };
  return tail[status] ?? 1500;
}

type Row = { type: 'header'; label: string } | { type: 'data'; master: MasterRow };

export default function GSTRateSetup() {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [masterType, setMasterType] = useState<MasterType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [masters, setMasters] = useState<MasterRow[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const applicableFrom = fmtDate(activeFY?.start_date);

  useEffect(() => {
    async function load() {
      if (!companyId || !masterType) return;
      try {
        setLoading(true);
        setError(null);
        setSelected(null);
        const res = await window.api.gst.getGstRateSetup({
          company_id: companyId,
          master_type: masterType,
        });
        if (res.success) setMasters((res.masters as MasterRow[]) || []);
        else {
          setError(res.error || 'Failed to load masters.');
          setMasters([]);
        }
      } catch (e: any) {
        setError(e.message || 'An unexpected error occurred.');
        setMasters([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, masterType]);

  const typeLabel = MASTER_TYPES.find((t) => t.key === masterType)?.label ?? '';
  const contextLabel =
    masterType === 'stock_item' || masterType === 'stock_group' ? 'Stock Group' : 'Group';

  // ── Master-type selector (List of Masters) ────────────────────────────────
  if (!masterType) {
    return (
      <TallyReportLayout title="GST Rate Setup" companyName={selectedCompany?.name || 'Company'}>
        <div className="mx-auto mt-8 w-80 border border-black bg-white text-xs">
          <div className="bg-black text-white px-2 py-1 font-bold">List of Masters</div>
          <div className="flex flex-col py-2">
            {['Accounting Masters', 'Inventory Masters'].map((grp) => (
              <div key={grp} className="flex flex-col">
                <div className="px-3 pt-1 font-bold text-black">{grp}</div>
                {MASTER_TYPES.filter((t) => t.group === grp).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setMasterType(t.key)}
                    className="text-left px-6 py-0.5 text-black hover:bg-[#ffcc00]"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </TallyReportLayout>
    );
  }

  // ── Rate-wise grid, grouped by GST status ─────────────────────────────────
  const buckets = new Map<string, MasterRow[]>();
  for (const m of masters) {
    if (!buckets.has(m.status)) buckets.set(m.status, []);
    buckets.get(m.status)!.push(m);
  }
  const orderedStatuses = [...buckets.keys()].sort((a, b) => statusOrder(a) - statusOrder(b));
  const rows: Row[] = [];
  for (const status of orderedStatuses) {
    rows.push({ type: 'header', label: status });
    for (const master of buckets.get(status)!) rows.push({ type: 'data', master });
  }

  const HEAD = 'h-auto px-2 py-1 align-bottom font-bold text-black text-xs whitespace-nowrap';

  return (
    <TallyReportLayout
      title="GST Rate Setup"
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <>
          <div className="font-bold">Rate-wise</div>
          <div className="flex gap-2">
            <span>{contextLabel}:</span>
            <span className="font-bold">{typeLabel}</span>
          </div>
        </>
      }
      footerControls={
        <Button
          onClick={() => setMasterType(null)}
          variant="ghost"
          size="xs"
          className="h-auto p-0 ml-4 font-bold text-black hover:underline hover:bg-transparent"
        >
          F4: Change Master
        </Button>
      }
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading masters…" className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && !error && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className={HEAD}>Particulars</TableHead>
                <TableHead className={cn(HEAD, 'w-28 text-right')}>
                  GST Rate Details
                  <br />
                  Applicable From
                </TableHead>
                <TableHead className={cn(HEAD, 'w-24')}>
                  Taxability
                  <br />
                  Type
                </TableHead>
                <TableHead className={cn(HEAD, 'w-16 text-right')}>
                  GST
                  <br />
                  Rate
                </TableHead>
                <TableHead className={cn(HEAD, 'w-28 text-right')}>
                  HSN/SAC Details
                  <br />
                  Applicable From
                </TableHead>
                <TableHead className={cn(HEAD, 'w-24')}>HSN/SAC</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {masters.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState message={`No ${typeLabel.toLowerCase()} found.`} />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => {
                  if (row.type === 'header') {
                    return (
                      <TableRow key={idx} className="border-0 hover:bg-transparent">
                        <TableCell
                          colSpan={6}
                          className="px-2 pt-2 pb-0.5 font-bold italic text-black"
                        >
                          {row.label}
                        </TableCell>
                      </TableRow>
                    );
                  }
                  const m = row.master;
                  const hasRate = /taxable/i.test(m.taxability_type);
                  const configured =
                    m.status !== 'GST Rate Details Not Provided' &&
                    m.status !== 'GST Not Applicable';
                  return (
                    <TableRow
                      key={idx}
                      onClick={() => setSelected(idx)}
                      className={cn(
                        'border-0 cursor-pointer hover:bg-[#e6f2ff]',
                        selected === idx ? 'bg-[#ffcc00] hover:bg-[#ffcc00]' : '',
                      )}
                    >
                      <TableCell className="px-2 py-0.5 pl-6">{m.name}</TableCell>
                      <TableCell className="px-2 py-0.5 text-right tabular-nums">
                        {configured ? applicableFrom : ''}
                      </TableCell>
                      <TableCell className="px-2 py-0.5">{m.taxability_type}</TableCell>
                      <TableCell className="px-2 py-0.5 text-right tabular-nums">
                        {hasRate ? `${m.gst_rate} %` : ''}
                      </TableCell>
                      <TableCell className="px-2 py-0.5 text-right tabular-nums">
                        {m.hsn || configured ? applicableFrom : ''}
                      </TableCell>
                      <TableCell className="px-2 py-0.5">{m.hsn}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </TallyReportLayout>
  );
}
