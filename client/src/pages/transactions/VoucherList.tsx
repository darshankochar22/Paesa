import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";
import { PageTitleBar, AlertBanner, SearchInput, DataTable, StatusBadge, RightActionPanel } from "../../components/ui";
import type { TableColumn } from "../../components/ui";
import { VoucherTypeBadge, PageFooterBar } from "./ui";

const VOUCHER_TYPES = ["Receipt", "Payment", "Contra", "Journal", "Sales", "Purchase"];

interface VoucherRow {
  voucher_id: number;
  voucher_type: string;
  voucher_number: string;
  date: string;
  narration: string | null;
  party_name: string | null;
  is_cancelled: number;
}

const formatDate = (d: string) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const TABLE_COLUMNS: TableColumn[] = [
  { key: "voucher_number", label: "Voucher No.",    span: "col-span-2" },
  { key: "voucher_type",   label: "Type",           span: "col-span-1" },
  { key: "date",           label: "Date",           span: "col-span-2" },
  { key: "party_name",     label: "Party / Narration", span: "col-span-4" },
  { key: "status",         label: "Status",         span: "col-span-2" },
  { key: "actions",        label: "",               span: "col-span-1", align: "right" },
];

export default function VoucherList() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const [selectedType, setSelectedType] = useState<string>("All");
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const fetchVouchers = useCallback(async () => {
    if (!companyId || !fyId) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = selectedType === "All"
        ? await window.api.voucher.getAll(companyId, fyId)
        : await window.api.voucher.getByType(companyId, fyId, selectedType);
      if (res.success) setVouchers(res.vouchers || []);
      else setError(res.error || "Failed to fetch vouchers");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId, selectedType]);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        navigate("/transactions/vouchers");
      }
      if (e.altKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        navigate("/transactions/daybook");
      }
      if (e.altKey && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        navigate("/utilities/banking");
      }
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/");
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [navigate]);

  const listActions = [
    { key: "Alt+C", label: "New Voucher", onClick: () => navigate("/transactions/vouchers") },
    { key: "Alt+D", label: "Day Book", onClick: () => navigate("/transactions/daybook") },
    { key: "Alt+B", label: "Banking", onClick: () => navigate("/utilities/banking") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/") },
  ];

  const filtered = vouchers.filter(v => {
    const q = search.toLowerCase();
    return (
      !q ||
      v.voucher_number?.toLowerCase().includes(q) ||
      v.party_name?.toLowerCase().includes(q) ||
      v.narration?.toLowerCase().includes(q)
    );
  });

  // Augment rows with rendered fields for DataTable
  const tableRows = filtered.map(v => ({
    ...v,
    voucher_number: v.voucher_number || "—",
    date: formatDate(v.date),
    party_name: v.party_name || v.narration || "—",
  }));

  const columns: TableColumn[] = TABLE_COLUMNS.map(col => ({
    ...col,
    render: col.key === "voucher_type"
      ? (row) => <VoucherTypeBadge type={row.voucher_type} />
      : col.key === "status"
        ? (row) => <StatusBadge label={row.is_cancelled ? "Cancelled" : "Active"} />
        : col.key === "actions"
          ? (row) => (
              <button
                onClick={e => { e.stopPropagation(); navigate(`/transactions/voucher/${row.voucher_id}`); }}
                className="text-[10px] text-zinc-500 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-400 px-1.5 py-0.5 rounded transition-all font-sans uppercase opacity-0 group-hover:opacity-100"
              >
                View
              </button>
            )
          : undefined,
  }));

  return (
    <div className="flex-1 flex flex-col bg-white h-full text-xs select-none">
      {/* Title Bar */}
      <PageTitleBar
        title="Voucher Register"
        subtitle={selectedCompany?.name}
        actions={
          <button
            onClick={() => navigate("/transactions/vouchers")}
            className="text-[10px] bg-zinc-700 hover:bg-zinc-600 text-white px-2 py-0.5 rounded uppercase tracking-wider transition-colors"
          >
            + New Voucher
          </button>
        }
      />

      {/* Main Body Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left Side: Table & Filters */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Type Filter Tabs */}
          <div className="flex border-b border-zinc-200 bg-zinc-50 overflow-x-auto shrink-0">
            {["All", ...VOUCHER_TYPES].map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
                  selectedType === type
                    ? "border-zinc-900 text-zinc-900 bg-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50/50">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by voucher no, party, narration…"
              className="max-w-sm"
            />
          </div>

          {/* Error Banner */}
          {error && (
            <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />
          )}

          {/* Table */}
          <DataTable
            columns={columns}
            rows={tableRows}
            rowKey={row => row.voucher_id}
            loading={loading}
            onRowClick={row => navigate(`/transactions/voucher/${row.voucher_id}`)}
            emptyMessage={
              vouchers.length === 0
                ? "No vouchers found. Create your first voucher."
                : "No results match your search."
            }
            rowClassName={row => row.is_cancelled ? "opacity-50" : "group"}
          />
        </div>

        {/* Right Side: Action Panel */}
        <RightActionPanel actions={listActions} />
      </div>

      {/* Footer */}
      <PageFooterBar
        countLabel={`${filtered.length} voucher${filtered.length !== 1 ? "s" : ""}`}
        onBack={() => navigate("/")}
      />
    </div>
  );
}
