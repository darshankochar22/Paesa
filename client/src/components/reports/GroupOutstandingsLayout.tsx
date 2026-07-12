import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { filterPartyGroups } from '@/lib/outstandingParties';
import { OutstandingsRightPanel } from './OutstandingsRightPanel';

/* ── Formatters ────────────────────────────────────────────────────── */
const fmtDate = (d: string) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${dt.getDate()}-${dt.toLocaleString('en-IN', { month: 'short' })}-${String(dt.getFullYear()).slice(-2)}`;
};
const fmt = (v: number) =>
  !v
    ? ''
    : new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        Math.abs(v),
      );
const fmtTotal = (v: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Math.abs(v),
  );

/* ── Types ─────────────────────────────────────────────────────────── */
interface GroupMeta {
  group_id: number;
  name: string;
  parent?: string;
}
interface BillEntry {
  bill: string;
  bill_date: string;
  due_date: string;
  overdue_days: number;
  debit: number;
  credit: number;
}
interface OutRow {
  type: 'ledger' | 'group';
  ledger_id?: number;
  group_id?: number;
  party: string;
  debit: number;
  credit: number;
  bills?: BillEntry[];
}

export default function GroupOutstandingsLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany, activeFY } = useCompany();

  const [groupId, setGroupId] = React.useState<number | null>(() => {
    const p = new URLSearchParams(location.search);
    const id = p.get('group_id');
    return id ? Number(id) : ((location.state as any)?.group_id ?? null);
  });
  const [groupName, setGroupName] = React.useState<string>(() => {
    const p = new URLSearchParams(location.search);
    return p.get('group_name') || (location.state as any)?.group_name || '';
  });

  /* Picker state */
  const [groups, setGroups] = React.useState<GroupMeta[]>([]);
  const [search, setSearch] = React.useState('');
  const [pickerFocus, setPickerFocus] = React.useState(0);

  /* Data state */
  const [rows, setRows] = React.useState<OutRow[]>([]);
  const [totalDebit, setTotDr] = React.useState(0);
  const [totalCredit, setTotCr] = React.useState(0);
  const [as_on, setAsOn] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedIdx, setFocused] = React.useState(0);

  const fromDate = activeFY?.start_date || '';
  const toDate = activeFY?.end_date || '';
  const cid = selectedCompany?.company_id;
  const fyid = activeFY?.fy_id;
  const companyName =
    (selectedCompany as any)?.name || (selectedCompany as any)?.company_name || '';

  /* ── Load group picker ──────────────────────────────────────────── */
  React.useEffect(() => {
    if (!cid || groupId) return;
    (window as any).api.group.getAll(cid).then((res: any) => {
      const rawList = Array.isArray(res) ? res : (res?.groups ?? res?.data ?? []);
      const nameMap = new Map<number, string>();
      rawList.forEach((g: any) => nameMap.set(g.group_id, g.name));
      // Only Sundry Debtors / Sundry Creditors (and sub-groups under them) are valid parties.
      const list: GroupMeta[] = filterPartyGroups(rawList)
        .map((g: any) => ({
          group_id: g.group_id,
          name: g.name,
          parent: g.parent_group_id ? nameMap.get(g.parent_group_id) || '' : '',
        }))
        .sort((a: GroupMeta, b: GroupMeta) => a.name.localeCompare(b.name));
      setGroups(list);
    });
  }, [cid, groupId]);

  /* ── Load group bill data ──────────────────────────────────────── */
  React.useEffect(() => {
    if (!groupId || !cid || !fyid) return;
    setLoading(true);
    setError(null);
    setFocused(0);
    (window as any).api.report
      .groupOutstandings(cid, fyid, groupId)
      .then((res: any) => {
        if (res?.success) {
          setRows(res.rows || []);
          setTotDr(res.totalDebit || 0);
          setTotCr(res.totalCredit || 0);
          setAsOn(res.as_on || '');
        } else {
          setError(res?.error || 'Failed to load.');
        }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [groupId, cid, fyid]);

  const filtered = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

  /* Open a row: sub-group rows drill deeper into the group tree; ledger rows
   * drill through to that ledger's own Outstandings screen (Tally behaviour). */
  const openRow = React.useCallback(
    (row: OutRow) => {
      if (row.type === 'group' && row.group_id) {
        setGroupId(row.group_id);
        setGroupName(row.party);
      } else if (row.type === 'ledger' && row.ledger_id != null) {
        navigate(
          `/reports/accounts/outstandings-ledger?ledger_id=${row.ledger_id}&ledger_name=${encodeURIComponent(row.party)}`,
        );
      }
    },
    [navigate],
  );

  /* ── Keyboard: picker ──────────────────────────────────────────── */
  React.useEffect(() => {
    if (groupId) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') {
        if (e.key === 'Escape') navigate(-1);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPickerFocus((p) => Math.min(filtered.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPickerFocus((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const g = filtered[pickerFocus];
        if (g) {
          setGroupId(g.group_id);
          setGroupName(g.name);
        }
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [groupId, filtered, pickerFocus, navigate]);

  /* ── Keyboard: drill-down ──────────────────────────────────────── */
  React.useEffect(() => {
    if (!groupId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocused((p) => Math.min(rows.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocused((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (rows[focusedIdx]) openRow(rows[focusedIdx]);
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        setGroupId(null);
        setGroupName('');
        setRows([]);
        setFocused(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [groupId, rows, focusedIdx, openRow]);

  /* ── Picker view ─────────────────────────────────────────────────── */
  if (!groupId) {
    return (
      <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-3 py-1 text-[10px] font-mono text-black flex gap-6 select-none">
          <span className="font-bold">Group Outstandings</span>
          <span className="ml-auto">Select a group to view pending bills</span>
        </div>
        <div className="px-3 py-1.5 border-b border-gray-200 bg-white">
          <input
            autoFocus
            type="text"
            placeholder="Type to search group..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPickerFocus(0);
            }}
            className="w-full text-[11px] font-mono border border-gray-200 px-2 py-1 rounded outline-none focus:border-gray-200 bg-white"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono">
            <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 select-none">
              <tr>
                <th className="px-3 py-1.5 text-left font-bold">Group Name</th>
                <th className="px-3 py-1.5 text-left font-bold w-48">Under</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-black italic">
                    No groups found.
                  </td>
                </tr>
              ) : (
                filtered.map((g, idx) => (
                  <tr
                    key={g.group_id}
                    className={`border-b border-gray-200 cursor-pointer select-none transition-colors ${pickerFocus === idx ? 'bg-black/[0.06] text-black font-bold' : 'hover:bg-black/[0.03] text-black'}`}
                    onClick={() => {
                      setPickerFocus(idx);
                      setGroupId(g.group_id);
                      setGroupName(g.name);
                    }}
                  >
                    <td className="px-3 py-1.5">{g.name}</td>
                    <td className="px-3 py-1.5 text-black">{g.parent}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
        Loading Group Outstandings...
      </div>
    );
  if (error)
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs px-8 text-center">
        {error}
      </div>
    );

  /* ── Right-panel actions (Tally F-keys). Wired: F4 Group → picker,
   * Change View → Ledger Outstandings. The rest are greyed for parity. ── */
  const panelItems = [
    { key: 'F2', label: 'Period' },
    { key: 'F3', label: 'Company' },
    {
      key: 'F4',
      label: 'Group',
      onClick: () => {
        setGroupId(null);
        setGroupName('');
        setRows([]);
        setFocused(0);
      },
    },
    { key: '', label: '', spacer: true },
    { key: 'F5', label: 'Ledger-wise' },
    { key: 'F6', label: 'Ageing Method' },
    { key: 'F8', label: 'Ledger-wise Bills' },
    { key: '', label: '', spacer: true },
    { key: 'B', label: 'Basis of Values' },
    {
      key: 'H',
      label: 'Change View',
      onClick: () => navigate('/reports/accounts/outstandings-ledger'),
    },
    { key: 'J', label: 'Exception Reports' },
    { key: 'L', label: 'Save View' },
    { key: '', label: '', spacer: true },
    { key: 'E', label: 'Apply Filter' },
    { key: 'C', label: 'New Column' },
    { key: 'A', label: 'Alter Column' },
    { key: 'N', label: 'Auto Column' },
  ];

  /* ── Drill-down view (Particulars | Pending Bills: Debit | Credit) ─── */
  return (
    <div className="flex h-full w-full bg-white font-mono overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sub-header */}
        <div className="bg-white border-b border-gray-200 px-3 py-1 text-[10px] font-mono text-black flex gap-6 select-none">
          <span>
            Group : <span className="font-bold">{groupName}</span>
          </span>
          <span>
            Details of : <span className="font-bold">Pending Bills</span>
          </span>
          <span className="ml-auto text-right">
            {companyName && <span className="font-bold">{companyName}</span>}
            {companyName && '  ·  '}
            {as_on ? `As on ${fmtDate(as_on)}` : `${fmtDate(fromDate)} to ${fmtDate(toDate)}`}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono">
            <thead className="sticky top-0 bg-white z-10 select-none">
              <tr className="border-b border-gray-200">
                <th className="px-3 py-1 text-left align-bottom font-bold" rowSpan={2}>
                  Particulars
                </th>
                <th
                  className="px-3 py-1 text-center font-bold border-b border-gray-200"
                  colSpan={2}
                >
                  Pending Bills
                </th>
              </tr>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-1 text-right font-bold w-[20%]">Debit</th>
                <th className="px-3 py-1 text-right font-bold w-[20%]">Credit</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-black italic">
                    No pending bills for this group.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const isFocused = focusedIdx === idx;
                  const isGroup = row.type === 'group';
                  return (
                    <tr
                      key={`${row.type}-${row.ledger_id ?? row.group_id}`}
                      className={`border-b border-gray-200 cursor-pointer select-none transition-colors ${isFocused ? 'bg-black/[0.06] text-black' : 'hover:bg-black/[0.03] text-black'} font-semibold`}
                      onClick={() => {
                        setFocused(idx);
                        openRow(row);
                      }}
                    >
                      <td className="px-3 py-1.5">
                        {isGroup ? (
                          <span>
                            {row.party} <span className="text-black">(sub-group)</span>
                          </span>
                        ) : (
                          <span>{row.party}</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right">{fmt(row.debit)}</td>
                      <td className="px-3 py-1.5 text-right">{fmt(row.credit)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Grand Total */}
        <div className="border-t border-gray-200 bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black select-none">
          <span className="flex-1">Grand Total</span>
          <span className="w-[20%] text-right">{fmtTotal(totalDebit)}</span>
          <span className="w-[20%] text-right pr-3">{fmtTotal(totalCredit)}</span>
        </div>
      </div>

      <OutstandingsRightPanel items={panelItems} />
    </div>
  );
}
