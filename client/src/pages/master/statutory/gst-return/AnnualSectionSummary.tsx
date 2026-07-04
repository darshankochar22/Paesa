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
import { cn } from "@/lib/utils";

const amt = (n: number) => (n ? n.toFixed(2) : "");

interface SectionRow {
  key: string;
  label: string;
  has_children: boolean;
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  cess: number;
  tax: number;
}

// One level of the Annual Computation (GSTR-9) drill tree: a Particulars row opens
// its category breakdown; categories with children go one level deeper; leaves open
// the monthly summary. Amounts are real FY sums from the shared classifier.
export default function AnnualSectionSummary() {
  const { selectedCompany, activeFY } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const registration = location.state?.registration;
  const path = location.state?.path || "payable";
  const fallbackLabel = location.state?.label || "";

  const registrationName = registration?.state_id
    ? `${registration.state_id} Registration`
    : registration?.name || " All Registrations";
  const periodText = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState<string>(fallbackLabel);
  const [rows, setRows] = useState<SectionRow[]>([]);

  useEffect(() => {
    async function load() {
      if (!companyId || !fyId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await window.api.gst.getAnnualSectionBreakdown({
          company_id: companyId,
          fy_id: fyId,
          gst_registration_id: registration?.gst_id ?? null,
          path,
        });
        if (res.success) {
          setRows((res.rows as SectionRow[]) || []);
          setLabel(res.label || fallbackLabel);
        } else {
          setError(res.error || "Failed to load section breakdown.");
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
  }, [companyId, fyId, path, registration?.gst_id]);

  const openRow = (row: SectionRow) => {
    if (row.has_children) {
      navigate("/master/statutory/gst/annual-section", {
        state: { registration, path: row.key, label: row.label },
      });
    } else {
      navigate("/master/statutory/gst/annual-monthly", {
        state: { registration, category: row.key, label: row.label },
      });
    }
  };

  const totals = rows.reduce(
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
      title="Annual Computation - Summary"
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
      rightSubtitle={<div>{periodText}</div>}
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading breakdown..." className="italic" />}
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
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState message="No categories in this section." />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const hasData = row.txval !== 0 || row.tax !== 0;
                  return (
                    <TableRow
                      key={row.key}
                      onClick={() => openRow(row)}
                      className={cn(
                        "border-0 cursor-pointer hover:bg-[#e6f2ff]",
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

            {rows.length > 0 && (
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
