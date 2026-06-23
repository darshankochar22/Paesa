import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

// ── types ─────────────────────────────────────────────────────────────────

interface GroupRow {
  group_id: number;
  group_name: string;
  nature?: string;
  balance: number;
  ledgers: { ledger_id: number; ledger_name: string; balance: number }[];
  childGroups: GroupRow[];
}

interface PLData {
  income:        GroupRow[];
  expenses:      GroupRow[];
  totalIncome:   number;
  totalExpenses: number;
  netProfit:     number;
  isProfit:      boolean;
  openingStock:  number;
  closingStock:  number;
}

// ── formatter (same as BalanceSheetLayout) ────────────────────────────────

const fmt = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(val));

// ── group rows ────────────────────────────────────────────────────────────

interface GroupRowsProps {
  groups: GroupRow[];
  focusedId: string | null;
  onFocus: (key: string, group: GroupRow) => void;
  onOpenGroup: (group: GroupRow) => void;
  side: "L" | "R";  // L = Expenses (left), R = Income (right)
}

function GroupRows({ groups, focusedId, onFocus, onOpenGroup, side }: GroupRowsProps) {
  return (
    <>
      {groups.map((group) => {
        const key = `${side}-g-${group.group_id}`;
        const isFocused = focusedId === key;

        return (
          <tr
            key={key}
            className={`border-b border-zinc-100 cursor-pointer transition-colors select-none ${
              isFocused
                ? "bg-[#ffcc00] text-zinc-950 font-bold"
                : "hover:bg-zinc-50 text-zinc-800 font-semibold"
            }`}
            onClick={() => onFocus(key, group)}
            onDoubleClick={() => onOpenGroup(group)}
          >
            <td className="px-3 py-1.5 text-left">{group.group_name}</td>
            <td className="px-3 py-1.5 text-right whitespace-nowrap w-36 font-mono">
              ₹{fmt(group.balance)}
            </td>
          </tr>
        );
      })}
    </>
  );
}

// ── static info row (for Opening Stock, Closing Stock, Net Profit/Loss) ──

interface InfoRowProps {
  label: string;
  value: number;
  italic?: boolean;
  bold?: boolean;
}

function InfoRow({ label, value, italic, bold }: InfoRowProps) {
  return (
    <tr className={`border-b border-zinc-100 select-none ${bold ? "font-bold text-zinc-900" : "text-zinc-700"} ${italic ? "italic" : ""}`}>
      <td className="px-3 py-1.5 text-left text-[11px]">{label}</td>
      <td className="px-3 py-1.5 text-right whitespace-nowrap w-36 font-mono text-[11px]">
        {value !== 0 ? `₹${fmt(value)}` : ""}
      </td>
    </tr>
  );
}

// ── panel (identical structure to BalanceSheetLayout Panel) ───────────────

interface PanelProps {
  title: string;
  children: React.ReactNode;
  total: number;
  totalLabel: string;
  periodLabel: string;
}

function Panel({ title, children, total, totalLabel, periodLabel }: PanelProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden border-r border-zinc-300 last:border-r-0">
      <div className="bg-[#e5eff5] border-b border-zinc-200 px-3 py-1 flex justify-between items-center select-none">
        <span className="font-mono text-[11px] font-bold text-zinc-800 tracking-wide uppercase">
          {title}
        </span>
        <span className="font-mono text-[10px] text-zinc-500">{periodLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse font-mono text-[11px]">
          <tbody>
            {children}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-double border-zinc-400 bg-[#e5eff5] px-3 py-1.5 flex justify-between font-mono text-[11px] font-bold text-zinc-900 select-none">
        <span>{totalLabel}</span>
        <span>₹{fmt(total)}</span>
      </div>
    </div>
  );
}

// ── main layout ───────────────────────────────────────────────────────────

export function ProfitLossLayout() {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();

  const [data, setData] = React.useState<PLData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [focusedId, setFocusedId] = React.useState<string | null>(null);
  const focusedGroupRef = React.useRef<GroupRow | null>(null);

  React.useEffect(() => {
    if (!selectedCompany?.company_id || !activeFY?.fy_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    (window as any).api.report
      .profitLoss(selectedCompany.company_id, activeFY.fy_id)
      .then((res: any) => {
        if (res?.success) setData(res);
        else setError(res?.error || "Failed to load.");
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedCompany?.company_id, activeFY?.fy_id]);

  const openGroup = React.useCallback(
    (group: GroupRow) => {
      navigate(`/reports/accounts/group-summary/${group.group_id}`);
    },
    [navigate]
  );

  const handleFocus = React.useCallback((key: string, group: GroupRow) => {
    setFocusedId(key);
    focusedGroupRef.current = group;
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!focusedGroupRef.current) return;
      if (e.key === "Enter") {
        e.preventDefault();
        openGroup(focusedGroupRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openGroup]);

  // Period label matches BalanceSheetLayout exactly
  const periodLabel = activeFY
    ? `${activeFY.start_date} to ${activeFY.end_date}`
    : "";

  // ── grand total for both sides (must match) ───────────────────────────
  // Tally's P&L: both sides show the same grand total.
  // Left (Expenses) side total  = totalExpenses + openingStock + netProfit (if loss)
  // Right (Income) side total   = totalIncome   + closingStock + netProfit (if profit)
  // Grand total = max of both sides (they're equal after Net Profit/Loss balancing row)

  const grandTotal = data
    ? Math.max(
        data.totalExpenses + data.openingStock + (!data.isProfit ? Math.abs(data.netProfit) : 0),
        data.totalIncome   + data.closingStock + ( data.isProfit ? Math.abs(data.netProfit) : 0)
      )
    : 0;

  // ── loading / error states ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs">
        Loading Profit &amp; Loss...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500 font-mono text-xs px-8 text-center">
        {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs">
        No data available.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white font-mono">
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL: Expenses ── */}
        <Panel
          title="Particulars"
          total={grandTotal}
          totalLabel="Total"
          periodLabel={periodLabel}
        >
          {/* Opening Stock */}
          {data.openingStock !== 0 && (
            <InfoRow label="Opening Stock" value={data.openingStock} />
          )}

          {/* Expense groups */}
          <GroupRows
            groups={data.expenses}
            focusedId={focusedId}
            onFocus={handleFocus}
            onOpenGroup={openGroup}
            side="L"
          />

          {/* Closing Stock — shown on expense side as a deduction in Tally */}
          {data.closingStock !== 0 && (
            <InfoRow label="Closing Stock" value={data.closingStock} />
          )}

          {/* Net Profit goes on Expenses side if it IS a profit */}
          {data.isProfit && data.netProfit !== 0 && (
            <InfoRow
              label="Net Profit"
              value={data.netProfit}
              bold
            />
          )}

          {/* Net Loss label on expenses side when it's a loss */}
          {!data.isProfit && data.netProfit !== 0 && (
            <InfoRow
              label="Net Loss"
              value={Math.abs(data.netProfit)}
              bold
              italic
            />
          )}
        </Panel>

        {/* ── RIGHT PANEL: Income ── */}
        <Panel
          title="Particulars"
          total={grandTotal}
          totalLabel="Total"
          periodLabel={periodLabel}
        >
          {/* Income groups */}
          <GroupRows
            groups={data.income}
            focusedId={focusedId}
            onFocus={handleFocus}
            onOpenGroup={openGroup}
            side="R"
          />

          {/* Closing Stock on income side */}
          {data.closingStock !== 0 && (
            <InfoRow label="Closing Stock" value={data.closingStock} />
          )}

          {/* Net Loss goes on Income side if it IS a loss */}
          {!data.isProfit && data.netProfit !== 0 && (
            <InfoRow
              label="Net Loss"
              value={Math.abs(data.netProfit)}
              bold
              italic
            />
          )}

          {/* Net Profit label on income side when it's a profit */}
          {data.isProfit && data.netProfit !== 0 && (
            <InfoRow
              label="Net Profit"
              value={data.netProfit}
              bold
            />
          )}
        </Panel>

      </div>
    </div>
  );
}