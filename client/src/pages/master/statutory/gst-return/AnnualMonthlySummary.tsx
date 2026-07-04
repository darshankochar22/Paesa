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

const MONTHS_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const amt = (n: number) => (n ? n.toFixed(2) : "");

interface MonthRow {
  period?: string; // MMYYYY (monthly view)
  label: string;
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  cess: number;
  tax: number;
}

function monthLabelFor(period: string) {
  const m = Number(period.substring(0, 2));
  const y = Number(period.substring(2, 6));
  const lastDay = new Date(y, m, 0).getDate();
  const yy = String(y).slice(-2);
  return `1-${MONTHS_ABBR[m - 1]}-${yy} to ${lastDay}-${MONTHS_ABBR[m - 1]}-${yy}`;
}

// Annual Computation monthly drill: April..March for one category. Clicking a month
// opens the intra/interstate × registered/unregistered breakup for not-payable
// categories (as in Tally) or the voucher register directly for the rest.
export default function AnnualMonthlySummary() {
  const { selectedCompany, activeFY } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const registration = location.state?.registration;
  const category = location.state?.category || "";
  const label = location.state?.label || "";

  const registrationName = registration?.state_id
    ? `${registration.state_id} Registration`
    : registration?.name || " All Registrations";
  const fyText = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MonthRow[]>([]);
  // Month drilled into for the intra/interstate breakup step (not-payable categories).
  const [breakupMonth, setBreakupMonth] = useState<string | null>(null);
  const [breakupRows, setBreakupRows] = useState<MonthRow[]>([]);

  useEffect(() => {
    async function load() {
      if (!companyId || !fyId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await window.api.gst.getAnnualMonthly({
          company_id: companyId,
          fy_id: fyId,
          gst_registration_id: registration?.gst_id ?? null,
          category,
          month: breakupMonth ?? undefined,
        });
        if (res.success) {
          if (breakupMonth) setBreakupRows((res.rows as MonthRow[]) || []);
          else setRows((res.rows as MonthRow[]) || []);
        } else {
          setError(res.error || "Failed to load monthly summary.");
        }
      } catch (e: any) {
        setError(e.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, fyId, category, registration?.gst_id, breakupMonth]);

  const openRegister = (period: string) => {
    navigate("/master/statutory/gst/voucher-register", {
      state: {
        registration,
        month: period.substring(0, 2),
        year: period.substring(2, 6),
        returnType: "ANNUAL",
        annual: false, // register scoped to the clicked month
        bucket: "included",
        annualCategory: category,
        columns: "tax",
        subtitle: label,
      },
    });
  };

  const onMonthClick = (row: MonthRow) => {
    if (!row.period) return;
    // Tally inserts an intra/interstate × registered/unregistered step for the
    // tax-not-payable categories; other categories go straight to the register.
    if (category.startsWith("not_payable.")) setBreakupMonth(row.period);
    else openRegister(row.period);
  };

  const active = breakupMonth ? breakupRows : rows;
  const totals = active.reduce(
    (acc, r) => ({
      txval: acc.txval + r.txval,
      iamt: acc.iamt + r.iamt,
      camt: acc.camt + r.camt,
      samt: acc.samt + r.samt,
      cess: acc.cess + r.cess,
      tax: acc.tax + r.tax,
    }),
    { txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0, tax: 0 }
  );

  return (
    <TallyReportLayout
      title={breakupMonth ? "Annual Computation - Summary" : "Annual Computation - Monthly Summary"}
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
      rightSubtitle={<div>{breakupMonth ? monthLabelFor(breakupMonth) : fyText}</div>}
      footerControls={
        breakupMonth ? (
          <div className="flex items-center gap-4 ml-4">
            <Button
              onClick={() => setBreakupMonth(null)}
              variant="ghost"
              size="xs"
              className="h-auto p-0 font-bold text-black-900 hover:underline hover:bg-transparent"
            >
              Esc: Back to Months
            </Button>
            <Button
              onClick={() => openRegister(breakupMonth)}
              variant="ghost"
              size="xs"
              className="h-auto p-0 font-bold text-black-900 hover:underline hover:bg-transparent"
            >
              F5: Voucher-wise
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading..." className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && !error && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">P a r t i c u l a r s</TableHead>
                <TableHead className="h-auto w-28 px-2 py-1 text-right align-bottom font-bold text-black">Taxable<br />Amount</TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">IGST</TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">CGST</TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">SGST/<br />UTGST</TableHead>
                <TableHead className="h-auto w-20 px-2 py-1 text-right align-bottom font-bold text-black">Cess</TableHead>
                <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">Tax<br />Amount</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {active.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState message="No data for this category." />
                  </TableCell>
                </TableRow>
              ) : (
                active.map((row) => {
                  const hasData = row.txval !== 0 || row.tax !== 0;
                  return (
                    <TableRow
                      key={row.period || row.label}
                      onClick={() => !breakupMonth && onMonthClick(row)}
                      className={cn(
                        "border-0 hover:bg-[#e6f2ff]",
                        !breakupMonth && "cursor-pointer",
                        hasData ? "text-black" : "text-gray-500"
                      )}
                    >
                      <TableCell className="px-2 py-0.5 pl-4">{row.label}</TableCell>
                      <TableCell className="px-2 py-0.5 text-right">{amt(row.txval)}</TableCell>
                      <TableCell className="px-2 py-0.5 text-right">{amt(row.iamt)}</TableCell>
                      <TableCell className="px-2 py-0.5 text-right">{amt(row.camt)}</TableCell>
                      <TableCell className="px-2 py-0.5 text-right">{amt(row.samt)}</TableCell>
                      <TableCell className="px-2 py-0.5 text-right">{amt(row.cess)}</TableCell>
                      <TableCell className="px-2 py-0.5 text-right">{amt(row.tax)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>

            {active.length > 0 && (
              <TableFooter className="bg-transparent">
                <TableRow className="border-t border-gray-300 hover:bg-transparent font-bold">
                  <TableCell className="px-2 py-1">Total</TableCell>
                  <TableCell className="px-2 py-1 text-right">{amt(totals.txval)}</TableCell>
                  <TableCell className="px-2 py-1 text-right">{amt(totals.iamt)}</TableCell>
                  <TableCell className="px-2 py-1 text-right">{amt(totals.camt)}</TableCell>
                  <TableCell className="px-2 py-1 text-right">{amt(totals.samt)}</TableCell>
                  <TableCell className="px-2 py-1 text-right">{amt(totals.cess)}</TableCell>
                  <TableCell className="px-2 py-1 text-right">{amt(totals.tax)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        )}
      </div>
    </TallyReportLayout>
  );
}
