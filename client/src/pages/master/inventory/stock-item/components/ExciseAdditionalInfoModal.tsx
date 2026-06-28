import { useState, useEffect } from "react";
import type { TaxUnitType } from "@/types/entities/TaxUnit";
import { EXCISE_REPORTING_UOM_OPTIONS } from "../consts";

export interface ExciseAdditionalInfoRow {
  tax_unit_id: string;
  tax_unit_name: string;
  conv_qty_from: string;
  conv_qty_to: string;
  excise_uom: string;
  stock_item_type: string;
}

const STOCK_ITEM_NATURES = [
  "Capital Goods",
  "Finished Goods",
  "Intermediate Goods",
  "Other Inputs",
  "Principal Input",
  "Scrap",
];

const EMPTY_ROW: ExciseAdditionalInfoRow = {
  tax_unit_id: "",
  tax_unit_name: "",
  conv_qty_from: "",
  conv_qty_to: "",
  excise_uom: "",
  stock_item_type: "",
};

type ActivePopup =
  | { rowIndex: number; field: "exciseUnit" }
  | { rowIndex: number; field: "exciseUom" }
  | { rowIndex: number; field: "stockItemType" }
  | null;

interface Props {
  stockItemName: string;
  unitSymbol: string;
  companyId: number | undefined;
  initialRows: ExciseAdditionalInfoRow[];
  onAccept: (rows: ExciseAdditionalInfoRow[]) => void;
  onClose: () => void;
}

const thCls = "py-1.5 px-2 text-[11px] font-bold text-zinc-600 border-r border-zinc-200 last:border-r-0 text-left";
const tdCls = "border-r border-zinc-100 last:border-r-0";

export default function ExciseAdditionalInfoModal({
  stockItemName,
  unitSymbol,
  companyId,
  initialRows,
  onAccept,
  onClose,
}: Props) {
  const [rows, setRows] = useState<ExciseAdditionalInfoRow[]>(
    initialRows.length > 0 ? initialRows : [{ ...EMPTY_ROW }]
  );
  const [taxUnits, setTaxUnits] = useState<TaxUnitType[]>([]);
  const [activePopup, setActivePopup] = useState<ActivePopup>(null);

  useEffect(() => {
    if (!companyId) return;
    window.api.taxUnit.getAll(companyId).then((r: any) => {
      if (r.success) setTaxUnits(r.taxUnits ?? []);
    });
  }, [companyId]);

  const updateRow = (i: number, patch: Partial<ExciseAdditionalInfoRow>) =>
    setRows(prev => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const addRow = () => setRows(prev => [...prev, { ...EMPTY_ROW }]);
  const removeRow = (i: number) => setRows(prev => prev.filter((_, j) => j !== i));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (activePopup) { setActivePopup(null); return; }
      e.preventDefault(); onClose();
    }
    if (e.altKey && e.key.toLowerCase() === "a") { e.preventDefault(); onAccept(rows.filter(r => r.tax_unit_id)); }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white border border-zinc-300 shadow-xl flex flex-col" style={{ width: 860, maxHeight: "85vh" }}>

        {/* Title */}
        <div className="px-5 py-2.5 border-b border-zinc-200 flex items-center gap-3 shrink-0">
          <span className="text-sm font-semibold text-zinc-700">Excise Details for</span>
          <span className="text-zinc-400">:</span>
          <span className="text-sm font-bold text-zinc-900">{stockItemName}</span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-100 border-b border-zinc-200">
                <th className={thCls} style={{ width: "30%" }}>Excise Unit</th>
                <th className={thCls} style={{ width: "46%" }}>Conversion Factor</th>
                <th className={thCls} style={{ width: "22%" }}>Stock Item Type</th>
                <th className="py-1.5 px-1 w-6" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-zinc-100 align-middle hover:bg-zinc-50">

                  {/* Excise Unit */}
                  <td className={tdCls}>
                    <button
                      type="button"
                      className="w-full text-left px-2 py-1 text-sm focus:bg-yellow-50 outline-none"
                      onClick={() => setActivePopup({ rowIndex: i, field: "exciseUnit" })}
                    >
                      {row.tax_unit_name || <span className="text-zinc-300 italic text-xs">select…</span>}
                    </button>
                  </td>

                  {/* Conversion Factor: qty_from | unit | = | qty_to | uom */}
                  <td className={tdCls}>
                    <div className="flex items-center gap-1 px-2 py-1">
                      <input
                        type="number"
                        className="w-14 text-right text-sm font-mono outline-none bg-transparent hover:bg-zinc-100 focus:bg-yellow-50 px-1 py-0.5"
                        value={row.conv_qty_from}
                        onChange={e => updateRow(i, { conv_qty_from: e.target.value })}
                        placeholder="1"
                      />
                      <span className="text-zinc-500 text-xs shrink-0">{unitSymbol || "Nos"}</span>
                      <span className="text-zinc-400 text-xs shrink-0 mx-0.5">=</span>
                      <input
                        type="number"
                        className="w-14 text-right text-sm font-mono outline-none bg-transparent hover:bg-zinc-100 focus:bg-yellow-50 px-1 py-0.5"
                        value={row.conv_qty_to}
                        onChange={e => updateRow(i, { conv_qty_to: e.target.value })}
                        placeholder="1"
                      />
                      <button
                        type="button"
                        className="text-sm font-mono outline-none px-1 py-0.5 hover:bg-zinc-100 focus:bg-yellow-50 min-w-[40px] text-left"
                        onClick={() => setActivePopup({ rowIndex: i, field: "exciseUom" })}
                      >
                        {row.excise_uom || <span className="text-zinc-300 italic text-xs">UoM</span>}
                      </button>
                    </div>
                  </td>

                  {/* Stock Item Type */}
                  <td className={tdCls}>
                    <button
                      type="button"
                      className="w-full text-left px-2 py-1 text-sm focus:bg-yellow-50 outline-none"
                      onClick={() => setActivePopup({ rowIndex: i, field: "stockItemType" })}
                    >
                      {row.stock_item_type || <span className="text-zinc-300 italic text-xs">select…</span>}
                    </button>
                  </td>

                  {/* Remove */}
                  <td className="px-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-zinc-300 hover:text-zinc-800 font-bold text-sm leading-none"
                      title="Remove"
                    >&times;</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-3 py-1.5">
            <button
              type="button"
              onClick={addRow}
              className="text-xs text-zinc-500 hover:text-zinc-900 border border-zinc-200 px-3 py-1 hover:bg-zinc-50 transition-colors"
            >
              + Add Row
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 flex text-xs bg-zinc-50 shrink-0">
          <button onClick={onClose} className="flex-1 py-2 border-r border-zinc-200 hover:bg-zinc-100 text-left px-4 transition-colors">
            <span className="font-bold">Q</span>: Quit
          </button>
          <button
            onClick={() => onAccept(rows.filter(r => r.tax_unit_id))}
            className="flex-1 py-2 hover:bg-zinc-100 text-left px-4 transition-colors"
          >
            <span className="font-bold">Alt+A</span>: Accept
          </button>
        </div>
      </div>

      {/* ── List of Excise Units panel ── */}
      {activePopup?.field === "exciseUnit" && (
        <div
          className="absolute top-1/2 -translate-y-1/2 bg-white border border-zinc-300 shadow-xl flex flex-col"
          style={{ left: "calc(50% + 432px)", width: 280, maxHeight: 360 }}
        >
          <div className="bg-zinc-800 text-white text-xs font-bold px-3 py-1.5 shrink-0">List of Excise Units</div>
          <div className="overflow-y-auto flex-1">
            {taxUnits.length === 0 ? (
              <div className="px-3 py-2 text-xs text-zinc-400 italic">No tax units found.</div>
            ) : (
              taxUnits.map(tu => (
                <div
                  key={tu.tax_unit_id}
                  className={[
                    "flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer border-b border-zinc-50",
                    rows[activePopup.rowIndex]?.tax_unit_id === String(tu.tax_unit_id)
                      ? "bg-amber-400 text-zinc-900 font-semibold"
                      : "hover:bg-zinc-100 text-zinc-800",
                  ].join(" ")}
                  onMouseDown={e => {
                    e.preventDefault();
                    updateRow(activePopup.rowIndex, {
                      tax_unit_id: String(tu.tax_unit_id),
                      tax_unit_name: tu.name,
                    });
                    setActivePopup(null);
                  }}
                >
                  <span className="truncate">{tu.name}</span>
                  <span className="ml-2 text-xs italic text-zinc-500 shrink-0">
                    {tu.registration_type || ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── List of Excise Reporting UoMs panel ── */}
      {activePopup?.field === "exciseUom" && (
        <div
          className="absolute top-1/2 -translate-y-1/2 bg-white border border-zinc-300 shadow-xl flex flex-col"
          style={{ left: "calc(50% + 432px)", width: 300, maxHeight: 400 }}
        >
          <div className="bg-zinc-800 text-white text-xs font-bold px-3 py-1.5 shrink-0">List of Excise Reporting UoMs</div>
          <div className="grid grid-cols-[80px_1fr] bg-zinc-100 border-b border-zinc-200 shrink-0">
            <div className="px-2 py-1 text-[10px] font-bold text-zinc-600 border-r border-zinc-200">Excise UoM</div>
            <div className="px-2 py-1 text-[10px] font-bold text-zinc-600">Description</div>
          </div>
          <div className="overflow-y-auto flex-1">
            {EXCISE_REPORTING_UOM_OPTIONS.filter(o => o.id !== "Undefined").map(opt => {
              const [code, ...rest] = opt.label.split(" - ");
              const desc = rest.join(" - ");
              return (
                <div
                  key={opt.id}
                  className={[
                    "grid grid-cols-[80px_1fr] border-b border-zinc-50 cursor-pointer",
                    rows[activePopup.rowIndex]?.excise_uom === opt.id
                      ? "bg-amber-400 text-zinc-900 font-semibold"
                      : "hover:bg-zinc-100 text-zinc-800",
                  ].join(" ")}
                  onMouseDown={e => {
                    e.preventDefault();
                    updateRow(activePopup.rowIndex, { excise_uom: opt.id });
                    setActivePopup(null);
                  }}
                >
                  <div className="px-2 py-1 text-xs font-mono border-r border-zinc-100">{code.trim()}</div>
                  <div className="px-2 py-1 text-xs italic">{desc.trim()}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Natures of Stock Item panel ── */}
      {activePopup?.field === "stockItemType" && (
        <div
          className="absolute top-1/2 -translate-y-1/2 bg-white border border-zinc-300 shadow-xl flex flex-col"
          style={{ left: "calc(50% + 432px)", width: 220, maxHeight: 280 }}
        >
          <div className="bg-zinc-800 text-white text-xs font-bold px-3 py-1.5 shrink-0">Natures of Stock Item</div>
          <div className="overflow-y-auto flex-1">
            {STOCK_ITEM_NATURES.map(n => (
              <div
                key={n}
                className={[
                  "px-3 py-1.5 text-sm cursor-pointer border-b border-zinc-50",
                  rows[activePopup.rowIndex]?.stock_item_type === n
                    ? "bg-amber-400 text-zinc-900 font-semibold"
                    : "hover:bg-zinc-100 text-zinc-800",
                ].join(" ")}
                onMouseDown={e => {
                  e.preventDefault();
                  updateRow(activePopup.rowIndex, { stock_item_type: n });
                  setActivePopup(null);
                }}
              >
                {n}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
