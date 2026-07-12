import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';

/* ─────────────────────────── Types ─────────────────────────────────── */

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
  closingStock: number;

  purchaseAccounts: GroupRow[];
  totalPurchase: number;
  directExpenses: GroupRow[];
  totalDirectExpenses: number;
  indirectExpenses: GroupRow[];
  totalIndirectExpenses: number;

  salesAccounts: GroupRow[];
  totalSales: number;
  directIncomes: GroupRow[];
  totalDirectIncomes: number;
  indirectIncomes: GroupRow[];
  totalIndirectIncomes: number;

  grossProfit: number;
  isGrossProfit: boolean;
  netProfit: number;
  isProfit: boolean;
}

/* ─────────────────────────── Helpers ───────────────────────────────── */

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(toNum(val)));

/* TallyPrime period label format: "1-Apr-26" */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtTallyDate = (iso?: string): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d}-${MONTHS[m - 1]}-${String(y).slice(2)}`;
};

function normalizeLedger(raw: any): LedgerRow {
  return {
    ledger_id: toNum(raw?.ledger_id),
    ledger_name: raw?.ledger_name ?? 'Unnamed Ledger',
    balance: toNum(raw?.balance),
  };
}

function normalizeGroup(raw: any): GroupRow {
  return {
    group_id: toNum(raw?.group_id),
    group_name: raw?.group_name ?? 'Unnamed Group',
    balance: toNum(raw?.balance),
    ledgers: Array.isArray(raw?.ledgers) ? raw.ledgers.map(normalizeLedger) : [],
    childGroups: Array.isArray(raw?.childGroups) ? raw.childGroups.map(normalizeGroup) : [],
  };
}

function normalizeGroupList(raw: any): GroupRow[] {
  return Array.isArray(raw) ? raw.map(normalizeGroup) : [];
}

function normalizePnL(raw: any): PnLData {
  const purchaseAccounts = normalizeGroupList(raw?.purchaseAccounts);
  const directExpenses = normalizeGroupList(raw?.directExpenses);
  const indirectExpenses = normalizeGroupList(raw?.indirectExpenses);
  const salesAccounts = normalizeGroupList(raw?.salesAccounts);
  const directIncomes = normalizeGroupList(raw?.directIncomes);
  const indirectIncomes = normalizeGroupList(raw?.indirectIncomes);

  const openingStock = toNum(raw?.openingStock);
  const closingStock = toNum(raw?.closingStock);

  const totalPurchase =
    toNum(raw?.totalPurchase) || purchaseAccounts.reduce((s, g) => s + Math.abs(g.balance), 0);
  const totalDirectExpenses =
    toNum(raw?.totalDirectExpenses) || directExpenses.reduce((s, g) => s + Math.abs(g.balance), 0);
  const totalIndirectExpenses =
    toNum(raw?.totalIndirectExpenses) ||
    indirectExpenses.reduce((s, g) => s + Math.abs(g.balance), 0);
  const totalSales =
    toNum(raw?.totalSales) || salesAccounts.reduce((s, g) => s + Math.abs(g.balance), 0);
  const totalDirectIncomes =
    toNum(raw?.totalDirectIncomes) || directIncomes.reduce((s, g) => s + Math.abs(g.balance), 0);
  const totalIndirectIncomes =
    toNum(raw?.totalIndirectIncomes) ||
    indirectIncomes.reduce((s, g) => s + Math.abs(g.balance), 0);

  const tradingCredit = totalSales + totalDirectIncomes + closingStock;
  const tradingDebit = openingStock + totalPurchase + totalDirectExpenses;
  const grossProfit =
    toNum(raw?.grossProfit) !== 0 ? toNum(raw?.grossProfit) : tradingCredit - tradingDebit;
  const isGrossProfit =
    typeof raw?.isGrossProfit === 'boolean' ? raw.isGrossProfit : grossProfit >= 0;

  const netProfit =
    toNum(raw?.netProfit) !== 0
      ? toNum(raw?.netProfit)
      : grossProfit + totalIndirectIncomes - totalIndirectExpenses;
  const isProfit = typeof raw?.isProfit === 'boolean' ? raw.isProfit : netProfit >= 0;

  return {
    openingStock,
    closingStock,
    purchaseAccounts,
    totalPurchase,
    directExpenses,
    totalDirectExpenses,
    indirectExpenses,
    totalIndirectExpenses,
    salesAccounts,
    totalSales,
    directIncomes,
    totalDirectIncomes,
    indirectIncomes,
    totalIndirectIncomes,
    grossProfit,
    isGrossProfit,
    netProfit,
    isProfit,
  };
}

/* ─────────────────────────── Error Boundary ────────────────────────── */

interface BoundaryState {
  error: Error | null;
}

class ReportErrorBoundary extends React.Component<{ children: React.ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };
  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Profit & Loss report crashed:', error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex items-center justify-center text-black text-xs font-mono">
          <div>
            <div className="font-bold">Profit &amp; Loss report failed to render</div>
            <div>{this.state.error.message}</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─────────────────────────── TRow ──────────────────────────────────── */

interface TRowProps {
  label: string;
  amount: number | null;
  isFocused?: boolean;
  isTotal?: boolean;
  isSubItem?: boolean;
  isGrossEntry?: boolean;
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
  isGrossEntry = false,
  onClick,
  onDoubleClick,
  showZero = false,
}: TRowProps) {
  const amountDisplay =
    amount === null || amount === undefined ? '' : amount === 0 && !showZero ? '' : fmt(amount);

  return (
    <tr
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={[
        'border-b border-transparent select-none',
        onClick ? 'cursor-pointer hover:bg-black/[0.03]' : '',
        isFocused ? 'bg-black/[0.06] text-black' : '',
        isTotal || isGrossEntry ? 'font-semibold' : '',
        isGrossEntry ? 'italic' : '',
      ].join(' ')}
    >
      <td
        className={[
          'py-[3px] text-left text-[13px]',
          isSubItem ? 'pl-8 pr-2 text-black' : 'px-2',
          isTotal || isGrossEntry ? 'font-semibold' : 'font-normal',
        ].join(' ')}
      >
        {label}
      </td>
      <td className="py-[3px] text-right whitespace-nowrap w-36 font-mono text-[13px] pr-2">
        {amountDisplay}
      </td>
    </tr>
  );
}

/* Subtotal row (bold, underlined on both sides) */
function SubtotalRow({ amount }: { amount: number }) {
  return (
    <tr className="border-t border-gray-200">
      <td className="py-[2px] text-left px-2 text-[13px] font-semibold" />
      <td className="py-[2px] text-right font-mono text-[13px] font-semibold pr-2 border-b-2 border-gray-200">
        {fmt(amount)}
      </td>
    </tr>
  );
}

/* ─────────────────────────── GroupSection ──────────────────────────── */

function GroupSection({
  group,
  focusedId,
  onFocus,
  onDrillGroup,
  prefix,
}: {
  group: GroupRow;
  focusedId: string | null;
  onFocus: (key: string, drill?: () => void) => void;
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
          onFocus(key, () => onDrillGroup(group));
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

/* ─────────────────────────── Column header ─────────────────────────── */

function ColHeader({ companyName, periodLabel }: { companyName: string; periodLabel: string }) {
  return (
    <div className="flex justify-between items-start px-3 py-2 border-b border-gray-200">
      <div className="text-[16px] tracking-[0.2em] font-semibold text-black">Particulars</div>
      <div className="text-right text-[11px] leading-tight text-black">
        <div className="font-semibold text-[12px]">{companyName}</div>
        <div>{periodLabel}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Inner layout ──────────────────────────── */

interface ProfitLossLayoutProps {
  /** Period start/end (ISO yyyy-mm-dd) from the report runner's F2 selector. */
  fromDate?: string;
  toDate?: string;
}

function ProfitLossLayoutInner({ fromDate, toDate }: ProfitLossLayoutProps) {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();

  const [data, setData] = React.useState<PnLData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedId, setFocusedId] = React.useState<string | null>(null);

  /* Drill target of the currently-focused row, invoked on Enter (Tally parity). */
  const focusedDrillRef = React.useRef<null | (() => void)>(null);

  React.useEffect(() => {
    if (!selectedCompany?.company_id || !activeFY?.fy_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const reportApi = (window as any)?.api?.report?.profitLoss;
    if (typeof reportApi !== 'function') {
      setError('Report service is not available.');
      setLoading(false);
      return;
    }

    reportApi(selectedCompany.company_id, activeFY.fy_id, fromDate, toDate)
      .then((res: any) => {
        if (res?.success) setData(normalizePnL(res));
        else setError(res?.error || 'Failed to load Profit & Loss report.');
      })
      .catch((e: any) => setError(e?.message || 'Unknown error'))
      .finally(() => setLoading(false));
  }, [selectedCompany?.company_id, activeFY?.fy_id, fromDate, toDate]);

  const drillGroup = React.useCallback(
    (group: GroupRow) => navigate(`/reports/accounts/group-summary/${group.group_id}`),
    [navigate],
  );

  /* Opening / Closing Stock both drill into the Stock Summary (gold screenshots). */
  const drillStock = React.useCallback(
    () => navigate('/reports/inventory/stock-summary'),
    [navigate],
  );

  const focus = React.useCallback((key: string, drill?: () => void) => {
    setFocusedId(key);
    focusedDrillRef.current = drill || null;
  }, []);

  /* Enter on a focused, drillable row opens its drill-down. */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !focusedDrillRef.current) return;
      const el = document.activeElement;
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'SELECT' ||
          el.tagName === 'TEXTAREA' ||
          el.closest("[role='dialog']"))
      ) {
        return;
      }
      e.preventDefault();
      focusedDrillRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
        Loading Profit &amp; Loss…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs px-8 text-center">
        {error}
      </div>
    );
  }
  if (!selectedCompany?.company_id || !activeFY?.fy_id) {
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs px-8 text-center">
        Select a company and financial year to view the Profit &amp; Loss report.
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
        No data available.
      </div>
    );
  }

  const absGross = Math.abs(data.grossProfit);
  const absNet = Math.abs(data.netProfit);

  /* Whether we have any trading-account data */
  const showTrading =
    data.openingStock !== 0 ||
    data.closingStock !== 0 ||
    data.purchaseAccounts.length > 0 ||
    data.directExpenses.length > 0 ||
    data.salesAccounts.length > 0 ||
    data.directIncomes.length > 0;

  const companyName =
    (selectedCompany as any)?.company_name ?? (selectedCompany as any)?.name ?? 'Company';

  const periodStart = fromDate || activeFY?.start_date;
  const periodEnd = toDate || activeFY?.end_date;
  const periodLabel =
    periodStart && periodEnd ? `${fmtTallyDate(periodStart)} to ${fmtTallyDate(periodEnd)}` : '';

  /*
   * Trading subtotal: sum of both debit and credit sides of the trading section
   * Both sides should balance.
   * Left  = openingStock + totalPurchase + totalDirectExpenses + closingStock + (grossLoss if applicable)
   * Right = totalSales + totalDirectIncomes + closingStock + (grossProfit if applicable)
   *
   * Since both sides must equal, we use max of either side as the subtotal
   * display value (they should be equal after balancing).
   */
  const tradingDebitTotal =
    data.openingStock +
    data.totalPurchase +
    data.totalDirectExpenses +
    (data.isGrossProfit ? absGross : 0);

  const tradingCreditTotal =
    data.totalSales +
    data.totalDirectIncomes +
    data.closingStock +
    (!data.isGrossProfit ? absGross : 0);

  const tradingSubtotal = Math.max(tradingDebitTotal, tradingCreditTotal);

  /* Bottom "Total" = the P&L (below-the-line) section only. The trading section is
     already closed by its own subtotal above, so it is NOT re-added here (that was
     inflating the total). Gross profit/loss is carried into this section as b/f. */
  const grossLossBf = showTrading && !data.isGrossProfit ? absGross : 0;
  const grossProfitBf = showTrading && data.isGrossProfit ? absGross : 0;

  const leftTotal = data.totalIndirectExpenses + grossLossBf + (data.isProfit ? absNet : 0);
  const rightTotal = data.totalIndirectIncomes + grossProfitBf + (!data.isProfit ? absNet : 0);

  const grandTotal = Math.max(leftTotal, rightTotal);

  return (
    <div className="flex flex-col h-full w-full bg-white text-black overflow-hidden font-sans">
      {/* T-format title bar */}
      <div className="h-6 bg-black/[0.06] border-b border-gray-200 flex items-center justify-center text-sm font-semibold tracking-wide">
        Profit &amp; Loss A/c
      </div>

      {/* Two-column body */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* ══════════════ LEFT SIDE (Debit) ══════════════ */}
        <div className="flex-1 border-r border-gray-200 flex flex-col">
          <ColHeader companyName={companyName} periodLabel={periodLabel} />

          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse">
              <tbody>
                {/* ── Trading section (debit) ── */}
                {showTrading && (
                  <>
                    {/* Opening Stock — drills to Stock Summary */}
                    <TRow
                      label="Opening Stock"
                      amount={data.openingStock}
                      showZero
                      isFocused={focusedId === 'opening-stock'}
                      onClick={() => focus('opening-stock', drillStock)}
                      onDoubleClick={drillStock}
                    />

                    {/* Purchase Accounts groups */}
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

                    {/* Direct Expenses groups */}
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

                    {/* Gross Profit c/o goes on LEFT only if there's a gross PROFIT */}
                    {data.isGrossProfit && (
                      <TRow
                        label="Gross Profit c/o"
                        amount={absGross}
                        isGrossEntry
                        isFocused={focusedId === 'gross-co'}
                        onClick={() => focus('gross-co')}
                      />
                    )}

                    {/* Trading subtotal divider */}
                    <SubtotalRow amount={tradingSubtotal} />

                    {/* Gross Loss b/f goes on LEFT (below subtotal) if there's gross LOSS */}
                    {!data.isGrossProfit && (
                      <TRow
                        label="Gross Loss b/f"
                        amount={absGross}
                        isGrossEntry
                        isFocused={focusedId === 'gross-bf'}
                        onClick={() => focus('gross-bf')}
                      />
                    )}
                  </>
                )}

                {/* ── P&L section (debit) — Indirect Expenses ── */}
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

                {/* Net Profit on LEFT (debit) if profit */}
                {data.isProfit && (
                  <TRow
                    label="Nett Profit"
                    amount={absNet}
                    isGrossEntry
                    isFocused={focusedId === 'net-profit'}
                    onClick={() => focus('net-profit')}
                  />
                )}
              </tbody>
            </table>
          </div>

          {/* Grand Total — left */}
          <div className="border-t-2 border-black flex justify-between px-3 py-1 font-semibold text-[13px]">
            <span>Total</span>
            <span className="font-mono">{fmt(grandTotal)}</span>
          </div>
        </div>

        {/* ══════════════ RIGHT SIDE (Credit) ══════════════ */}
        <div className="flex-1 flex flex-col">
          <ColHeader companyName={companyName} periodLabel={periodLabel} />

          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse">
              <tbody>
                {/* ── Trading section (credit) ── */}
                {showTrading && (
                  <>
                    {/* Sales Accounts */}
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

                    {/* Direct Incomes */}
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

                    {/* Closing Stock — credit side (integrated P&L); drills to Stock Summary */}
                    <TRow
                      label="Closing Stock"
                      amount={data.closingStock}
                      showZero
                      isFocused={focusedId === 'closing-stock'}
                      onClick={() => focus('closing-stock', drillStock)}
                      onDoubleClick={drillStock}
                    />

                    {/* Gross Loss c/o on RIGHT when there's a gross LOSS */}
                    {!data.isGrossProfit && (
                      <TRow
                        label="Gross Loss c/o"
                        amount={absGross}
                        isGrossEntry
                        isFocused={focusedId === 'gross-co-r'}
                        onClick={() => focus('gross-co-r')}
                      />
                    )}

                    {/* Trading subtotal on right — same subtotal value */}
                    <SubtotalRow amount={tradingSubtotal} />

                    {/* Gross Profit b/f — on RIGHT when there's gross PROFIT */}
                    {data.isGrossProfit && (
                      <TRow
                        label="Gross Profit b/f"
                        amount={absGross}
                        isGrossEntry
                        isFocused={focusedId === 'gross-bf-r'}
                        onClick={() => focus('gross-bf-r')}
                      />
                    )}
                  </>
                )}

                {/* ── P&L section (credit) — Indirect Incomes ── */}
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

                {/* Net Loss on RIGHT (credit) if loss — balancing entry */}
                {!data.isProfit && (
                  <TRow
                    label="Nett Loss"
                    amount={absNet}
                    isGrossEntry
                    isFocused={focusedId === 'net-loss'}
                    onClick={() => focus('net-loss')}
                  />
                )}
              </tbody>
            </table>
          </div>

          {/* Grand Total — right */}
          <div className="border-t-2 border-black flex justify-between px-3 py-1 font-semibold text-[13px]">
            <span>Total</span>
            <span className="font-mono">{fmt(grandTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Export ────────────────────────────────── */

export function ProfitLossLayout({ fromDate, toDate }: ProfitLossLayoutProps = {}) {
  return (
    <ReportErrorBoundary>
      <ProfitLossLayoutInner fromDate={fromDate} toDate={toDate} />
    </ReportErrorBoundary>
  );
}
