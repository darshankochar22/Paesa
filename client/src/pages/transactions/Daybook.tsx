import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";
import { PageTitleBar, AlertBanner, RightActionPanel } from "../../components/ui";
import { PageFooterBar } from "./ui";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/shadcn/table";
import { EmptyState } from "@/components/blocks/EmptyState";
import { cn } from "@/lib/utils";

const todayISO = () => new Date().toISOString().split("T")[0];

interface VoucherRow {
  voucher_id: number;
  voucher_type: string;
  voucher_number: string;
  date: string;
  narration: string | null;
  party_name: string | null;
  is_cancelled: number;
  debit_amount: number;
  credit_amount: number;
  inwards_qty: number;
  outwards_qty: number;
}

const formatDate = (d: string) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
};

const formatAmount = (n: number) => {
  if (!n) return "";
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function Daybook() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedIndex, setSelectedIndex] = useState(0);

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const fetchDaybook = useCallback(async () => {
    if (!companyId || !fyId || !selectedDate) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await window.api.voucher.getDaybook(companyId, fyId, selectedDate, selectedDate);
      if (res.success) {
        setVouchers(res.vouchers || []);
        setSelectedIndex(0);
      } else {
        setError(res.error || "Failed to fetch daybook");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId, selectedDate]);

  useEffect(() => { fetchDaybook(); }, [fetchDaybook]);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        navigate("/transactions/vouchers");
      }
      if (e.altKey && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        navigate("/transactions/voucher-list");
      }
      if (e.altKey && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        navigate("/utilities/banking");
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, vouchers.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      }
      if (e.key === "Enter" && vouchers.length > 0) {
        e.preventDefault();
        navigate(`/transactions/voucher/${vouchers[selectedIndex].voucher_id}`);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/");
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [navigate, selectedIndex, vouchers]);

  const daybookActions = [
    { key: "Alt+C", label: "New Voucher", onClick: () => navigate("/transactions/vouchers") },
    { key: "Alt+V", label: "Voucher Reg", onClick: () => navigate("/transactions/voucher-list") },
    { key: "Alt+B", label: "Banking", onClick: () => navigate("/utilities/banking") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/") },
  ];

  const handleRowClick = (idx: number) => {
    setSelectedIndex(idx);
    navigate(`/transactions/voucher/${vouchers[idx].voucher_id}`);
  };

  return (
    <div className="flex-1 flex flex-col bg-white h-full text-xs select-none">
      <PageTitleBar
        title="Day Book"
        subtitle={selectedCompany?.name}
      />

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          {/* Date picker bar */}
          <div className="flex items-center gap-3 px-3 py-2 border-b border-zinc-200 bg-zinc-50 shrink-0">
            <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">Date</span>
            <Input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="text-xs w-auto h-7 px-2 py-1 rounded border-zinc-300 bg-white focus-visible:ring-0 focus-visible:border-zinc-900"
            />
            <Button
              variant="link"
              size="xs"
              onClick={() => setSelectedDate(todayISO())}
              className="h-auto p-0 text-[10px] text-zinc-500 hover:text-zinc-900 underline"
            >
              Today
            </Button>
            <span className="text-[10px] text-zinc-400 ml-auto">
              {vouchers.length} transaction{vouchers.length !== 1 ? "s" : ""} on {formatDate(selectedDate)}
            </span>
          </div>

          {error && (
            <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />
          )}

          {/* Tally-style table */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading && (
              <EmptyState message="Loading…" className="py-8 italic text-xs" />
            )}

            {!loading && vouchers.length === 0 && (
              <EmptyState message="No vouchers found for this date." className="py-8 italic text-xs" />
            )}

            {!loading && vouchers.length > 0 && (
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-zinc-300 hover:bg-transparent">
                    <TableHead className="text-left text-[11px] font-bold text-zinc-700 px-3 py-1.5 h-auto w-[10%]">Date</TableHead>
                    <TableHead className="text-left text-[11px] font-bold text-zinc-700 px-3 py-1.5 h-auto w-[35%]">Particulars</TableHead>
                    <TableHead className="text-right text-[11px] font-bold text-zinc-700 px-3 py-1.5 h-auto w-[15%]">Vch Type</TableHead>
                    <TableHead className="text-right text-[11px] font-bold text-zinc-700 px-3 py-1.5 h-auto w-[10%]">Vch No.</TableHead>
                    <TableHead className="text-right text-[11px] font-bold text-zinc-700 px-3 py-1.5 h-auto w-[15%]">Debit Amount</TableHead>
                    <TableHead className="text-right text-[11px] font-bold text-zinc-700 px-3 py-1.5 h-auto w-[15%]">Credit Amount</TableHead>
                  </TableRow>
                  <TableRow className="border-b border-zinc-300 hover:bg-transparent">
                    <TableHead className="px-3 py-0.5 h-auto"></TableHead>
                    <TableHead className="px-3 py-0.5 h-auto"></TableHead>
                    <TableHead className="px-3 py-0.5 h-auto"></TableHead>
                    <TableHead className="px-3 py-0.5 h-auto"></TableHead>
                    <TableHead className="text-right text-[10px] font-bold text-zinc-500 px-3 py-0.5 h-auto">Inwards Qty</TableHead>
                    <TableHead className="text-right text-[10px] font-bold text-zinc-500 px-3 py-0.5 h-auto">Outwards Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vouchers.map((v, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <TableRow
                        key={v.voucher_id}
                        onClick={() => handleRowClick(idx)}
                        data-state={isSelected ? "selected" : undefined}
                        className={cn(
                          "border-b border-zinc-100 cursor-pointer transition-colors",
                          isSelected ? "bg-zinc-100 data-[state=selected]:bg-zinc-100" : "hover:bg-zinc-50",
                          v.is_cancelled ? "opacity-50" : ""
                        )}
                      >
                        <TableCell className="px-3 py-1.5 text-zinc-800 text-[12px]">{formatDate(v.date)}</TableCell>
                        <TableCell className="px-3 py-1.5 font-bold text-zinc-900 text-[12px]">{v.party_name || v.narration || "—"}</TableCell>
                        <TableCell className={cn("px-3 py-1.5 text-right text-[12px]", idx === 0 ? "font-bold text-zinc-900" : "text-zinc-700")}>{v.voucher_type}</TableCell>
                        <TableCell className="px-3 py-1.5 text-right text-zinc-700 text-[12px]">{v.voucher_number || "—"}</TableCell>
                        <TableCell className={cn("px-3 py-1.5 text-right text-[12px]", v.debit_amount ? "font-bold text-zinc-900" : "text-zinc-400")}>
                          {v.debit_amount ? formatAmount(v.debit_amount) : ""}
                        </TableCell>
                        <TableCell className="px-3 py-1.5 text-right text-[12px] text-zinc-700">
                          {v.credit_amount ? formatAmount(v.credit_amount) : ""}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <RightActionPanel actions={daybookActions} />
      </div>

      <PageFooterBar
        countLabel={`${vouchers.length} voucher${vouchers.length !== 1 ? "s" : ""} on ${formatDate(selectedDate)}`}
        onBack={() => navigate("/")}
      />
    </div>
  );
}
