import { useState, useEffect } from "react";
import { PageTitleBar, RightActionPanel, SearchInput, DataTable } from "@/components/ui";
import type { TDSNatureOfPaymentType } from "@/types/entities/TDSNatureOfPayment";

interface TDSNatureOfPaymentSelectionPanelProps {
  tdsList: TDSNatureOfPaymentType[];
  onSelect: (t: TDSNatureOfPaymentType) => void;
  onCancel: () => void;
  onCreate: () => void;
}

export default function TDSNatureOfPaymentSelectionPanel({
  tdsList,
  onSelect,
  onCancel,
  onCreate,
}: TDSNatureOfPaymentSelectionPanelProps) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        onCreate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel, onCreate]);

  const filtered = tdsList.filter((t) =>
    (t.name && t.name.toLowerCase().includes(search.toLowerCase())) ||
    (t.section && t.section.toLowerCase().includes(search.toLowerCase())) ||
    (t.payment_code && t.payment_code.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    {
      key: "name",
      label: "Nature of Payment",
      span: "col-span-5",
      render: (r: TDSNatureOfPaymentType) => (
        <span className="font-bold text-zinc-950 uppercase flex items-center gap-1.5">
          {r.name}
          {r.is_predefined === 1 && (
            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-zinc-100 text-zinc-500 rounded tracking-wider border border-zinc-200">
              PREDEFINED
            </span>
          )}
        </span>
      ),
    },
    {
      key: "section",
      label: "Section",
      span: "col-span-2",
      render: (r: TDSNatureOfPaymentType) => (
        <span className="text-zinc-500 font-semibold uppercase">{r.section || "—"}</span>
      ),
    },
    {
      key: "payment_code",
      label: "Payment Code",
      span: "col-span-2",
      render: (r: TDSNatureOfPaymentType) => (
        <span className="text-zinc-500 font-semibold uppercase">{r.payment_code || "—"}</span>
      ),
    },
    {
      key: "rate_individual_with_pan",
      label: "Indiv Rate",
      span: "col-span-1.5",
      align: "right" as const,
      render: (r: TDSNatureOfPaymentType) => (
        <span className="text-zinc-700 font-bold">{r.rate_individual_with_pan ?? 0}%</span>
      ),
    },
    {
      key: "rate_other_with_pan",
      label: "Other Rate",
      span: "col-span-1.5",
      align: "right" as const,
      render: (r: TDSNatureOfPaymentType) => (
        <span className="text-zinc-700 font-bold">{r.rate_other_with_pan ?? 0}%</span>
      ),
    },
  ];

  const selectionActions = [
    { key: "Alt+C", label: "Create TDS Nature", onClick: onCreate },
    { key: "Esc", label: "Quit", onClick: onCancel },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none font-sans">
      <PageTitleBar title="Alter TDS Nature of Payment" subtitle="Select TDS Nature of Payment to Alter" />
      <div className="p-3 bg-zinc-50 border-b border-zinc-200 shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search nature of payment by name, section or payment code…"
          autoFocus
        />
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col bg-white border-r border-zinc-100">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r: TDSNatureOfPaymentType) => String(r.tds_id)}
            onRowClick={onSelect}
            emptyMessage="No TDS Nature of Payment records found."
          />
        </div>
        <RightActionPanel actions={selectionActions} />
      </div>
      <div className="border-t border-zinc-200 p-3 flex justify-end bg-zinc-50">
        <button
          onClick={onCancel}
          className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white shadow-sm text-zinc-600 hover:bg-zinc-50 transition-colors font-medium font-sans"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
