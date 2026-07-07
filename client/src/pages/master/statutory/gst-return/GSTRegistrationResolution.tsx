import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';

const REGISTRATION_TYPES = ['Regular', 'Composition', 'Regular - SEZ'];
const PERIODICITY = ['Monthly', 'Quarterly'];

interface ResolutionRow {
  gst_id: number;
  name: string;
  voucher_count: number;
  address: string;
  state_id: string;
  registration_status: string;
  address_type: string;
  registration_type: string;
  assessee_of_other_territory: number;
  periodicity_of_gstr1: string;
  gstin: string;
  place_of_supply: string;
}

const selectCls =
  'border border-zinc-300 h-8 px-2 text-xs bg-white text-black focus:border-black focus:outline-none w-56';

// GSTR-1 Reconciliation → resolution page for the "GST Registration Details of the Company
// are invalid or not specified" exception. Lists each of the company's own registrations
// whose GSTIN is missing/invalid; Enter/click a row opens the editable GST Registration
// Details popup, whose Accept writes the fix back to the registration (clearing the flag).
export default function GSTRegistrationResolution() {
  const { selectedCompany, activeFY } = useCompany();
  const location = useLocation();

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const registration = location.state?.registration;
  const reportName = location.state?.reportName || 'GSTR-1 Reconciliation';
  const registrationName = registration?.state_id
    ? `${registration.state_id} Registration`
    : 'All Registrations';
  const periodText = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : '';

  const [rows, setRows] = useState<ResolutionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(0);

  const [editRow, setEditRow] = useState<ResolutionRow | null>(null);
  const [form, setForm] = useState<ResolutionRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = async () => {
    if (!companyId || !fyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await window.api.gst.getRegistrationResolution({
        company_id: companyId,
        fy_id: fyId,
        gst_registration_id: registration?.gst_id ?? null,
      });
      if (res.success) {
        setRows(res.rows ?? []);
        setFocused(0);
      } else {
        setError(res.error || 'Failed to load registration resolution.');
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, fyId, registration?.gst_id]);

  const openEdit = (row: ResolutionRow) => {
    setSaveError(null);
    setEditRow(row);
    setForm({ ...row });
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await window.api.gstRegistration.update({
        gst_id: form.gst_id,
        registration_type: form.registration_type,
        registration_status: form.registration_status,
        assessee_of_other_territory: form.assessee_of_other_territory ? 1 : 0,
        periodicity_of_gstr1: form.periodicity_of_gstr1,
        gstin: form.gstin,
        state_id: form.state_id,
        address_type: form.address_type,
      });
      if (res.success) {
        setEditRow(null);
        setForm(null);
        load();
      } else {
        setSaveError(res.error || 'Failed to update GST registration.');
      }
    } catch (e: any) {
      setSaveError(e.message || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  // Enter opens the popup for the focused registration.
  useEffect(() => {
    if (editRow || !rows.length) return;
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.closest("[role='dialog']")) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocused((p) => Math.min(rows.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocused((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (rows[focused]) openEdit(rows[focused]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editRow, rows, focused]);

  return (
    <TallyReportLayout
      title={`${reportName} - Resolution of Uncertain Transactions`}
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <>
          <div className="flex gap-4">
            <span className="w-32">GST Registration</span>
            <span className="font-bold">: {registrationName}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-32">Details of</span>
            <span className="font-bold">
              : GST Registration Details of the Company are invalid or not specified
            </span>
          </div>
        </>
      }
      rightSubtitle={<div>{periodText}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Scanning registrations..." className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && !error && (
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">
                  P a r t i c u l a r s
                </TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">
                  Voucher
                  <br />
                  Count
                </TableHead>
                <TableHead className="h-auto w-32 px-2 py-1 align-bottom font-bold text-black">
                  Address
                </TableHead>
                <TableHead className="h-auto w-28 px-2 py-1 align-bottom font-bold text-black">
                  State
                </TableHead>
                <TableHead className="h-auto w-28 px-2 py-1 align-bottom font-bold text-black">
                  Registration
                  <br />
                  Type
                </TableHead>
                <TableHead className="h-auto w-28 px-2 py-1 align-bottom font-bold text-black">
                  Assessee of
                  <br />
                  Other Territory
                </TableHead>
                <TableHead className="h-auto w-36 px-2 py-1 align-bottom font-bold text-black">
                  GSTIN/UIN
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState message="No invalid company registrations — nothing to resolve." />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, i) => (
                  <TableRow
                    key={r.gst_id}
                    onClick={() => {
                      setFocused(i);
                      openEdit(r);
                    }}
                    className={`border-0 cursor-pointer ${
                      i === focused ? 'bg-[#ffcc00] hover:bg-[#ffcc00]' : 'hover:bg-[#e6f2ff]'
                    }`}
                  >
                    <TableCell className="px-2 py-0.5 font-semibold">{r.name}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right tabular-nums">
                      {r.voucher_count || ''}
                    </TableCell>
                    <TableCell className="px-2 py-0.5">{r.address}</TableCell>
                    <TableCell className="px-2 py-0.5">{r.state_id}</TableCell>
                    <TableCell className="px-2 py-0.5">{r.registration_type}</TableCell>
                    <TableCell className="px-2 py-0.5">
                      {r.assessee_of_other_territory ? 'Yes' : 'No'}
                    </TableCell>
                    <TableCell className="px-2 py-0.5">{r.gstin || ''}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* GST Registration Details popup */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="sm:max-w-lg bg-white text-black border border-zinc-300">
          <DialogHeader>
            <DialogTitle className="font-bold text-sm">GST Registration Details</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] italic text-zinc-600 leading-snug">
            (Once you accept the following changes, it will be applied to the transaction)
          </p>
          {form && (
            <div className="flex flex-col gap-2.5 py-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-semibold">Registration status</label>
                <span className="font-bold w-56">{form.registration_status}</span>
              </div>
              <div className="flex items-center justify-between">
                <label className="font-semibold">State</label>
                <Input
                  className="w-56 h-8 text-xs border-zinc-300 text-black"
                  value={form.state_id}
                  onChange={(e) => setForm((f) => f && { ...f, state_id: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="font-semibold">Address type</label>
                <Input
                  className="w-56 h-8 text-xs border-zinc-300 text-black"
                  value={form.address_type}
                  onChange={(e) => setForm((f) => f && { ...f, address_type: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="font-semibold">Registration type</label>
                <select
                  className={selectCls}
                  value={form.registration_type}
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
                <label className="font-semibold">Assessee of Other Territory</label>
                <select
                  className={selectCls}
                  value={form.assessee_of_other_territory ? 'Yes' : 'No'}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, assessee_of_other_territory: e.target.value === 'Yes' ? 1 : 0 })
                  }
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="font-semibold">GSTIN/UIN</label>
                <Input
                  className="w-56 h-8 text-xs border-zinc-300 text-black uppercase"
                  value={form.gstin}
                  placeholder="15-character GSTIN"
                  onChange={(e) => setForm((f) => f && { ...f, gstin: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="font-semibold">Periodicity of GSTR-1</label>
                <select
                  className={selectCls}
                  value={form.periodicity_of_gstr1}
                  onChange={(e) => setForm((f) => f && { ...f, periodicity_of_gstr1: e.target.value })}
                >
                  {PERIODICITY.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="font-semibold">Place of Supply (for inwards)</label>
                <span className="w-56">{form.place_of_supply || form.state_id}</span>
              </div>
              {saveError && <div className="text-red-600 font-semibold">{saveError}</div>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setEditRow(null)}>
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
