import { useState, useEffect } from "react";
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

interface ChallanRow {
  date: string;
  particulars: string;
  vch_type: string;
  vch_no: string;
  type_of_tax_payment: string;
  payment_period_from: string;
  payment_period_to: string;
  type_of_payment: string;
  mode_of_payment: string;
  bank_name: string;
  cpin: string;
  cin: string;
  brn_utr: string;
  instrument_number: string;
  instrument_date: string;
  payment_date: string;
  amount: number;
}

function fmt(n: number) {
  return n ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
}

const CELL = "px-2 py-0.5 text-xs text-black border-r border-gray-200 whitespace-nowrap";
const CELL_NUM = "px-2 py-0.5 text-xs text-black text-right border-r border-gray-200 whitespace-nowrap tabular-nums";
const HEAD = "h-auto px-2 py-1 font-bold text-black text-xs border-r border-gray-200 whitespace-nowrap";

export default function ChallanReconciliation() {
  const { selectedCompany, activeFY } = useCompany();

  const companyId = selectedCompany?.company_id;
  const fyId      = activeFY?.fy_id;

  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [challans, setChallans]       = useState<ChallanRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [periodLabel, setPeriodLabel] = useState("");

  const loadData = async () => {
    if (!companyId || !fyId) return;

    try {
      setLoading(true);
      setError(null);
      const result = await window.api.gst.getChallanReconciliation({ company_id: companyId, fy_id: fyId });
      if (result.success) {
        setChallans(result.payload.challans || []);
        setPeriodLabel(result.payload.period_label || "");
      } else {
        setError(result.error || "Failed to load Challan reconciliation data.");
      }
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [companyId, fyId]);

  const grandTotalAmount = challans.reduce((sum, c) => sum + (c.amount || 0), 0);
  const subtitlePeriod = periodLabel || (activeFY ? `For 1-Apr-${new Date(activeFY.start_date).getFullYear()}` : "");

  return (
    <TallyReportLayout
      title="GST Challan Reconciliation"
      companyName={selectedCompany?.name || "Company"}
      leftSubtitle={
        <div className="flex gap-4">
          <span className="text-zinc-600 italic font-semibold">(Reconciliation)</span>
        </div>
      }
      rightSubtitle={
        <div>{subtitlePeriod}</div>
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
        {loading && <EmptyState message="Loading Challan reconciliation data…" className="italic" />}
        {error   && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && (
          <div className="overflow-x-auto w-full border border-gray-300 rounded-sm">
            <Table className="text-xs table-auto min-w-[1500px]">
              <TableHeader className="bg-gray-50">
                <TableRow className="border-b border-gray-300 hover:bg-transparent">
                  <TableHead rowSpan={2} className={cn(HEAD, "align-bottom")}>Date</TableHead>
                  <TableHead rowSpan={2} className={cn(HEAD, "align-bottom")}>Particulars</TableHead>
                  <TableHead rowSpan={2} className={cn(HEAD, "align-bottom")}>Vch Type</TableHead>
                  <TableHead rowSpan={2} className={cn(HEAD, "align-bottom")}>Vch No.</TableHead>
                  <TableHead rowSpan={2} className={cn(HEAD, "align-bottom")}>Type of Tax Payment</TableHead>
                  <TableHead colSpan={2} className="h-auto px-2 py-0.5 text-center font-bold text-black text-xs border-r border-b border-gray-200">Payment Period</TableHead>
                  <TableHead rowSpan={2} className={cn(HEAD, "align-bottom")}>Type of Payment</TableHead>
                  <TableHead rowSpan={2} className={cn(HEAD, "align-bottom")}>Mode of payment</TableHead>
                  <TableHead rowSpan={2} className={cn(HEAD, "align-bottom")}>Bank Name</TableHead>
                  <TableHead rowSpan={2} className={cn(HEAD, "align-bottom")}>Common Portal Identification Number(CPIN)</TableHead>
                  <TableHead rowSpan={2} className={cn(HEAD, "align-bottom")}>Challan Identification Number(CIN)</TableHead>
                  <TableHead rowSpan={2} className={cn(HEAD, "align-bottom")}>BRN/UTR</TableHead>
                  <TableHead rowSpan={2} className={cn(HEAD, "align-bottom")}>Instrument Number</TableHead>
                  <TableHead rowSpan={2} className={cn(HEAD, "align-bottom")}>Instrument Date</TableHead>
                  <TableHead rowSpan={2} className={cn(HEAD, "align-bottom")}>Payment Date</TableHead>
                  <TableHead rowSpan={2} className={cn(HEAD, "text-right align-bottom border-r-0")}>Amount</TableHead>
                </TableRow>
                <TableRow className="border-b border-gray-300 hover:bg-transparent">
                  <TableHead className="h-auto px-2 py-0.5 text-center font-bold text-black text-xs border-r border-gray-200">From</TableHead>
                  <TableHead className="h-auto px-2 py-0.5 text-center font-bold text-black text-xs border-r border-gray-200">To</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {challans.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={17} className="text-center py-4 text-gray-400 italic">
                      No Challan payments found for this Financial Year.
                    </TableCell>
                  </TableRow>
                ) : (
                  challans.map((c, idx) => {
                    const isSelected = selectedRow === idx;
                    return (
                      <TableRow
                        key={idx}
                        onClick={() => setSelectedRow(idx)}
                        className={cn(
                          "border-b border-gray-100 cursor-pointer hover:bg-[#e6f2ff]",
                          isSelected ? "bg-[#ffcc00] hover:bg-[#ffcc00]" : "bg-white"
                        )}
                      >
                        <TableCell className={CELL}>{c.date}</TableCell>
                        <TableCell className={CELL}>{c.particulars}</TableCell>
                        <TableCell className={CELL}>{c.vch_type}</TableCell>
                        <TableCell className={CELL}>{c.vch_no}</TableCell>
                        <TableCell className={CELL}>{c.type_of_tax_payment}</TableCell>
                        <TableCell className={CELL}>{c.payment_period_from}</TableCell>
                        <TableCell className={CELL}>{c.payment_period_to}</TableCell>
                        <TableCell className={CELL}>{c.type_of_payment}</TableCell>
                        <TableCell className={CELL}>{c.mode_of_payment}</TableCell>
                        <TableCell className={CELL}>{c.bank_name}</TableCell>
                        <TableCell className={CELL}>{c.cpin}</TableCell>
                        <TableCell className={CELL}>{c.cin}</TableCell>
                        <TableCell className={CELL}>{c.brn_utr}</TableCell>
                        <TableCell className={CELL}>{c.instrument_number}</TableCell>
                        <TableCell className={CELL}>{c.instrument_date}</TableCell>
                        <TableCell className={CELL}>{c.payment_date}</TableCell>
                        <TableCell className={cn(CELL_NUM, "border-r-0")}>{fmt(c.amount)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>

              <TableFooter className="bg-transparent border-t border-gray-300">
                <TableRow className="hover:bg-transparent font-bold">
                  <TableCell colSpan={16} className="px-2 py-1 font-bold text-black border-r border-gray-200">Total</TableCell>
                  <TableCell className="px-2 py-1 text-right font-bold text-black tabular-nums">{fmt(grandTotalAmount)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </div>
    </TallyReportLayout>
  );
}
