import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
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
import type { GstRateSetupNode } from '@/types/api/MasterData';

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

type Crumb = { id: number; name: string };
type Row = { type: 'header'; label: string } | { type: 'data'; node: GstRateSetupNode };

// Group a flat master list into status buckets (rate buckets first, then Not Provided /
// Not Applicable), each bucket sorted alphabetically — the shape of the Ledgers / Stock views.
function bucketRows(items: GstRateSetupNode[]): Row[] {
  const buckets = new Map<string, GstRateSetupNode[]>();
  for (const n of items) {
    if (!buckets.has(n.status)) buckets.set(n.status, []);
    buckets.get(n.status)!.push(n);
  }
  const ordered = [...buckets.keys()].sort((a, b) => statusOrder(a) - statusOrder(b));
  const rows: Row[] = [];
  for (const status of ordered) {
    rows.push({ type: 'header', label: status });
    for (const node of buckets.get(status)!.sort((a, b) => a.name.localeCompare(b.name)))
      rows.push({ type: 'data', node });
  }
  return rows;
}

export default function GSTRateSetup() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [masterType, setMasterType] = useState<MasterType | null>(null);
  // Groups drill stack: [] = the "♦ Primary" root; each entry is a group drilled into.
  const [path, setPath] = useState<Crumb[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<GstRateSetupNode[]>([]); // group-view sub-groups
  const [ledgers, setLedgers] = useState<GstRateSetupNode[]>([]); // group-view ledgers
  const [masters, setMasters] = useState<GstRateSetupNode[]>([]); // flat-view masters
  const [selected, setSelected] = useState<string | null>(null);

  const currentGroupId = path.length ? path[path.length - 1].id : null;
  const atRoot = currentGroupId == null;
  const applicableFrom = fmtDate(activeFY?.start_date);
  const typeLabel = MASTER_TYPES.find((t) => t.key === masterType)?.label ?? '';

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!companyId || !masterType) return;
      try {
        setLoading(true);
        setError(null);
        setSelected(null);
        if (masterType === 'group' || masterType === 'stock_group') {
          const res =
            masterType === 'group'
              ? await window.api.gst.getGstRateSetupTree({
                  company_id: companyId,
                  group_id: currentGroupId,
                })
              : await window.api.gst.getGstRateSetupStockTree({
                  company_id: companyId,
                  stock_group_id: currentGroupId,
                });
          if (cancelled) return;
          if (res.success) {
            setGroups(res.groups || []);
            setLedgers(res.ledgers || []);
          } else {
            setError(res.error || 'Failed to load GST rate setup.');
            setGroups([]);
            setLedgers([]);
          }
        } else {
          const res = await window.api.gst.getGstRateSetup({
            company_id: companyId,
            master_type: masterType,
          });
          if (cancelled) return;
          if (res.success) setMasters((res.masters as GstRateSetupNode[]) || []);
          else {
            setError(res.error || 'Failed to load GST rate setup.');
            setMasters([]);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'An unexpected error occurred.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [companyId, masterType, currentGroupId]);

  const isGroupKind = (n: GstRateSetupNode) => n.kind === 'group' || n.kind === 'stock_group';

  const drillInto = (node: GstRateSetupNode) => {
    if (!isGroupKind(node)) return; // ledgers/items are leaf rows
    setPath((p) => [...p, { id: node.id, name: node.name }]);
  };

  const goToLevel = (idx: number) => setPath((p) => p.slice(0, idx));

  const backToChooser = () => {
    setMasterType(null);
    setPath([]);
  };

  const isTreeView = masterType === 'group' || masterType === 'stock_group';

  const handleQuit = () => {
    if (isTreeView && path.length) setPath((p) => p.slice(0, -1)); // climb one group…
    else if (masterType) backToChooser(); // …then back to the master chooser…
    else navigate(-1); // …then leave the report.
  };

  // ── List of Masters chooser ───────────────────────────────────────────────
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

  // ── Build the rows for the active view ────────────────────────────────────
  let rows: Row[];
  if (isTreeView) {
    if (atRoot) {
      // Primary root: sub-groups as a plain navigable list, then the masters sitting
      // directly under Primary bucketed below (empty for Accounting, populated for Stock).
      rows = [
        ...groups.map((node): Row => ({ type: 'data', node })),
        ...bucketRows(ledgers),
      ];
    } else {
      rows = bucketRows([...groups, ...ledgers]);
    }
  } else {
    // Ledgers / Stock Items: flat list, bucketed by GST status.
    rows = bucketRows(masters.map((m) => ({ ...m, kind: masterType })));
  }

  const treeLabel = masterType === 'stock_group' ? 'Stock Group' : 'Group';
  const HEAD = 'h-auto px-2 py-1 align-bottom font-bold text-black text-xs whitespace-nowrap';

  return (
    <TallyReportLayout
      title="GST Rate Setup"
      companyName={selectedCompany?.name || 'Company'}
      onQuit={handleQuit}
      leftSubtitle={
        <>
          <div className="font-bold">Rate-wise</div>
          {isTreeView ? (
            <div className="flex items-center gap-1">
              <span>{treeLabel}:</span>
              <button
                onClick={() => goToLevel(0)}
                className={cn('hover:underline', atRoot ? 'font-bold' : '')}
                disabled={atRoot}
              >
                ♦ Primary
              </button>
              {path.map((c, i) => (
                <span key={c.id} className="flex items-center gap-1">
                  <span className="text-black">›</span>
                  <button
                    onClick={() => goToLevel(i + 1)}
                    className={cn('hover:underline', i === path.length - 1 ? 'font-bold' : '')}
                    disabled={i === path.length - 1}
                  >
                    {c.name}
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              <span>List of:</span>
              <span className="font-bold">{typeLabel}</span>
            </div>
          )}
        </>
      }
      footerControls={
        <button
          onClick={backToChooser}
          className="ml-4 font-bold text-black hover:underline"
        >
          F4: Change Master
        </button>
      }
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading masters…" className="italic" />}
        {error && <div className="p-2 text-center font-bold">{error}</div>}

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
              {rows.length === 0 ? (
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
                  const n = row.node;
                  const rowKey = `${n.kind}-${n.id}`;
                  // A "GST Not Applicable" master shows nothing in the GST columns (no dates,
                  // taxability or rate) — matching Tally.
                  const gstShown = n.status !== 'GST Not Applicable';
                  const hasRate = gstShown && /taxable/i.test(n.taxability_type);
                  const isGroup = isGroupKind(n);
                  return (
                    <TableRow
                      key={idx}
                      onClick={() => (isGroup ? drillInto(n) : setSelected(rowKey))}
                      className={cn(
                        'border-0 hover:bg-[#e6f2ff]',
                        isGroup ? 'cursor-pointer' : 'cursor-default',
                        atRoot && isGroup ? 'font-bold' : '',
                        selected === rowKey ? 'bg-[#ffcc00] hover:bg-[#ffcc00]' : '',
                      )}
                    >
                      <TableCell className="px-2 py-0.5 pl-6">{n.name}</TableCell>
                      <TableCell className="px-2 py-0.5 text-right tabular-nums">
                        {gstShown ? applicableFrom : ''}
                      </TableCell>
                      <TableCell className="px-2 py-0.5">
                        {gstShown ? n.taxability_type : ''}
                      </TableCell>
                      <TableCell className="px-2 py-0.5 text-right tabular-nums">
                        {hasRate ? `${n.gst_rate} %` : ''}
                      </TableCell>
                      <TableCell className="px-2 py-0.5 text-right tabular-nums">
                        {gstShown ? applicableFrom : ''}
                      </TableCell>
                      <TableCell className="px-2 py-0.5">{n.hsn}</TableCell>
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
