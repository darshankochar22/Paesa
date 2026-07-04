import { useState, useEffect, useMemo } from "react";
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function periodLabelFor(month: string, year: string) {
  const m = Number(month);
  const y = Number(year);
  const lastDay = new Date(y, m, 0).getDate();
  const yy = String(y).slice(-2);
  return `1-${MONTHS[m - 1]}-${yy} to ${lastDay}-${MONTHS[m - 1]}-${yy}`;
}

const amt = (n: number) => (n ? n.toFixed(2) : "");

// Drill target for a GSTR-1 Return View section (B2B, B2C, CDN, Nil, HSN, Docs...).
// Default view groups vouchers party-wise; F5 toggles to the voucher register.
// HSN Summary (12) and Document Summary (13) render their aggregate views.
export default function GSTR1SectionDetail() {
  const { selectedCompany, activeFY } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const today = new Date();
  const month = location.state?.month || String(today.getMonth() + 1).padStart(2, "0");
  const year = location.state?.year || String(today.getFullYear());
  const registration = location.state?.registration;
  const section = location.state?.section ?? null; // null → section with no book data (amendments/advances)
  const label = location.state?.label || "Section";
  const returnType = location.state?.returnType || "GSTR1";

  const registrationName = registration?.state_id
    ? `${registration.state_id} Registration`
    : registration?.name || " All Registrations";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [view, setView] = useState<"summary" | "register">("summary");
  const serverView = section === "hsn" ? "hsn" : section === "docs" ? "docs" : "vouchers";

  useEffect(() => {
    async function load() {
      if (!companyId || !fyId) return;
      if (!section) { setRows([]); return; } // amendments/advances: no book data by design
      try {
        setLoading(true);
        setError(null);
        const res = await window.api.gst.getReturnVouchers({
          company_id: companyId,
          fy_id: fyId,
          return_period: `${month}${year}`,
          return_type: returnType,
          gst_registration_id: registration?.gst_id ?? null,
          bucket: "included",
          section,
        });
        if (res.success) setRows(res.rows || []);
        else {
          setError(res.error || "Failed to load section data.");
          setRows([]);
        }
      } catch (e: any) {
        setError(e.message || "An unexpected error occurred.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, fyId, month, year, section, returnType, registration?.gst_id]);

  // Party-wise grouping for the default Summary view.
  const partySummary = useMemo(() => {
    if (serverView !== "vouchers") return [];
    const byParty: Record<string, any> = {};
    for (const r of rows) {
      const key = r.particulars || "(No Party)";
      const p = byParty[key] || (byParty[key] = { party: key, count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, tax: 0, invoice: 0 });
      p.count++;
      p.taxable += r.taxable; p.igst += r.igst; p.cgst += r.cgst; p.sgst += r.sgst;
      p.cess += r.cess; p.tax += r.tax; p.invoice += r.invoice;
    }
    return Object.values(byParty).sort((a: any, b: any) => a.party.localeCompare(b.party));
  }, [rows, serverView]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          qty: acc.qty + (r.qty || 0),
          taxable: acc.taxable + (r.taxable || 0),
          igst: acc.igst + (r.igst || 0),
          cgst: acc.cgst + (r.cgst || 0),
          sgst: acc.sgst + (r.sgst || 0),
          cess: acc.cess + (r.cess || 0),
          tax: acc.tax + (r.tax || 0),
          invoice: acc.invoice + (r.invoice || 0),
          count: acc.count + (r.count || 0),
          net: acc.net + (r.net || 0),
        }),
        { qty: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, tax: 0, invoice: 0, count: 0, net: 0 }
      ),
    [rows]
  );

  const taxHeads = (
    <>
      <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">Taxable<br />Amount</TableHead>
      <TableHead className="h-auto w-20 px-2 py-1 text-right align-bottom font-bold text-black">IGST</TableHead>
      <TableHead className="h-auto w-20 px-2 py-1 text-right align-bottom font-bold text-black">CGST</TableHead>
      <TableHead className="h-auto w-20 px-2 py-1 text-right align-bottom font-bold text-black">SGST/<br />UTGST</TableHead>
      <TableHead className="h-auto w-16 px-2 py-1 text-right align-bottom font-bold text-black">Cess</TableHead>
      <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">Tax<br />Amount</TableHead>
    </>
  );

  const taxCells = (r: any) => (
    <>
      <TableCell className="px-2 py-0.5 text-right">{amt(r.taxable)}</TableCell>
      <TableCell className="px-2 py-0.5 text-right">{amt(r.igst)}</TableCell>
      <TableCell className="px-2 py-0.5 text-right">{amt(r.cgst)}</TableCell>
      <TableCell className="px-2 py-0.5 text-right">{amt(r.sgst)}</TableCell>
      <TableCell className="px-2 py-0.5 text-right">{amt(r.cess)}</TableCell>
      <TableCell className="px-2 py-0.5 text-right">{amt(r.tax)}</TableCell>
    </>
  );

  return (
    <TallyReportLayout
      title={`${returnType === "GSTR3B" ? "GSTR-3B" : "GSTR-1"} - ${view === "register" && serverView === "vouchers" ? "Voucher Register" : section === "hsn" ? "HSN/SAC Summary" : section === "docs" ? "Document Summary" : "Summary"}`}
      companyName={selectedCompany?.name || "Company"}
      leftSubtitle={
        <>
          <div className="flex gap-4">
            <span className="w-32">GST Registration</span>
            <span className="font-bold">: {registrationName}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-32">Details of</span>
            <span className="font-bold">: {label}</span>
          </div>
        </>
      }
      rightSubtitle={<div>{periodLabelFor(month, year)}</div>}
      footerControls={
        serverView === "vouchers" ? (
          <div className="flex items-center gap-4 ml-4">
            <Button
              onClick={() => setView(view === "summary" ? "register" : "summary")}
              variant="ghost"
              size="xs"
              className="h-auto p-0 font-bold text-black-900 hover:underline hover:bg-transparent"
            >
              {view === "summary" ? "F5: Voucher-wise" : "F5: Summary"}
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading section data..." className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && !error && rows.length === 0 && (
          <EmptyState message="No transactions in this section for the period." />
        )}

        {!loading && !error && rows.length > 0 && serverView === "hsn" && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">HSN/SAC</TableHead>
                <TableHead className="h-auto w-20 px-2 py-1 text-right align-bottom font-bold text-black">Quantity</TableHead>
                {taxHeads}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.hsn} className="border-0 hover:bg-[#e6f2ff]">
                  <TableCell className="px-2 py-0.5">{r.hsn}</TableCell>
                  <TableCell className="px-2 py-0.5 text-right">{r.qty || ""}</TableCell>
                  {taxCells(r)}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="bg-transparent">
              <TableRow className="border-t border-gray-300 hover:bg-transparent font-bold">
                <TableCell className="px-2 py-1">Total</TableCell>
                <TableCell className="px-2 py-1 text-right">{totals.qty || ""}</TableCell>
                {taxCells(totals)}
              </TableRow>
            </TableFooter>
          </Table>
        )}

        {!loading && !error && rows.length > 0 && serverView === "docs" && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">Nature of Document</TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 text-center align-bottom font-bold text-black">From<br />Vch No.</TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 text-center align-bottom font-bold text-black">To<br />Vch No.</TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">Voucher<br />Count</TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">Cancelled</TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">Nett<br />Issued</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.nature} className="border-0 hover:bg-[#e6f2ff]">
                  <TableCell className="px-2 py-0.5">{r.nature}</TableCell>
                  <TableCell className="px-2 py-0.5 text-center">{r.from ?? ""}</TableCell>
                  <TableCell className="px-2 py-0.5 text-center">{r.to ?? ""}</TableCell>
                  <TableCell className="px-2 py-0.5 text-right">{r.count || ""}</TableCell>
                  <TableCell className="px-2 py-0.5 text-right">{r.cancelled || ""}</TableCell>
                  <TableCell className="px-2 py-0.5 text-right">{r.net || ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="bg-transparent">
              <TableRow className="border-t border-gray-300 hover:bg-transparent font-bold">
                <TableCell colSpan={3} className="px-2 py-1">Total</TableCell>
                <TableCell className="px-2 py-1 text-right">{totals.count || ""}</TableCell>
                <TableCell className="px-2 py-1 text-right"></TableCell>
                <TableCell className="px-2 py-1 text-right">{totals.net || ""}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}

        {!loading && !error && rows.length > 0 && serverView === "vouchers" && view === "summary" && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">Party Name</TableHead>
                <TableHead className="h-auto w-20 px-2 py-1 text-center align-bottom font-bold text-black">Voucher<br />Count</TableHead>
                {taxHeads}
                <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">Invoice<br />Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partySummary.map((p: any) => (
                <TableRow
                  key={p.party}
                  className="border-0 cursor-pointer hover:bg-[#e6f2ff]"
                  onClick={() => setView("register")}
                >
                  <TableCell className="px-2 py-0.5">{p.party}</TableCell>
                  <TableCell className="px-2 py-0.5 text-center">{p.count}</TableCell>
                  {taxCells(p)}
                  <TableCell className="px-2 py-0.5 text-right">{amt(p.invoice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="bg-transparent">
              <TableRow className="border-t border-gray-300 hover:bg-transparent font-bold">
                <TableCell className="px-2 py-1">Total</TableCell>
                <TableCell className="px-2 py-1 text-center">{rows.length}</TableCell>
                {taxCells(totals)}
                <TableCell className="px-2 py-1 text-right">{amt(totals.invoice)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}

        {!loading && !error && rows.length > 0 && serverView === "vouchers" && view === "register" && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className="h-auto w-20 px-2 py-1 align-bottom font-bold text-black">Date</TableHead>
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">Particulars</TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 align-bottom font-bold text-black">Vch Type</TableHead>
                <TableHead className="h-auto w-16 px-2 py-1 text-center align-bottom font-bold text-black">Vch No.</TableHead>
                {taxHeads}
                <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">Invoice<br />Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow
                  key={r.voucher_id}
                  className="border-0 cursor-pointer hover:bg-[#e6f2ff]"
                  onClick={() => navigate(`/transactions/voucher/${r.voucher_id}`)}
                >
                  <TableCell className="px-2 py-0.5">{r.date}</TableCell>
                  <TableCell className="px-2 py-0.5">{r.particulars}</TableCell>
                  <TableCell className="px-2 py-0.5">{r.voucher_type}</TableCell>
                  <TableCell className="px-2 py-0.5 text-center">{r.voucher_number ?? ""}</TableCell>
                  {taxCells(r)}
                  <TableCell className="px-2 py-0.5 text-right">{amt(r.invoice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="bg-transparent">
              <TableRow className="border-t border-gray-300 hover:bg-transparent font-bold">
                <TableCell colSpan={4} className="px-2 py-1">Total</TableCell>
                {taxCells(totals)}
                <TableCell className="px-2 py-1 text-right">{amt(totals.invoice)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </div>
    </TallyReportLayout>
  );
}
