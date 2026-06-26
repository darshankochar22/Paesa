import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import FullScreenPanel from "@/components/ui/FullScreenPanel";
import DataTable, { type TableColumn } from "@/components/ui/DataTable";
import { fmt, fmtQty, fmtDate } from "@/lib/format";

// Inventory Books → Stock Item (issue #107).
// Flat list of every stock item (inwards / outwards / closing), drilling into the
// item's monthly movement and then its vouchers. Real data via
// window.api.report.stockItemSummary / stockItemMonthly / stockItemVouchers.

interface ItemRow {
  item_id: number;
  item_name: string;
  group_name: string;
  unit_name?: string;
  in_qty: number;
  out_qty: number;
  closing_qty: number;
  closing_value: number;
  rate: number;
  isTotal?: boolean;
}
interface MonthRow {
  month: string;
  in_qty: number; in_value: number;
  out_qty: number; out_value: number;
  closing_qty: number; closing_value: number;
  isTotal?: boolean;
}
interface VoucherRow {
  voucher_id: number | null;
  date: string | null;
  particulars: string;
  voucher_type: string;
  voucher_number: string | number;
  inwards_qty: number | null;
  outwards_qty: number | null;
  closing_qty: number;
  closing_value: number;
  isTotal?: boolean;
}

type Level =
  | { step: "items" }
  | { step: "monthly"; item: ItemRow }
  | { step: "vouchers"; item: ItemRow };

const sum = (rows: any[], key: string) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);

export default function StockItemReport() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : "";

  const [level, setLevel] = React.useState<Level>({ step: "items" });

  // ── Level 1: all stock items ───────────────────────────────────────────────
  const [items, setItems] = React.useState<ItemRow[]>([]);
  const [loadingItems, setLoadingItems] = React.useState(true);
  const [itemsError, setItemsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!companyId || !fyId) { setLoadingItems(false); return; }
    setLoadingItems(true);
    setItemsError(null);
    (window as any).api.report
      .stockItemSummary(companyId, fyId)
      .then((res: any) => {
        if (res?.success) setItems(res.rows ?? []);
        else setItemsError(res?.error || "Failed to load stock items.");
      })
      .catch((e: any) => setItemsError(e.message))
      .finally(() => setLoadingItems(false));
  }, [companyId, fyId]);

  // ── Level 2: item monthly ──────────────────────────────────────────────────
  const [months, setMonths] = React.useState<MonthRow[]>([]);
  const [loadingMonths, setLoadingMonths] = React.useState(false);
  const [monthsError, setMonthsError] = React.useState<string | null>(null);

  const openMonthly = React.useCallback((item: ItemRow) => {
    if (!companyId || !fyId) return;
    setLevel({ step: "monthly", item });
    setLoadingMonths(true);
    setMonthsError(null);
    (window as any).api.report
      .stockItemMonthly(companyId, fyId, item.item_id)
      .then((res: any) => {
        if (res?.success) setMonths(res.months ?? []);
        else setMonthsError(res?.error || "Failed to load monthly summary.");
      })
      .catch((e: any) => setMonthsError(e.message))
      .finally(() => setLoadingMonths(false));
  }, [companyId, fyId]);

  // ── Level 3: item vouchers ─────────────────────────────────────────────────
  const [vouchers, setVouchers] = React.useState<VoucherRow[]>([]);
  const [loadingVouchers, setLoadingVouchers] = React.useState(false);
  const [vouchersError, setVouchersError] = React.useState<string | null>(null);

  const openVouchers = React.useCallback((item: ItemRow) => {
    if (!companyId || !fyId) return;
    setLevel({ step: "vouchers", item });
    setLoadingVouchers(true);
    setVouchersError(null);
    (window as any).api.report
      .stockItemVouchers(companyId, fyId, item.item_id, activeFY?.start_date, activeFY?.end_date)
      .then((res: any) => {
        if (res?.success) setVouchers(res.rows ?? []);
        else setVouchersError(res?.error || "Failed to load vouchers.");
      })
      .catch((e: any) => setVouchersError(e.message))
      .finally(() => setLoadingVouchers(false));
  }, [companyId, fyId, activeFY]);

  // ── Level 1 render ──────────────────────────────────────────────────────────
  if (level.step === "items") {
    const rows: ItemRow[] = items.length
      ? [
          ...items,
          {
            item_id: -1,
            item_name: "Grand Total",
            group_name: "",
            in_qty: sum(items, "in_qty"),
            out_qty: sum(items, "out_qty"),
            closing_qty: sum(items, "closing_qty"),
            closing_value: sum(items, "closing_value"),
            rate: 0,
            isTotal: true,
          },
        ]
      : [];
    const COLUMNS: TableColumn[] = [
      { key: "item_name", label: "Particulars", span: "col-span-4", align: "left" },
      { key: "in_qty", label: "Inwards", span: "col-span-2", align: "right", render: (r: ItemRow) => fmtQty(r.in_qty) },
      { key: "out_qty", label: "Outwards", span: "col-span-2", align: "right", render: (r: ItemRow) => fmtQty(r.out_qty) },
      { key: "closing_qty", label: "Closing Qty", span: "col-span-2", align: "right", render: (r: ItemRow) => {
          const q = fmtQty(r.closing_qty);
          return q && !r.isTotal && r.unit_name ? `${q} ${r.unit_name}` : q;
        } },
      { key: "closing_value", label: "Closing Value", span: "col-span-2", align: "right", render: (r: ItemRow) => fmt(r.closing_value) },
    ];
    return (
      <FullScreenPanel title="Stock Item" periodLabel={periodLabel}>
        <DataTable
          variant="report"
          columns={COLUMNS}
          rows={rows}
          rowKey={(r: ItemRow) => r.item_id}
          loading={loadingItems}
          emptyMessage={itemsError ?? "No stock items found."}
          onRowActivate={(r: ItemRow) => !r.isTotal && openMonthly(r)}
        />
      </FullScreenPanel>
    );
  }

  // ── Level 2 render ──────────────────────────────────────────────────────────
  if (level.step === "monthly") {
    const rows: MonthRow[] = months.length
      ? [
          ...months,
          {
            month: "Grand Total",
            in_qty: sum(months, "in_qty"), in_value: sum(months, "in_value"),
            out_qty: sum(months, "out_qty"), out_value: sum(months, "out_value"),
            closing_qty: months[months.length - 1]?.closing_qty ?? 0,
            closing_value: months[months.length - 1]?.closing_value ?? 0,
            isTotal: true,
          },
        ]
      : [];
    const COLUMNS: TableColumn[] = [
      { key: "month", label: "Particulars", span: "col-span-2", align: "left" },
      { key: "in_qty", label: "In Qty", span: "col-span-2", align: "right", render: (r: MonthRow) => fmtQty(r.in_qty) },
      { key: "in_value", label: "In Value", span: "col-span-2", align: "right", render: (r: MonthRow) => fmt(r.in_value) },
      { key: "out_qty", label: "Out Qty", span: "col-span-2", align: "right", render: (r: MonthRow) => fmtQty(r.out_qty) },
      { key: "out_value", label: "Out Value", span: "col-span-2", align: "right", render: (r: MonthRow) => fmt(r.out_value) },
      { key: "closing_value", label: "Closing", span: "col-span-2", align: "right", render: (r: MonthRow) => fmt(r.closing_value) },
    ];
    return (
      <FullScreenPanel
        title={`Stock Item — ${level.item.item_name}`}
        periodLabel={periodLabel}
        breadcrumb={[{ label: "Stock Item" }]}
        onClose={() => setLevel({ step: "items" })}
      >
        <DataTable
          variant="report"
          columns={COLUMNS}
          rows={rows}
          rowKey={(r: MonthRow) => r.month}
          loading={loadingMonths}
          emptyMessage={monthsError ?? "No movement in this period."}
          onRowActivate={(r: MonthRow) => !r.isTotal && openVouchers(level.item)}
        />
      </FullScreenPanel>
    );
  }

  // ── Level 3 render ──────────────────────────────────────────────────────────
  const vrows: VoucherRow[] = vouchers.length
    ? [
        ...vouchers,
        {
          voucher_id: null,
          date: null,
          particulars: "Grand Total",
          voucher_type: "",
          voucher_number: "",
          inwards_qty: sum(vouchers, "inwards_qty"),
          outwards_qty: sum(vouchers, "outwards_qty"),
          closing_qty: vouchers[vouchers.length - 1]?.closing_qty ?? 0,
          closing_value: vouchers[vouchers.length - 1]?.closing_value ?? 0,
          isTotal: true,
        },
      ]
    : [];
  const VCOLUMNS: TableColumn[] = [
    { key: "date", label: "Date", span: "col-span-2", align: "left", render: (r: VoucherRow) => (r.isTotal ? "" : fmtDate(r.date)) },
    { key: "particulars", label: "Particulars", span: "col-span-3", align: "left" },
    { key: "voucher_type", label: "Vch Type", span: "col-span-2", align: "left" },
    { key: "voucher_number", label: "Vch No.", span: "col-span-1", align: "right" },
    { key: "inwards_qty", label: "Inwards", span: "col-span-1", align: "right", render: (r: VoucherRow) => fmtQty(r.inwards_qty) },
    { key: "outwards_qty", label: "Outwards", span: "col-span-1", align: "right", render: (r: VoucherRow) => fmtQty(r.outwards_qty) },
    { key: "closing_value", label: "Closing", span: "col-span-2", align: "right", render: (r: VoucherRow) => fmt(r.closing_value) },
  ];
  return (
    <FullScreenPanel
      title={`Stock Item Vouchers — ${level.item.item_name}`}
      periodLabel={periodLabel}
      breadcrumb={[{ label: "Stock Item" }, { label: level.item.item_name }]}
      onClose={() => openMonthly(level.item)}
    >
      <DataTable
        variant="report"
        columns={VCOLUMNS}
        rows={vrows}
        rowKey={(r: VoucherRow) => r.voucher_id ?? -1}
        loading={loadingVouchers}
        emptyMessage={vouchersError ?? "No vouchers for this item."}
        onRowActivate={(r: VoucherRow) => r.voucher_id && navigate(`/transactions/voucher/${r.voucher_id}`)}
      />
    </FullScreenPanel>
  );
}
