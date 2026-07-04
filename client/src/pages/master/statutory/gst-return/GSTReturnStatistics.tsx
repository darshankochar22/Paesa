import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { TallyReportLayout } from "@/components/tally-ui/TallyReportLayout";
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

interface StatRow {
  voucher_type: string;
  total: number;
  included_pending: number;
  included_ok: number;
  not_relevant: number;
  uncertain: number;
}

const num = (n: number) => (n ? String(n) : "");

export default function GSTReturnStatistics() {
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
  const returnPeriod = `${month}${year}`;

  const registrationName = registration?.state_id
    ? `${registration.state_id} Registration`
    : registration?.name || " All Registrations";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<StatRow[]>([]);
  const [totals, setTotals] = useState<StatRow | null>(null);

  useEffect(() => {
    async function load() {
      if (!companyId || !fyId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await window.api.gst.getReturnStatistics({
          company_id: companyId,
          fy_id: fyId,
          return_period: returnPeriod,
          return_type: returnType,
          gst_registration_id: registration?.gst_id ?? null,
        });
        if (res.success && res.statistics) {
          setRows(res.statistics.rows);
          setTotals({ voucher_type: "Total", ...res.statistics.totals });
        } else {
          setError(res.error || "Failed to load statistics.");
          setRows([]);
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, fyId, returnPeriod, returnType, registration?.gst_id]);

  return (
    <TallyReportLayout
      title="Statistics"
      companyName={selectedCompany?.name || "Company"}
      leftSubtitle={
        <div className="flex gap-4">
          <span className="w-32">GST Registration</span>
          <span className="font-bold">: {registrationName}</span>
        </div>
      }
      rightSubtitle={<div>{periodLabelFor(month, year)}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Compiling statistics..." className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && !error && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead rowSpan={2} className="h-auto px-2 py-1 align-bottom font-bold text-black">
                  Type of Voucher
                </TableHead>
                <TableHead rowSpan={2} className="h-auto w-28 px-2 py-1 text-right align-bottom font-bold text-black">
                  Total Vouchers
                </TableHead>
                <TableHead colSpan={2} className="h-auto px-2 py-1 text-center font-bold text-black border-l border-gray-200">
                  Included in Return
                </TableHead>
                <TableHead rowSpan={2} className="h-auto w-32 px-2 py-1 text-right align-bottom font-bold text-black border-l border-gray-200">
                  Not Relevant<br />for This Return
                </TableHead>
                <TableHead rowSpan={2} className="h-auto w-32 px-2 py-1 text-right align-bottom font-bold text-[#ff8c00] border-l border-gray-200">
                  Uncertain<br />Transactions
                </TableHead>
              </TableRow>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className="h-auto w-28 px-2 py-1 text-right align-bottom font-bold text-[#ff8c00] border-l border-gray-200">
                  Action<br />Pending
                </TableHead>
                <TableHead className="h-auto w-28 px-2 py-1 text-right align-bottom font-bold text-black">
                  No Action<br />Required
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState message="No transactions in this period." />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.voucher_type}
                    className="border-0 cursor-pointer hover:bg-[#e6f2ff]"
                    onClick={() =>
                      navigate("/master/statutory/gst/voucher-register", {
                        state: {
                          registration,
                          month,
                          year,
                          returnType,
                          bucket: "all",
                          voucherType: row.voucher_type,
                          subtitle: row.voucher_type,
                        },
                      })
                    }
                  >
                    <TableCell className="px-2 py-0.5 pl-4">{row.voucher_type}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{num(row.total)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right text-[#ff8c00]">{num(row.included_pending)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{num(row.included_ok)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{num(row.not_relevant)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right text-[#ff8c00]">{num(row.uncertain)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>

            {totals && (
              <TableFooter className="bg-transparent">
                <TableRow className="border-t border-gray-300 hover:bg-transparent font-bold">
                  <TableCell className="px-2 py-1 pl-4">Total</TableCell>
                  <TableCell className="px-2 py-1 text-right">{num(totals.total)}</TableCell>
                  <TableCell className="px-2 py-1 text-right text-[#ff8c00]">{num(totals.included_pending)}</TableCell>
                  <TableCell className="px-2 py-1 text-right">{num(totals.included_ok)}</TableCell>
                  <TableCell className="px-2 py-1 text-right">{num(totals.not_relevant)}</TableCell>
                  <TableCell className="px-2 py-1 text-right text-[#ff8c00]">{num(totals.uncertain)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        )}
      </div>
    </TallyReportLayout>
  );
}
