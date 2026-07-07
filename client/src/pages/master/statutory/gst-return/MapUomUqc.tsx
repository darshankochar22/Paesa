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
import { UqcPopup } from '../../inventory/unit/UqcPopup';
import { EffectiveDatePrompt, type EffectiveDateOption } from '@/components/tally-ui/EffectiveDatePrompt';

interface UnitRow {
  unit_id: number;
  symbol: string;
  formal_name: string | null;
  unit_quantity_code: string | null;
  uqc_effective_date: string | null;
  unit_type: string;
  name: string;
  decimal_places: number | null;
  first_unit_id: number | null;
  second_unit_id: number | null;
  conversion_factor: number | null;
}

interface AlterForm {
  symbol: string;
  formal_name: string;
  decimal_places: number;
  unit_quantity_code: string; // '' means Not Applicable
  uqc_effective_date: string;
}

const isMapped = (u: UnitRow) =>
  !!u.unit_quantity_code && u.unit_quantity_code !== 'Not Applicable';

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoToday = () => toISO(new Date());
const isoTomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toISO(d);
};

const rowCls = 'flex items-center min-h-[26px]';
const labelCls = 'w-56 shrink-0 text-zinc-700';
const fieldInput =
  'flex-1 bg-transparent outline-none px-1 py-0.5 border border-transparent focus:bg-zinc-100 focus:border-zinc-300';

export default function MapUomUqc() {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const companyDate = activeFY?.start_date || '';

  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const [editUnit, setEditUnit] = useState<UnitRow | null>(null);
  const [form, setForm] = useState<AlterForm | null>(null);
  const [showUqcList, setShowUqcList] = useState(false);
  const [showEffDate, setShowEffDate] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await window.api.unit.getSimpleUnits(companyId);
      if (res.success) setUnits((res.units as UnitRow[]) || []);
      else {
        setError(res.error || 'Failed to load units.');
        setUnits([]);
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [companyId]);

  const rows = showAll ? units : units.filter((u) => !isMapped(u));

  const openAlter = (u: UnitRow) => {
    setEditUnit(u);
    setForm({
      symbol: u.symbol,
      formal_name: u.formal_name || '',
      decimal_places: u.decimal_places ?? 0,
      unit_quantity_code: isMapped(u) ? (u.unit_quantity_code as string) : '',
      uqc_effective_date: u.uqc_effective_date || '',
    });
    setShowUqcList(false);
    setShowEffDate(false);
  };

  const closeAlter = () => {
    setEditUnit(null);
    setForm(null);
    setShowUqcList(false);
    setShowEffDate(false);
  };

  // Selecting from the List of UQCs. A real code prompts for the Effective Date;
  // "Not Applicable" clears the mapping and needs no date.
  const onSelectUqc = (v: string) => {
    setShowUqcList(false);
    if (v === 'Not Applicable') {
      setForm((f) => (f ? { ...f, unit_quantity_code: '', uqc_effective_date: '' } : f));
    } else {
      setForm((f) => (f ? { ...f, unit_quantity_code: v } : f));
      setShowEffDate(true);
    }
  };

  const onAcceptEffDate = (date: string) => {
    setForm((f) => (f ? { ...f, uqc_effective_date: date } : f));
    setShowEffDate(false);
  };

  const save = async () => {
    if (!editUnit || !form || !companyId) return;
    setSaving(true);
    setError(null);
    try {
      const uqc = form.unit_quantity_code || null;
      const eff = uqc ? form.uqc_effective_date || null : null;
      const res = await window.api.unit.update({
        unit_id: editUnit.unit_id,
        company_id: companyId,
        unit_type: editUnit.unit_type,
        name: form.symbol.trim(),
        symbol: form.symbol.trim(),
        formal_name: form.formal_name.trim() || form.symbol.trim(),
        decimal_places: form.decimal_places,
        unit_quantity_code: uqc,
        uqc_effective_date: eff,
        first_unit_id: editUnit.first_unit_id,
        second_unit_id: editUnit.second_unit_id,
        conversion_factor: editUnit.conversion_factor,
      });
      if (res.success) {
        setUnits((prev) =>
          prev.map((r) =>
            r.unit_id === editUnit.unit_id
              ? {
                  ...r,
                  symbol: form.symbol.trim(),
                  formal_name: form.formal_name.trim() || form.symbol.trim(),
                  decimal_places: form.decimal_places,
                  unit_quantity_code: uqc,
                  uqc_effective_date: eff,
                }
              : r,
          ),
        );
        closeAlter();
      } else {
        setError(res.error || 'Failed to update unit.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to update unit.');
    } finally {
      setSaving(false);
    }
  };

  // List navigation — arrows move focus, Enter alters the focused unit. Disabled while
  // the alteration popup (and its sub-popups) own the keyboard.
  useEffect(() => {
    if (editUnit || !rows.length) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((p) => Math.min(rows.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const u = rows[focusedIndex];
        if (u) openAlter(u);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editUnit, rows, focusedIndex]);

  // Escape closes the alteration popup, but only once its sub-popups are closed
  // (those handle their own Escape).
  useEffect(() => {
    if (!editUnit) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || showEffDate || showUqcList) return;
      e.preventDefault();
      closeAlter();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editUnit, showEffDate, showUqcList]);

  const effPresets: EffectiveDateOption[] = [
    { label: 'Current Date of Company', val: companyDate },
    { label: 'Today (Computer Date)', val: isoToday() },
    { label: 'Tomorrow (Computer Date)', val: isoTomorrow() },
  ];

  const HEAD = 'h-auto px-2 py-1 align-bottom font-bold text-black text-xs';

  return (
    <TallyReportLayout
      title="Map UOM to UQC"
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <div className="font-bold">
          {showAll ? 'All Units of Measure' : 'UOM Not Mapped to UQC'}
        </div>
      }
      footerControls={
        <div className="flex items-center gap-4">
          <span className="text-black font-bold">Enter: Alter</span>
          <Button
            onClick={() => setShowAll((s) => !s)}
            variant="ghost"
            size="xs"
            className="h-auto p-0 font-bold text-black hover:underline hover:bg-transparent"
          >
            {showAll ? 'F8: Show Unmapped' : 'F8: Show All'}
          </Button>
        </div>
      }
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading units…" className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className={cn(HEAD, 'w-48')}>Symbol of UOM</TableHead>
                <TableHead className={cn(HEAD, 'w-64')}>Formal Name of UOM</TableHead>
                <TableHead className={HEAD}>Unit Quantity Code (UQC)</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="p-0">
                    <EmptyState
                      message={
                        showAll ? 'No units of measure found.' : 'All units are mapped to a UQC.'
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((u, i) => (
                  <TableRow
                    key={u.unit_id}
                    onClick={() => {
                      setFocusedIndex(i);
                      openAlter(u);
                    }}
                    className={cn(
                      'border-0 cursor-pointer',
                      i === focusedIndex ? 'bg-zinc-200' : 'hover:bg-zinc-100',
                    )}
                  >
                    <TableCell className="px-2 py-0.5">{u.symbol}</TableCell>
                    <TableCell className="px-2 py-0.5">{u.formal_name}</TableCell>
                    <TableCell className="px-2 py-0.5">
                      {isMapped(u) ? u.unit_quantity_code : '◆ Not Applicable'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Unit Alteration (Secondary) — Tally-style master edit popup */}
      {editUnit && form && (
        <div className="fixed inset-0 z-[10000] bg-black/10 font-sans text-xs">
          <div className="absolute left-2 top-24 w-[460px] bg-white border border-zinc-500 shadow-2xl">
            <div className="bg-zinc-800 text-white font-bold px-3 py-1.5 flex justify-between items-center">
              <span>Unit Alteration (Secondary)</span>
              <button onClick={closeAlter} className="text-zinc-300 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-4 space-y-1">
              <div className={rowCls}>
                <label className={labelCls}>Type</label>
                <span className="mr-1">:</span>
                <span className="flex-1 font-semibold">{editUnit.unit_type}</span>
              </div>

              <div className={rowCls}>
                <label className={labelCls}>Symbol</label>
                <span className="mr-1">:</span>
                <input
                  autoFocus
                  className={fieldInput}
                  value={form.symbol}
                  onChange={(e) => setForm((f) => (f ? { ...f, symbol: e.target.value } : f))}
                />
              </div>

              <div className={rowCls}>
                <label className={labelCls}>Formal name</label>
                <span className="mr-1">:</span>
                <input
                  className={fieldInput}
                  value={form.formal_name}
                  onChange={(e) => setForm((f) => (f ? { ...f, formal_name: e.target.value } : f))}
                />
              </div>

              <div className={rowCls}>
                <label className={labelCls}>Unit Quantity Code (UQC)</label>
                <span className="mr-1">:</span>
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={() => setShowUqcList((v) => !v)}
                    className="w-full text-left px-1 py-0.5 hover:bg-zinc-100 outline-none border border-transparent focus:border-zinc-300"
                  >
                    ◆ {form.unit_quantity_code || 'Not Applicable'}
                  </button>
                  {showUqcList && (
                    <UqcPopup
                      selected={form.unit_quantity_code || 'Not Applicable'}
                      onSelect={onSelectUqc}
                      onClose={() => setShowUqcList(false)}
                    />
                  )}
                </div>
              </div>

              <div className={rowCls}>
                <label className={labelCls}>Number of decimal places</label>
                <span className="mr-1">:</span>
                <select
                  className={fieldInput}
                  value={form.decimal_places}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, decimal_places: Number(e.target.value) } : f))
                  }
                >
                  {[0, 1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-zinc-200 px-3 py-2 flex justify-end gap-2 bg-zinc-50">
              <button
                onClick={closeAlter}
                className="px-3 py-1 border border-zinc-300 text-zinc-700 hover:bg-white"
              >
                Quit
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-1 bg-black text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Accept'}
              </button>
            </div>
          </div>

          <EffectiveDatePrompt
            open={showEffDate}
            label="Effective Date for revised GST details"
            presets={effPresets}
            value={form.uqc_effective_date || companyDate}
            onAccept={onAcceptEffDate}
            onClose={() => setShowEffDate(false)}
          />
        </div>
      )}
    </TallyReportLayout>
  );
}
