import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { TallyReportLayout } from "@/components/tally-ui/TallyReportLayout";
import {
  Table,
  TableHeader,
  TableBody,
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

interface UncertainRow {
  voucher_id: number;
  date: string;
  particulars: string;
  voucher_type: string;
  voucher_number: string | null;
  invoice: number;
  exceptions: string[];
}

// "Uncertain Transactions (Corrections needed)" — vouchers blocked from the return,
// each with its concrete exceptions. Opening a row lands on the voucher to fix it.
export default function GSTRUncertain() {
  const { selectedCompany, activeFY } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const today = new Date();
  const month = location.state?.month || String(today.getMonth() + 1).padStart(2, "0");
  const year = location.state?.year || String(today.getFullYear());
  const registration = location.state?.registration;
  const returnType = location.state?.returnType || "GSTR1";
  const annual = !!location.state?.annual;
  const periodText = annual
    ? (activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : "")
    : periodLabelFor(month, year);

  const registrationName = registration?.state_id
    ? `${registration.state_id} Registration`
    : registration?.name || " All Registrations";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<UncertainRow[]>([]);

  useEffect(() => {
    async function load() {
      if (!companyId || !fyId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await window.api.gst.getReturnVouchers({
          company_id: companyId,
          fy_id: fyId,
          return_period: `${month}${year}`,
          return_type: returnType,
          gst_registration_id: registration?.gst_id ?? null,
          annual,
          bucket: "uncertain",
        });
        if (res.success) setRows((res.rows as UncertainRow[]) || []);
        else {
          setError(res.error || "Failed to load uncertain transactions.");
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
  }, [companyId, fyId, month, year, returnType, registration?.gst_id]);

  return (
    <TallyReportLayout
      title={`${returnType === "ANNUAL" ? "Annual Computation" : returnType === "GSTR3B" ? "GSTR-3B" : "GSTR-1"} - Resolution of Uncertain Transactions`}
      companyName={selectedCompany?.name || "Company"}
      leftSubtitle={
        <>
          <div className="flex gap-4">
            <span className="w-32">GST Registration</span>
            <span className="font-bold">: {registrationName}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-32">Details of</span>
            <span className="font-bold">: Transactions with Incomplete/Mismatch in Information</span>
          </div>
        </>
      }
      rightSubtitle={<div>{periodText}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Scanning transactions..." className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && !error && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className="h-auto w-20 px-2 py-1 align-bottom font-bold text-black">Date</TableHead>
                <TableHead className="h-auto w-48 px-2 py-1 align-bottom font-bold text-black">Particulars</TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 align-bottom font-bold text-black">Vch Type</TableHead>
                <TableHead className="h-auto w-16 px-2 py-1 text-center align-bottom font-bold text-black">Vch No.</TableHead>
                <TableHead className="h-auto w-28 px-2 py-1 text-right align-bottom font-bold text-black">Invoice<br />Amount</TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 text-center align-bottom font-bold text-black">No. of<br />Exceptions</TableHead>
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">Exception</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState message="No uncertain transactions — nothing needs correction for this period." />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow
                    key={r.voucher_id}
                    className="border-0 cursor-pointer hover:bg-[#e6f2ff]"
                    onClick={() => navigate(`/transactions/voucher/${r.voucher_id}`)}
                  >
                    <TableCell className="px-2 py-0.5">{r.date}</TableCell>
                    <TableCell className="px-2 py-0.5">{r.particulars}</TableCell>
                    <TableCell className="px-2 py-0.5">{r.voucher_type}</TableCell>
                    <TableCell className="px-2 py-0.5 text-center">{r.voucher_number ?? ""}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{amt(r.invoice)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-center">{r.exceptions.length}</TableCell>
                    <TableCell className="px-2 py-0.5 text-[#ff8c00]">{r.exceptions[0] || ""}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </TallyReportLayout>
  );
}
