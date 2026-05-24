import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import GroupTree from "@/components/GroupTree";
import { FormRow, PageTitleBar, RightActionPanel } from "@/components/ui";
import BankDetailsPopup, { EMPTY_BANK_DETAILS } from "./components/BankDetailsPopup";
import type { BankDetails } from "./components/BankDetailsPopup";
import { useCompany } from "@/context/CompanyContext";
import { loadFormState, saveFormState, clearFormState } from "@/utils/formPersistence";
import { INDIAN_STATES } from "@/constants/states";
import type { GroupType, LedgerType } from "@/types/api";

interface StatutoryDetails {
  gst_applicability?: string;
  hsn_sac_code?: string;
  hsn_sac_description?: string;
  gst_rate?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  type_of_duty_tax?: string;
  percentage_of_calculation?: number;
  statutory_details?: string;
}

const EMPTY_STATUTORY: StatutoryDetails = {
  gst_applicability: "Not Applicable",
  hsn_sac_code: "",
  hsn_sac_description: "",
  gst_rate: 0,
  cgst_rate: 0,
  sgst_rate: 0,
  igst_rate: 0,
  type_of_duty_tax: "",
  percentage_of_calculation: 0,
  statutory_details: "",
};

// ── Style tokens — identical to LedgerCreate ──────────────────────────────
const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

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
    <div className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
      <div className="px-3 py-2 border-b border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase tracking-wider flex justify-between items-center select-none">
        <span>List of Ledgers</span>
        <button onClick={onClose} className="text-sm font-bold text-zinc-400 hover:text-zinc-800 transition-colors">&times;</button>
      </div>
      <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50/30">
        <input
          ref={inputRef}
          className="w-full text-xs bg-white border border-zinc-200 rounded px-2 py-1 outline-none focus:border-zinc-800 transition-colors"
          placeholder="Search ledgers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-xs text-zinc-400 px-3 py-2 italic select-none">No ledgers found</div>
        )}
        {filtered.map((l) => (
          <div
            key={l.ledger_id}
            onClick={() => { onSelect(l); onClose(); }}
            className={[
              "text-sm px-3 py-2 border-b border-zinc-100 cursor-pointer select-none transition-colors",
              selectedId === l.ledger_id
                ? "bg-zinc-900 text-white font-medium"
                : "hover:bg-zinc-50 text-zinc-700",
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
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;
  const persistKey = companyId ? `ledgerAlter_${companyId}` : null;
  const hasRestored = useRef(false);

  const [ledgers, setLedgers] = useState<LedgerType[]>([]);
  const [flatGroups, setFlatGroups] = useState<GroupType[]>([]);
  const [groupTree, setGroupTree] = useState<any[]>([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState<number | null>(
    () => loadFormState<any>(persistKey ?? "")?.selectedLedgerId ?? null
  );
  const [loadedGroupId, setLoadedGroupId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [showLedgerPanel, setShowLedgerPanel] = useState(false);
  const [showBankPopup, setShowBankPopup] = useState(false);
  const [provideBank, setProvideBank] = useState<"No" | "Yes">(
    () => loadFormState<any>(persistKey ?? "")?.provideBank ?? "No"
  );

  const INITIAL_FORM: any = {
    name: "", alias: "", group_id: null, ledger_type: "General",
    opening_balance: 0, closing_balance: 0,
    is_bill_wise: 0, maintain_inventory_values: 0,
    mailing_name: "", address1: "", address2: "", city: "",
    state: "Select", country: "India", pincode: "", phone: "",
    email: "", pan: "", gstin: "", registration_type: "Unregistered",
    default_credit_period: 0, check_credit_days: 0,
    allow_cost_centres: 0,
    invoice_rounding: 0, rounding_method: "", rounding_limit: 0,
  };

  const [form, setForm] = useState<any>(
    () => loadFormState<any>(persistKey ?? "")?.form ?? INITIAL_FORM
  );

  const [bankForm, setBankForm] = useState<BankDetails>(
    () => loadFormState<any>(persistKey ?? "")?.bankForm ?? EMPTY_BANK_DETAILS
  );
  const [statutoryForm, setStatutoryForm] = useState<StatutoryDetails>(
    () => loadFormState<any>(persistKey ?? "")?.statutoryForm ?? EMPTY_STATUTORY
  );

  // Auto-save to sessionStorage
  useEffect(() => {
    if (!persistKey) return;
    if (!hasRestored.current) {
      hasRestored.current = true;
      return;
    }
    if (!selectedLedgerId) return;
    saveFormState(persistKey, { form, bankForm, statutoryForm, provideBank, selectedLedgerId });
  }, [persistKey, form, bankForm, statutoryForm, provideBank, selectedLedgerId]);

  // Compute selected group lineage flags in real time
  const selectedGroup = useMemo(() => {
    return flatGroups.find((g) => g.group_id === form.group_id) || null;
  }, [form.group_id, flatGroups]);

  const groupLineage = useMemo(() => {
    const lineage = {
      isBank: false,
      isOD: false,
      isTax: false,
      isDebtorCreditor: false,
      isInventory: false,
      isIncomeExpense: false,
      primaryGroupName: null as string | null,
      hideMailingExtras: false,
    };
    if (!selectedGroup || flatGroups.length === 0) return lineage;

    const findGroup = (id?: number): GroupType | undefined => {
      return flatGroups.find((g) => g.group_id === id);
    };

    const checkLineage = (current: GroupType) => {
      const name = current.name.toLowerCase().trim();
      if (name === "bank accounts") lineage.isBank = true;
      if (name === "bank od a/c" || name === "bank od accounts" || name === "bank od account" || name === "bank occ a/c") {
        lineage.isBank = true;
        lineage.isOD = true;
      }
      if (name === "duties & taxes") lineage.isTax = true;
      if (name === "sundry debtors" || name === "sundry creditors") lineage.isDebtorCreditor = true;
      if (
        [
          "sales accounts",
          "purchase accounts",
          "direct expenses",
          "indirect expenses",
          "direct incomes",
          "indirect incomes",
        ].includes(name)
      ) {
        lineage.isInventory = true;
      }
      if (
        [
          "direct expenses",
          "indirect expenses",
          "direct incomes",
          "indirect incomes",
        ].includes(name)
      ) {
        lineage.isIncomeExpense = true;
      }

      if (
        [
          "cash-in-hand",
          "duties & taxes",
          "misc. expenses(asset)",
          "misc.expenses(asset)",
          "provisions",
          "purchase accounts",
          "sales accounts",
          "reserves & surplus",
          "reserve & surplus",
          "retained earnings",
          "stock-in-hand",
          "stock in hand",
          "suspense a/c",
        ].includes(name)
      ) {
        lineage.hideMailingExtras = true;
      }

      if (!current.parent_group_id) {
        lineage.primaryGroupName = current.name;
        return;
      }

      const parent = findGroup(current.parent_group_id);
      if (parent) {
        checkLineage(parent);
      }
    };

    checkLineage(selectedGroup);
    return lineage;
  }, [selectedGroup, flatGroups]);

  // Context-aware state cleanups when selected group changes
  useEffect(() => {
    if (!selectedGroup) return;
    if (form.group_id !== loadedGroupId) {
      if (!groupLineage.isBank) {
        setProvideBank("No");
      } else {
        setProvideBank("Yes");
      }
      if (!groupLineage.isIncomeExpense) {
        setForm((prev: any) => ({ ...prev, invoice_rounding: 0, rounding_method: "", rounding_limit: 0 }));
      }
    } else {
      if (groupLineage.isBank) {
        setProvideBank("Yes");
      }
    }
  }, [selectedGroup, groupLineage.isBank, groupLineage.isIncomeExpense, form.group_id, loadedGroupId]);

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
      if (groupRes.success) setFlatGroups(groupRes.groups || []);
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
      setLoadedGroupId(l.group_id || null);

      const hasBankDetails = !!l.bank_details;
      setProvideBank(hasBankDetails ? "Yes" : "No");
      setBankForm(hasBankDetails ? { ...EMPTY_BANK_DETAILS, ...l.bank_details } : EMPTY_BANK_DETAILS);

      const hasStatutory = !!l.statutory_details;
      setStatutoryForm(hasStatutory ? { ...EMPTY_STATUTORY, ...l.statutory_details } : EMPTY_STATUTORY);

      setShowGroupPanel(false);
      setForm({
        ledger_id: l.ledger_id,
        name: l.name || "", alias: l.alias || "",
        group_id: l.group_id || null, ledger_type: l.ledger_type || "General",
        opening_balance: l.opening_balance || 0,
        closing_balance: l.closing_balance || 0,
        mailing_name: l.mailing_name || "",
        address1: l.address1 || "", address2: l.address2 || "",
        city: l.city || "", state: l.state || "Select",
        country: l.country || "India", pincode: l.pincode || "",
        phone: l.phone || "", email: l.email || "",
        pan: l.pan || "", gstin: l.gstin || "",
        registration_type: l.registration_type || "Unregistered",
        is_bill_wise: l.is_bill_wise || 0,
        maintain_inventory_values: l.maintain_inventory_values || 0,
        default_credit_period: l.default_credit_period || 0,
        check_credit_days: l.check_credit_days || 0,
        allow_cost_centres: l.allow_cost_centres || 0,
        invoice_rounding: l.invoice_rounding || 0,
        rounding_method: l.rounding_method || "",
        rounding_limit: l.rounding_limit || 0,
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

  const setBankField = (key: keyof BankDetails) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setBankForm((f) => ({ ...f, [key]: e.target.value }));

  const setBankNumber = (key: keyof BankDetails) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setBankForm((f) => ({ ...f, [key]: e.target.value === "" ? undefined : Number(e.target.value) }));

  const setStatutoryField = (key: keyof StatutoryDetails) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setStatutoryForm((f) => ({ ...f, [key]: e.target.value }));

  const setStatutoryNumber = (key: keyof StatutoryDetails) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setStatutoryForm((f) => ({ ...f, [key]: e.target.value === "" ? undefined : Number(e.target.value) }));

  const handleProvideBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as "No" | "Yes";
    setProvideBank(val);
    if (val === "Yes") setShowBankPopup(true);
  };

  const handleBankClose = () => {
    setShowBankPopup(false);
    setProvideBank("No");
    setBankForm(EMPTY_BANK_DETAILS);
  };

  const handleBankAccept = () => {
    setShowBankPopup(false);
  };

  const validate = useCallback((): string | null => {
    if (!form.name?.trim()) return "Name is required.";
    if (!companyId) return "No company selected.";
    return null;
  }, [form.name, companyId]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload: any = {
        ledger_id: form.ledger_id,
        company_id: companyId!,
        name: form.name.trim(),
        alias: form.alias?.trim() || undefined,
        group_id: form.group_id || undefined,
        ledger_type: form.ledger_type || "General",
        opening_balance: Number(form.opening_balance) || 0,
        closing_balance: Number(form.closing_balance) || 0,
        is_bill_wise: form.is_bill_wise || 0,
        maintain_inventory_values: form.maintain_inventory_values || 0,
        mailing_name: form.mailing_name?.trim() || undefined,
        address1: form.address1?.trim() || undefined,
        address2: form.address2?.trim() || undefined,
        city: form.city?.trim() || undefined,
        state: form.state || undefined,
        country: form.country?.trim() || undefined,
        pincode: form.pincode?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        email: form.email?.trim() || undefined,
        gstin: form.gstin?.trim() || undefined,
        pan: form.pan?.trim() || undefined,
        registration_type: form.registration_type || "Unregistered",
        default_credit_period: form.default_credit_period || 0,
        check_credit_days: form.check_credit_days || 0,
        allow_cost_centres: form.allow_cost_centres || 0,
        invoice_rounding: form.invoice_rounding || 0,
        rounding_method: form.rounding_method || undefined,
        rounding_limit: form.rounding_limit || 0,
      };

      const hasBankData = provideBank === "Yes" || groupLineage.isBank;
      if (hasBankData) {
        payload.bank_details = {
          account_holder_name: bankForm.account_holder_name?.trim() || undefined,
          account_number: bankForm.account_number?.trim() || undefined,
          ifsc_code: bankForm.ifsc_code?.trim() || undefined,
          swift_code: bankForm.swift_code?.trim() || undefined,
          bank_name: bankForm.bank_name?.trim() || undefined,
          branch_name: bankForm.branch_name?.trim() || undefined,
          bank_configuration: bankForm.bank_configuration?.trim() || undefined,
          cheque_book_start_no: bankForm.cheque_book_start_no?.trim() || undefined,
          cheque_book_end_no: bankForm.cheque_book_end_no?.trim() || undefined,
          enable_cheque_printing: bankForm.enable_cheque_printing ? 1 : 0,
          cheque_printing_configuration: bankForm.cheque_printing_configuration?.trim() || undefined,
          od_limit: Number(bankForm.od_limit) || 0,
          transaction_type: bankForm.transaction_type?.trim() || undefined,
        };
      } else {
        payload.bank_details = null;
      }

      if (
        groupLineage.isTax ||
        (statutoryForm.gst_applicability && statutoryForm.gst_applicability !== "Not Applicable")
      ) {
        payload.statutory_details = {
          gst_applicability: statutoryForm.gst_applicability || "Not Applicable",
          hsn_sac_code: statutoryForm.hsn_sac_code?.trim() || undefined,
          hsn_sac_description: statutoryForm.hsn_sac_description?.trim() || undefined,
          gst_rate: Number(statutoryForm.gst_rate) || 0,
          cgst_rate: Number(statutoryForm.cgst_rate) || 0,
          sgst_rate: Number(statutoryForm.sgst_rate) || 0,
          igst_rate: Number(statutoryForm.igst_rate) || 0,
          type_of_duty_tax: statutoryForm.type_of_duty_tax || undefined,
          percentage_of_calculation: Number(statutoryForm.percentage_of_calculation) || 0,
          statutory_details: statutoryForm.statutory_details || undefined,
        };
      } else {
        payload.statutory_details = null;
      }

      const res = await window.api.ledger.update(payload);
      if (!res.success) { setError(res.error || "Failed to update ledger."); return; }
      if (persistKey) clearFormState(persistKey);
      hasRestored.current = false;
      setSuccess("Ledger updated successfully.");
      setLoadedGroupId(form.group_id);
      await loadInitial();
    } catch {
      setError("Unexpected error.");
    } finally {
      setSaving(false);
    }
  }, [companyId, form, provideBank, groupLineage, bankForm, statutoryForm, validate, loadInitial]);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showBankPopup) return;
        if (showLedgerPanel) { e.preventDefault(); setShowLedgerPanel(false); return; }
        if (showGroupPanel) { e.preventDefault(); setShowGroupPanel(false); return; }
        e.preventDefault();
        navigate("/master/alter");
      }
      if (e.altKey && (e.key === "a" || e.key === "A") && !showBankPopup) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && (e.key === "l" || e.key === "L") && !showBankPopup) {
        e.preventDefault();
        setShowLedgerPanel(prev => !prev);
        setShowGroupPanel(false);
      }
      if (e.altKey && (e.key === "g" || e.key === "G") && !showBankPopup && selectedLedgerId) {
        e.preventDefault();
        setShowGroupPanel(prev => !prev);
        setShowLedgerPanel(false);
      }
      if (e.altKey && (e.key === "c" || e.key === "C") && !showBankPopup) {
        e.preventDefault();
        navigate("/master/create/ledger");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSubmit, showBankPopup, showGroupPanel, showLedgerPanel, navigate, selectedLedgerId]);

  const ledgerAlterActions = [
    { key: "Alt+L", label: "Select Ledger", onClick: () => { setShowLedgerPanel(prev => !prev); setShowGroupPanel(false); } },
    { key: "Alt+G", label: "Select Group", disabled: !selectedLedgerId, onClick: () => { setShowGroupPanel(prev => !prev); setShowLedgerPanel(false); } },
    { key: "Alt+A", label: "Accept", disabled: !selectedLedgerId, onClick: handleSubmit },
    { key: "Alt+C", label: "Create Ledger", onClick: () => navigate("/master/create/ledger") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/master/alter") },
  ];

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
    <div className="flex-1 flex flex-col h-full bg-white select-none">

      {showBankPopup && (
        <BankDetailsPopup
          ledgerName={form.name || ""}
          bankForm={bankForm}
          setBankForm={setBankForm}
          onClose={handleBankClose}
          onAccept={handleBankAccept}
          isOD={groupLineage.isOD}
        />
      )}

      <PageTitleBar title="Ledger Alteration" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs font-bold">&times;</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0 overflow-x-auto">

        {/* Left column: Name / Group / Bank (if bank group) / Opening Balance */}
        <div className="flex-1 flex flex-col min-w-0 shrink-0 bg-white">
          <div className="p-3 space-y-1">

            {/* Ledger selector row */}
            <div
              className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-100/60 px-2 py-0.5 rounded transition-colors group mb-2 border border-zinc-200 bg-zinc-50/30"
              onClick={() => { setShowLedgerPanel((v) => !v); setShowGroupPanel(false); }}
            >
              <span className="w-16 text-sm shrink-0 font-medium text-zinc-500">Ledger</span>
              <span className="text-zinc-400 mr-2 shrink-0">:</span>
              <span className="text-sm font-semibold text-zinc-800 underline decoration-dotted underline-offset-2 decoration-zinc-400 group-hover:decoration-zinc-800">
                {selectedLedgerId
                  ? ledgers.find((l) => l.ledger_id === selectedLedgerId)?.name ?? "—"
                  : <span className="text-zinc-400 italic">Select ledger to alter…</span>}
              </span>
            </div>

            {selectedLedgerId && (
              <>
                <FormRow label="Name" labelWidth="w-20" className="flex items-center min-h-[26px]">
                  <input
                    autoFocus
                    className={inputCls}
                    value={form.name || ""}
                    onChange={setField("name")}
                  />
                </FormRow>
                <FormRow label="(alias)" labelWidth="w-20" className="flex items-center min-h-[26px]">
                  <input className={inputCls} value={form.alias || ""} onChange={setField("alias")} />
                </FormRow>
              </>
            )}
          </div>

          {selectedLedgerId && (
            <div className="p-3 border-t border-zinc-100 bg-zinc-50/20">
              <div
                className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-100/60 px-2 py-0.5 rounded transition-colors group"
                onClick={() => { setShowGroupPanel((v) => !v); setShowLedgerPanel(false); }}
              >
                <span className="w-16 text-sm shrink-0 font-medium text-zinc-500 group-hover:text-zinc-800">Under</span>
                <span className="text-zinc-400 mr-2 shrink-0">:</span>
                <span className="text-sm font-semibold text-zinc-800 underline decoration-dotted underline-offset-2 decoration-zinc-400 group-hover:decoration-zinc-800">
                  {selectedGroup?.name || "—"}
                </span>
                {groupLineage.primaryGroupName && groupLineage.primaryGroupName !== selectedGroup?.name && (
                  <span className="text-xs text-zinc-400 ml-2 font-normal">(Group: {groupLineage.primaryGroupName})</span>
                )}
              </div>
            </div>
          )}

          {/* Bank Configuration — shown in left column for Bank groups */}
          {selectedLedgerId && groupLineage.isBank && (
            <div className="p-3 border-t border-zinc-100 bg-white space-y-1.5">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Bank Configurations</div>
              <FormRow label="Account Holder Name" labelWidth="w-44" className="flex items-center min-h-[26px]">
                <input className={inputCls} value={bankForm.account_holder_name || ""} onChange={setBankField("account_holder_name")} />
              </FormRow>
              <FormRow label="Account Number" labelWidth="w-44" className="flex items-center min-h-[26px]">
                <input className={inputCls} value={bankForm.account_number || ""} onChange={setBankField("account_number")} />
              </FormRow>
              <FormRow label="IFSC Code" labelWidth="w-44" className="flex items-center min-h-[26px]">
                <input className={inputCls} value={bankForm.ifsc_code || ""} onChange={setBankField("ifsc_code")} />
              </FormRow>
              <FormRow label="SWIFT Code" labelWidth="w-44" className="flex items-center min-h-[26px]">
                <input className={inputCls} value={bankForm.swift_code || ""} onChange={setBankField("swift_code")} />
              </FormRow>
              <FormRow label="Bank Name" labelWidth="w-44" className="flex items-center min-h-[26px]">
                <input className={inputCls} value={bankForm.bank_name || ""} onChange={setBankField("bank_name")} />
              </FormRow>
              <FormRow label="Branch Name" labelWidth="w-44" className="flex items-center min-h-[26px]">
                <input className={inputCls} value={bankForm.branch_name || ""} onChange={setBankField("branch_name")} />
              </FormRow>
              {groupLineage.isOD && (
                <FormRow label="OD Limit" labelWidth="w-44" className="flex items-center min-h-[26px]">
                  <input
                    type="number"
                    step="0.01"
                    className={`${inputCls} text-right font-medium max-w-[120px]`}
                    value={bankForm.od_limit ?? 0}
                    onChange={setBankNumber("od_limit")}
                  />
                </FormRow>
              )}
              <div className="pt-2 border-t border-zinc-100 my-2" />
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Cheque Configuration</div>
              <FormRow label="Enable Cheque Printing" labelWidth="w-44" className="flex items-center min-h-[26px]">
                <select
                  className={selectCls}
                  value={bankForm.enable_cheque_printing ? "Yes" : "No"}
                  onChange={(e) => setBankForm((f) => ({ ...f, enable_cheque_printing: e.target.value === "Yes" ? 1 : 0 }))}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FormRow>
              {!!bankForm.enable_cheque_printing && (
                <div className="pl-3 border-l-2 border-zinc-200 space-y-1.5 py-1">
                  <FormRow label="Cheque Start No" labelWidth="w-40" className="flex items-center min-h-[26px]">
                    <input className={inputCls} value={bankForm.cheque_book_start_no || ""} onChange={setBankField("cheque_book_start_no")} />
                  </FormRow>
                  <FormRow label="Cheque End No" labelWidth="w-40" className="flex items-center min-h-[26px]">
                    <input className={inputCls} value={bankForm.cheque_book_end_no || ""} onChange={setBankField("cheque_book_end_no")} />
                  </FormRow>
                  <FormRow label="Cheque Print Config" labelWidth="w-40" className="flex items-center min-h-[26px]">
                    <input className={inputCls} value={bankForm.cheque_printing_configuration || ""} onChange={setBankField("cheque_printing_configuration")} />
                  </FormRow>
                </div>
              )}
            </div>
          )}

          <div className="flex-1" />

          {selectedLedgerId ? (
            <div className="border-t border-zinc-200 bg-zinc-50/50 p-3 flex items-center justify-center gap-2">
              <span className="text-sm font-semibold text-zinc-600">Opening Balance</span>
              <span className="text-sm text-zinc-500">( on {fyLabel} ) :</span>
              <input
                type="number"
                step="0.01"
                className="w-36 border border-zinc-300 rounded text-sm text-right px-2 py-1 outline-none focus:border-zinc-800 transition-all"
                value={form.opening_balance ?? 0}
                onChange={setNumber("opening_balance")}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm italic select-none">
              Click &ldquo;Ledger&rdquo; above to select a ledger to alter.
            </div>
          )}
        </div>

        {/* Right column: detail panels — always shown, same as LedgerCreate */}
        <div className="w-[480px] border-l border-zinc-200 flex flex-col overflow-y-auto shrink-0 bg-zinc-50/25">

          {selectedLedgerId ? (
            <>
              {/* Opening balance summary box */}
              <div className="p-3 flex justify-end">
                <div className="w-44 border border-zinc-200 rounded shrink-0 bg-white shadow-sm overflow-hidden">
                  <div className="text-center text-[10px] font-bold border-b border-zinc-100 py-1 bg-zinc-50 text-zinc-500 uppercase tracking-wider">Total Opening Balance</div>
                  <div className="h-14 flex items-center justify-center text-sm font-semibold tabular-nums text-zinc-800">
                    {Number(form.opening_balance || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Context 1: Type of Ledger for Income/Expense groups */}
              {groupLineage.isIncomeExpense && (
                <div className="p-3 border-t border-zinc-100 bg-white space-y-1.5">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Ledger Type</div>
                  <FormRow label="Type of ledger" labelWidth="w-52" className="flex items-center min-h-[26px]">
                    <select
                      className={selectCls}
                      value={form.invoice_rounding ? "Invoice Rounding" : "Not Applicable"}
                      onChange={(e) => {
                        const val = e.target.value === "Invoice Rounding" ? 1 : 0;
                        setForm((prev: any) => ({
                          ...prev,
                          invoice_rounding: val,
                          rounding_method: val ? "Normal Rounding" : "",
                          rounding_limit: val ? 1 : 0,
                        }));
                      }}
                    >
                      <option value="Not Applicable">Not Applicable</option>
                      <option value="Invoice Rounding">Invoice Rounding</option>
                    </select>
                  </FormRow>
                  {form.invoice_rounding === 1 && (
                    <>
                      <FormRow label="Rounding method" labelWidth="w-52" className="flex items-center min-h-[26px]">
                        <select
                          className={selectCls}
                          value={form.rounding_method || "Normal Rounding"}
                          onChange={setField("rounding_method")}
                        >
                          <option value="Normal Rounding">Normal Rounding</option>
                          <option value="Downward Rounding">Downward Rounding</option>
                          <option value="Upward Rounding">Upward Rounding</option>
                        </select>
                      </FormRow>
                      <FormRow label="Rounding limit" labelWidth="w-52" className="flex items-center min-h-[26px]">
                        <input
                          type="number"
                          step="0.01"
                          className={`${inputCls} text-right max-w-[100px]`}
                          value={form.rounding_limit ?? 1}
                          onChange={setNumber("rounding_limit")}
                        />
                      </FormRow>
                    </>
                  )}
                </div>
              )}

              {/* Context 1b: Ledger Type for Sales/Purchase groups */}
              {groupLineage.isInventory && !groupLineage.isIncomeExpense && (
                <div className="p-3 border-t border-zinc-100 bg-white">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Ledger Type</div>
                  <FormRow label="Type of ledger" labelWidth="w-52" className="flex items-center min-h-[26px]">
                    <select
                      className={selectCls}
                      value={form.ledger_type || "General"}
                      onChange={setField("ledger_type")}
                    >
                      <option value="General">General</option>
                      <option value="Sales">Sales</option>
                      <option value="Purchase">Purchase</option>
                      <option value="Income">Income</option>
                      <option value="Expenses">Expenses</option>
                      <option value="Assets">Assets</option>
                      <option value="Liabilities">Liabilities</option>
                    </select>
                  </FormRow>
                </div>
              )}

              {/* Context 2: Duties & Taxes */}
              {groupLineage.isTax && (
                <div className="p-3 border-t border-zinc-100 bg-white space-y-1.5">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Statutory / Duty Details</div>
                  <FormRow label="Type of Duty/Tax" labelWidth="w-44" className="flex items-center min-h-[26px]">
                    <select
                      className={selectCls}
                      value={statutoryForm.type_of_duty_tax || "GST"}
                      onChange={setStatutoryField("type_of_duty_tax")}
                    >
                      <option value="GST">GST</option>
                      <option value="Others">Others</option>
                    </select>
                  </FormRow>
                  <FormRow label="Percentage of Calculation" labelWidth="w-44" className="flex items-center min-h-[26px]">
                    <input
                      type="number"
                      step="0.01"
                      className={`${inputCls} text-right max-w-[100px]`}
                      value={statutoryForm.percentage_of_calculation ?? 0}
                      onChange={setStatutoryNumber("percentage_of_calculation")}
                    />
                  </FormRow>
                  <FormRow label="Rounding Method" labelWidth="w-44" className="flex items-center min-h-[26px]">
                    <select
                      className={selectCls}
                      value={statutoryForm.statutory_details || "Not Applicable"}
                      onChange={setStatutoryField("statutory_details")}
                    >
                      <option value="Not Applicable">Not Applicable</option>
                      <option value="Downward Rounding">Downward Rounding</option>
                      <option value="Normal Rounding">Normal Rounding</option>
                      <option value="Upward Rounding">Upward Rounding</option>
                    </select>
                  </FormRow>

                  {statutoryForm.type_of_duty_tax === "GST" && (
                    <div className="mt-3 pt-3 border-t border-zinc-100 space-y-1.5">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">GST Rate Config</div>
                      <FormRow label="GST Applicability" labelWidth="w-44" className="flex items-center min-h-[26px]">
                        <select
                          className={selectCls}
                          value={statutoryForm.gst_applicability || "Applicable"}
                          onChange={setStatutoryField("gst_applicability")}
                        >
                          <option value="Applicable">Applicable</option>
                          <option value="Not Applicable">Not Applicable</option>
                          <option value="Undefined">Undefined</option>
                        </select>
                      </FormRow>
                      {statutoryForm.gst_applicability === "Applicable" && (
                        <div className="pl-3 border-l-2 border-zinc-200 space-y-1.5 py-1">
                          <FormRow label="HSN/SAC Code" labelWidth="w-40" className="flex items-center min-h-[26px]">
                            <input className={inputCls} value={statutoryForm.hsn_sac_code || ""} onChange={setStatutoryField("hsn_sac_code")} />
                          </FormRow>
                          <FormRow label="HSN/SAC Description" labelWidth="w-40" className="flex items-center min-h-[26px]">
                            <input className={inputCls} value={statutoryForm.hsn_sac_description || ""} onChange={setStatutoryField("hsn_sac_description")} />
                          </FormRow>
                          <FormRow label="IGST Rate (%)" labelWidth="w-40" className="flex items-center min-h-[26px]">
                            <input
                              type="number"
                              step="0.01"
                              className={`${inputCls} text-right max-w-[100px]`}
                              value={statutoryForm.igst_rate ?? 0}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setStatutoryForm((f) => ({
                                  ...f,
                                  igst_rate: val,
                                  gst_rate: val,
                                  cgst_rate: val / 2,
                                  sgst_rate: val / 2,
                                }));
                              }}
                            />
                          </FormRow>
                          <div className="flex items-center text-[10px] text-zinc-500 pl-44 gap-4">
                            <span>CGST: {(statutoryForm.cgst_rate ?? 0).toFixed(2)}%</span>
                            <span>SGST: {(statutoryForm.sgst_rate ?? 0).toFixed(2)}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Context 3: Debtor/Creditor bill-wise details */}
              {groupLineage.isDebtorCreditor && (
                <div className="p-3 border-t border-zinc-100 bg-white">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Bill-wise Details</div>
                  <div className="space-y-1">
                    <FormRow label="Maintain balances bill-by-bill" labelWidth="w-52" className="flex items-center min-h-[26px]">
                      <select
                        className={selectCls}
                        value={form.is_bill_wise ? "Yes" : "No"}
                        onChange={(e) => setForm((f: any) => ({ ...f, is_bill_wise: e.target.value === "Yes" ? 1 : 0 }))}
                      >
                        <option>No</option>
                        <option>Yes</option>
                      </select>
                    </FormRow>
                    <FormRow label="Default credit period (days)" labelWidth="w-52" className="flex items-center min-h-[26px]">
                      <input
                        type="number"
                        className={`${inputCls} max-w-[80px] text-right`}
                        value={form.default_credit_period ?? 0}
                        onChange={setNumber("default_credit_period")}
                      />
                    </FormRow>
                    <FormRow label="Check for credit days during voucher entry" labelWidth="w-52" className="flex items-center min-h-[26px]">
                      <select
                        className={selectCls}
                        value={form.check_credit_days ? "Yes" : "No"}
                        onChange={(e) => setForm((f: any) => ({ ...f, check_credit_days: e.target.value === "Yes" ? 1 : 0 }))}
                      >
                        <option>No</option>
                        <option>Yes</option>
                      </select>
                    </FormRow>
                  </div>
                </div>
              )}

              {/* Cost Centre Details — always shown */}
              <div className="p-3 border-t border-zinc-100 bg-white">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Cost Centre Details</div>
                <FormRow label="Cost Centres are applicable" labelWidth="w-52" className="flex items-center min-h-[26px]">
                  <select
                    className={selectCls}
                    value={form.allow_cost_centres ? "Yes" : "No"}
                    onChange={(e) => setForm((f: any) => ({ ...f, allow_cost_centres: e.target.value === "Yes" ? 1 : 0 }))}
                  >
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </FormRow>
              </div>

              {/* Mailing Details — always shown */}
              <div className="p-3 border-t border-zinc-100 bg-white">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Mailing Details</div>
                <div className="space-y-1">
                  <FormRow label="Name" labelWidth="w-20" className="flex items-center min-h-[26px]">
                    <input className={inputCls} value={form.mailing_name || ""} onChange={setField("mailing_name")} />
                  </FormRow>
                  <div className="flex items-start min-h-[26px]">
                    <span className="w-20 text-sm shrink-0 pt-1 text-zinc-400 font-medium">Address</span>
                    <span className="text-zinc-400 mr-2 shrink-0 pt-1">:</span>
                    <div className="flex-1 space-y-1">
                      <input className={`${inputCls} w-full`} value={form.address1 || ""} onChange={setField("address1")} />
                      <input className={`${inputCls} w-full`} value={form.address2 || ""} onChange={setField("address2")} />
                    </div>
                  </div>
                  {!groupLineage.hideMailingExtras && (
                    <>
                      <FormRow label="State" labelWidth="w-20" className="flex items-center min-h-[26px]">
                        <select className={selectCls} value={form.state || "Select"} onChange={setField("state")}>
                          <option value="Select">Select</option>
                          {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </FormRow>
                      <FormRow label="Country" labelWidth="w-20" className="flex items-center min-h-[26px]">
                        <input className={inputCls} value={form.country || ""} onChange={setField("country")} />
                      </FormRow>
                      <FormRow label="Pincode" labelWidth="w-20" className="flex items-center min-h-[26px]">
                        <input className={inputCls} value={form.pincode || ""} onChange={setField("pincode")} />
                      </FormRow>
                    </>
                  )}
                </div>
              </div>

              {/* Banking Details popup trigger — shown for non-bank groups only */}
              {!groupLineage.isBank && (
                <div className="p-3 border-t border-zinc-100 bg-white">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Banking Details</div>
                  <FormRow label="Provide bank details" labelWidth="w-40" className="flex items-center min-h-[26px]">
                    <select className={selectCls} value={provideBank} onChange={handleProvideBankChange}>
                      <option>No</option>
                      <option>Yes</option>
                    </select>
                  </FormRow>

                  {provideBank === "Yes" && !showBankPopup && (
                    <div className="mt-2 pl-3 border-l-2 border-zinc-200 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      {bankForm.bank_name && (
                        <FormRow label="Bank Name" labelWidth="w-36" className="flex items-center min-h-[22px] text-xs">
                          <span className="text-sm text-zinc-700 font-medium">{bankForm.bank_name}</span>
                        </FormRow>
                      )}
                      {bankForm.account_number && (
                        <FormRow label="Account Number" labelWidth="w-36" className="flex items-center min-h-[22px] text-xs">
                          <span className="text-sm text-zinc-700">{bankForm.account_number}</span>
                        </FormRow>
                      )}
                      {bankForm.transaction_type && (
                        <FormRow label="Transaction Type" labelWidth="w-36" className="flex items-center min-h-[22px] text-xs">
                          <span className="text-sm text-zinc-700 font-medium">{bankForm.transaction_type}</span>
                        </FormRow>
                      )}
                      <button
                        onClick={() => setShowBankPopup(true)}
                        className="text-xs text-zinc-500 hover:text-zinc-800 underline underline-offset-1 mt-1 block transition-colors font-medium"
                      >
                        Edit bank details
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tax Registration Details — always shown */}
              <div className="p-3 border-t border-zinc-100 bg-white">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Tax Registration Details</div>
                <div className="space-y-1">
                  <FormRow label="PAN/IT No." labelWidth="w-40" className="flex items-center min-h-[26px]">
                    <input className={inputCls} value={form.pan || ""} onChange={setField("pan")} />
                  </FormRow>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-300 text-sm select-none italic">
              No ledger selected
            </div>
          )}
        </div>

        {/* Ledger list panel */}
        {showLedgerPanel && (
          <LedgerListPanel
            ledgers={ledgers}
            selectedId={selectedLedgerId}
            onSelect={(l) => loadLedger(l.ledger_id!)}
            onClose={() => setShowLedgerPanel(false)}
          />
        )}

        {/* Group panel */}
        {showGroupPanel && (
          <div className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
            <div className="px-3 py-2 border-b border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase tracking-wider flex justify-between items-center select-none">
              <span>List of Groups</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setShowGroupPanel(false); navigate("/master/create/group"); }}
                  className="text-[11px] text-zinc-500 hover:text-zinc-800 font-medium transition-colors"
                >
                  + Create
                </button>
                <button onClick={() => setShowGroupPanel(false)} className="text-sm font-bold text-zinc-400 hover:text-zinc-800 transition-colors">&times;</button>
              </div>
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

        {/* Actions panel */}
        <RightActionPanel actions={ledgerAlterActions} />
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50">
        <Link to="/master/alter" className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium">
          &larr; Back to Masters
        </Link>
        {selectedLedgerId && (
          <button
            onClick={handleSubmit}
            disabled={saving || loading}
            className="text-sm px-6 py-1.5 rounded bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 transition-all font-semibold shadow-sm hover:shadow active:scale-95 duration-150"
          >
            {saving ? "Saving..." : loading ? "Loading..." : "Update"}
          </button>
        )}
      </div>
    </div>
  );
}