import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import GroupTree from "@/components/GroupTree";
import FormRow from "@/components/ui/FormRow";
import BankDetailsPopup, { EMPTY_BANK_DETAILS } from "./components/BankDetailsPopup";
import type { BankDetails } from "./components/BankDetailsPopup";
import { useCompany } from "@/context/CompanyContext";
import { INDIAN_STATES } from "@/constants/states";
import type { GroupType, LedgerType } from "@/types/api";

// ── Style tokens — identical to LedgerCreate ──────────────────────────────
const inputCls = "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent";
const selectCls = "bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent";

// ── Ledger selection panel (slide-in, mirrors Group panel in LedgerCreate) ──
function LedgerListPanel({
  ledgers,
  selectedId,
  onSelect,
  onClose,
}: {
  ledgers: LedgerType[];
  selectedId: number | null;
  onSelect: (l: LedgerType) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = ledgers.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-72 border-l flex flex-col shrink-0">
      <div className="px-2 py-1 text-sm font-medium flex justify-between items-center select-none">
        <span>List of Ledgers</span>
        <button onClick={onClose} className="text-xs hover:underline">&times;</button>
      </div>
      <div className="px-2 pb-1 border-b">
        <input
          ref={inputRef}
          className="w-full text-xs bg-transparent border-b border-zinc-300 outline-none py-0.5 placeholder:text-zinc-400"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-xs text-zinc-400 px-3 py-2">No ledgers found</div>
        )}
        {filtered.map((l) => (
          <div
            key={l.ledger_id}
            onClick={() => { onSelect(l); onClose(); }}
            className={[
              "text-sm px-3 py-1 border-b border-zinc-100 cursor-pointer select-none",
              selectedId === l.ledger_id
                ? "bg-zinc-800 text-white"
                : "hover:bg-zinc-50",
            ].join(" ")}
          >
            {l.name}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LedgerAlter() {
  const { selectedCompany, activeFY } = useCompany();

  const [ledgers, setLedgers] = useState<LedgerType[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [groupTree, setGroupTree] = useState<any[]>([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [showLedgerPanel, setShowLedgerPanel] = useState(false);
  const [showBankPopup, setShowBankPopup] = useState(false);
  const [provideBank, setProvideBank] = useState<"No" | "Yes">("No");

  const [form, setForm] = useState<any>({
    name: "", alias: "", group_id: null, ledger_type: "General",
    nature: "", opening_balance: 0, closing_balance: 0,
    mailing_name: "", address1: "", address2: "", city: "",
    state: "Select", country: "India", pincode: "", phone: "",
    email: "", pan: "", gstin: "", registration_type: "Unregistered",
    bank_details: null, statutory_details: null,
  });

  const [bankForm, setBankForm] = useState<BankDetails>(EMPTY_BANK_DETAILS);

  const companyId = selectedCompany?.company_id;

  // ── Data loading ───────────────────────────────────────────────────────────
  const loadInitial = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const [ledgerRes, groupRes, treeRes] = await Promise.all([
        window.api.ledger.getAll(companyId),
        window.api.group.getAll(companyId),
        window.api.group.getTree(companyId),
      ]);
      if (ledgerRes.success) setLedgers(ledgerRes.ledgers || []);
      if (groupRes.success) setGroups(groupRes.groups || []);
      if (treeRes.success) setGroupTree(treeRes.tree || []);
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const loadLedger = async (ledgerId: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await window.api.ledger.getById(ledgerId);
      if (!res.success || !res.ledger) { setError("Ledger not found."); return; }
      const l = res.ledger;
      setSelectedLedgerId(ledgerId);
      // Restore bank state
      const hasBankDetails = !!l.bank_details;
      setProvideBank(hasBankDetails ? "Yes" : "No");
      setBankForm(hasBankDetails ? { ...EMPTY_BANK_DETAILS, ...l.bank_details } : EMPTY_BANK_DETAILS);
      setShowGroupPanel(false);
      setForm({
        ledger_id: l.ledger_id,
        name: l.name || "", alias: l.alias || "",
        group_id: l.group_id || null, ledger_type: l.ledger_type || "General",
        nature: l.nature || "",
        opening_balance: l.opening_balance || 0,
        closing_balance: l.closing_balance || 0,
        mailing_name: l.mailing_name || "",
        address1: l.address1 || "", address2: l.address2 || "",
        city: l.city || "", state: l.state || "Select",
        country: l.country || "India", pincode: l.pincode || "",
        phone: l.phone || "", email: l.email || "",
        pan: l.pan || "", gstin: l.gstin || "",
        registration_type: l.registration_type || "Unregistered",
        bank_details: l.bank_details || null,
        statutory_details: l.statutory_details || null,
      });
    } catch {
      setError("Failed to load ledger.");
    } finally {
      setLoading(false);
    }
  };

  // ── Field helpers ──────────────────────────────────────────────────────────
  const setField = (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev: any) => ({ ...prev, [key]: e.target.value }));

  const setNumber = (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev: any) => ({ ...prev, [key]: e.target.value === "" ? 0 : Number(e.target.value) }));

  const handleProvideBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as "No" | "Yes";
    setProvideBank(val);
    if (val === "Yes") setShowBankPopup(true);
    if (val === "No") {
      setBankForm(EMPTY_BANK_DETAILS);
      setForm((prev: any) => ({ ...prev, bank_details: null }));
    }
  };

  const handleBankAccept = () => {
    // Persist the bankForm into the main form so it's submitted
    setForm((prev: any) => ({ ...prev, bank_details: { ...bankForm } }));
    setShowBankPopup(false);
  };

  const handleBankClose = () => {
    setShowBankPopup(false);
    setProvideBank("No");
    setBankForm(EMPTY_BANK_DETAILS);
    setForm((prev: any) => ({ ...prev, bank_details: null }));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name?.trim()) { setError("Ledger name required."); return; }
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const res = await window.api.ledger.update({
        ledger_id: form.ledger_id,
        company_id: companyId,
        name: form.name,
        alias: form.alias,
        group_id: form.group_id,
        ledger_type: form.ledger_type,
        nature: form.nature,
        opening_balance: Number(form.opening_balance || 0),
        closing_balance: Number(form.closing_balance || 0),
        mailing_name: form.mailing_name,
        address1: form.address1, address2: form.address2,
        city: form.city, state: form.state,
        country: form.country, pincode: form.pincode,
        phone: form.phone, email: form.email,
        pan: form.pan, gstin: form.gstin,
        registration_type: form.registration_type,
        bank_details: provideBank === "Yes" ? form.bank_details : null,
        statutory_details: form.statutory_details,
      });
      if (!res.success) { setError(res.error || "Failed to update ledger."); return; }
      setSuccess("Ledger updated successfully.");
      await loadInitial();
    } catch {
      setError("Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const groupName = (id?: number) => groups.find((g) => g.group_id === id)?.name || "—";

  const fyLabel = useMemo(() => {
    if (activeFY?.start_date) {
      const d = new Date(activeFY.start_date);
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${d.getDate()}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
    }
    return "1-Apr-24";
  }, [activeFY]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col h-full bg-white">

      {showBankPopup && (
        <BankDetailsPopup
          ledgerName={form.name || ""}
          bankForm={bankForm}
          setBankForm={setBankForm}
          onClose={handleBankClose}
          onAccept={handleBankAccept}
        />
      )}

      {/* Title bar — matches LedgerCreate */}
      <div className="px-3 py-1 text-sm font-medium flex justify-between items-center select-none">
        <span>Ledger Alteration</span>
        {loading && <span className="text-xs text-zinc-400">Loading…</span>}
      </div>

      {/* Alerts */}
      {error && (
        <div className="px-3 py-1 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs">dismiss</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs">dismiss</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0 overflow-x-auto">

        {/* ── Left column: mirrors LedgerCreate exactly ─────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 shrink-0">
          <div className="p-2 space-y-0.5">

            {/* Ledger selector row — opens the LedgerListPanel */}
            <div
              className="flex items-center min-h-[22px] cursor-pointer hover:bg-zinc-50"
              onClick={() => { setShowLedgerPanel((v) => !v); setShowGroupPanel(false); }}
            >
              <span className="w-16 text-sm shrink-0">Ledger</span>
              <span className="text-zinc-600 mr-2 shrink-0">:</span>
              <span className="text-sm px-1 py-0.5">
                {selectedLedgerId
                  ? ledgers.find((l) => l.ledger_id === selectedLedgerId)?.name ?? "—"
                  : <span className="text-zinc-400 italic">select ledger…</span>}
              </span>
            </div>

            {selectedLedgerId && (
              <>
                <FormRow label="Name" labelWidth="w-16" className="flex items-center min-h-[22px]">
                  <input
                    autoFocus
                    className={inputCls}
                    value={form.name || ""}
                    onChange={setField("name")}
                  />
                </FormRow>
                <FormRow label="(alias)" labelWidth="w-16" className="flex items-center min-h-[22px]">
                  <input className={inputCls} value={form.alias || ""} onChange={setField("alias")} />
                </FormRow>
              </>
            )}
          </div>

          {selectedLedgerId && (
            <div className="p-2">
              <div
                className="flex items-center min-h-[22px] cursor-pointer hover:bg-zinc-50"
                onClick={() => { setShowGroupPanel((v) => !v); setShowLedgerPanel(false); }}
              >
                <span className="w-16 text-sm shrink-0">Under</span>
                <span className="text-zinc-600 mr-2 shrink-0">:</span>
                <span className="text-sm px-1 py-0.5">{groupName(form.group_id)}</span>
              </div>
            </div>
          )}

          <div className="flex-1" />

          {selectedLedgerId ? (
            <div className="border-t p-2 flex items-center justify-center gap-2">
              <span className="text-sm font-medium">Opening Balance</span>
              <span className="text-sm">( on {fyLabel} ) :</span>
              <input
                type="number"
                step="0.01"
                className="w-32 border border-zinc-300 text-sm text-right px-1 py-0.5"
                value={form.opening_balance ?? 0}
                onChange={setNumber("opening_balance")}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm select-none">
              Click &ldquo;Ledger&rdquo; above to select a ledger
            </div>
          )}
        </div>

        {/* ── Right column: detail panels — mirrors LedgerCreate exactly ───── */}
        <div className="w-[480px] border-l flex flex-col overflow-y-auto shrink-0">

          {selectedLedgerId ? (
            <>
              {/* Opening balance summary box */}
              <div className="p-2 flex justify-end">
                <div className="w-44 border shrink-0">
                  <div className="text-center text-xs border-b py-0.5 bg-zinc-50">Total Opening Balance</div>
                  <div className="h-14 flex items-center justify-center text-sm font-medium tabular-nums">
                    {Number(form.opening_balance || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Mailing Details */}
              <div className="p-2">
                <div className="text-sm font-semibold mb-1.5 underline decoration-1 underline-offset-2">Mailing Details</div>
                <div className="space-y-0.5">
                  <FormRow label="Name" labelWidth="w-20" className="flex items-center min-h-[22px]">
                    <input className={inputCls} value={form.mailing_name || ""} onChange={setField("mailing_name")} />
                  </FormRow>
                  <div className="flex items-start min-h-[22px]">
                    <span className="w-20 text-sm shrink-0 pt-0.5 text-zinc-400">Address</span>
                    <span className="text-zinc-600 mr-2 shrink-0 pt-0.5">:</span>
                    <div className="flex-1 space-y-0.5">
                      <input className={`${inputCls} w-full`} value={form.address1 || ""} onChange={setField("address1")} />
                      <input className={`${inputCls} w-full`} value={form.address2 || ""} onChange={setField("address2")} />
                    </div>
                  </div>
                  <FormRow label="State" labelWidth="w-20" className="flex items-center min-h-[22px]">
                    <select className={selectCls} value={form.state || "Select"} onChange={setField("state")}>
                      <option value="Select">Select</option>
                      {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </FormRow>
                  <FormRow label="Country" labelWidth="w-20" className="flex items-center min-h-[22px]">
                    <input className={inputCls} value={form.country || ""} onChange={setField("country")} />
                  </FormRow>
                  <FormRow label="Pincode" labelWidth="w-20" className="flex items-center min-h-[22px]">
                    <input className={inputCls} value={form.pincode || ""} onChange={setField("pincode")} />
                  </FormRow>
                </div>
              </div>

              {/* Banking Details */}
              <div className="p-2">
                <div className="text-sm font-semibold mb-1.5 underline decoration-1 underline-offset-2">Banking Details</div>
                <FormRow label="Provide bank details" labelWidth="w-40" className="flex items-center min-h-[22px]">
                  <select className={selectCls} value={provideBank} onChange={handleProvideBankChange}>
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </FormRow>

                {provideBank === "Yes" && !showBankPopup && (
                  <div className="mt-1.5 pl-2 space-y-0.5">
                    {bankForm.bank_name && (
                      <FormRow label="Bank Name" labelWidth="w-40" className="flex items-center min-h-[22px]">
                        <span className="text-sm">{bankForm.bank_name}</span>
                      </FormRow>
                    )}
                    {bankForm.account_number && (
                      <FormRow label="Account Number" labelWidth="w-40" className="flex items-center min-h-[22px]">
                        <span className="text-sm">{bankForm.account_number}</span>
                      </FormRow>
                    )}
                    {bankForm.transaction_type && (
                      <FormRow label="Transaction Type" labelWidth="w-40" className="flex items-center min-h-[22px]">
                        <span className="text-sm">{bankForm.transaction_type}</span>
                      </FormRow>
                    )}
                    <button
                      onClick={() => setShowBankPopup(true)}
                      className="text-xs text-zinc-500 hover:text-zinc-800 underline underline-offset-1 mt-0.5"
                    >
                      Edit bank details
                    </button>
                  </div>
                )}
              </div>

              {/* Tax Registration Details */}
              <div className="p-2">
                <div className="text-sm font-semibold mb-1.5 underline decoration-1 underline-offset-2">Tax Registration Details</div>
                <FormRow label="PAN/IT No." labelWidth="w-40" className="flex items-center min-h-[22px]">
                  <input className={inputCls} value={form.pan || ""} onChange={setField("pan")} />
                </FormRow>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-300 text-sm select-none">
              No ledger selected
            </div>
          )}
        </div>

        {/* ── Ledger list panel ──────────────────────────────────────────────── */}
        {showLedgerPanel && (
          <LedgerListPanel
            ledgers={ledgers}
            selectedId={selectedLedgerId}
            onSelect={(l) => loadLedger(l.ledger_id!)}
            onClose={() => setShowLedgerPanel(false)}
          />
        )}

        {/* ── Group panel — matches LedgerCreate ────────────────────────────── */}
        {showGroupPanel && (
          <div className="w-72 border-l flex flex-col shrink-0">
            <div className="px-2 py-1 text-sm font-medium flex justify-between items-center select-none">
              <span>List of Groups</span>
              <button onClick={() => setShowGroupPanel(false)} className="text-xs hover:underline">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <GroupTree
                tree={groupTree}
                selectedId={form.group_id as number}
                onSelect={(group: GroupType) => {
                  setForm((prev: any) => ({ ...prev, group_id: group.group_id }));
                  setShowGroupPanel(false);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer — matches LedgerCreate */}
      <div className="border-t p-2 flex justify-between items-center bg-zinc-50">
        <Link to="/master/alter" className="text-xs text-zinc-500 hover:text-zinc-800">
          &larr; Back to Masters
        </Link>
        {selectedLedgerId && (
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="text-sm px-5 py-1 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
          >
            {saving ? "Saving..." : "Update"}
          </button>
        )}
      </div>
    </div>
  );
}