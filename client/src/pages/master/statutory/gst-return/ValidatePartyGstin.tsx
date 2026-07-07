import { useCallback, useEffect, useMemo, useState } from 'react';
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

const REGISTRATION_TYPES = [
  'Regular',
  'Composition',
  'Regular - SEZ',
  'Consumer',
  'Unregistered',
  'Unknown',
];

// PAN: 5 letters, 4 digits, 1 letter (e.g. AAAPS1234A). Tally rejects anything else.
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const PAN_ERROR =
  'Invalid PAN format.\n' +
  'The PAN must contain 5 alphabets, followed by 4 numbers and then 1 alphabet.\n' +
  'For example: AAAPS1234A';

// State-code prefix → State, for offline "Fetch Details Using GSTIN/UIN" (mirrors the
// server-side map used by Create Party Using GSTIN/UIN — the GSTIN carries the state code).
const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
  '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra', '28': 'Andhra Pradesh',
  '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '35': 'Andaman & Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh',
  '38': 'Ladakh', '97': 'Other Territory',
};

interface PartyRow {
  id: number;
  name: string;
  address: string;
  state: string;
  country: string;
  registration_type: string;
  gstin: string;
  pan: string;
  valid: boolean;
  status: string;
}

interface GroupOpt {
  group_id: number;
  name: string;
  is_predefined: boolean;
}

// Predefined groups TallyPrime lists in "Select Group" for party utilities — the
// party-capable balance-sheet groups. They appear whether or not they hold a ledger.
// Every user-created group is shown too (e.g. "Moly Jain" made under Capital Account),
// while empty P&L / tax / cash / stock predefined groups stay hidden — even when they
// contain ledgers. Names match the group seed (server/group/groupService.js).
const PARTY_GROUPS = new Set([
  'Bank Accounts',
  'Bank OCC A/c',
  'Bank OD A/c',
  'Branch/Divisions',
  'Capital Account',
  'Current Assets',
  'Current Liabilities',
  'Deposits (Asset)',
  'Fixed Assets',
  'Loans & Advances (Asset)',
  'Loans(Liability)',
  'Secured Loans',
  'Sundry Creditors',
  'Sundry Debtors',
  'Unsecured Loans',
]);

const ALL = 'All Items';
const TH = 'px-2 py-1 text-left font-bold text-black align-bottom border-b border-black';
const THR = 'px-2 py-1 text-right font-bold text-black align-bottom border-b border-black';
const selectCls =
  'border border-zinc-300 h-8 px-2 text-xs bg-white text-black focus:border-black focus:outline-none w-56';
const editCls = 'w-56 h-8 text-xs border-zinc-300 text-black';

export default function ValidatePartyGstin() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [groups, setGroups] = useState<GroupOpt[]>([]);
  const [allLedgers, setAllLedgers] = useState<
    { ledger_id: number; name: string; group_name: string }[]
  >([]);

  // Committed selection (drives the loaded report) vs. draft (held while the dialog is open).
  const [groupName, setGroupName] = useState(ALL);
  const [ledgerName, setLedgerName] = useState(ALL);
  const [showSelect, setShowSelect] = useState(true);
  const [draftGroup, setDraftGroup] = useState(ALL);
  const [draftLedger, setDraftLedger] = useState(ALL);

  const [parties, setParties] = useState<PartyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exceptionsOnly, setExceptionsOnly] = useState(false);
  const [focused, setFocused] = useState(0);

  // View-only line ops (Space marks, Remove hides, Restore un-hides) — never delete data.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [removedStack, setRemovedStack] = useState<number[]>([]);

  const [editParty, setEditParty] = useState<PartyRow | null>(null);
  const [form, setForm] = useState<PartyRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load groups + all ledgers once. Each ledger carries its group_name, so the ledger
  // dropdown is filtered client-side by the chosen group — and a specific ledger can be
  // picked even while Group stays "All Items" (matching Tally's Select Group flow).
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const [gRes, lRes] = await Promise.all([
        window.api.group.getAll(companyId),
        window.api.ledger.getAll(companyId),
      ]);
      if (gRes.success) {
        setGroups(
          (gRes.groups ?? [])
            .map((g: any) => ({
              group_id: g.group_id,
              name: g.name,
              is_predefined: !!g.is_predefined,
            }))
            .filter((g: GroupOpt) => g.name),
        );
      }
      if (lRes.success) {
        setAllLedgers(
          (lRes.ledgers ?? [])
            .map((l: any) => ({ ledger_id: l.ledger_id, name: l.name, group_name: l.group_name }))
            .filter((l: { name: string }) => l.name),
        );
      }
    })();
  }, [companyId]);

  // Group options: the party-capable predefined groups Tally lists, plus every
  // user-created (non-predefined) group — regardless of whether they hold a ledger.
  const groupChoices = useMemo(
    () =>
      groups
        .filter((g) => !g.is_predefined || PARTY_GROUPS.has(g.name))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [groups],
  );

  // Ledger dropdown options: all ledgers for "All Items", else only the chosen group's.
  const ledgerOptions = useMemo(
    () => (draftGroup === ALL ? allLedgers : allLedgers.filter((l) => l.group_name === draftGroup)),
    [allLedgers, draftGroup],
  );

  const load = useCallback(
    async (gName: string, lName: string) => {
      if (!companyId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await window.api.gst.validatePartyGstin({
          company_id: companyId,
          group_name: gName,
          ledger_name: lName,
        });
        if (res.success) {
          setParties(res.parties ?? []);
          setFocused(0);
          setSelectedIds(new Set());
          setRemovedStack([]);
        } else {
          setError(res.error || 'Failed to validate party GSTINs.');
          setParties([]);
        }
      } catch (e: any) {
        setError(e.message || 'An unexpected error occurred.');
        setParties([]);
      } finally {
        setLoading(false);
      }
    },
    [companyId],
  );

  const acceptSelection = () => {
    setGroupName(draftGroup);
    setLedgerName(draftLedger);
    setShowSelect(false);
    load(draftGroup, draftLedger);
  };

  const openSelect = () => {
    setDraftGroup(groupName);
    setDraftLedger(ledgerName);
    setShowSelect(true);
  };

  // Rows currently on screen: exclude removed, optionally keep only exceptions.
  const removedSet = useMemo(() => new Set(removedStack), [removedStack]);
  const visible = useMemo(
    () =>
      parties.filter(
        (p) => !removedSet.has(p.id) && (!exceptionsOnly || !p.valid),
      ),
    [parties, removedSet, exceptionsOnly],
  );
  const exceptionCount = parties.filter((p) => !p.valid && !removedSet.has(p.id)).length;

  // Keep focus in-bounds as the visible set changes.
  useEffect(() => {
    setFocused((f) => Math.max(0, Math.min(f, visible.length - 1)));
  }, [visible.length]);

  const openEdit = (p: PartyRow) => {
    setSaveError(null);
    setEditParty(p);
    setForm({ ...p });
  };

  // Fill blank fields from the GSTIN (State-code prefix → State, chars 3-12 → PAN).
  const fetchFromGstin = () => {
    setForm((f) => {
      if (!f) return f;
      const g = f.gstin.trim().toUpperCase();
      if (g.length < 12) return f;
      return {
        ...f,
        state: f.state || GST_STATE_CODES[g.substring(0, 2)] || f.state,
        pan: f.pan || g.substring(2, 12),
        country: f.country || 'India',
        registration_type:
          !f.registration_type || f.registration_type === 'Unknown'
            ? 'Regular'
            : f.registration_type,
      };
    });
  };

  const save = async () => {
    if (!form) return;
    const pan = form.pan.trim().toUpperCase();
    if (pan && !PAN_RE.test(pan)) {
      setSaveError(PAN_ERROR);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await window.api.gst.updatePartyGstDetails({
        ledger_id: form.id,
        registration_type: form.registration_type,
        gstin: form.gstin,
        pan: form.pan,
        state: form.state,
        country: form.country,
      });
      if (res.success) {
        setEditParty(null);
        setForm(null);
        load(groupName, ledgerName);
      } else {
        setSaveError(res.error || 'Failed to update party GST details.');
      }
    } catch (e: any) {
      setSaveError(e.message || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const removeLines = () => {
    const focusRow = visible[focused];
    const ids = selectedIds.size ? [...selectedIds] : focusRow ? [focusRow.id] : [];
    if (!ids.length) return;
    setRemovedStack((s) => [...s, ...ids]);
    setSelectedIds(new Set());
  };

  const restoreLine = () => {
    setRemovedStack((s) => s.slice(0, -1));
  };

  const toggleMark = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Keyboard: arrows move focus, Enter opens Update Details, Space marks, R/Del remove, U restore.
  useEffect(() => {
    if (showSelect || editParty) return;
    const handler = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el?.tagName === 'INPUT' || el?.tagName === 'SELECT' || el?.closest("[role='dialog']")) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocused((p) => Math.min(visible.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocused((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (visible[focused]) openEdit(visible[focused]);
      } else if (e.key === ' ') {
        e.preventDefault();
        if (visible[focused]) toggleMark(visible[focused].id);
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'Delete') {
        e.preventDefault();
        removeLines();
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        restoreLine();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showSelect, editParty, visible, focused, selectedIds]);

  const actionBtn = 'border border-zinc-400 px-2 py-0.5 text-[11px] font-semibold hover:bg-zinc-100 disabled:opacity-40';

  return (
    <TallyReportLayout
      title="Validate Party GSTIN/UIN"
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <div className="flex items-center gap-4">
          <span>
            Name of Group&nbsp;:&nbsp;<span className="font-bold">{groupName}</span>
          </span>
          <span>
            Party Name&nbsp;:&nbsp;<span className="font-bold">{ledgerName}</span>
          </span>
        </div>
      }
      rightSubtitle={
        <span>
          {exceptionCount} exception{exceptionCount === 1 ? '' : 's'}
        </span>
      }
      footerControls={
        <div className="flex items-center gap-2">
          <button className={actionBtn} onClick={openSelect}>
            F4: Group
          </button>
          <button className={actionBtn} onClick={() => setExceptionsOnly((s) => !s)}>
            F8: {exceptionsOnly ? 'Show All' : 'Exceptions Only'}
          </button>
          <button
            className="border border-black bg-black text-white px-2 py-0.5 text-[11px] font-semibold hover:bg-zinc-800 disabled:opacity-40"
            disabled={!visible.length}
            onClick={() => visible[focused] && openEdit(visible[focused])}
          >
            F9: Update Details
          </button>
        </div>
      }
    >
      <div className="w-full flex flex-col font-sans text-xs h-full">
        {error ? (
          <EmptyState message={error} className="italic" />
        ) : loading ? (
          <EmptyState message="Validating party GSTINs…" className="italic" />
        ) : (
          <>
            <div className="flex-1 overflow-auto">
              <table className="text-xs border-collapse w-full">
                <thead className="sticky top-0 bg-white z-10">
                  <tr>
                    <th className={`${THR} w-12`}>Sl No.</th>
                    <th className={TH}>Particulars</th>
                    <th className={`${TH} w-40`}>Address</th>
                    <th className={`${TH} w-28`}>State</th>
                    <th className={`${TH} w-24`}>Country</th>
                    <th className={`${TH} w-28`}>Registration Type</th>
                    <th className={`${TH} w-40`}>GSTIN/UIN</th>
                    <th className={`${TH} w-32`}>PAN/IT No.</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-gray-400 italic">
                        {exceptionsOnly
                          ? 'No exceptions — all party GSTINs are valid.'
                          : 'No party ledgers found for this selection.'}
                      </td>
                    </tr>
                  ) : (
                    visible.map((p, i) => {
                      const marked = selectedIds.has(p.id);
                      return (
                        <tr
                          key={p.id}
                          onClick={() => setFocused(i)}
                          onDoubleClick={() => openEdit(p)}
                          className={`cursor-pointer border-b border-black/10 ${
                            i === focused
                              ? 'bg-[#ffcc00] hover:bg-[#ffcc00]'
                              : marked
                                ? 'bg-zinc-200'
                                : 'hover:bg-[#e6f2ff]'
                          }`}
                        >
                          <td className="px-2 py-0.5 text-right tabular-nums">{i + 1}</td>
                          <td className={`px-2 py-0.5 ${!p.valid ? 'font-bold' : 'font-semibold'}`}>
                            {p.name}
                            {!p.valid && (
                              <span className="ml-2 text-[10px] italic font-normal text-gray-600">
                                {p.status}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-0.5 truncate">{p.address}</td>
                          <td className="px-2 py-0.5">{p.state}</td>
                          <td className="px-2 py-0.5">{p.country}</td>
                          <td className="px-2 py-0.5">{p.registration_type}</td>
                          <td className={`px-2 py-0.5 tabular-nums ${!p.valid ? 'font-bold' : ''}`}>
                            {p.gstin}
                          </td>
                          <td className="px-2 py-0.5 tabular-nums">{p.pan}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom button bar (Tally line-ops) */}
            <div className="flex items-center gap-4 border-t border-black px-3 py-1 text-[11px] bg-white">
              <button
                className="font-semibold hover:underline disabled:opacity-40"
                disabled={!visible.length}
                onClick={() => visible[focused] && toggleMark(visible[focused].id)}
              >
                Space: Select{selectedIds.size ? ` (${selectedIds.size})` : ''}
              </button>
              <button
                className="font-semibold hover:underline disabled:opacity-40"
                disabled={!visible.length}
                onClick={removeLines}
              >
                R: Remove Line
              </button>
              <button
                className="font-semibold hover:underline disabled:opacity-40"
                disabled={!removedStack.length}
                onClick={restoreLine}
              >
                U: Restore Line
              </button>
            </div>
          </>
        )}
      </div>

      {/* Select Group / Ledger */}
      <Dialog open={showSelect} onOpenChange={(open) => !open && parties.length && setShowSelect(false)}>
        <DialogContent className="sm:max-w-md bg-white text-black border border-zinc-300">
          <DialogHeader>
            <DialogTitle className="font-bold">Select Group</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <label className="font-semibold">Name of Group</label>
              <select
                className={selectCls}
                value={draftGroup}
                onChange={(e) => {
                  setDraftGroup(e.target.value);
                  setDraftLedger(ALL);
                }}
              >
                <option value={ALL}>{ALL}</option>
                {groupChoices.map((g) => (
                  <option key={g.group_id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="font-semibold">Name of Ledger</label>
              <select
                className={selectCls}
                value={draftLedger}
                onChange={(e) => setDraftLedger(e.target.value)}
              >
                <option value={ALL}>{ALL}</option>
                {ledgerOptions.map((l) => (
                  <option key={l.ledger_id} value={l.name}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            {parties.length > 0 && (
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowSelect(false)}>
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              className="text-xs bg-black text-white hover:bg-zinc-800"
              onClick={acceptSelection}
            >
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Details (F9) — party GST identity */}
      <Dialog open={!!editParty} onOpenChange={(o) => !o && setEditParty(null)}>
        <DialogContent className="sm:max-w-lg bg-white text-black border border-zinc-300">
          <DialogHeader>
            <DialogTitle className="font-bold text-sm">
              Update Details for : {editParty?.name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-[11px] italic text-zinc-600 leading-snug">
            Correct the party's GST identity. Use Fetch to fill State and PAN from the GSTIN/UIN. On
            Accept the changes are saved to the party ledger.
          </p>
          {form && (
            <div className="flex flex-col gap-2.5 py-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-semibold">Registration Type</label>
                <select
                  className={selectCls}
                  value={form.registration_type || 'Unknown'}
                  onChange={(e) => setForm((f) => f && { ...f, registration_type: e.target.value })}
                >
                  {REGISTRATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="font-semibold">GSTIN/UIN</label>
                <Input
                  className={`${editCls} uppercase`}
                  value={form.gstin}
                  maxLength={15}
                  placeholder="15-character GSTIN/UIN"
                  onChange={(e) => setForm((f) => f && { ...f, gstin: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="font-semibold">PAN/IT No.</label>
                <Input
                  className={`${editCls} uppercase`}
                  value={form.pan}
                  maxLength={10}
                  onChange={(e) => setForm((f) => f && { ...f, pan: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="font-semibold">State</label>
                <Input
                  className={editCls}
                  value={form.state}
                  onChange={(e) => setForm((f) => f && { ...f, state: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="font-semibold">Country</label>
                <Input
                  className={editCls}
                  value={form.country}
                  onChange={(e) => setForm((f) => f && { ...f, country: e.target.value })}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-[11px] font-semibold border border-zinc-400 px-2 py-0.5 hover:bg-zinc-100"
                  onClick={fetchFromGstin}
                >
                  Fetch Details Using GSTIN/UIN
                </button>
              </div>
              {saveError && (
                <div className="border border-red-500 bg-red-50 text-red-700 font-semibold text-[11px] whitespace-pre-line px-2 py-1.5">
                  {saveError}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setEditParty(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs bg-black text-white hover:bg-zinc-800"
              onClick={save}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Accept'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TallyReportLayout>
  );
}
