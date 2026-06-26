import * as React from "react";
import { useCompany } from "@/context/CompanyContext";
import DataTable, { type TableColumn } from "@/components/ui/DataTable";
import { fmtAbs, fmtQty } from "@/lib/format";

interface ItemRow {
  item_id: number;
  item_name: string;
  group_id: number | null;
  group_name: string;
  unit_name: string;
  closing_qty: number;
  closing_value: number;
  rate: number;
}

interface GroupRow {
  group_id: number | null;
  group_name: string;
  closing_qty: number;
  closing_value: number;
  item_count: number;
  items: ItemRow[];
}

interface StockSummaryData {
  items: ItemRow[];
  groups: GroupRow[];
  totalClosingQty: number;
  totalClosingValue: number;
  as_on_date: string | null;
}

const signed = (val: number, formatted: string) => (val < 0 ? `(-)${formatted}` : formatted);

// Render fns read either a group ({group_name}) or a nested item ({item_name, unit_name, rate}).
const nameCell = (r: any) => r.group_name ?? r.item_name;
const qtyCell = (r: any) => {
  const q = r.closing_qty ?? 0;
  if (!q) return "";
  const unit = r.unit_name ? ` ${r.unit_name}` : "";
  return signed(q, `${fmtQty(q)}${unit}`.trim());
};
const rateCell = (r: any) => (r.rate && r.closing_qty ? fmtAbs(r.rate) : "");
const valueCell = (r: any) => {
  const v = r.closing_value ?? 0;
  return v ? signed(v, fmtAbs(v)) : "";
};

const COLUMNS: TableColumn[] = [
  { key: "name", label: "Particulars", span: "col-span-6", align: "left", render: nameCell },
  { key: "qty", label: "Quantity", span: "col-span-2", align: "right", render: qtyCell },
  { key: "rate", label: "Rate", span: "col-span-2", align: "right", render: rateCell },
  { key: "value", label: "Value", span: "col-span-2", align: "right", render: valueCell },
];

export function StockSummaryLayout() {
  const { selectedCompany, activeFY } = useCompany();

  const [data, setData] = React.useState<StockSummaryData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedCompany?.company_id || !activeFY?.fy_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    (window as any).api.report
      .stockSummary(selectedCompany.company_id, activeFY.fy_id, activeFY.end_date, "FIFO")
      .then((res: any) => {
        if (res?.success) setData(res);
        else setError(res?.error || "Failed to load.");
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedCompany?.company_id, activeFY?.fy_id, activeFY?.end_date]);

  const rows = React.useMemo(() => {
    if (!data?.groups) return [];
    const list: any[] = data.groups.map((g) => ({
      id: `g-${g.group_id ?? "ungrouped"}`,
      ...g,
      subItems: (g.items ?? []).map((it) => ({ id: `i-${it.item_id}`, ...it })),
    }));
    list.push({
      id: "__total",
      group_name: "Grand Total",
      closing_qty: data.totalClosingQty,
      closing_value: data.totalClosingValue,
      isTotal: true,
    });
    return list;
  }, [data]);

  if (loading) return <Centered>Loading Stock Summary...</Centered>;
  if (error) return <Centered>{error}</Centered>;
  if (!data) return <Centered>No data available.</Centered>;

  return (
    <DataTable
      variant="report"
      columns={COLUMNS}
      rows={rows}
      rowKey={(r: any) => r.id}
      emptyMessage="No stock items found."
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs px-8 text-center">
      {children}
    </div>
  );
}
