import * as React from 'react';
import { useCompany } from '@/context/CompanyContext';

// Issue #156 — Stock Query · "Voucher Display".
// A DISTINCT read-only voucher view (not the standard VoucherView) shown when a
// Purchases/Sales row in Stock Query is opened. Mirrors TallyPrime's item-invoice
// "Voucher Display": header block + Name of Item table (Actual/Billed qty) with
// per-item Inventory + Accounting allocations, Party Bill Allocations, Total, Narration.

interface Entry {
  ledger_id: number;
  ledger_name: string;
  type: 'Dr' | 'Cr';
  amount: number;
}
interface StockEntry {
  stock_entry_id: number;
  item_name: string;
  quantity: number;
  rate: number;
  amount: number;
  godown_name?: string | null;
  unit_symbol?: string | null;
}
interface BillRef {
  bill_id: number;
  bill_name: string;
  bill_type: string;
  amount: number;
  due_date: string;
}
interface OrderDetails {
  source_godown_name: string | null;
  order_nos: string | null;
}
interface Voucher {
  voucher_id: number;
  voucher_type: string;
  voucher_number: string;
  date: string;
  supplier_invoice_no: string | null;
  supplier_invoice_date: string | null;
  place_of_supply: string | null;
  narration: string | null;
  party_name: string | null;
  party_ledger_id: number | null;
  entries: Entry[];
  stock_entries: StockEntry[];
  bill_references: BillRef[];
  order_details?: OrderDetails | null;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dmy = (iso: string | null) => {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])}-${MON[Number(m[2]) - 1]}-${m[1].slice(2)}` : iso;
};
const amt = (v: number | null | undefined) =>
  v == null
    ? ''
    : new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        v,
      );
const qty = (v: number | null | undefined, unit?: string | null) => {
  const n = Number(v) || 0;
  const s = n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  return unit ? `${s} ${unit}` : s;
};

function HRow({ label, value, w = 'w-40' }: { label: string; value: React.ReactNode; w?: string }) {
  return (
    <div className="flex leading-5">
      <span className={`${w} shrink-0 text-black`}>{label}</span>
      <span className="mr-2 text-black">:</span>
      <span className="font-semibold text-black">{value}</span>
    </div>
  );
}

export default function VoucherDisplay({
  voucherId,
  onClose,
}: {
  voucherId: number;
  onClose: () => void;
}) {
  const { selectedCompany, activeFY } = useCompany();
  const [voucher, setVoucher] = React.useState<Voucher | null>(null);
  const [balance, setBalance] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [detailed, setDetailed] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setErr(null);
    window.api.voucher
      .getById(voucherId)
      .then((res: any) => {
        if (!active) return;
        if (res?.success) setVoucher(res.voucher as Voucher);
        else setErr(res?.error ?? 'Voucher not found.');
        setLoading(false);
      })
      .catch((e: any) => {
        if (active) {
          setErr(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [voucherId]);

  // Party ledger current balance (Tally shows it under Party Ledger A/c).
  React.useEffect(() => {
    if (!voucher?.party_ledger_id || !selectedCompany?.company_id || !activeFY?.fy_id) return;
    let active = true;
    window.api.voucher
      .getLedgerBalance(voucher.party_ledger_id, selectedCompany.company_id, activeFY.fy_id)
      .then((r: any) => {
        if (active && r?.success) setBalance(r.balance ?? '');
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [voucher?.party_ledger_id, selectedCompany?.company_id, activeFY?.fy_id]);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'F' || e.key === 'f') {
        setDetailed((d) => !d);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const partySide: 'Dr' | 'Cr' =
    voucher?.entries.find((e) => e.ledger_id === voucher.party_ledger_id)?.type ?? 'Cr';
  // Accounting allocations = non-party ledger entries (e.g. "Goods Purchase … Dr").
  const acctEntries = (voucher?.entries ?? []).filter(
    (e) => e.ledger_id !== voucher?.party_ledger_id,
  );

  const totActual = (voucher?.stock_entries ?? []).reduce((s, r) => s + (r.quantity || 0), 0);
  const totAmount = (voucher?.stock_entries ?? []).reduce((s, r) => s + (r.amount || 0), 0);
  const unit0 = voucher?.stock_entries?.[0]?.unit_symbol ?? '';

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white select-none text-black font-mono text-[11px]">
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-gray-200">
        <span className="font-bold text-sm tracking-wide font-sans">Voucher Display</span>
        <span className="font-bold text-sm font-sans">{selectedCompany?.name ?? ''}</span>
        <button
          onClick={onClose}
          className="text-sm font-bold text-black hover:text-black font-sans"
        >
          &times;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-black italic">Loading…</div>
        ) : err ? (
          <div className="py-8 text-center text-black">{err}</div>
        ) : !voucher ? null : (
          <div className="px-6 py-3">
            {/* Voucher type, centered */}
            <div className="text-center font-bold text-sm underline mb-3">
              {voucher.voucher_type}
            </div>

            {/* Header block */}
            <div className="mb-2">
              <HRow label="No." value={voucher.voucher_number} />
              <HRow label="Date" value={dmy(voucher.date)} />
              <HRow
                label="Supplier Invoice No."
                value={
                  <span>
                    {voucher.supplier_invoice_no || '—'}
                    <span className="ml-16 text-black">Date</span>
                    <span className="mx-2 text-black">:</span>
                    <span className="font-semibold">
                      {dmy(voucher.supplier_invoice_date) || '—'}
                    </span>
                  </span>
                }
              />
              <HRow
                label="GST Registration"
                value={
                  voucher.place_of_supply
                    ? `${voucher.place_of_supply} Registration`
                    : 'Not Applicable'
                }
              />
              <HRow label="Excise Unit" value="Not Applicable" />
              <div className="h-2" />
              <HRow label="Party Ledger A/c" value={voucher.party_name || '—'} />
              {balance && (
                <HRow label="Current Balance" value={<span className="italic">{balance}</span>} />
              )}
            </div>

            {/* Item table */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-y border-gray-200">
                  <th className="text-left py-1 font-bold">Name of Item</th>
                  <th className="text-right py-1 font-bold w-24">Actual</th>
                  <th className="text-right py-1 font-bold w-24">Billed</th>
                  <th className="text-right py-1 font-bold w-24">Rate</th>
                  <th className="text-center py-1 font-bold w-12">per</th>
                  <th className="text-right py-1 font-bold w-32">Amount</th>
                </tr>
                <tr className="text-[9px] text-black">
                  <th />
                  <th className="text-right font-normal">Quantity</th>
                  <th className="text-right font-normal">Quantity</th>
                  <th />
                  <th />
                  <th />
                </tr>
              </thead>
              <tbody>
                {voucher.stock_entries.map((r) => (
                  <React.Fragment key={r.stock_entry_id}>
                    <tr className="font-bold">
                      <td className="py-0.5">{r.item_name}</td>
                      <td className="text-right">{qty(r.quantity, r.unit_symbol)}</td>
                      <td className="text-right">{qty(r.quantity, r.unit_symbol)}</td>
                      <td className="text-right">{amt(r.rate)}</td>
                      <td className="text-center font-normal">{r.unit_symbol || ''}</td>
                      <td className="text-right">{amt(r.amount)}</td>
                    </tr>
                    {detailed && (
                      <tr>
                        <td colSpan={6} className="pb-1 pl-3">
                          <div className="italic text-black">Inventory Allocations:</div>
                          <div className="pl-3 flex flex-wrap gap-x-6">
                            <span>
                              Godown Name:{' '}
                              <span className="font-semibold">
                                {r.godown_name || 'Main Location'}
                              </span>{' '}
                              {qty(r.quantity, r.unit_symbol)} @ {amt(r.rate)} = {amt(r.amount)}
                            </span>
                          </div>
                          <div className="pl-3 flex flex-wrap gap-x-6 text-black">
                            <span>Tracking No : Not Applicable</span>
                            {voucher.order_details?.order_nos && (
                              <span>Order No : {voucher.order_details.order_nos}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold border-t border-gray-200">
                  <td className="py-1">Total</td>
                  <td className="text-right">{qty(totActual, unit0)}</td>
                  <td className="text-right">{qty(totActual, unit0)}</td>
                  <td />
                  <td />
                  <td className="text-right">{amt(totAmount)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Accounting Allocations */}
            {detailed && acctEntries.length > 0 && (
              <div className="mt-3">
                <div className="italic text-black">Accounting Allocations:</div>
                {acctEntries.map((e, i) => (
                  <div key={i} className="pl-3 flex">
                    <span className="flex-1 font-semibold">{e.ledger_name}</span>
                    <span className="w-40 text-right">
                      {amt(e.amount)} {e.type}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Party Bill Allocations */}
            {voucher.bill_references.length > 0 && (
              <div className="mt-3">
                <div className="font-bold">Party Bill Allocations:</div>
                {voucher.bill_references.map((b) => (
                  <div key={b.bill_id} className="pl-3 flex">
                    <span className="w-24">{b.bill_type || 'New Ref'}</span>
                    <span className="flex-1 font-semibold">{b.bill_name}</span>
                    <span className="w-40 text-right">
                      {amt(b.amount)} {partySide}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Narration */}
            <div className="mt-4 border-t border-gray-200 pt-1">
              <span className="text-black">Narration:</span>
              <span className="ml-2">{voucher.narration || ''}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-6 px-3 py-1 border-t border-gray-200 bg-white text-[10px] font-semibold text-black shrink-0">
        <button onClick={() => setDetailed((d) => !d)} className="hover:text-black">
          F: {detailed ? 'Condensed' : 'Detailed'}
        </button>
        <span className="text-black">Esc: Back to Stock Query</span>
      </div>
    </div>
  );
}
