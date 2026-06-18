import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
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
  | { type: "data";    label: string; row: ReconciliationRow; indent?: 1 | 2 }
  | { type: "divider" };

const NUM  = "px-2 py-0.5 text-right text-xs tabular-nums";
const HEAD = "h-auto px-2 py-1 text-right align-bottom font-bold text-black text-xs whitespace-nowrap";

export default function IMSInwardSupplies() {
  const { selectedCompany, activeFY } = useCompany();
  const location = useLocation();

  const companyId = selectedCompany?.company_id;
  const fyId      = activeFY?.fy_id;

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
      const result = await window.api.gst.getIMSInwardSupplies({ company_id: companyId, fy_id: fyId });
      if (result.success) {
        setData(result.payload);
      } else {
        setError(result.error || "Failed to load IMS inward supplies data.");
      }
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [companyId, fyId]);

  const d = data?.return_view ?? {};

  const b2b:             ReconciliationRow = d.b2b             ?? ZERO_ROW;
  const amend_b2b:       ReconciliationRow = d.amend_b2b       ?? ZERO_ROW;
  const cdn:             ReconciliationRow = d.cdn             ?? ZERO_ROW;
  const amend_cdn:       ReconciliationRow = d.amend_cdn       ?? ZERO_ROW;
  const debit_note:      ReconciliationRow = d.debit_note      ?? ZERO_ROW;
  const amend_debit_note:ReconciliationRow = d.amend_debit_note?? ZERO_ROW;
  const impg:            ReconciliationRow = d.impg            ?? ZERO_ROW;
  const amend_impg:      ReconciliationRow = d.amend_impg      ?? ZERO_ROW;
  const impgsez:         ReconciliationRow = d.impgsez         ?? ZERO_ROW;
  const amend_impgsez:   ReconciliationRow = d.amend_impgsez   ?? ZERO_ROW;

  const totalVouchers   = data?.voucher_status?.total_vouchers ?? 0;
  const filed           = data?.voucher_status?.filed          ?? { total: 0, action_required: 0, ready_for_upload: 0, uploaded: 0 };
  const yet_filed       = data?.voucher_status?.yet_filed      ?? { total: 0, action_required: 0, ready_for_upload: 0, uploaded: 0 };

  const periodLabel  = data?.period_label
    ?? (activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : "");
  const lastActivity = data?.last_gst_activity ?? "No Activity Found";

  const grandTotal = [
    b2b, amend_b2b, cdn, amend_cdn, debit_note, amend_debit_note, impg, amend_impg, impgsez, amend_impgsez
  ].reduce(addRow, ZERO_ROW);

  const rows: RowDef[] = [
    { type: "section", label: "Return View (Comparison of Books & Portal Values)" },
    { type: "data", label: "B2B Invoices",                                       row: b2b,              indent: 1 },
    { type: "data", label: "B2B Invoice Amendments",                             row: amend_b2b,        indent: 1 },
    { type: "data", label: "B2B Credit Notes",                                   row: cdn,              indent: 1 },
    { type: "data", label: "B2B Credit Note Amendments",                         row: amend_cdn,        indent: 1 },
    { type: "data", label: "B2B Debit Notes",                                    row: debit_note,       indent: 1 },
    { type: "data", label: "B2B Debit Note Amendments",                          row: amend_debit_note, indent: 1 },
    { type: "data", label: "IMPG Invoices",                                      row: impg,             indent: 1 },
    { type: "data", label: "IMPG Invoice Amendments",                            row: amend_impg,       indent: 1 },
    { type: "data", label: "IMPGSEZ Invoices",                                   row: impgsez,          indent: 1 },
    { type: "data", label: "IMPGSEZ Invoice Amendments",                         row: amend_impgsez,    indent: 1 },
  ];

  return (
    <TallyReportLayout
      title="IMS Inward Supplies"
      companyName={selectedCompany?.name || "Company"}
      leftSubtitle={
        <>
          <div className="flex gap-4">
            <span className="w-36">GST Registration</span>
            <span className="font-bold">: {registrationName}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-36">Current View</span>
            <span className="font-bold">: Default IMS View</span>
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
        {loading && <EmptyState message="Loading IMS inward supplies data…" className="italic" />}
        {error   && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && (
          <>
            <div className="flex flex-col border-b border-gray-300">
              <div className="flex font-bold px-2 py-1 border-b border-gray-200">
                <div className="flex-1">P a r t i c u l a r s</div>
                <div className="w-32 text-right">Voucher Count</div>
              </div>

              <div className="flex px-2 py-0.5 font-bold bg-[#ffcc00]">
                <div className="flex-1">Total Vouchers</div>
                <div className="w-32 text-right">{fmtCount(totalVouchers)}</div>
              </div>

              <div className="flex px-4 py-0.5 font-semibold">
                <div className="flex-1">Invoices Filed by Supplier</div>
                <div className="w-32 text-right">{fmtCount(filed.total)}</div>
              </div>

              <div className="flex px-8 py-0.5 text-orange-600">
                <div className="flex-1">Action Required</div>
                <div className="w-32 text-right">{fmtCount(filed.action_required)}</div>
              </div>

              <div className="flex px-8 py-0.5 text-blue-600">
                <div className="flex-1">Action Taken - Ready for Upload</div>
                <div className="w-32 text-right">{fmtCount(filed.ready_for_upload)}</div>
              </div>

              <div className="flex px-8 py-0.5 text-green-700">
                <div className="flex-1">Action Taken - Uploaded</div>
                <div className="w-32 text-right">{fmtCount(filed.uploaded)}</div>
              </div>

              <div className="flex px-4 py-0.5 font-semibold">
                <div className="flex-1">Invoices Yet to Be Filed by Supplier</div>
                <div className="w-32 text-right">{fmtCount(yet_filed.total)}</div>
              </div>

              <div className="flex px-8 py-0.5 text-orange-600">
                <div className="flex-1">Action Required</div>
                <div className="w-32 text-right">{fmtCount(yet_filed.action_required)}</div>
              </div>

              <div className="flex px-8 py-0.5 text-blue-600">
                <div className="flex-1">Action Taken - Ready for Upload</div>
                <div className="w-32 text-right">{fmtCount(yet_filed.ready_for_upload)}</div>
              </div>

              <div className="flex px-8 py-0.5 text-green-700">
                <div className="flex-1">Action Taken - Uploaded</div>
                <div className="w-32 text-right">{fmtCount(yet_filed.uploaded)}</div>
              </div>
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
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((row, idx) => {
                  if (row.type === "divider") {
                    return (
                      <TableRow key={idx} className="border-0 h-2 hover:bg-transparent">
                        <TableCell colSpan={9} className="p-0 border-t border-gray-200" />
                      </TableRow>
                    );
                  }

                  if (row.type === "section") {
                    return (
                      <TableRow key={idx} className="border-0 hover:bg-transparent">
                        <TableCell colSpan={9} className="px-2 pt-2 pb-0.5 font-bold text-black underline">
                          {row.label}
                        </TableCell>
                      </TableRow>
                    );
                  }

                  const isSelected = selectedRow === idx;
                  const hasData    = row.row.vch_count > 0 || row.row.taxable_amount !== 0;
                  const indentCls  = "pl-6";

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
                </TableRow>
              </TableFooter>
            </Table>
          </>
        )}
      </div>
    </TallyReportLayout>
  );
}
