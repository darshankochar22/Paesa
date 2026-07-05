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
  TableFooter,
} from '@/components/shadcn/table';
import { EmptyState } from '@/components/blocks/EmptyState';
import { cn } from '@/lib/utils';

interface Advance {
  advance_id: number;
  party_name: string | null;
  type_of_advance: string;
  registration_name: string | null;
  place_of_supply: string | null;
  advance_amount: number;
}

interface Registration {
  gst_id: number;
  state_id: string | null;
  gstin: string | null;
}

interface Ledger {
  ledger_id: number;
  name: string;
}

const STATES = [
  'Andaman & Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra & Nagar Haveli',
  'Daman & Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const fmt = (n: number) =>
  n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

const regName = (r: Registration) => (r.state_id ? `${r.state_id} Registration` : 'Registration');

const INPUT_CLS =
  'border border-gray-300 bg-white px-1 py-0.5 text-xs text-black focus:outline-none focus:border-black';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="w-56 text-black">{children}</span>;
}

export default function GstAdvancesOpeningBalance() {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [advanceType, setAdvanceType] = useState<'Receipt' | 'Payment'>('Receipt');

  const [advances, setAdvances] = useState<Advance[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Create-form fields ────────────────────────────────────────────────────
  const [regId, setRegId] = useState<number | null>(null);
  const [partyId, setPartyId] = useState<number | null>(null);
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [reverseCharge, setReverseCharge] = useState(false);
  const [date, setDate] = useState(activeFY?.start_date || '');
  const [taxability, setTaxability] = useState('Taxable');
  const [gstRate, setGstRate] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const [advRes, regRes, ledRes] = await Promise.all([
        window.api.gst.getGstOpeningAdvances({ company_id: companyId }),
        window.api.gstRegistration.getAll(companyId),
        window.api.ledger.getAll(companyId),
      ]);
      if (advRes.success) setAdvances((advRes.advances as Advance[]) || []);
      if (regRes.success) setRegistrations((regRes.gstRegistrations as Registration[]) || []);
      if (ledRes.success) setLedgers((ledRes.ledgers as Ledger[]) || []);
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [companyId]);

  // GST split: intra-state (CGST+SGST) when Place of Supply == the registration's state.
  const rate = Number(gstRate) || 0;
  const gross = Number(advanceAmount) || 0;
  const isTaxable = taxability === 'Taxable' && rate > 0;
  const taxable = isTaxable ? gross / (1 + rate / 100) : gross;
  const tax = gross - taxable;
  const selectedReg = registrations.find((r) => r.gst_id === regId);
  const intra = !!placeOfSupply && placeOfSupply === selectedReg?.state_id;
  const igst = isTaxable && !intra ? tax : 0;
  const cgst = isTaxable && intra ? tax / 2 : 0;
  const sgst = isTaxable && intra ? tax / 2 : 0;

  const startCreate = (type: 'Receipt' | 'Payment') => {
    setAdvanceType(type);
    setRegId(registrations[0]?.gst_id ?? null);
    setPartyId(null);
    setPlaceOfSupply('');
    setReverseCharge(type === 'Payment');
    setDate(activeFY?.start_date || '');
    setTaxability('Taxable');
    setGstRate('');
    setAdvanceAmount('');
    setError(null);
    setMode('create');
  };

  const save = async () => {
    if (!companyId) return;
    if (!partyId) {
      setError('Select a party.');
      return;
    }
    if (gross <= 0) {
      setError('Enter the unadjusted advance amount.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const party = ledgers.find((l) => l.ledger_id === partyId);
      const reg = registrations.find((r) => r.gst_id === regId);
      const res = await window.api.gst.createGstOpeningAdvance({
        company_id: companyId,
        gst_registration_id: regId,
        registration_name: reg ? regName(reg) : null,
        party_ledger_id: partyId,
        party_name: party?.name ?? null,
        type_of_advance: advanceType,
        place_of_supply: placeOfSupply,
        reverse_charge: reverseCharge,
        date,
        taxability,
        gst_rate: rate,
        advance_amount: gross,
        taxable_amount: taxable,
        igst,
        cgst,
        sgst,
        cess: 0,
      });
      if (res.success) {
        await loadAll();
        setMode('list');
      } else {
        setError(res.error || 'Failed to save the advance.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to save the advance.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!companyId) return;
    await window.api.gst.deleteGstOpeningAdvance({ advance_id: id, company_id: companyId });
    loadAll();
  };

  const HEAD = 'h-auto px-2 py-1 align-bottom font-bold text-black text-xs whitespace-nowrap';
  const total = advances.reduce((s, a) => s + (a.advance_amount || 0), 0);

  // ── Create form ───────────────────────────────────────────────────────────
  if (mode === 'create') {
    return (
      <TallyReportLayout
        title={`Opening Balance (Advance ${advanceType}) Creation`}
        companyName={selectedCompany?.name || 'Company'}
        onQuit={() => setMode('list')}
      >
        <div className="w-full flex flex-col font-sans text-xs p-4 gap-1 max-w-3xl">
          <div className="flex items-center gap-2">
            <FieldLabel>GST Registration</FieldLabel>
            <select
              className={INPUT_CLS}
              value={regId ?? ''}
              onChange={(e) => setRegId(Number(e.target.value))}
            >
              {registrations.length === 0 && <option value="">No registrations</option>}
              {registrations.map((r) => (
                <option key={r.gst_id} value={r.gst_id}>
                  {regName(r)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <FieldLabel>Party Name</FieldLabel>
            <select
              className={cn(INPUT_CLS, 'w-64')}
              value={partyId ?? ''}
              onChange={(e) => setPartyId(Number(e.target.value))}
            >
              <option value="">Select party…</option>
              {ledgers.map((l) => (
                <option key={l.ledger_id} value={l.ledger_id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <FieldLabel>Place of Supply</FieldLabel>
            <select
              className={INPUT_CLS}
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
            >
              <option value="">Not Applicable</option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <FieldLabel>Supply attracts Reverse Charge</FieldLabel>
            <select
              className={INPUT_CLS}
              value={reverseCharge ? 'Yes' : 'No'}
              onChange={(e) => setReverseCharge(e.target.value === 'Yes')}
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </div>

          <Table className="text-xs mt-3">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className={HEAD}>Date of GST Advances</TableHead>
                <TableHead className={HEAD}>Taxability</TableHead>
                <TableHead className={cn(HEAD, 'text-right')}>GST Rate (%)</TableHead>
                <TableHead className={cn(HEAD, 'text-right')}>Unadjusted Advance Amount</TableHead>
                <TableHead className={cn(HEAD, 'text-right')}>Taxable Amount</TableHead>
                <TableHead className={cn(HEAD, 'text-right')}>Tax</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-transparent border-0">
                <TableCell className="px-2 py-1">
                  <input
                    type="date"
                    className={INPUT_CLS}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </TableCell>
                <TableCell className="px-2 py-1">
                  <select
                    className={INPUT_CLS}
                    value={taxability}
                    onChange={(e) => setTaxability(e.target.value)}
                  >
                    <option>Taxable</option>
                    <option>Exempt</option>
                    <option>Nil Rated</option>
                  </select>
                </TableCell>
                <TableCell className="px-2 py-1 text-right">
                  <input
                    type="number"
                    className={cn(INPUT_CLS, 'w-16 text-right')}
                    value={gstRate}
                    disabled={taxability !== 'Taxable'}
                    onChange={(e) => setGstRate(e.target.value)}
                  />
                </TableCell>
                <TableCell className="px-2 py-1 text-right">
                  <input
                    type="number"
                    className={cn(INPUT_CLS, 'w-28 text-right')}
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                  />
                </TableCell>
                <TableCell className="px-2 py-1 text-right tabular-nums">{fmt(taxable)}</TableCell>
                <TableCell className="px-2 py-1 text-right tabular-nums">{fmt(tax)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {isTaxable && (
            <div className="flex gap-6 px-2 text-[11px] text-gray-600">
              {intra ? (
                <>
                  <span>CGST: {fmt(cgst)}</span>
                  <span>SGST/UTGST: {fmt(sgst)}</span>
                </>
              ) : (
                <span>IGST: {fmt(igst)}</span>
              )}
            </div>
          )}

          {error && <div className="p-2 text-red-600 font-bold">{error}</div>}

          <div className="flex gap-2 mt-3">
            <Button
              onClick={save}
              disabled={saving}
              size="xs"
              className="bg-black text-white hover:bg-gray-800"
            >
              {saving ? 'Saving…' : 'Accept'}
            </Button>
            <Button onClick={() => setMode('list')} disabled={saving} size="xs" variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      </TallyReportLayout>
    );
  }

  // ── List of unadjusted GST advances ───────────────────────────────────────
  return (
    <TallyReportLayout
      title="GST Advances - Opening Balance"
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={<div className="font-bold">List of Unadjusted GST Advances</div>}
      footerControls={
        <>
          <Button
            onClick={() => startCreate('Receipt')}
            variant="ghost"
            size="xs"
            className="h-auto p-0 ml-4 font-bold text-black hover:underline hover:bg-transparent"
          >
            Create (Advance Receipt)
          </Button>
          <Button
            onClick={() => startCreate('Payment')}
            variant="ghost"
            size="xs"
            className="h-auto p-0 ml-4 font-bold text-black hover:underline hover:bg-transparent"
          >
            Create (Advance Payment)
          </Button>
        </>
      }
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading GST advances…" className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className={HEAD}>Party Name</TableHead>
                <TableHead className={cn(HEAD, 'w-28')}>Type of Advance</TableHead>
                <TableHead className={cn(HEAD, 'w-40')}>Registration Name</TableHead>
                <TableHead className={cn(HEAD, 'w-32')}>Place of Supply</TableHead>
                <TableHead className={cn(HEAD, 'w-32 text-right')}>Advance Amount</TableHead>
                <TableHead className={cn(HEAD, 'w-16')} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {advances.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState message="No unadjusted GST advances — use Create (Advance Receipt/Payment)." />
                  </TableCell>
                </TableRow>
              ) : (
                advances.map((a) => (
                  <TableRow key={a.advance_id} className="border-0 hover:bg-[#e6f2ff]">
                    <TableCell className="px-2 py-0.5">{a.party_name}</TableCell>
                    <TableCell className="px-2 py-0.5">{a.type_of_advance}</TableCell>
                    <TableCell className="px-2 py-0.5">{a.registration_name}</TableCell>
                    <TableCell className="px-2 py-0.5">{a.place_of_supply}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right tabular-nums">
                      {fmt(a.advance_amount)}
                    </TableCell>
                    <TableCell className="px-2 py-0.5 text-right">
                      <button
                        onClick={() => remove(a.advance_id)}
                        className="text-[11px] text-gray-500 hover:text-black hover:underline"
                      >
                        Delete
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {advances.length > 0 && (
              <TableFooter className="bg-transparent">
                <TableRow className="border-t border-gray-400 hover:bg-transparent font-bold">
                  <TableCell colSpan={4} className="px-2 py-1">
                    Total
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right tabular-nums">{fmt(total)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        )}
      </div>
    </TallyReportLayout>
  );
}
