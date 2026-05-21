import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SectionCard, AlertBanner } from "../../components/ui";
import { VoucherTypeBadge, AmountDisplay, PageFooterBar } from "./ui";

interface VoucherEntry {
  entry_id: number;
  ledger_id: number;
  ledger_name: string;
  type: "Dr" | "Cr";
  amount: number;
  currency: string;
}

interface StockEntry {
  stock_entry_id: number;
  item_name: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Voucher {
  voucher_id: number;
  voucher_type: string;
  voucher_number: string;
  date: string;
  reference_number: string | null;
  reference_date: string | null;
  narration: string | null;
  party_name: string | null;
  party_ledger_id: number | null;
  place_of_supply: string | null;
  is_invoice: number;
  is_cancelled: number;
  created_at: string;
  entries: VoucherEntry[];
  stock_entries: StockEntry[];
}

const formatDate = (d: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// ─── Sub-components ──────────────────────────────────────────────────────────

/** A single labelled detail cell inside the header card */
function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2.5">
      <div className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider mb-0.5">{label}</div>
      <div className="text-zinc-800 font-semibold font-mono truncate" title={value}>{value}</div>
    </div>
  );
}

/** Dr / Cr badge pill for entry rows */
function DrCrBadge({ type }: { type: "Dr" | "Cr" }) {
  const cls = type === "Dr"
    ? "bg-black text-white"
    : "bg-zinc-600 text-white";
  return (
    <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${cls}`}>{type}</span>
  );
}

/** Thin horizontal table header row */
function TableHeader({ cols }: { cols: { label: string; span: string; align?: string }[] }) {
  return (
    <div className="grid grid-cols-12 px-3 py-1.5 bg-zinc-50 border-b border-zinc-100 text-[9px] font-bold uppercase tracking-wider text-zinc-500 select-none">
      {cols.map(c => (
        <div key={c.label} className={`${c.span} ${c.align ?? ""}`}>{c.label}</div>
      ))}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function VoucherView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await window.api.voucher.getById(Number(id));
        if (res.success) setVoucher(res.voucher as Voucher);
        else setError(res.error || "Voucher not found");
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleCancel = async () => {
    if (!voucher) return;
    if (!window.confirm(`Cancel voucher ${voucher.voucher_number}? This cannot be undone.`)) return;
    setCancelling(true);
    try {
      const res = await window.api.voucher.cancel(voucher.voucher_id);
      if (res.success) setVoucher(prev => prev ? { ...prev, is_cancelled: 1 } : prev);
      else setError(res.error || "Failed to cancel");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    if (!voucher) return;
    if (!window.confirm(`Permanently delete voucher ${voucher.voucher_number}?`)) return;
    try {
      const res = await window.api.voucher.delete(voucher.voucher_id);
      if (res.success) navigate("/transactions/voucher-list");
      else setError(res.error || "Failed to delete");
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ── Loading / error states ──
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs">
        Loading voucher…
      </div>
    );
  }

  if (error && !voucher) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-500 font-mono text-xs">
        <span className="text-red-600">{error}</span>
        <button onClick={() => navigate(-1)} className="underline hover:text-zinc-900">← Go Back</button>
      </div>
    );
  }

  if (!voucher) return null;

  // ── Computed totals ──
  const drTotal    = voucher.entries.filter(e => e.type === "Dr").reduce((s, e) => s + e.amount, 0);
  const crTotal    = voucher.entries.filter(e => e.type === "Cr").reduce((s, e) => s + e.amount, 0);
  const stockTotal = voucher.stock_entries.reduce((s, e) => s + e.amount, 0);
  const balanced   = Math.abs(drTotal - crTotal) < 0.01;

  const accentClass = "bg-zinc-900";

  // Header detail cells (skip nulls)
  const headerCells: { label: string; value: string }[] = [
    { label: "Voucher No.", value: voucher.voucher_number },
    { label: "Type",        value: voucher.voucher_type },
    { label: "Date",        value: formatDate(voucher.date) },
    ...(voucher.party_name       ? [{ label: "Party",          value: voucher.party_name }]                   : []),
    ...(voucher.reference_number ? [{ label: "Ref No.",        value: voucher.reference_number }]             : []),
    ...(voucher.reference_date   ? [{ label: "Ref Date",       value: formatDate(voucher.reference_date) }]   : []),
    ...(voucher.place_of_supply  ? [{ label: "Place of Supply",value: voucher.place_of_supply }]              : []),
    ...(voucher.narration        ? [{ label: "Narration",      value: voucher.narration }]                    : []),
  ];

  return (
    <div className="flex-1 flex flex-col bg-white h-full font-mono text-xs select-none">

      {/* Coloured Title Bar */}
      <div className={`px-4 py-2.5 text-white flex justify-between items-center shadow-sm shrink-0 ${accentClass}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white transition-colors text-sm">←</button>
          <div>
            <div className="text-sm font-bold tracking-wide uppercase">
              {voucher.voucher_type} Voucher — {voucher.voucher_number}
            </div>
            <div className="text-[10px] text-white/60 font-sans">
              {formatDate(voucher.date)}
              {voucher.is_cancelled ? " · CANCELLED" : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!voucher.is_cancelled && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-[10px] bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              Cancel Voucher
            </button>
          )}
          <button
            onClick={handleDelete}
            className="text-[10px] bg-red-700 hover:bg-red-800 text-white px-2 py-1 rounded uppercase tracking-wider transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}

      {/* Body */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">

        {/* Header Details Card */}
        <SectionCard title="Voucher Details">
          <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-y divide-zinc-100">
            {headerCells.map(({ label, value }) => (
              <DetailCell key={label} label={label} value={value} />
            ))}
          </div>
        </SectionCard>

        {/* Accounting Entries */}
        {voucher.entries.length > 0 && (
          <SectionCard
            title="Accounting Entries"
            headerRight={
              <div className="flex gap-3 text-[10px] text-zinc-500">
                <span>Dr: <span className="font-bold text-zinc-800"><AmountDisplay amount={drTotal} /></span></span>
                <span>Cr: <span className="font-bold text-zinc-800"><AmountDisplay amount={crTotal} /></span></span>
              </div>
            }
          >
            <TableHeader cols={[
              { label: "Dr/Cr", span: "col-span-1", align: "text-center" },
              { label: "Ledger Account", span: "col-span-7" },
              { label: "Amount", span: "col-span-4", align: "text-right" },
            ]} />

            {voucher.entries.map(entry => (
              <div key={entry.entry_id} className="grid grid-cols-12 px-3 py-2 border-b border-zinc-100 items-center hover:bg-zinc-50/50 transition-colors">
                <div className="col-span-1 text-center">
                  <DrCrBadge type={entry.type} />
                </div>
                <div className="col-span-7 text-zinc-800 font-semibold truncate">
                  {entry.ledger_name || `Ledger #${entry.ledger_id}`}
                </div>
                <div className="col-span-4 text-right font-bold text-zinc-900">
                  <AmountDisplay amount={entry.amount} />
                </div>
              </div>
            ))}

            {/* Balance indicator */}
            <div className={`px-3 py-1.5 text-[10px] font-bold text-right border-t border-zinc-100 ${balanced ? "bg-zinc-50 text-zinc-700" : "bg-zinc-900 text-white"}`}>
              {balanced
                ? "✓ Balanced"
                : `⚠ Difference: `}
              {!balanced && <AmountDisplay amount={Math.abs(drTotal - crTotal)} />}
            </div>
          </SectionCard>
        )}

        {/* Inventory / Stock Entries */}
        {voucher.stock_entries.length > 0 && (
          <SectionCard title="Inventory Particulars">
            <TableHeader cols={[
              { label: "Item Name", span: "col-span-5" },
              { label: "Qty",       span: "col-span-2", align: "text-right" },
              { label: "Rate",      span: "col-span-2", align: "text-right" },
              { label: "Amount",    span: "col-span-3", align: "text-right" },
            ]} />

            {voucher.stock_entries.map(item => (
              <div key={item.stock_entry_id} className="grid grid-cols-12 px-3 py-2 border-b border-zinc-100 items-center hover:bg-zinc-50/50 transition-colors">
                <div className="col-span-5 text-zinc-800 font-semibold truncate">{item.item_name || "—"}</div>
                <div className="col-span-2 text-right text-zinc-600">{item.quantity}</div>
                <div className="col-span-2 text-right text-zinc-600"><AmountDisplay amount={item.rate} /></div>
                <div className="col-span-3 text-right font-bold text-zinc-900"><AmountDisplay amount={item.amount} /></div>
              </div>
            ))}

            {/* Stock total row */}
            <div className="grid grid-cols-12 px-3 py-2 bg-zinc-50 border-t border-zinc-200">
              <div className="col-span-9 font-bold text-zinc-700 uppercase text-[10px] tracking-wider">Total Inventory Value</div>
              <div className="col-span-3 text-right font-bold text-zinc-900"><AmountDisplay amount={stockTotal} /></div>
            </div>
          </SectionCard>
        )}

        {/* Type badge (visual flourish at bottom) */}
        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
          <VoucherTypeBadge type={voucher.voucher_type} size="sm" />
          <span>Voucher ID: {voucher.voucher_id}</span>
          <span>·</span>
          <span>Created: {formatDate(voucher.created_at)}</span>
        </div>
      </div>

      <PageFooterBar
        countLabel={`Voucher #${voucher.voucher_id}`}
        backLabel="← Back to List"
        onBack={() => navigate("/transactions/voucher-list")}
      />
    </div>
  );
}
