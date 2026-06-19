import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

interface ReconciliationRow {
  vch_count:      number;
  taxable_amount: number;
  igst:           number;
  cgst:           number;
  sgst:           number;
  cess:           number;
  tax_amount:     number;
  invoice_amount: number;
  status?:        "Reconciled" | "Unreconciled" | "Uncertain" | "";
}

const ZERO_ROW: ReconciliationRow = {
  vch_count: 0, taxable_amount: 0, igst: 0, cgst: 0,
  sgst: 0, cess: 0, tax_amount: 0, invoice_amount: 0,
};

function fmt(n: number) {
  return n ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
}

function fmtCount(n: number) {
  return n ? String(n) : "";
}

function addRow(a: ReconciliationRow, b: ReconciliationRow): ReconciliationRow {
  return {
    vch_count:      a.vch_count      + b.vch_count,
    taxable_amount: a.taxable_amount + b.taxable_amount,
    igst:           a.igst           + b.igst,
    cgst:           a.cgst           + b.cgst,
    sgst:           a.sgst           + b.sgst,
    cess:           a.cess           + b.cess,
    tax_amount:     a.tax_amount     + b.tax_amount,
    invoice_amount: a.invoice_amount + b.invoice_amount,
  };
}

type RowDef =
  | { type: "section"; label: string }
  | { type: "subhead"; label: string }
  | { type: "data";    label: string; row: ReconciliationRow; indent?: 1 | 2 }
  | { type: "divider" };

const NUM  = "px-2 py-0.5 text-right text-xs tabular-nums";
const HEAD = "h-auto px-2 py-1 text-right align-bottom font-bold text-black text-xs whitespace-nowrap";

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const cls =
    status === "Reconciled"   ? "text-green-700"  :
    status === "Unreconciled" ? "text-red-600"    :
    status === "Uncertain"    ? "text-orange-600" : "text-gray-400";
  return <span className={cn("text-xs font-medium", cls)}>{status}</span>;
}

export default function GSTR2BReconciliation() {
  const { selectedCompany, activeFY } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();

  const companyId = selectedCompany?.company_id;
  const fyId      = activeFY?.fy_id;

  const today = new Date();
  const [selectedMonth] = useState(String(today.getMonth() + 1).padStart(2, "0"));
  const [selectedYear] = useState(String(today.getFullYear()));
  const returnPeriod = `${selectedMonth}${selectedYear}`;

  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [data, setData]               = useState<any>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [fetchedRegistration, setFetchedRegistration] = useState<any>(null);

  const activeRegistration = location.state?.registration || fetchedRegistration;
  const registrationName   = activeRegistration?.state_id
    ? `${activeRegistration.state_id} Registration`
    : "All Registrations";

  const loadData = async () => {
    if (!companyId || !fyId) return;

    if (!location.state?.registration && !fetchedRegistration) {
      try {
        const regRes = await window.api.gstRegistration.getAll(companyId);
        if (regRes.success && regRes.gstRegistrations?.length > 0) {
          setFetchedRegistration(regRes.gstRegistrations[0]);
        }
      } catch (err) {
        console.error("Failed to fetch registrations", err);
      }
    }

    try {
      setLoading(true);
      setError(null);
      const result = await window.api.gst.getGSTR2BReconciliation({ company_id: companyId, fy_id: fyId });
      if (result.success) {
        setData(result.payload);
      } else {
        setError(result.error || "Failed to load GSTR-2B reconciliation data.");
      }
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [companyId, fyId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "a" && e.altKey) {
        e.preventDefault();
        navigate("/utilities/copilot", {
          state: {
            initialPrompt: "Analyze my GSTR-2B reconciliation status. Please highlight any mismatches and provide GST correction suggestions."
          }
        });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [navigate]);

  const handleImportJson = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        setLoading(true);
        const text = await file.text();
        const payload = JSON.parse(text);
        const period = payload.fp || returnPeriod; // try to get period from payload, fallback to current
        
        const res = await window.api.gst.importGSTR2B({
          company_id: companyId,
          fy_id: fyId,
          return_period: period,
          payload
        });
        
        if (res.success) {
          await loadData();
          alert("GSTR-2B JSON Imported successfully! Reconciliation updated.");
        } else {
          setError(res.error || "Failed to import JSON");
        }
      } catch (err: any) {
        setError("Invalid JSON file: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  const d = data?.return_view ?? {};

  const itc_avail_other:     ReconciliationRow = d.itc_available_other     ?? ZERO_ROW;
  const itc_avail_isd:       ReconciliationRow = d.itc_available_isd       ?? ZERO_ROW;
  const itc_avail_rcm:       ReconciliationRow = d.itc_available_rcm       ?? ZERO_ROW;
  const itc_avail_import:    ReconciliationRow = d.itc_available_import    ?? ZERO_ROW;
  const itc_avail_reversal:  ReconciliationRow = d.itc_available_reversal  ?? ZERO_ROW;
  const itc_avail_others:    ReconciliationRow = d.itc_available_others    ?? ZERO_ROW;

  const itc_unavail_other:   ReconciliationRow = d.itc_unavailable_other   ?? ZERO_ROW;
  const itc_unavail_isd:     ReconciliationRow = d.itc_unavailable_isd     ?? ZERO_ROW;
  const itc_unavail_rcm:     ReconciliationRow = d.itc_unavailable_rcm     ?? ZERO_ROW;
  const itc_unavail_reversal:ReconciliationRow = d.itc_unavailable_reversal?? ZERO_ROW;
  const itc_unavail_others:  ReconciliationRow = d.itc_unavailable_others  ?? ZERO_ROW;

  const reconciled   = data?.voucher_status?.reconciled   ?? 0;
  const unreconciled = data?.voucher_status?.unreconciled ?? 0;
  const uncertain    = data?.voucher_status?.uncertain    ?? 0;

  const periodLabel  = data?.period_label
    ?? (activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : "");
  const lastActivity = data?.last_gst_activity ?? "No Activity Found";

  const grandTotal = [
    itc_avail_other, itc_avail_isd, itc_avail_rcm, itc_avail_import, itc_avail_reversal, itc_avail_others,
    itc_unavail_other, itc_unavail_isd, itc_unavail_rcm, itc_unavail_reversal, itc_unavail_others
  ].reduce(addRow, ZERO_ROW);

  const rows: RowDef[] = [
    { type: "section", label: "Return View (Comparison of Books & Portal Values)" },
    { type: "subhead", label: "Input Tax Credit Available - Part A" },
    { type: "data", label: "All other ITC from Registered Persons (Excluding Reverse Charge)", row: itc_avail_other,    indent: 1 },
    { type: "data", label: "Inward Supplies from ISD",                                         row: itc_avail_isd,      indent: 1 },
    { type: "data", label: "Inward Supplies Liable for Reverse Charge",                        row: itc_avail_rcm,      indent: 1 },
    { type: "data", label: "Import of Goods",                                                  row: itc_avail_import,   indent: 1 },
    { type: "data", label: "Reversal of Available ITC (Purchase Return) - Part B",             row: itc_avail_reversal, indent: 1 },
    { type: "data", label: "Others",                                                           row: itc_avail_others,   indent: 1 },
    { type: "divider" },
    { type: "subhead", label: "Input Tax Credit Unavailable - Part A" },
    { type: "data", label: "All other ITC from Registered Persons (Excluding Reverse Charge)", row: itc_unavail_other,    indent: 1 },
    { type: "data", label: "Inward Supplies from ISD",                                         row: itc_unavail_isd,      indent: 1 },
    { type: "data", label: "Inward Supplies Liable for Reverse Charge",                        row: itc_unavail_rcm,      indent: 1 },
    { type: "data", label: "Reversal of Unavailable ITC (Purchase Return) - Part B",           row: itc_unavail_reversal, indent: 1 },
    { type: "data", label: "Others",                                                           row: itc_unavail_others,   indent: 1 },
  ];

  return (
    <TallyReportLayout
      title="GSTR-2B Reconciliation"
      companyName={selectedCompany?.name || "Company"}
      leftSubtitle={
        <>
          <div className="flex gap-4">
            <span className="w-36">GST Registration</span>
            <span className="font-bold">: {registrationName}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-36">Status</span>
            <span className="font-bold">: Unreconciled</span>
          </div>
        </>
      }
      rightSubtitle={
        <>
          <div>{periodLabel}</div>
          <div className="text-gray-500">Last online GST activity: {lastActivity}</div>
        </>
      }
      footerControls={
        <div className="flex items-center gap-4 ml-4">
          <Button
            onClick={loadData}
            variant="ghost"
            size="xs"
            disabled={loading}
            className="h-auto p-0 font-bold text-black hover:underline hover:bg-transparent"
          >
            F5: Refresh
          </Button>
          <Button
            onClick={handleImportJson}
            variant="ghost"
            size="xs"
            disabled={loading}
            className="h-auto p-0 font-bold text-black hover:underline hover:bg-transparent"
          >
            Alt+I: Import JSON
          </Button>
        </div>
      }
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading GSTR-2B reconciliation data…" className="italic" />}
        {error   && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && (
          <>
            <div className="flex flex-col border-b border-gray-300">
              <div className="flex font-bold px-2 py-1 border-b border-gray-200">
                <div className="flex-1">P a r t i c u l a r s</div>
                <div className="w-32 text-right">Voucher Count</div>
              </div>

              <div className="flex px-2 py-0.5 font-bold bg-[#ffcc00]">
                <div className="flex-1">Reconciled</div>
                <div className="w-32 text-right text-green-700">{fmtCount(reconciled)}</div>
              </div>

              <div className="flex px-4 py-0.5 text-red-600">
                <div className="flex-1">Unreconciled</div>
                <div className="w-32 text-right font-semibold">{fmtCount(unreconciled)}</div>
              </div>

              {uncertain > 0 && (
                <div className="flex px-4 py-0.5 pb-2 text-orange-600 font-semibold">
                  <div className="flex-1">Uncertain Transactions (Corrections needed)</div>
                  <div className="w-32 text-right">{fmtCount(uncertain)}</div>
                </div>
              )}
            </div>

            <Table className="text-xs table-fixed">
              <TableHeader>
                <TableRow className="border-b border-gray-300 hover:bg-transparent">
                  <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">
                    P a r t i c u l a r s
                  </TableHead>
                  <TableHead className={cn(HEAD, "w-24")}>Voucher Count</TableHead>
                  <TableHead className={cn(HEAD, "w-28")}>Taxable<br />Amount</TableHead>
                  <TableHead className={cn(HEAD, "w-24")}>IGST</TableHead>
                  <TableHead className={cn(HEAD, "w-24")}>CGST</TableHead>
                  <TableHead className={cn(HEAD, "w-24")}>SGST/<br />UTGST</TableHead>
                  <TableHead className={cn(HEAD, "w-20")}>Cess</TableHead>
                  <TableHead className={cn(HEAD, "w-24")}>Tax<br />Amount</TableHead>
                  <TableHead className={cn(HEAD, "w-28")}>Invoice<br />Amount</TableHead>
                  <TableHead className={cn(HEAD, "w-24")}>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((row, idx) => {
                  if (row.type === "divider") {
                    return (
                      <TableRow key={idx} className="border-0 h-2 hover:bg-transparent">
                        <TableCell colSpan={10} className="p-0 border-t border-gray-200" />
                      </TableRow>
                    );
                  }

                  if (row.type === "section") {
                    return (
                      <TableRow key={idx} className="border-0 hover:bg-transparent">
                        <TableCell colSpan={10} className="px-2 pt-2 pb-0.5 font-bold text-black underline">
                          {row.label}
                        </TableCell>
                      </TableRow>
                    );
                  }

                  if (row.type === "subhead") {
                    return (
                      <TableRow key={idx} className="border-0 hover:bg-transparent">
                        <TableCell colSpan={10} className="px-2 py-1 font-bold text-black">
                          {row.label}
                        </TableCell>
                      </TableRow>
                    );
                  }

                  const isSelected = selectedRow === idx;
                  const hasData    = row.row.vch_count > 0 || row.row.taxable_amount !== 0;
                  const indentCls  = row.indent === 2 ? "pl-10" : "pl-6";

                  return (
                    <TableRow
                      key={idx}
                      onClick={() => setSelectedRow(idx)}
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
                      <TableCell className={NUM}>{fmtCount(row.row.vch_count)}</TableCell>
                      <TableCell className={NUM}>{fmt(row.row.taxable_amount)}</TableCell>
                      <TableCell className={NUM}>{fmt(row.row.igst)}</TableCell>
                      <TableCell className={NUM}>{fmt(row.row.cgst)}</TableCell>
                      <TableCell className={NUM}>{fmt(row.row.sgst)}</TableCell>
                      <TableCell className={NUM}>{fmt(row.row.cess)}</TableCell>
                      <TableCell className={NUM}>{fmt(row.row.tax_amount)}</TableCell>
                      <TableCell className={NUM}>{fmt(row.row.invoice_amount)}</TableCell>
                      <TableCell className="px-2 py-0.5 text-xs">
                        <StatusBadge status={row.row.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>

              <TableFooter className="bg-transparent">
                <TableRow className="border-t border-gray-400 hover:bg-transparent font-bold">
                  <TableCell className="px-2 py-1">Total</TableCell>
                  <TableCell className={cn(NUM, "font-bold")}>{fmtCount(grandTotal.vch_count)}</TableCell>
                  <TableCell className={cn(NUM, "font-bold")}>{fmt(grandTotal.taxable_amount)}</TableCell>
                  <TableCell className={cn(NUM, "font-bold")}>{fmt(grandTotal.igst)}</TableCell>
                  <TableCell className={cn(NUM, "font-bold")}>{fmt(grandTotal.cgst)}</TableCell>
                  <TableCell className={cn(NUM, "font-bold")}>{fmt(grandTotal.sgst)}</TableCell>
                  <TableCell className={cn(NUM, "font-bold")}>{fmt(grandTotal.cess)}</TableCell>
                  <TableCell className={cn(NUM, "font-bold")}>{fmt(grandTotal.tax_amount)}</TableCell>
                  <TableCell className={cn(NUM, "font-bold")}>{fmt(grandTotal.invoice_amount)}</TableCell>
                  <TableCell className={NUM} />
                </TableRow>
              </TableFooter>
            </Table>
          </>
        )}
      </div>
    </TallyReportLayout>
  );
}
