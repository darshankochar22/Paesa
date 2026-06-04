import { useState, useEffect } from "react";
import { PageTitleBar, RightActionPanel, SearchInput, DataTable } from "@/components/ui";
import type { GSTClassificationType } from "@/types/entities/GSTClassification";

interface GSTClassificationSelectionPanelProps {
  classifications: GSTClassificationType[];
  onSelect: (c: GSTClassificationType) => void;
  onCancel: () => void;
  onCreate: () => void;
}

export default function GSTClassificationSelectionPanel({
  classifications,
  onSelect,
  onCancel,
  onCreate,
}: GSTClassificationSelectionPanelProps) {
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

  const filtered = classifications.filter((c) =>
    (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
    (c.hsn_sac_code && c.hsn_sac_code.toLowerCase().includes(search.toLowerCase())) ||
    (c.nature_of_transaction && c.nature_of_transaction.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    {
      key: "name",
      label: "Classification Name",
      span: "col-span-5",
      render: (r: GSTClassificationType) => (
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
      key: "hsn_sac_code",
      label: "HSN/SAC",
      span: "col-span-2",
      render: (r: GSTClassificationType) => (
        <span className="text-zinc-500 font-semibold uppercase">{r.hsn_sac_code || "—"}</span>
      ),
    },
    {
      key: "igst_rate",
      label: "Rate %",
      span: "col-span-2",
      align: "right" as const,
      render: (r: GSTClassificationType) => (
        <span className="text-zinc-700 font-bold">{r.igst_rate ?? 0}%</span>
      ),
    },
    {
      key: "nature_of_transaction",
      label: "Nature",
      span: "col-span-3",
      render: (r: GSTClassificationType) => (
        <span className="text-zinc-500 truncate block">{r.nature_of_transaction || "—"}</span>
      ),
    },
  ];

  const selectionActions = [
    { key: "Alt+C", label: "Create GST Class", onClick: onCreate },
    { key: "Esc", label: "Quit", onClick: onCancel },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none font-sans">
      <PageTitleBar title="Alter GST Classification" subtitle="Select GST Classification to Alter" />
      <div className="p-3 bg-zinc-50 border-b border-zinc-200 shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search classifications by name, HSN or transaction nature…"
          autoFocus
        />
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col bg-white border-r border-zinc-100">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r: GSTClassificationType) => String(r.gc_id)}
            onRowClick={onSelect}
            emptyMessage="No GST classifications found."
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
