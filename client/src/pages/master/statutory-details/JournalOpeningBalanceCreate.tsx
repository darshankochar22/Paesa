import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import {
  PageTitleBar,
  RightActionPanel,
  MasterFormFooter,
  AlertBanner,
} from "@/components/ui";
import LedgerListPanel from "@/pages/transactions/components/LedgerListPanel";
import type { LedgerType } from "@/types/entities/Ledger";

// Shared screen for the three Excise "Opening Balance" entries (#147 CENVAT,
// #148 PLA, #151 Excise). In TallyPrime each of these is a Journal voucher with
// a fixed Status — not a bespoke master — so this posts through the existing
// voucher stack via window.api.voucher.create, exactly like #150 Dealer Excise
// Opening Stock reuses it for a Purchase voucher.

type DrCr = "Dr" | "Cr";

interface JournalRow {
  id: number;
  ledger: LedgerType | null;
  type: DrCr;
  amountRaw: string;
}

let rowSeq = 1;
const blankRow = (type: DrCr): JournalRow => ({
  id: rowSeq++,
  ledger: null,
  type,
  amountRaw: "",
});

const inr = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}-${MONTHS[(m || 1) - 1]}-${String(y).slice(-2)}`;
};

export interface JournalOpeningBalanceCreateProps {
  /** Title bar text, e.g. "PLA Opening Balance Creation". */
  title: string;
  /** Voucher status persisted on the Journal, e.g. "PLA Opening Balance". */
  status: string;
  /** Read-only Tax Unit value: "♦ Not Applicable" (PLA/CENVAT) or "Default Tax Unit" (Excise). */
  taxUnitLabel: string;
  /** Success banner text. */
  successLabel: string;
  /** CENVAT only — show the "CENVAT credit of" selector. */
  creditOf?: boolean;
}

const CREDIT_OF_OPTIONS = ["Inputs", "Capital Goods", "Input Services"];

export default function JournalOpeningBalanceCreate({
  title,
  status,
  taxUnitLabel,
  successLabel,
  creditOf = false,
}: JournalOpeningBalanceCreateProps) {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  // Opening balances are always dated to the first day of the financial year.
  const fyStartYear = useMemo(() => {
    if (activeFY?.start_date) return Number(activeFY.start_date.slice(0, 4));
    return new Date().getFullYear();
  }, [activeFY]);
  const openingDate = `${fyStartYear}-04-01`;

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // header context
  const [journalNo, setJournalNo] = useState<string>("");
  const [gstRegistration, setGstRegistration] = useState<string>("♦ Not Applicable");
  const [creditOfValue, setCreditOfValue] = useState(CREDIT_OF_OPTIONS[0]);
  const [narration, setNarration] = useState("");

  // data + grid
  const [allLedgers, setAllLedgers] = useState<LedgerType[]>([]);
  const [rows, setRows] = useState<JournalRow[]>([blankRow("Dr"), blankRow("Cr")]);

  // ledger picker
  const [pickerRowId, setPickerRowId] = useState<number | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState("");

  // ── load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      try {
        const [ledRes, gstRes, numRes] = await Promise.all([
          window.api.ledger.getAll(companyId),
          window.api.gstRegistration.getAll(companyId),
          fyId
            ? window.api.voucher.getNextNumber(companyId, fyId, "Journal")
            : Promise.resolve(null),
        ]);
        if (ledRes?.success) {
          setAllLedgers((ledRes as { ledgers?: LedgerType[] }).ledgers ?? []);
        }
        if (gstRes?.success && Array.isArray(gstRes.gstRegistrations)) {
          const first = gstRes.gstRegistrations.find(
            (g) => g.state_id || g.legal_name || g.trade_name
          );
          if (first) {
            const state = first.state_id || "";
            setGstRegistration(
              state
                ? `${state} Registration`
                : first.legal_name || first.trade_name || selectedCompany?.name || "♦ Not Applicable"
            );
          } else if (selectedCompany?.name) {
            setGstRegistration(selectedCompany.name);
          }
        }
        if (numRes?.success && numRes.nextNumber != null) {
          setJournalNo(String(numRes.nextNumber));
        }
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [companyId, fyId, selectedCompany?.name]);

  // ── row helpers ───────────────────────────────────────────────────────────
  const updateRow = (id: number, patch: Partial<JournalRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: number) =>
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length ? next : [blankRow("Dr")];
    });

  const handleLedgerSelect = useCallback(
    (led: LedgerType) => {
      const targetId = pickerRowId;
      setPickerRowId(null);
      setLedgerSearch("");
      if (targetId == null) return;
      setRows((prev) => {
        const next = prev.map((r) =>
          r.id === targetId ? { ...r, ledger: led } : r
        );
        // keep one trailing blank row, alternating Dr/Cr like a Journal
        if (next.every((r) => r.ledger)) {
          const nextType: DrCr = next.length % 2 === 0 ? "Dr" : "Cr";
          next.push(blankRow(nextType));
        }
        return next;
      });
    },
    [pickerRowId]
  );

  // ── totals / balance ──────────────────────────────────────────────────────
  const totalDr = rows.reduce(
    (s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0),
    0
  );
  const totalCr = rows.reduce(
    (s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0),
    0
  );
  const difference = Math.abs(totalDr - totalCr);
  const balanced = totalDr > 0 && difference < 0.005;
  const filledRows = rows.filter(
    (r) => r.ledger && (Number(r.amountRaw) || 0) > 0
  );

  // ── save ────────────────────────────────────────────────────────────────
  const quit = useCallback(() => navigate("/master/create"), [navigate]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!companyId || !fyId) {
      setError("No active company / financial year.");
      return;
    }
    const hasDr = filledRows.some((r) => r.type === "Dr");
    const hasCr = filledRows.some((r) => r.type === "Cr");
    if (!hasDr || !hasCr) {
      setError("Enter at least one Debit and one Credit line.");
      return;
    }
    if (!balanced) {
      setError(`Debit and Credit must be equal. Difference: ${inr(difference)}`);
      return;
    }

    const entries = filledRows.map((r) => ({
      ledger_id: r.ledger!.ledger_id,
      ledger_name: r.ledger!.name,
      type: r.type,
      amount: Number(r.amountRaw) || 0,
    }));

    const fullNarration = creditOf
      ? [`CENVAT credit of: ${creditOfValue}`, narration].filter(Boolean).join(" — ")
      : narration || null;

    const payload = {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: "Journal",
      status,
      date: openingDate,
      is_invoice: 0,
      is_inventory_voucher: 0,
      is_accounting_voucher: 1,
      narration: fullNarration || null,
      entries,
    };

    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await window.api.voucher.create(payload as any);
      if (res?.success) {
        setSuccess(successLabel);
        setTimeout(() => navigate("/master/create"), 400);
      } else {
        setError(res?.error || "Failed to save.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [
    companyId,
    fyId,
    filledRows,
    balanced,
    difference,
    creditOf,
    creditOfValue,
    narration,
    status,
    openingDate,
    successLabel,
    navigate,
  ]);

  // ── keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (pickerRowId != null) return;
      if (e.key === "Escape") {
        e.preventDefault();
        quit();
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, quit, pickerRowId]);

  const actions = [
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Esc", label: "Quit", onClick: quit },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar
        title={title}
        subtitle={`As on ${fmtDate(openingDate)}`}
      />

      {error && (
        <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <AlertBanner
          type="success"
          message={success}
          onDismiss={() => setSuccess(null)}
        />
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          {/* header strip: voucher meta on the left, read-only context on the right */}
          <div className="flex border-b border-zinc-300 shrink-0">
            <div className="flex-1 flex flex-col gap-1 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-black border border-black px-2 py-0.5">
                  Journal
                </span>
                <span className="text-sm text-black">No.</span>
                <span className="text-sm font-semibold text-black tabular-nums">
                  {journalNo || "—"}
                </span>
              </div>

              {creditOf && (
                <div className="flex items-center gap-2">
                  <span className="w-40 text-sm text-black shrink-0">
                    CENVAT credit of
                  </span>
                  <span className="text-sm text-black shrink-0">:</span>
                  <select
                    className="text-sm border border-zinc-400 px-1 py-0 outline-none focus:border-black bg-white"
                    value={creditOfValue}
                    onChange={(e) => setCreditOfValue(e.target.value)}
                  >
                    {CREDIT_OF_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* right read-only context strip */}
            <div className="w-72 border-l border-zinc-300 px-3 py-2 flex flex-col gap-1 bg-zinc-50">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-600">Date</span>
                <span className="text-black font-semibold tabular-nums">
                  {fmtDate(openingDate)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-600">GST Registration</span>
                <span className="text-black font-medium">{gstRegistration}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-600">Tax Unit</span>
                <span className="text-black font-medium">{taxUnitLabel}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-600">Status</span>
                <span className="text-black font-semibold">{status}</span>
              </div>
            </div>
          </div>

          {/* Particulars table header */}
          <div className="flex border-b border-black shrink-0 px-3 py-0.5 bg-white">
            <div className="flex-1 text-sm font-semibold text-black">Particulars</div>
            <div className="w-16 text-center text-sm font-semibold text-black">
              Dr/Cr
            </div>
            <div className="w-40 text-right text-sm font-semibold text-black">
              Amount
            </div>
            <div className="w-6" />
          </div>

          {/* Particulars rows */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {rows.map((row, idx) => (
              <div
                key={row.id}
                className="flex items-center border-b border-zinc-100 min-h-[24px] group px-3 py-0"
              >
                <div className="flex-1 flex items-center gap-1">
                  <span className="text-xs text-zinc-500 w-5 shrink-0">
                    {row.type === "Dr" ? "By" : "To"}
                  </span>
                  <input
                    type="text"
                    readOnly
                    className="flex-1 text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black cursor-pointer"
                    value={row.ledger?.name ?? ""}
                    placeholder={idx === 0 ? "Select Ledger…" : ""}
                    onFocus={() => {
                      setPickerRowId(row.id);
                      setLedgerSearch("");
                    }}
                    onClick={() => {
                      setPickerRowId(row.id);
                      setLedgerSearch("");
                    }}
                  />
                </div>

                <div className="w-16 text-center">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() =>
                      updateRow(row.id, { type: row.type === "Dr" ? "Cr" : "Dr" })
                    }
                    className="text-xs font-semibold text-black border border-zinc-300 px-2 py-0.5 hover:border-black"
                  >
                    {row.type}
                  </button>
                </div>

                <div className="w-40 pr-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black tabular-nums"
                    value={row.amountRaw}
                    disabled={!row.ledger}
                    onChange={(e) =>
                      updateRow(row.id, { amountRaw: e.target.value })
                    }
                  />
                </div>

                <div className="w-6 text-center">
                  {rows.length > 1 && row.ledger && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => removeRow(row.id)}
                      className="text-xs text-zinc-300 hover:text-black opacity-0 group-hover:opacity-100"
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* filler rows */}
            {Array.from({ length: Math.max(0, 8 - rows.length) }).map((_, i) => (
              <div
                key={`f-${i}`}
                className="flex border-b border-zinc-50 min-h-[24px] px-3"
              />
            ))}
          </div>

          {/* totals + balance footer */}
          <div className="flex border-t border-black shrink-0 px-3 py-0.5 bg-white items-center">
            <div className="flex-1 text-xs text-zinc-700">
              {balanced ? (
                <span className="font-semibold text-black">Balanced</span>
              ) : difference > 0 ? (
                <span className="font-semibold text-black">
                  Difference: {inr(difference)}{" "}
                  {totalDr > totalCr ? "Dr" : "Cr"}
                </span>
              ) : (
                ""
              )}
            </div>
            <div className="w-16 text-center text-xs text-zinc-600 font-semibold">
              Dr / Cr
            </div>
            <div className="w-40 text-right text-sm font-semibold text-black tabular-nums pr-1">
              {totalDr > 0 ? inr(totalDr) : ""} / {totalCr > 0 ? inr(totalCr) : ""}
            </div>
            <div className="w-6" />
          </div>

          {/* narration */}
          <div className="border-t border-zinc-200 px-3 py-2 shrink-0 bg-white">
            <div className="flex items-start gap-2">
              <span className="text-sm text-black shrink-0 pt-0.5">Narration</span>
              <span className="text-sm text-black shrink-0 pt-0.5">:</span>
              <textarea
                className="flex-1 text-sm border border-zinc-400 px-1 py-0.5 outline-none focus:border-black resize-none h-12"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
              />
            </div>
          </div>
        </div>

        <RightActionPanel actions={actions} />
      </div>

      <MasterFormFooter
        onCancel={quit}
        onSubmit={handleSubmit}
        loading={loading}
        disabled={!balanced || filledRows.length < 2}
      />

      {/* Ledger list */}
      {pickerRowId != null && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <LedgerListPanel
            title="List of Ledger Accounts"
            items={allLedgers}
            searchTerm={ledgerSearch}
            onSearchChange={setLedgerSearch}
            onSelect={(it) => handleLedgerSelect(it as LedgerType)}
            onClose={() => {
              setPickerRowId(null);
              setLedgerSearch("");
            }}
            onCreateNew={() => navigate("/master/create/ledger")}
            createLabel="Create"
            height="h-screen"
          />
        </div>
      )}
    </div>
  );
}
