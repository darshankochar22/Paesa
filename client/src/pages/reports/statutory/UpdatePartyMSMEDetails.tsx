import { useCallback, useEffect, useState } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { EmptyState } from '@/components/blocks/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';

const ENTERPRISE_TYPES = ['Not Applicable', 'Micro', 'Small', 'Medium'];
const ACTIVITY_TYPES = ['Unknown', 'Manufacturing', 'Services', 'Traders'];

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoToday = () => toISO(new Date());
const isoTomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toISO(d);
};
const fmtDate = (dateStr?: string | null) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
};

interface PartyRow {
  ledger_id: number;
  name: string;
  is_bill_wise: number;
  default_credit_period: number | null;
  state: string | null;
  country: string | null;
  type_of_enterprise: string | null;
  udyam_reg_no: string | null;
  activity_type: string | null;
  effective_date: string | null;
}

interface GroupOpt {
  group_id: number;
  name: string;
}

const TH = 'px-3 py-1 text-left font-bold text-black align-bottom border-b border-gray-200';
const THR = 'px-3 py-1 text-right font-bold text-black align-bottom border-b border-gray-200';
const selectCls =
  'border border-gray-200 h-8 px-2 text-xs bg-white text-black focus:border-gray-200 focus:outline-none w-56';

export default function UpdatePartyMSMEDetails() {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const companyDate = activeFY?.start_date || '';

  const [groups, setGroups] = useState<GroupOpt[]>([]);
  const [groupLedgers, setGroupLedgers] = useState<{ ledger_id: number; name: string }[]>([]);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [ledgerId, setLedgerId] = useState<number | null>(null);

  const [rows, setRows] = useState<PartyRow[]>([]);
  const [lastEntryDate, setLastEntryDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const [showSelect, setShowSelect] = useState(true);
  // Draft selection held while the Select Group dialog is open.
  const [draftGroupId, setDraftGroupId] = useState<number | null>(null);
  const [draftLedgerId, setDraftLedgerId] = useState<number | null>(null);

  const [editParty, setEditParty] = useState<PartyRow | null>(null);
  const [form, setForm] = useState({
    type_of_enterprise: 'Not Applicable',
    udyam_reg_no: '',
    activity_type: 'Unknown',
    effective_date: '',
  });
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  // Effective Date is a separate popup (Tally flow), plus a nested "New Effective Date" entry.
  const [showEffDate, setShowEffDate] = useState(false);
  const [showNewDate, setShowNewDate] = useState(false);
  const [newDate, setNewDate] = useState('');

  // Load groups once; default the selection to Sundry Creditors (the MSME payables side).
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const res = await window.api.group.getAll(companyId);
      if (res.success) {
        const list: GroupOpt[] = (res.groups ?? []).map((g: any) => ({
          group_id: g.group_id,
          name: g.name,
        }));
        setGroups(list);
        const creditors = list.find((g) => g.name === 'Sundry Creditors');
        const gid = creditors?.group_id ?? list[0]?.group_id ?? null;
        setDraftGroupId(gid);
        setDraftLedgerId(null);
      }
    })();
  }, [companyId]);

  // Ledger dropdown for the Select Group dialog follows the drafted group.
  useEffect(() => {
    if (!companyId || !draftGroupId) {
      setGroupLedgers([]);
      return;
    }
    (async () => {
      const res = await window.api.ledger.getByGroup(companyId, draftGroupId);
      if (res.success) {
        setGroupLedgers(
          (res.ledgers ?? []).map((l: any) => ({ ledger_id: l.ledger_id, name: l.name })),
        );
      }
    })();
  }, [companyId, draftGroupId]);

  const loadPartyList = useCallback(
    async (gid: number | null, lid: number | null) => {
      if (!companyId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await window.api.msme.getPartyList(companyId, gid, lid);
        if (res.success) {
          setRows(res.party_ledgers ?? []);
          setLastEntryDate(res.last_entry_date ?? null);
          setFocusedIndex(0);
        } else {
          setError(res.error || 'Failed to load party MSME details');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [companyId],
  );

  const acceptSelection = () => {
    setGroupId(draftGroupId);
    setLedgerId(draftLedgerId);
    setShowSelect(false);
    loadPartyList(draftGroupId, draftLedgerId);
  };

  const openSelect = () => {
    setDraftGroupId(groupId ?? draftGroupId);
    setDraftLedgerId(ledgerId);
    setShowSelect(true);
  };

  const openUpdate = (party: PartyRow) => {
    setEditParty(party);
    setConfirming(false);
    setShowEffDate(false);
    setShowNewDate(false);
    setForm({
      type_of_enterprise: party.type_of_enterprise || 'Not Applicable',
      udyam_reg_no: party.udyam_reg_no || '',
      activity_type: party.activity_type || 'Unknown',
      effective_date: party.effective_date || companyDate,
    });
  };

  const saveUpdate = async () => {
    if (!editParty) return;
    setSaving(true);
    try {
      const res = await window.api.msme.updateDetails({
        ledger_id: editParty.ledger_id,
        type_of_enterprise: form.type_of_enterprise,
        udyam_reg_no: form.udyam_reg_no,
        activity_type: form.activity_type,
        effective_date: form.effective_date,
      });
      if (res.success) {
        setEditParty(null);
        setConfirming(false);
        loadPartyList(groupId, ledgerId);
      } else {
        setError(res.error || 'Failed to update MSME details');
      }
    } finally {
      setSaving(false);
    }
  };

  // Keyboard: arrows move focus, Enter opens the update popup for the focused party.
  useEffect(() => {
    if (showSelect || editParty || !rows.length) return;
    const handler = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.closest("[role='dialog']")
      )
        return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((p) => Math.min(rows.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const r = rows[focusedIndex];
        if (r) openUpdate(r);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showSelect, editParty, rows, focusedIndex]);

  const isRegistered = form.type_of_enterprise !== 'Not Applicable';

  return (
    <TallyReportLayout
      title="Update Party MSME Registration Details"
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <span>
          Group&nbsp;:&nbsp;
          <span className="font-bold">
            {groups.find((g) => g.group_id === groupId)?.name || 'All Items'}
          </span>
        </span>
      }
      footerControls={
        <div className="flex items-center gap-2">
          <button
            className="border border-gray-200 px-2 py-0.5 text-[11px] font-semibold hover:bg-black/[0.03]"
            onClick={openSelect}
          >
            F4: Group
          </button>
          <button
            className="border border-gray-200 bg-black text-white px-2 py-0.5 text-[11px] font-semibold hover:bg-black/80 disabled:opacity-40"
            disabled={!rows.length}
            onClick={() => rows[focusedIndex] && openUpdate(rows[focusedIndex])}
          >
            H: Update MSME Details
          </button>
        </div>
      }
    >
      <div className="w-full flex flex-col font-sans text-xs h-full">
        {error ? (
          <EmptyState message={error} className="italic" />
        ) : loading ? (
          <EmptyState message="Loading party ledgers…" className="italic" />
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="text-xs border-collapse w-full">
              <thead className="sticky top-0 bg-white z-10">
                <tr>
                  <th className={`${TH} w-12`}>Sl. No.</th>
                  <th className={TH}>Particulars</th>
                  <th className={THR}>Maintain Balance Bill-by-Bill</th>
                  <th className={THR}>Default Credit Period</th>
                  <th className={TH}>State</th>
                  <th className={TH}>Country</th>
                  <th className={TH}>Type of Enterprise</th>
                  <th className={TH}>UDYAM Reg No.</th>
                  <th className={TH}>Activity Type</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-6 text-black italic">
                      No party ledgers in this group.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => {
                    const type =
                      r.type_of_enterprise && r.type_of_enterprise !== 'Not Applicable'
                        ? r.type_of_enterprise
                        : '';
                    const activity =
                      type && r.activity_type && r.activity_type !== 'Unknown'
                        ? r.activity_type
                        : '';
                    return (
                      <tr
                        key={r.ledger_id}
                        onClick={() => setFocusedIndex(i)}
                        onDoubleClick={() => openUpdate(r)}
                        className={`border-b border-gray-200 cursor-pointer ${
                          i === focusedIndex
                            ? 'bg-black/[0.06] font-semibold'
                            : 'hover:bg-black/[0.03]'
                        }`}
                      >
                        <td className="px-3 py-1 text-right tabular-nums">{i + 1}</td>
                        <td className="px-3 py-1 font-semibold">{r.name}</td>
                        <td className="px-3 py-1 text-right">{r.is_bill_wise ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-1 text-right tabular-nums">
                          {r.default_credit_period ? `${r.default_credit_period} Days` : ''}
                        </td>
                        <td className="px-3 py-1">{r.state || ''}</td>
                        <td className="px-3 py-1">{r.country || ''}</td>
                        <td className="px-3 py-1">{type}</td>
                        <td className="px-3 py-1">{r.udyam_reg_no || ''}</td>
                        <td className="px-3 py-1">{activity}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Select Group / Ledger */}
      <Dialog open={showSelect} onOpenChange={(open) => !open && setShowSelect(false)}>
        <DialogContent className="sm:max-w-md bg-white text-black border border-gray-200">
          <DialogHeader>
            <DialogTitle className="font-bold">Select Group</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <label className="font-semibold">Name of Group</label>
              <select
                className={selectCls}
                value={draftGroupId ?? ''}
                onChange={(e) => {
                  setDraftGroupId(e.target.value ? Number(e.target.value) : null);
                  setDraftLedgerId(null);
                }}
              >
                {groups.map((g) => (
                  <option key={g.group_id} value={g.group_id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="font-semibold">Name of Ledger</label>
              <select
                className={selectCls}
                value={draftLedgerId ?? ''}
                onChange={(e) => setDraftLedgerId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">All Items</option>
                {groupLedgers.map((l) => (
                  <option key={l.ledger_id} value={l.ledger_id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setShowSelect(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs bg-black text-white hover:bg-black/80"
              onClick={acceptSelection}
              disabled={!draftGroupId}
            >
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update MSME Registration Details */}
      <Dialog open={!!editParty} onOpenChange={(open) => !open && setEditParty(null)}>
        <DialogContent
          className="sm:max-w-lg bg-white text-black border border-gray-200"
          onInteractOutside={(e) => {
            // Keep this dialog mounted while an Effective Date sub-popup is open.
            if (showEffDate || showNewDate) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            // Escape closes the topmost sub-popup first, not the whole dialog.
            if (showNewDate) {
              e.preventDefault();
              setShowNewDate(false);
            } else if (showEffDate) {
              e.preventDefault();
              setShowEffDate(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-bold text-sm">
              Update MSME Registration Details for : {editParty?.name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-[11px] italic text-black leading-snug">
            Once you provide MSME Registration details, the option Maintain balances bill-by-bill
            will be enabled in the party ledger. Also, State and Country are prefilled from the
            Company master, if not specified already.
          </p>
          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <label className="font-semibold">Type of Enterprise</label>
              <select
                className={selectCls}
                value={form.type_of_enterprise}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({ ...f, type_of_enterprise: v }));
                  // "Not Applicable" has no further fields — go straight to Effective Date.
                  if (v === 'Not Applicable') setShowEffDate(true);
                }}
              >
                {ENTERPRISE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="font-semibold">UDYAM Reg No.</label>
              <Input
                className="w-56 h-8 text-xs border-gray-200 text-black"
                value={form.udyam_reg_no}
                disabled={!isRegistered}
                onChange={(e) => setForm((f) => ({ ...f, udyam_reg_no: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="font-semibold">Activity Type</label>
              <select
                className={selectCls}
                value={form.activity_type}
                disabled={!isRegistered}
                onChange={(e) => {
                  setForm((f) => ({ ...f, activity_type: e.target.value }));
                  // Selecting the Activity Type completes the fields — prompt Effective Date.
                  setShowEffDate(true);
                }}
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            {/* Effective Date is captured only via the separate popup (Type of Enterprise / Activity Type). */}
          </div>
          <DialogFooter>
            {confirming ? (
              <div className="flex items-center gap-3 w-full justify-end">
                <span className="text-xs font-semibold">Accept?</span>
                <Button
                  size="sm"
                  className="text-xs bg-black text-white hover:bg-black/80"
                  onClick={saveUpdate}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Yes'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setConfirming(false)}
                  disabled={saving}
                >
                  No
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setEditParty(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="text-xs bg-black text-white hover:bg-black/80"
                  onClick={() => setConfirming(true)}
                >
                  Accept
                </Button>
              </>
            )}
          </DialogFooter>

          {/*
            Effective Date + New Effective Date render INSIDE this dialog (absolute overlays),
            not as separate modals — so closing them can never unmount the parent dialog.
          */}
          {showEffDate && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/[0.06] p-4">
              <div className="w-80 max-w-full bg-white border border-gray-200 text-black">
                <div className="border-b border-gray-200 px-3 py-1.5 font-bold text-sm text-center">
                  Effective Date
                </div>
                <div className="p-3 flex flex-col gap-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold">
                      Effective Date for MSME Registration Details
                    </label>
                    <Input
                      type="date"
                      className="w-36 h-8 text-xs border-gray-200 text-black shrink-0"
                      value={form.effective_date}
                      onChange={(e) => setForm((f) => ({ ...f, effective_date: e.target.value }))}
                    />
                  </div>
                  <div className="border border-gray-200">
                    <div className="bg-black/[0.06] px-2 py-1 font-bold text-[11px] border-b border-gray-200">
                      List of Effective Dates
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewDate('');
                        setShowNewDate(true);
                      }}
                      className="w-full text-left px-2 py-1 text-[11px] font-semibold hover:bg-black/[0.03] border-b border-gray-200"
                    >
                      New Effective Date
                    </button>
                    {[
                      { label: 'Current Date of Company', val: companyDate },
                      { label: 'Date of Last Entry', val: lastEntryDate || '' },
                      { label: 'Today (Computer Date)', val: isoToday() },
                      { label: 'Tomorrow (Computer Date)', val: isoTomorrow() },
                    ]
                      .filter((o) => o.val)
                      .map((o) => (
                        <button
                          key={o.label}
                          type="button"
                          onClick={() => {
                            setForm((f) => ({ ...f, effective_date: o.val }));
                            setShowEffDate(false);
                          }}
                          className="w-full flex justify-between gap-4 px-2 py-1 text-[11px] hover:bg-black/[0.03]"
                        >
                          <span className="tabular-nums">{fmtDate(o.val)}</span>
                          <span className="italic text-black">{o.label}</span>
                        </button>
                      ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setShowEffDate(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs bg-black text-white hover:bg-black/80"
                      disabled={!form.effective_date}
                      onClick={() => setShowEffDate(false)}
                    >
                      Accept
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showNewDate && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/[0.06] p-4">
              <div className="w-64 max-w-full bg-white border border-gray-200 text-black">
                <div className="border-b border-gray-200 px-3 py-1.5 font-bold text-sm text-center">
                  New Effective Date
                </div>
                <div className="p-3">
                  <Input
                    type="date"
                    autoFocus
                    className="w-full h-8 text-xs border-gray-200 text-black"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newDate) {
                        setForm((f) => ({ ...f, effective_date: newDate }));
                        setShowNewDate(false);
                        setShowEffDate(false);
                      }
                    }}
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setShowNewDate(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs bg-black text-white hover:bg-black/80"
                      disabled={!newDate}
                      onClick={() => {
                        setForm((f) => ({ ...f, effective_date: newDate }));
                        setShowNewDate(false);
                        setShowEffDate(false);
                      }}
                    >
                      Accept
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TallyReportLayout>
  );
}
