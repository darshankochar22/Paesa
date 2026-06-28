import { useState, useEffect, useRef } from "react";
import { PageTitleBar, RightActionPanel, Select } from "@/components/ui";
import type {
  ExciseBookType,
  ExciseBookRestartRow,
  ExciseBookAffixRow,
} from "@/types/api";
import {
  EXCISE_NUMBERING_METHODS,
  EMPTY_RESTART_ROW,
  EMPTY_AFFIX_ROW,
} from "@/types/entities/ExciseBook";

const inputCls =
  "w-full bg-transparent text-[12px] font-bold text-zinc-950 font-mono outline-none py-1 px-1 border-b border-transparent focus:border-zinc-400 transition-colors";
const cellCls =
  "w-full bg-transparent text-[12px] text-zinc-950 font-mono outline-none py-1 px-1.5 border border-transparent focus:border-zinc-400 transition-colors";

// Standard excise forms shown in the "Used for" picker.
const EXCISE_FORMS = ["ARE-1", "ARE-2", "ARE-3", "Rule -11 Invoice"];

interface Props {
  mode: "create" | "alter";
  companyId: number;
  initial?: ExciseBookType;
  onSaved: (msg: string) => void;
  onCancel: () => void;
  onBack: () => void;
  onDelete?: () => void;
}

function Row({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start min-h-[36px] border-b border-zinc-100 last:border-0">
      <span className="w-56 text-[12px] text-zinc-600 shrink-0 py-1.5 pl-3 select-none">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-zinc-400 mr-2 py-1.5 select-none">:</span>
      <div className="flex-1 py-1">{children}</div>
    </div>
  );
}

function YesNoSelect({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Select
      className="border-0 h-7 font-mono font-bold w-24"
      value={value ? "Yes" : "No"}
      onChange={(e) => onChange(e.target.value === "Yes")}
    >
      <option>Yes</option>
      <option>No</option>
    </Select>
  );
}

export default function ExciseBookForm({
  mode,
  companyId,
  initial,
  onSaved,
  onCancel,
  onBack,
  onDelete,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [alias, setAlias] = useState(initial?.alias ?? "");
  const [numberingMethod, setNumberingMethod] = useState<string>(
    initial?.numbering_method ?? "Automatic"
  );
  const [preventDuplicates, setPreventDuplicates] = useState<boolean>(
    !!initial?.prevent_duplicates
  );
  const [startingNumber, setStartingNumber] = useState<number>(
    initial?.starting_number ?? 1
  );
  const [width, setWidth] = useState<number>(initial?.width_of_numerical_part ?? 0);
  const [prefillZero, setPrefillZero] = useState<boolean>(!!initial?.prefill_with_zero);
  const [usedFor, setUsedFor] = useState(initial?.used_for ?? "");

  const [restart, setRestart] = useState<ExciseBookRestartRow[]>(
    initial?.restart_numbering ?? []
  );
  const [prefix, setPrefix] = useState<ExciseBookAffixRow[]>(
    initial?.prefix_details ?? []
  );
  const [suffix, setSuffix] = useState<ExciseBookAffixRow[]>(
    initial?.suffix_details ?? []
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFormsList, setShowFormsList] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setLoading(true);
    setError(null);
    const payload: Partial<ExciseBookType> = {
      company_id: companyId,
      name: name.trim(),
      alias: alias.trim() || null,
      numbering_method: numberingMethod,
      prevent_duplicates: preventDuplicates ? 1 : 0,
      starting_number: Number(startingNumber) || 0,
      width_of_numerical_part: Number(width) || 0,
      prefill_with_zero: prefillZero ? 1 : 0,
      used_for: usedFor.trim() || null,
      restart_numbering: restart,
      prefix_details: prefix,
      suffix_details: suffix,
    };
    try {
      const res =
        mode === "create"
          ? await window.api.exciseBook.create(payload)
          : await window.api.exciseBook.update({
              ...payload,
              excise_book_id: initial!.excise_book_id,
            });
      if (res.success) {
        onSaved(`Excise Book "${name.trim()}" ${mode === "create" ? "created" : "updated"}.`);
      } else {
        setError(res.error || "Failed to save excise book.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  const formActions = [
    { key: "Ctrl+A", label: "Accept", onClick: handleSubmit },
    ...(onDelete ? [{ key: "Alt+D", label: "Delete", onClick: onDelete }] : []),
    { key: "Esc", label: mode === "alter" ? "Back" : "Quit", onClick: onBack },
  ];

  const title =
    mode === "create" ? "Excise Book Creation" : "Excise Book Alteration";

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-950 font-mono text-[12px]">
      <PageTitleBar title={title} />

      {error && (
        <div className="mx-6 mt-4 p-2 border border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center font-sans">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">
            &times;
          </button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto bg-white border border-zinc-300 shadow-sm">
            <div className="bg-zinc-100 px-3 py-1.5 border-b border-zinc-200 text-center font-bold text-xs uppercase tracking-wider text-zinc-700">
              {title}
            </div>

            <div className="p-4 flex flex-col gap-1 max-w-2xl">
              <Row label="Name" required>
                <input ref={nameRef} className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
              </Row>
              <Row label="(alias)">
                <input className={inputCls} value={alias} onChange={(e) => setAlias(e.target.value)} />
              </Row>
              <Row label="Method of numbering">
                <Select
                  className="border-0 h-7 font-mono font-bold w-72"
                  value={numberingMethod}
                  onChange={(e) => setNumberingMethod(e.target.value)}
                >
                  {EXCISE_NUMBERING_METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </Select>
              </Row>
              <Row label="Prevent duplicates">
                <YesNoSelect value={preventDuplicates} onChange={setPreventDuplicates} />
              </Row>
              <Row label="Starting number">
                <input
                  type="number"
                  className={`${inputCls} w-32`}
                  value={startingNumber}
                  onChange={(e) => setStartingNumber(Number(e.target.value))}
                />
              </Row>
              <Row label="Width of numerical part">
                <input
                  type="number"
                  className={`${inputCls} w-32`}
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                />
              </Row>
              <Row label="Prefill with zero">
                <YesNoSelect value={prefillZero} onChange={setPrefillZero} />
              </Row>
              <Row label="Used for">
                <div className="relative">
                  <input
                    className={inputCls}
                    value={usedFor}
                    onChange={(e) => { setUsedFor(e.target.value); setShowFormsList(true); }}
                    onFocus={() => setShowFormsList(true)}
                    onBlur={() => setTimeout(() => setShowFormsList(false), 150)}
                    placeholder="e.g. Rule -11 Invoice"
                  />
                  {showFormsList && (
                    <div className="absolute left-0 top-full mt-0.5 z-50 bg-white border border-zinc-300 shadow-xl w-56 flex flex-col">
                      <div className="bg-zinc-800 text-white text-[11px] font-bold px-3 py-1.5 shrink-0">
                        List of Forms
                      </div>
                      {EXCISE_FORMS.filter((f) =>
                        f.toLowerCase().includes(usedFor.toLowerCase())
                      ).map((f) => (
                        <div
                          key={f}
                          onMouseDown={(e) => { e.preventDefault(); setUsedFor(f); setShowFormsList(false); }}
                          className={`px-3 py-1.5 text-[12px] font-mono cursor-pointer border-b border-zinc-50 ${
                            usedFor === f ? "bg-zinc-100 text-black font-bold" : "text-zinc-700 hover:bg-zinc-50"
                          }`}
                        >
                          {f}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Row>
            </div>

            {/* Numbering tables — three sections side-by-side in one row */}
            <div className="flex border-t border-zinc-200 divide-x divide-zinc-200">
              <RestartNumberingTable rows={restart} onChange={setRestart} className="flex-1 min-w-0" />
              <AffixTable title="Prefix Details" rows={prefix} onChange={setPrefix} className="flex-1 min-w-0" />
              <AffixTable title="Suffix Details" rows={suffix} onChange={setSuffix} className="flex-1 min-w-0" />
            </div>
          </div>
        </div>

        <RightActionPanel actions={formActions} />
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0 font-sans">
        {onDelete ? (
          <button
            onClick={onDelete}
            disabled={loading}
            className="text-xs px-4 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-colors font-medium shadow-sm"
          >
            Delete
          </button>
        ) : (
          <button onClick={onCancel} className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium">
            &larr; Back to Masters
          </button>
        )}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium"
          >
            Quit
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium"
          >
            {loading ? "Saving…" : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Restart Numbering table ─────────────────
   Cols: Applicable From (date) | Starting Number (int) | Particulars (text).
   One blank row is always rendered at the bottom to add into; typing into any
   field of the blank row materialises it. Each filled row gets a remove button. */

function RestartNumberingTable({
  rows,
  onChange,
  className,
}: {
  rows: ExciseBookRestartRow[];
  onChange: (rows: ExciseBookRestartRow[]) => void;
  className?: string;
}) {
  const all = [...rows, { ...EMPTY_RESTART_ROW }];

  const setCell = (i: number, patch: Partial<ExciseBookRestartRow>) => {
    const next = all.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    // drop trailing fully-blank rows (keep only filled ones)
    onChange(
      next.filter(
        (r) => r.applicable_from.trim() || r.particulars.trim()
      )
    );
  };
  const removeAt = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <div className={className}>
      <div className="bg-zinc-50 px-3 py-1.5 border-b border-zinc-200 font-bold text-[11px] uppercase tracking-wider text-zinc-600">
        Restart Numbering
      </div>
      <div className="grid grid-cols-[1fr_1fr_1.4fr_28px] bg-zinc-100 border-b border-zinc-200 text-[11px] font-bold text-zinc-600">
        <div className="py-1.5 px-1.5 border-r border-zinc-200">Applicable From</div>
        <div className="py-1.5 px-1.5 border-r border-zinc-200">Starting Number</div>
        <div className="py-1.5 px-1.5 border-r border-zinc-200">Particulars</div>
        <div className="py-1.5 px-1.5" />
      </div>
      {all.map((r, i) => {
        const isBlank = i === all.length - 1;
        return (
          <div
            key={i}
            className="grid grid-cols-[1fr_1fr_1.4fr_28px] border-b border-zinc-100 items-center"
          >
            <input
              type="date"
              className={`${cellCls} border-r border-zinc-100`}
              value={r.applicable_from}
              onChange={(e) => setCell(i, { applicable_from: e.target.value })}
            />
            <input
              type="number"
              className={`${cellCls} border-r border-zinc-100`}
              value={r.starting_number}
              onChange={(e) => setCell(i, { starting_number: Number(e.target.value) })}
            />
            <input
              className={`${cellCls} border-r border-zinc-100`}
              value={r.particulars}
              placeholder={isBlank ? "e.g. Yearly" : ""}
              onChange={(e) => setCell(i, { particulars: e.target.value })}
            />
            <button
              onClick={() => !isBlank && removeAt(i)}
              className={`text-sm font-bold leading-none ${
                isBlank ? "text-transparent cursor-default" : "text-zinc-300 hover:text-red-500"
              }`}
              title="Remove"
            >
              &times;
            </button>
          </div>
        );
      })}
      <div className="px-3 py-1 text-[11px] text-zinc-400 italic font-sans select-none">End of List</div>
    </div>
  );
}

/* ───────────────── Prefix / Suffix table ─────────────────
   Cols: Applicable From (date) | Particulars (text). Same blank-row pattern. */

function AffixTable({
  title,
  rows,
  onChange,
  className,
}: {
  title: string;
  rows: ExciseBookAffixRow[];
  onChange: (rows: ExciseBookAffixRow[]) => void;
  className?: string;
}) {
  const all = [...rows, { ...EMPTY_AFFIX_ROW }];

  const setCell = (i: number, patch: Partial<ExciseBookAffixRow>) => {
    const next = all.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange(next.filter((r) => r.applicable_from.trim() || r.particulars.trim()));
  };
  const removeAt = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <div className={className}>
      <div className="bg-zinc-50 px-3 py-1.5 border-b border-zinc-200 font-bold text-[11px] uppercase tracking-wider text-zinc-600">
        {title}
      </div>
      <div className="grid grid-cols-[1fr_1.6fr_28px] bg-zinc-100 border-b border-zinc-200 text-[11px] font-bold text-zinc-600">
        <div className="py-1.5 px-1.5 border-r border-zinc-200">Applicable From</div>
        <div className="py-1.5 px-1.5 border-r border-zinc-200">Particulars</div>
        <div className="py-1.5 px-1.5" />
      </div>
      {all.map((r, i) => {
        const isBlank = i === all.length - 1;
        return (
          <div
            key={i}
            className="grid grid-cols-[1fr_1.6fr_28px] border-b border-zinc-100 items-center"
          >
            <input
              type="date"
              className={`${cellCls} border-r border-zinc-100`}
              value={r.applicable_from}
              onChange={(e) => setCell(i, { applicable_from: e.target.value })}
            />
            <input
              className={`${cellCls} border-r border-zinc-100`}
              value={r.particulars}
              onChange={(e) => setCell(i, { particulars: e.target.value })}
            />
            <button
              onClick={() => !isBlank && removeAt(i)}
              className={`text-sm font-bold leading-none ${
                isBlank ? "text-transparent cursor-default" : "text-zinc-300 hover:text-red-500"
              }`}
              title="Remove"
            >
              &times;
            </button>
          </div>
        );
      })}
      <div className="px-3 py-1 text-[11px] text-zinc-400 italic font-sans select-none">End of List</div>
    </div>
  );
}
