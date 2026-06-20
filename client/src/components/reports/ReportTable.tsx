import * as React from "react";

export interface ReportColumn {
  header: string;
  field: string;
  align?: "left" | "right" | "center";
  type?: "text" | "number" | "currency" | "date";
  width?: string;
}

export interface ComparisonColumn {
  id: string;
  companyId: number;
  companyName: string;
  fromDate: string;
  toDate: string;
}

interface ReportTableProps {
  columns: ReportColumn[];
  rows: any[];
  comparisonColumns: ComparisonColumn[];
  onRowDrillDown?: (row: any) => void;
  expandedRows: Record<string | number, boolean>;
  onToggleExpand: (rowId: string | number) => void;
  hiddenRowIds: Set<string | number>;
  onHideRow: (rowId: string | number) => void;
  selectedRowIds: Set<string | number>;
  onToggleSelectRow: (rowId: string | number) => void;
  primaryKey?: string;
  detailedFormat?: boolean;
}

export function ReportTable({
  columns,
  rows,
  comparisonColumns,
  onRowDrillDown,
  expandedRows,
  onToggleExpand,
  hiddenRowIds,
  onHideRow,
  selectedRowIds,
  onToggleSelectRow,
  primaryKey = "id",
  detailedFormat = false,
}: ReportTableProps) {
  const [focusedIndex, setFocusedIndex] = React.useState<number>(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const visibleRows = React.useMemo(() => {
    return rows.filter((row) => !hiddenRowIds.has(row[primaryKey]));
  }, [rows, hiddenRowIds, primaryKey]);

  React.useEffect(() => {
    // Keep focused index within bounds
    if (focusedIndex >= visibleRows.length) {
      setFocusedIndex(Math.max(0, visibleRows.length - 1));
    }
  }, [visibleRows, focusedIndex]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If a modal/dialog is open, ignore table keyboard shortcuts
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "SELECT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.closest("[role='dialog']"))
      ) {
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(visibleRows.length - 1, prev + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "Enter") {
        const activeRow = visibleRows[focusedIndex];
        if (activeRow) {
          e.preventDefault();
          if (onRowDrillDown) {
            onRowDrillDown(activeRow);
          }
        }
      } else if (e.key === "Space") {
        const activeRow = visibleRows[focusedIndex];
        if (activeRow) {
          e.preventDefault();
          onToggleSelectRow(activeRow[primaryKey]);
        }
      } else if (e.key === "Enter" && e.shiftKey) {
        const activeRow = visibleRows[focusedIndex];
        if (activeRow) {
          e.preventDefault();
          onToggleExpand(activeRow[primaryKey]);
        }
      } else if (e.key === "Delete") {
        const activeRow = visibleRows[focusedIndex];
        if (activeRow) {
          e.preventDefault();
          onHideRow(activeRow[primaryKey]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visibleRows, focusedIndex, onRowDrillDown, onToggleSelectRow, onToggleExpand, onHideRow, primaryKey]);

  React.useEffect(() => {
    // Scroll focused row into view if necessary
    const container = containerRef.current;
    if (!container) return;
    const focusedRowElement = container.querySelector(`[data-row-index="${focusedIndex}"]`);
    if (focusedRowElement) {
      focusedRowElement.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex]);

  const formatValue = (val: any, type?: string) => {
    if (val === undefined || val === null) return "";
    if (type === "currency") {
      const num = Number(val);
      if (isNaN(num)) return val;
      // Indian number format with ₹ symbol
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
      return formatted;
    }
    if (type === "number") {
      const num = Number(val);
      if (isNaN(num)) return val;
      return num.toLocaleString("en-IN");
    }
    if (type === "date") {
      try {
        return new Date(val).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      } catch {
        return String(val);
      }
    }
    return String(val);
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col h-full overflow-auto bg-white border-b border-zinc-300">
      <table className="w-full border-collapse font-mono text-[10px] select-none text-zinc-900">
        <thead className="sticky top-0 bg-[#2e7d32] text-white z-10 shadow-sm">
          {comparisonColumns.length > 0 && (
            <tr>
              <th className="border-b border-r border-[#1b5e20] px-2 py-1 text-left font-bold" colSpan={columns.length - (columns.length > 1 ? 1 : 0)}>
                Particulars
              </th>
              {comparisonColumns.map((col) => (
                <th
                  key={col.id}
                  className="border-b border-r border-[#1b5e20] px-2 py-1 text-center font-bold"
                  colSpan={1}
                >
                  <div className="text-[9px] truncate max-w-[150px]">{col.companyName}</div>
                  <div className="text-[8px] text-green-100 font-normal">
                    {col.fromDate} to {col.toDate}
                  </div>
                </th>
              ))}
            </tr>
          )}
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="border-b-2 border-r border-[#1b5e20] px-2 py-1 font-bold uppercase text-left last:border-r-0 tracking-wide"
                style={{ width: col.width, textAlign: col.align || "left" }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-zinc-400 italic bg-zinc-50">
                No records found for the selected period.
              </td>
            </tr>
          ) : (
            visibleRows.map((row, rowIndex) => {
              const rowId = row[primaryKey];
              const isFocused = rowIndex === focusedIndex;
              const isSelected = selectedRowIds.has(rowId);
              const isExpanded = expandedRows[rowId] || detailedFormat;
              const isTotal = row.isTotal || row.label?.toLowerCase().includes("total");
              const isHeader = row.isHeader;

              return (
                <React.Fragment key={rowId}>
                  <tr
                    data-row-index={rowIndex}
                    onClick={() => setFocusedIndex(rowIndex)}
                    onDoubleClick={() => onRowDrillDown?.(row)}
                    className={`border-b border-zinc-200 hover:bg-blue-50 transition-colors cursor-pointer ${
                      isFocused ? "bg-[#fff59d] border-l-4 border-l-[#f57c00]" : ""
                    } ${isSelected ? "bg-[#ffe0b2] font-semibold" : ""} ${
                      isTotal ? "bg-[#e3f2fd] font-bold border-t-2 border-[#1565c0]" : ""
                    } ${isHeader ? "bg-[#f5f5f5] font-bold text-[#1a237e] border-t border-zinc-400" : ""}`}
                  >
                    {columns.map((col, colIdx) => {
                      const alignClass =
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";
                      return (
                        <td
                          key={colIdx}
                          className={`px-2 py-1 border-r border-zinc-100 last:border-r-0 ${alignClass} ${
                            isTotal ? "font-bold" : ""
                          }`}
                        >
                          {colIdx === 0 && row.subItems && row.subItems.length > 0 && (
                            <span className="mr-1 text-[#1565c0] font-bold">
                              {isExpanded ? "▼" : "▶"}
                            </span>
                          )}
                          <span className={col.type === "currency" ? "tabular-nums" : ""}>
                            {formatValue(row[col.field], col.type)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Expanded Sub items / Breakdown details */}
                  {isExpanded && row.subItems && row.subItems.map((sub: any, subIdx: number) => (
                    <tr
                      key={`${rowId}-sub-${subIdx}`}
                      className="bg-[#fafafa] border-b border-zinc-100 text-zinc-600 font-mono text-[9px]"
                    >
                      {columns.map((col, colIdx) => {
                        const alignClass =
                          col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";
                        return (
                          <td
                            key={colIdx}
                            className={`px-6 py-0.5 border-r border-zinc-100 last:border-r-0 ${alignClass}`}
                          >
                            {formatValue(sub[col.field], col.type)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
