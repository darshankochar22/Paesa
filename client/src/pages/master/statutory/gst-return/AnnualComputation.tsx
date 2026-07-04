import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { TallyReportLayout } from "@/components/tally-ui/TallyReportLayout";
import { Button } from "@/components/shadcn/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/shadcn/table";
import { EmptyState } from "@/components/blocks/EmptyState";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TaxAmount {
  txval: number;
  iamt:  number;
  camt:  number;
  samt:  number;
  cess:  number;
}

const ZERO: TaxAmount = { txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0 };

function fmt(n: number) {
  return n ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
}

function taxTotal(t: TaxAmount) {
  return t.iamt + t.camt + t.samt + t.cess;
}

function addAmt(a: TaxAmount, b: TaxAmount): TaxAmount {
  return {
    txval: a.txval + b.txval,
    iamt:  a.iamt  + b.iamt,
    camt:  a.camt  + b.camt,
    samt:  a.samt  + b.samt,
    cess:  a.cess  + b.cess,
  };
}

// ── Row type system (matches GSTR-3B pattern) ─────────────────────────────────

type RowDef =
  | { type: "section";    label: string }
  | { type: "subsection"; label: string }
  | { type: "data";       label: string; data: TaxAmount; indent?: 1 | 2; bold?: boolean; nav?: () => void }
  | { type: "total";      label: string; data: TaxAmount }
  | { type: "divider" };

// ── Shared column widths ──────────────────────────────────────────────────────

const NUM_CELL = "w-28 px-2 py-0.5 text-right text-xs tabular-nums";
const HEAD_CELL = "h-auto w-28 px-2 py-1 text-right align-bottom font-bold text-black text-xs";

// ── Main Component ────────────────────────────────────────────────────────────

export default function AnnualComputation() {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const companyId = selectedCompany?.company_id;
  const fyId      = activeFY?.fy_id;
  const registration = location.state?.registration; // optional (All Registrations by default)

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [data, setData]         = useState<any>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  const loadData = async () => {
    if (!companyId || !fyId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await window.api.gst.getAnnualComputation({
        company_id: companyId,
        fy_id: fyId,
        gst_registration_id: registration?.gst_id ?? null,
      });
      if (result.success) setData(result.payload);
      else setError(result.error || "Failed to load data");
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Every Annual drill runs over the full FY (annual: true) with the shared engine.
  const annualState = { registration, month: "", year: "", returnType: "ANNUAL", annual: true };
  const openStats = () => navigate("/master/statutory/gst/return-statistics", { state: annualState });
  const openNotRelevant = () => navigate("/master/statutory/gst/not-relevant", { state: annualState });
  const openUncertain = () => navigate("/master/statutory/gst/uncertain", { state: annualState });
  const openRegister = (subtitle: string, extra: Record<string, unknown>) =>
    navigate("/master/statutory/gst/voucher-register", {
      state: { ...annualState, columns: "tax", subtitle, ...extra },
    });
  const openSection = (label: string, extra: Record<string, unknown>) =>
    navigate("/master/statutory/gstr1/section", { state: { ...annualState, label, ...extra } });
  // GSTR-9 style category tree (section → sub-category → CN/DN split → monthly → register).
  const openTree = (path: string, label: string) =>
    navigate("/master/statutory/gst/annual-section", { state: { registration, path, label } });

  useEffect(() => { loadData(); }, [companyId, fyId]);

  // ── Derived values ────────────────────────────────────────────────────────

  // Liability
  const liab_taxable:   TaxAmount = data?.liability?.taxable_and_advances ?? ZERO;
  const liab_notpay:    TaxAmount = data?.liability?.not_payable           ?? ZERO;
  const liab_missing:   TaxAmount = data?.liability?.missing_invoice       ?? ZERO;
  const liab_total:     TaxAmount = addAmt(addAmt(liab_taxable, liab_notpay), liab_missing);

  // ITC
  const itc_availed:    TaxAmount = data?.itc?.availed   ?? ZERO;
  const itc_reversal:   TaxAmount = data?.itc?.reversal  ?? ZERO;
  const itc_net: TaxAmount = {
    txval: itc_availed.txval - itc_reversal.txval,
    iamt:  itc_availed.iamt  - itc_reversal.iamt,
    camt:  itc_availed.camt  - itc_reversal.camt,
    samt:  itc_availed.samt  - itc_reversal.samt,
    cess:  itc_availed.cess  - itc_reversal.cess,
  };

  // Others
  const interest:       TaxAmount = data?.interest_late_fee  ?? ZERO;
  const hsn_summary:    TaxAmount = data?.hsn_summary        ?? ZERO;
  const outward_summ:   TaxAmount = data?.summary_outward    ?? ZERO;
  const inward_summ:    TaxAmount = data?.summary_inward     ?? ZERO;

  // Voucher counts
  const totalVouchers  = data?.voucher_count?.total       ?? 0;
  const includedReturn = data?.voucher_count?.included    ?? 0;
  const notRelevant    = data?.voucher_count?.not_relevant ?? 0;
  const uncertain      = data?.voucher_count?.uncertain   ?? 0;

  const fyLabel =
    data?.fy_label ??
    (activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : "");

  // ── Row definitions ───────────────────────────────────────────────────────

  const rows: RowDef[] = [
    // ── Liability ──
    { type: "section",    label: "Liability" },
    { type: "data",       label: "Outward and Inward Supplies on Which Tax is Payable (Including Advances)", data: liab_taxable,  indent: 1,
      nav: () => openTree("payable", "Outward and Inward Supplies on Which Tax is Payable (Including Advances)") },
    { type: "data",       label: "Outward Supplies on Which Tax is Not Payable",                              data: liab_notpay,   indent: 1,
      nav: () => openTree("not_payable", "Outward Supplies on Which Tax is Not Payable") },
    { type: "data",       label: "Missing Invoice Reported in Current Period",                                 data: liab_missing,  indent: 1,
      nav: () => openRegister("Missing Invoice Reported in Current Period", { bucket: "included", voucherType: "__none__" }) },
    { type: "total",      label: "Total Liability",                                                            data: liab_total },

    { type: "divider" },

    // ── ITC ──
    { type: "section",    label: "Input Tax Credit" },
    { type: "data",       label: "Input Tax Credit",                                                                                              data: itc_availed,  indent: 1,
      nav: () => openTree("itc", "Input Tax Credit") },
    { type: "data",       label: "Reversal of Input Tax Credit, Adjusted and Ineligible Input Tax Credit Declared",                              data: itc_reversal, indent: 1,
      nav: () => openTree("itc_reversal", "Reversal of Input Tax Credit, Adjusted and Ineligible Input Tax Credit Declared") },
    { type: "total",      label: "Total ITC After Reversal & Ineligible Input Tax Credit",                                                        data: itc_net },

    { type: "divider" },

    // ── Others ──
    { type: "section",    label: "Other Details" },
    { type: "data",       label: "Interest, Late Fee, Penalty and Others", data: interest,      indent: 1,
      nav: () => openTree("interest", "Interest, Late Fee, Penalty and Others") },
    { type: "data",       label: "HSN/SAC Summary",                        data: hsn_summary,   indent: 1,
      nav: () => openSection("HSN/SAC Summary", { section: "hsn" }) },

    { type: "divider" },

    // ── Summaries ──
    { type: "section",    label: "Supply Summary" },
    { type: "data",       label: "Summary of Outward Supplies",            data: outward_summ,  indent: 1,
      nav: () => openSection("HSN-SAC Summary (Outward Supplies)", { section: "hsn", direction: "outward" }) },
    { type: "data",       label: "Summary of Inward Supplies",             data: inward_summ,   indent: 1,
      nav: () => openSection("HSN-SAC Summary (Inward Supplies)", { section: "hsn", direction: "inward" }) },
  ];

  // ── Grand totals for footer ───────────────────────────────────────────────
  const grandTotal: TaxAmount = addAmt(liab_total, itc_net);

  return (
    <TallyReportLayout
      title="Annual Computation"
      companyName={selectedCompany?.name || "Company"}
      leftSubtitle={
        <>
          <div className="flex gap-4">
            <span className="w-32">GST Registration</span>
            <span className="font-bold">: {data?.gstin || "All Registrations"}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-32">Financial Year</span>
            <span className="font-bold">: {fyLabel}</span>
          </div>
        </>
      }
      rightSubtitle={
        <div>{fyLabel}</div>
      }
      footerControls={
        <Button
          onClick={loadData}
          variant="ghost"
          size="xs"
          disabled={loading}
          className="h-auto p-0 ml-4 font-bold text-black hover:underline hover:bg-transparent"
        >
          F5: Refresh
        </Button>
      }
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">

        {loading && <EmptyState message="Computing annual GST data…" className="italic" />}
        {error   && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && data && (
          <>
            {/* ── Voucher Summary ───────────────────────────────────────── */}
            <div className="flex flex-col border-b border-gray-300">
              <div className="flex font-bold px-2 py-1 border-b border-gray-200">
                <div className="flex-1">P a r t i c u l a r s</div>
                <div className="w-32 text-right">Voucher Count</div>
              </div>

              <div className="flex px-2 py-0.5 font-bold bg-[#ffcc00] cursor-pointer" onClick={openStats}>
                <div className="flex-1">Total Vouchers</div>
                <div className="w-32 text-right">{totalVouchers || ""}</div>
              </div>

              <div className="flex px-4 py-0.5 cursor-pointer hover:bg-[#e6f2ff]" onClick={openStats}>
                <div className="flex-1">Included in Return</div>
                <div className="w-32 text-right">{includedReturn || ""}</div>
              </div>

              <div className="flex px-4 py-0.5 text-gray-500 cursor-pointer hover:bg-[#e6f2ff]" onClick={openNotRelevant}>
                <div className="flex-1">Not Relevant for This Return</div>
                <div className="w-32 text-right">{notRelevant || ""}</div>
              </div>

              <div
                className="flex px-4 py-0.5 pb-2 text-[#ff8c00] font-semibold cursor-pointer hover:underline"
                onClick={openUncertain}
              >
                <div className="flex-1">Uncertain Transactions (Corrections needed)</div>
                <div className="w-32 text-right">{uncertain || ""}</div>
              </div>
            </div>

            {/* ── Main Table ────────────────────────────────────────────── */}
            <Table className="text-xs table-fixed">
              <TableHeader>
                <TableRow className="border-b border-gray-300 hover:bg-transparent">
                  <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">
                    P a r t i c u l a r s
                  </TableHead>
                  <TableHead className={HEAD_CELL}>Taxable<br />Amount</TableHead>
                  <TableHead className={HEAD_CELL}>IGST</TableHead>
                  <TableHead className={HEAD_CELL}>CGST</TableHead>
                  <TableHead className={HEAD_CELL}>SGST/<br />UTGST</TableHead>
                  <TableHead className={HEAD_CELL}>Cess</TableHead>
                  <TableHead className={HEAD_CELL}>Tax<br />Amount</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((row, idx) => {

                  // ── Divider ──
                  if (row.type === "divider") {
                    return (
                      <TableRow key={idx} className="border-0 h-2 hover:bg-transparent">
                        <TableCell colSpan={7} className="p-0 border-t border-gray-200" />
                      </TableRow>
                    );
                  }

                  // ── Section header ──
                  if (row.type === "section") {
                    return (
                      <TableRow key={idx} className="border-0 hover:bg-transparent">
                        <TableCell
                          colSpan={7}
                          className="px-2 pt-2 pb-0.5 font-bold text-black underline"
                        >
                          {row.label}
                        </TableCell>
                      </TableRow>
                    );
                  }

                  // ── Subsection ──
                  if (row.type === "subsection") {
                    return (
                      <TableRow key={idx} className="border-0 hover:bg-transparent">
                        <TableCell colSpan={7} className="px-2 py-0.5 pl-6 text-black">
                          {row.label}
                        </TableCell>
                      </TableRow>
                    );
                  }

                  // ── Total row ──
                  if (row.type === "total") {
                    return (
                      <TableRow
                        key={idx}
                        className="border-t border-b border-gray-300 bg-gray-100 hover:bg-gray-100 font-semibold"
                      >
                        <TableCell className="px-2 py-0.5 font-semibold">{row.label}</TableCell>
                        <TableCell className={NUM_CELL}>{fmt(row.data.txval)}</TableCell>
                        <TableCell className={NUM_CELL}>{fmt(row.data.iamt)}</TableCell>
                        <TableCell className={NUM_CELL}>{fmt(row.data.camt)}</TableCell>
                        <TableCell className={NUM_CELL}>{fmt(row.data.samt)}</TableCell>
                        <TableCell className={NUM_CELL}>{fmt(row.data.cess)}</TableCell>
                        <TableCell className={NUM_CELL}>{fmt(taxTotal(row.data))}</TableCell>
                      </TableRow>
                    );
                  }

                  // ── Data row ──
                  const isSelected = selectedRow === idx;
                  const hasData    = taxTotal(row.data) !== 0 || row.data.txval !== 0;
                  const indentCls  = row.indent === 2 ? "pl-10" : "pl-6";

                  return (
                    <TableRow
                      key={idx}
                      onClick={() => { setSelectedRow(idx); row.nav?.(); }}
                      className={cn(
                        "border-0 cursor-pointer hover:bg-[#e6f2ff]",
                        isSelected
                          ? "bg-[#ffcc00] text-black font-bold hover:bg-[#ffcc00]"
                          : hasData
                            ? "text-black"
                            : "text-gray-400"
                      )}
                    >
                      <TableCell className={cn("px-2 py-0.5", indentCls)}>{row.label}</TableCell>
                      <TableCell className={NUM_CELL}>{fmt(row.data.txval)}</TableCell>
                      <TableCell className={NUM_CELL}>{fmt(row.data.iamt)}</TableCell>
                      <TableCell className={NUM_CELL}>{fmt(row.data.camt)}</TableCell>
                      <TableCell className={NUM_CELL}>{fmt(row.data.samt)}</TableCell>
                      <TableCell className={NUM_CELL}>{fmt(row.data.cess)}</TableCell>
                      <TableCell className={NUM_CELL}>{fmt(taxTotal(row.data))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>

              <TableFooter className="bg-transparent">
                <TableRow className="border-t border-gray-400 hover:bg-transparent font-bold">
                  <TableCell className="px-2 py-1">Total</TableCell>
                  <TableCell className={cn(NUM_CELL, "font-bold")}>{fmt(grandTotal.txval)}</TableCell>
                  <TableCell className={cn(NUM_CELL, "font-bold")}>{fmt(grandTotal.iamt)}</TableCell>
                  <TableCell className={cn(NUM_CELL, "font-bold")}>{fmt(grandTotal.camt)}</TableCell>
                  <TableCell className={cn(NUM_CELL, "font-bold")}>{fmt(grandTotal.samt)}</TableCell>
                  <TableCell className={cn(NUM_CELL, "font-bold")}>{fmt(grandTotal.cess)}</TableCell>
                  <TableCell className={cn(NUM_CELL, "font-bold")}>{fmt(taxTotal(grandTotal))}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </>
        )}
      </div>
    </TallyReportLayout>
  );
}