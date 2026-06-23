import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

interface LedgerRow {
  ledger_id: number;
  ledger_name: string;
  balance: number;
}

interface GroupRow {
  group_id: number;
  group_name: string;
  balance: number;
  ledgers: LedgerRow[];
  childGroups: GroupRow[];
}

interface PnLData {
  openingStock: number;
  purchaseAccounts: GroupRow[];
  totalPurchase: number;
  directExpenses: GroupRow[];
  totalDirectExpenses: number;
  salesAccounts: GroupRow[];
  totalSales: number;
  directIncomes: GroupRow[];
  totalDirectIncomes: number;
  closingStock: number;
  grossProfit: number;
  indirectExpenses: GroupRow[];
  totalIndirectExpenses: number;
  indirectIncomes: GroupRow[];
  totalIndirectIncomes: number;
  netProfit: number;
}

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function normalizeLedger(raw: any): LedgerRow {
  return {
    ledger_id: toNum(raw?.ledger_id),
    ledger_name: raw?.ledger_name ?? "Unnamed Ledger",
    balance: toNum(raw?.balance),
  };
}

function normalizeGroup(raw: any): GroupRow {
  return {
    group_id: toNum(raw?.group_id),
    group_name: raw?.group_name ?? "Unnamed Group",
    balance: toNum(raw?.balance),
    ledgers: Array.isArray(raw?.ledgers) ? raw.ledgers.map(normalizeLedger) : [],
    childGroups: Array.isArray(raw?.childGroups) ? raw.childGroups.map(normalizeGroup) : [],
  };
}

function normalizeGroupList(raw: any): GroupRow[] {
  return Array.isArray(raw) ? raw.map(normalizeGroup) : [];
}

function normalizePnL(raw: any): PnLData {
  const data: PnLData = {
    openingStock: toNum(raw?.openingStock),
    purchaseAccounts: normalizeGroupList(raw?.purchaseAccounts),
    totalPurchase: toNum(raw?.totalPurchase),
    directExpenses: normalizeGroupList(raw?.directExpenses),
    totalDirectExpenses: toNum(raw?.totalDirectExpenses),
    salesAccounts: normalizeGroupList(raw?.salesAccounts),
    totalSales: toNum(raw?.totalSales),
    directIncomes: normalizeGroupList(raw?.directIncomes),
    totalDirectIncomes: toNum(raw?.totalDirectIncomes),
    closingStock: toNum(raw?.closingStock),
    grossProfit: toNum(raw?.grossProfit),
    indirectExpenses: normalizeGroupList(raw?.indirectExpenses),
    totalIndirectExpenses: toNum(raw?.totalIndirectExpenses),
    indirectIncomes: normalizeGroupList(raw?.indirectIncomes),
    totalIndirectIncomes: toNum(raw?.totalIndirectIncomes),
    netProfit: toNum(raw?.netProfit),
  };

  const creditSide = data.totalSales + data.totalDirectIncomes + data.closingStock;
  const debitSide = data.openingStock + data.totalPurchase + data.totalDirectExpenses;
  data.grossProfit = creditSide - debitSide;
  data.netProfit = data.grossProfit + data.totalIndirectIncomes - data.totalIndirectExpenses;

  return data;
}

const fmt = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(toNum(val)));

interface BoundaryState {
  error: Error | null;
}

class ReportErrorBoundary extends React.Component<{ children: React.ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };
  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Profit & Loss report crashed:", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex items-center justify-center text-red-600 text-xs font-mono">
          <div>
            <div className="font-bold">Profit & Loss report failed to render</div>
            <div>{this.state.error.message}</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface TRowProps {
  label: string;
  amount: number | null;
  isFocused?: boolean;
  isTotal?: boolean;
  isSubItem?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  showZero?: boolean;
}

function TRow({
  label,
  amount,
  isFocused = false,
  isTotal = false,
  isSubItem = false,
  onClick,
  onDoubleClick,
  showZero = false,
}: TRowProps) {
  const amountDisplay =
    amount === null || amount === undefined
      ? ""
      : amount === 0 && !showZero
      ? ""
      : fmt(amount);

  return (
    <tr
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={[
        "border-b border-transparent select-none",
        onClick ? "cursor-pointer" : "",
        isFocused ? "bg-[#f6c744] text-zinc-950" : "",
        isTotal ? "font-semibold" : "",
      ].join(" ")}
    >
      <td
        className={[
          "py-[3px] text-left text-[14px]",
          isSubItem ? "pl-6 pr-2 italic text-zinc-600" : "px-2",
          isTotal ? "font-semibold" : "font-normal",
        ].join(" ")}
      >
        {label}
      </td>
      <td className="py-[3px] text-right whitespace-nowrap w-40 font-mono text-[14px] pr-2">
        {amountDisplay}
      </td>
    </tr>
  );
}

function GroupSection({
  group,
  focusedId,
  onFocus,
  onDrillGroup,
  prefix,
}: {
  group: GroupRow;
  focusedId: string | null;
  onFocus: (key: string) => void;
  onDrillGroup: (group: GroupRow) => void;
  prefix: string;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const key = `${prefix}-g-${group.group_id}`;
  const isFocused = focusedId === key;

  return (
    <>
      <TRow
        label={group.group_name}
        amount={group.balance}
        isFocused={isFocused}
        onClick={() => {
          onFocus(key);
          setExpanded((e) => !e);
        }}
        onDoubleClick={() => onDrillGroup(group)}
      />
      {expanded &&
        group.ledgers.map((l) => {
          const lKey = `${prefix}-l-${l.ledger_id}`;
          return (
            <TRow
              key={lKey}
              label={l.ledger_name}
              amount={l.balance}
              isSubItem
              isFocused={focusedId === lKey}
              onClick={() => onFocus(lKey)}
            />
          );
        })}
      {expanded &&
        group.childGroups.map((cg) => (
          <GroupSection
            key={`${prefix}-cg-${cg.group_id}`}
            group={cg}
            focusedId={focusedId}
            onFocus={onFocus}
            onDrillGroup={onDrillGroup}
            prefix={`${prefix}-cg`}
          />
        ))}
    </>
  );
}

function hasTradingData(data: PnLData): boolean {
  return (
    data.openingStock !== 0 ||
    data.closingStock !== 0 ||
    data.purchaseAccounts.length > 0 ||
    data.directExpenses.length > 0 ||
    data.salesAccounts.length > 0 ||
    data.directIncomes.length > 0
  );
}

function ProfitLossLayoutInner() {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();

  const [data, setData] = React.useState<PnLData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedId, setFocusedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedCompany?.company_id || !activeFY?.fy_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const reportApi = (window as any)?.api?.report?.profitLoss;
    if (typeof reportApi !== "function") {
      setError("Report service is not available.");
      setLoading(false);
      return;
    }

    reportApi(selectedCompany.company_id, activeFY.fy_id)
      .then((res: any) => {
        if (res?.success) setData(normalizePnL(res));
        else setError(res?.error || "Failed to load Profit & Loss report.");
      })
      .catch((e: any) => setError(e?.message || "Unknown error"))
      .finally(() => setLoading(false));
  }, [selectedCompany?.company_id, activeFY?.fy_id]);

  const drillGroup = React.useCallback(
    (group: GroupRow) => navigate(`/reports/accounts/group-summary/${group.group_id}`),
    [navigate]
  );

  const focus = React.useCallback((key: string) => setFocusedId(key), []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs">
        Loading Profit & Loss…
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
  if (!selectedCompany?.company_id || !activeFY?.fy_id) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs px-8 text-center">
        Select a company and financial year to view the Profit & Loss report.
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

  const isGrossProfit = data.grossProfit >= 0;
  const isNetProfit = data.netProfit >= 0;
  const absGross = Math.abs(data.grossProfit);
  const absNet = Math.abs(data.netProfit);
  const showTrading = hasTradingData(data);

  const companyName =
    (selectedCompany as any)?.company_name ??
    (selectedCompany as any)?.name ??
    "Company";

  const periodLabel =
    activeFY?.start_date && activeFY?.end_date
      ? `${activeFY.start_date} to ${activeFY.end_date}`
      : "";

  const leftTotal = showTrading
    ? data.openingStock +
      data.totalPurchase +
      data.totalDirectExpenses +
      (!isGrossProfit ? absGross : 0) +
      data.totalIndirectExpenses +
      (isNetProfit ? absNet : 0)
    : data.totalIndirectExpenses + (isNetProfit ? absNet : 0);

  const rightTotal = showTrading
    ? data.totalSales +
      data.totalDirectIncomes +
      data.closingStock +
      (isGrossProfit ? absGross : 0) +
      data.totalIndirectIncomes +
      (!isNetProfit ? absNet : 0)
    : data.totalIndirectIncomes + (!isNetProfit ? absNet : 0);

  const grandTotal = Math.max(leftTotal, rightTotal);

  return (
    <div className="flex flex-col h-full w-full bg-white text-black overflow-hidden font-sans">
      <div className="h-6 bg-[#b7d9f2] border-b border-zinc-300 flex items-center justify-center text-sm font-semibold">
        Profit & Loss A/c
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 border-r border-zinc-300 flex flex-col">
          <div className="flex justify-between px-4 py-2 border-b border-zinc-200">
            <div className="text-[18px] tracking-[0.25em] font-semibold">Particulars</div>
            <div className="text-right text-[12px] leading-tight">
              <div className="font-semibold">{companyName}</div>
              <div>{periodLabel}</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse">
              <tbody>
                {showTrading && (
                  <>
                    <TRow
                      label="Opening Stock"
                      amount={data.openingStock}
                      showZero
                      isFocused={focusedId === "opening-stock"}
                      onClick={() => focus("opening-stock")}
                    />
                    {data.purchaseAccounts.map((g) => (
                      <GroupSection
                        key={g.group_id}
                        group={g}
                        focusedId={focusedId}
                        onFocus={focus}
                        onDrillGroup={drillGroup}
                        prefix="pur"
                      />
                    ))}
                    {data.purchaseAccounts.length > 0 && (
                      <TRow label="Purchase Accounts" amount={data.totalPurchase} isTotal />
                    )}
                    {data.directExpenses.map((g) => (
                      <GroupSection
                        key={g.group_id}
                        group={g}
                        focusedId={focusedId}
                        onFocus={focus}
                        onDrillGroup={drillGroup}
                        prefix="dexp"
                      />
                    ))}
                    {data.directExpenses.length > 0 && (
                      <TRow label="Direct Expenses" amount={data.totalDirectExpenses} isTotal />
                    )}
                    {!isGrossProfit && (
                      <TRow
                        label="Gross Loss c/o"
                        amount={absGross}
                        isTotal
                        isFocused={focusedId === "gross-co"}
                        onClick={() => focus("gross-co")}
                      />
                    )}
                    {isGrossProfit && (
                      <TRow
                        label="Gross Profit c/o"
                        amount={absGross}
                        isTotal
                        isFocused={focusedId === "gross-co"}
                        onClick={() => focus("gross-co")}
                      />
                    )}
                  </>
                )}

                <TRow
                  label="Indirect Expenses"
                  amount={data.totalIndirectExpenses}
                  isTotal={data.indirectExpenses.length > 0}
                  showZero
                />
                {data.indirectExpenses.map((g) => (
                  <GroupSection
                    key={g.group_id}
                    group={g}
                    focusedId={focusedId}
                    onFocus={focus}
                    onDrillGroup={drillGroup}
                    prefix="iexp"
                  />
                ))}
                {isNetProfit && (
                  <TRow
                    label="Nett Profit"
                    amount={absNet}
                    isTotal
                    isFocused={focusedId === "net-profit"}
                    onClick={() => focus("net-profit")}
                  />
                )}
                {!isNetProfit && (
                  <TRow
                    label="Nett Loss"
                    amount={absNet}
                    isTotal
                    isFocused={focusedId === "net-loss"}
                    onClick={() => focus("net-loss")}
                  />
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-zinc-300 flex justify-between px-3 py-1 font-semibold">
            <span>Total</span>
            <span className="font-mono">{fmt(grandTotal)}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex justify-between px-4 py-2 border-b border-zinc-200">
            <div className="text-[18px] tracking-[0.25em] font-semibold">Particulars</div>
            <div className="text-right text-[12px] leading-tight">
              <div className="font-semibold">{companyName}</div>
              <div>{periodLabel}</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse">
              <tbody>
                {showTrading && (
                  <>
                    {data.salesAccounts.map((g) => (
                      <GroupSection
                        key={g.group_id}
                        group={g}
                        focusedId={focusedId}
                        onFocus={focus}
                        onDrillGroup={drillGroup}
                        prefix="sal"
                      />
                    ))}
                    {data.salesAccounts.length > 0 && (
                      <TRow label="Sales Accounts" amount={data.totalSales} isTotal />
                    )}
                    {data.directIncomes.map((g) => (
                      <GroupSection
                        key={g.group_id}
                        group={g}
                        focusedId={focusedId}
                        onFocus={focus}
                        onDrillGroup={drillGroup}
                        prefix="dinc"
                      />
                    ))}
                    {data.directIncomes.length > 0 && (
                      <TRow label="Direct Incomes" amount={data.totalDirectIncomes} isTotal />
                    )}
                    <TRow
                      label="Closing Stock"
                      amount={data.closingStock}
                      showZero
                      isFocused={focusedId === "closing-stock"}
                      onClick={() => focus("closing-stock")}
                    />
                    {isGrossProfit && (
                      <TRow
                        label="Gross Profit b/f"
                        amount={absGross}
                        isTotal
                        isFocused={focusedId === "gross-bf"}
                        onClick={() => focus("gross-bf")}
                      />
                    )}
                    {!isGrossProfit && (
                      <TRow
                        label="Gross Loss b/f"
                        amount={absGross}
                        isTotal
                        isFocused={focusedId === "gross-bf"}
                        onClick={() => focus("gross-bf")}
                      />
                    )}
                  </>
                )}

                {data.indirectIncomes.length > 0 && (
                  <>
                    {data.indirectIncomes.map((g) => (
                      <GroupSection
                        key={g.group_id}
                        group={g}
                        focusedId={focusedId}
                        onFocus={focus}
                        onDrillGroup={drillGroup}
                        prefix="iinc"
                      />
                    ))}
                    <TRow label="Indirect Incomes" amount={data.totalIndirectIncomes} isTotal />
                  </>
                )}

                {!isNetProfit && (
                  <TRow
                    label="Nett Loss"
                    amount={absNet}
                    isTotal
                    isFocused={focusedId === "net-loss"}
                    onClick={() => focus("net-loss")}
                  />
                )}
                {isNetProfit && (
                  <TRow
                    label="Nett Profit"
                    amount={absNet}
                    isTotal
                    isFocused={focusedId === "net-profit"}
                    onClick={() => focus("net-profit")}
                  />
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-zinc-300 flex justify-between px-3 py-1 font-semibold">
            <span>Total</span>
            <span className="font-mono">{fmt(grandTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfitLossLayout() {
  return (
    <ReportErrorBoundary>
      <ProfitLossLayoutInner />
    </ReportErrorBoundary>
  );
}