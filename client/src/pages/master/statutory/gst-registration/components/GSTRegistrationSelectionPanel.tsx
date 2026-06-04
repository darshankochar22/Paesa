import { useState, useEffect } from "react";
import { PageTitleBar, RightActionPanel, SearchInput, DataTable } from "@/components/ui";
import type { GSTRegistrationType } from "@/types/entities/GSTRegistration";

interface GSTRegistrationSelectionPanelProps {
  registrations: GSTRegistrationType[];
  onSelect: (r: GSTRegistrationType) => void;
  onCancel: () => void;
  onCreate: () => void;
}

export default function GSTRegistrationSelectionPanel({
  registrations,
  onSelect,
  onCancel,
  onCreate,
}: GSTRegistrationSelectionPanelProps) {
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

  const filtered = registrations.filter((r) =>
    (r.gstin && r.gstin.toLowerCase().includes(search.toLowerCase())) ||
    (r.state_id && r.state_id.toLowerCase().includes(search.toLowerCase())) ||
    (r.trade_name && r.trade_name.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    {
      key: "gstin",
      label: "GSTIN",
      span: "col-span-4",
      render: (r: GSTRegistrationType) => (
        <span className="font-bold text-zinc-950 text-sm tracking-wider uppercase">
          {r.gstin}
        </span>
      ),
    },
    {
      key: "state_id",
      label: "State",
      span: "col-span-3",
      render: (r: GSTRegistrationType) => (
        <span className="text-zinc-500 font-semibold uppercase">{r.state_id}</span>
      ),
    },
    {
      key: "trade_name",
      label: "Trade/Legal Name",
      span: "col-span-3",
      render: (r: GSTRegistrationType) => (
        <span className="text-zinc-600 font-medium truncate block">
          {r.trade_name || r.legal_name || "—"}
        </span>
      ),
    },
    {
      key: "registration_type",
      label: "Type",
      span: "col-span-2",
      render: (r: GSTRegistrationType) => (
        <span className="text-zinc-500 text-[10px]">{r.registration_type}</span>
      ),
    },
  ];

  const selectionActions = [
    { key: "Alt+C", label: "Create GST Reg", onClick: onCreate },
    { key: "Esc", label: "Quit", onClick: onCancel },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none font-sans">
      <PageTitleBar title="Alter GST Registration" subtitle="Select GST Registration to Alter" />

      <div className="p-3 bg-zinc-50 border-b border-zinc-200 shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search GSTIN by code, state or business name…"
          autoFocus
        />
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col bg-white border-r border-zinc-100">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r: GSTRegistrationType) => String(r.gst_id)}
            onRowClick={onSelect}
            emptyMessage="No GST registrations found."
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
