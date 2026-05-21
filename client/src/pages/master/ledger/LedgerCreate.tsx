import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import GroupTree from "@/components/GroupTree";
import FormRow from "@/components/ui/FormRow";
import BankDetailsPopup, { EMPTY_BANK_DETAILS } from "./components/BankDetailsPopup";
import type { BankDetails } from "./components/BankDetailsPopup";
import { INDIAN_STATES } from "@/constants/states";
import type { LedgerType, GroupType } from "@/types/api";

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

const INITIAL_FORM: Partial<LedgerType> = {
  name: "",
  alias: "",
  opening_balance: 0,
  mailing_name: "",
  address1: "",
  address2: "",
  city: "",
  state: "Select",
  country: "India",
  pincode: "",
  phone: "",
  email: "",
  gstin: "",
  pan: "",
  registration_type: "Unregistered",
};

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

export default function LedgerCreate() {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();
  const [groupTree, setGroupTree] = useState<(GroupType & { children?: GroupType[] })[]>([]);
  const [flatGroups, setFlatGroups] = useState<GroupType[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [provideBank, setProvideBank] = useState<"No" | "Yes">("No");
  const [showBankPopup, setShowBankPopup] = useState(false);

  const [form, setForm] = useState<Partial<LedgerType>>(INITIAL_FORM);
  const [bankForm, setBankForm] = useState<BankDetails>(EMPTY_BANK_DETAILS);
  const [statutoryForm, setStatutoryForm] = useState<StatutoryDetails>(EMPTY_STATUTORY);

  const companyId = selectedCompany?.company_id;

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [treeRes, allRes] = await Promise.all([
          window.api.group.getTree(companyId),
          window.api.group.getAll(companyId),
        ]);
        if (cancelled) return;
        if (treeRes.success && treeRes.tree) setGroupTree(treeRes.tree ?? []);
        if (allRes.success && allRes.groups) {
          setFlatGroups(allRes.groups ?? []);
          const capital = (allRes.groups ?? []).find((g: GroupType) => g.name === "Capital Account");
          if (capital && !selectedGroup) {
            setSelectedGroup(capital);
            setForm((f) => ({ ...f, group_id: capital.group_id }));
          }
        }
      } catch {
        if (!cancelled) setError("Failed to load groups.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  // Compute selected group lineage flags in real time
  const groupLineage = useMemo(() => {
    const lineage = {
      isBank: false,
      isOD: false,
      isTax: false,
      isDebtorCreditor: false,
      isInventory: false,
    };
    if (!selectedGroup || flatGroups.length === 0) return lineage;

    const findGroup = (id?: number): GroupType | undefined => {
      return flatGroups.find((g) => g.group_id === id);
    };

    const checkLineage = (current: GroupType) => {
      const name = current.name.toLowerCase().trim();
      if (name === "bank accounts") lineage.isBank = true;
      if (name === "bank od a/c" || name === "bank od accounts" || name === "bank od account") {
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

      if (current.parent_group_id) {
        const parent = findGroup(current.parent_group_id);
        if (parent) {
          checkLineage(parent);
        }
      }
    };

    checkLineage(selectedGroup);
    return lineage;
  }, [selectedGroup, flatGroups]);

  // Context-aware state cleanups when selected group changes
  useEffect(() => {
    if (!selectedGroup) return;
    if (!groupLineage.isBank) {
      setProvideBank("No");
    } else {
      setProvideBank("Yes");
    }
  }, [selectedGroup, groupLineage.isBank]);

  const fyLabel = useMemo(() => {
    if (activeFY?.start_date) {
      const d = new Date(activeFY.start_date);
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${d.getDate()}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
    }
    return "1-Apr-24";
  }, [activeFY]);

  const setField = (key: keyof LedgerType) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const setNumber = (key: keyof LedgerType) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value === "" ? undefined : Number(e.target.value) }));

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

  const validate = useCallback((): string | null => {
    if (!form.name?.trim()) return "Name is required.";
    if (!companyId) return "No company selected.";
    return null;
  }, [form.name, companyId]);

  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true); setError(null); setSuccess(null);
    try {
      const payload: any = {
        company_id: companyId!,
        name: form.name!.trim(),
        alias: form.alias?.trim() || undefined,
        group_id: form.group_id || undefined,
        ledger_type: "General",
        opening_balance: Number(form.opening_balance) || 0,
        closing_balance: 0,
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
          statutory_details: statutoryForm.statutory_details || undefined, // rounding method
        };
      }

      const res = await window.api.ledger.create(payload);
      if (res.success) {
        setSuccess(`Ledger "${form.name}" created.`);
        setForm(INITIAL_FORM);
        setProvideBank("No");
        setBankForm(EMPTY_BANK_DETAILS);
        setStatutoryForm(EMPTY_STATUTORY);
      } else {
        setError(res.error || "Failed to create ledger.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [companyId, form, provideBank, groupLineage, bankForm, statutoryForm, validate]);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key to navigate back (only if no dialog/popup is open)
      if (e.key === "Escape" && !showBankPopup && !showGroupPanel) {
        e.preventDefault();
        navigate("/master/create");
      }
      // Alt+A to save/create
      if (e.altKey && (e.key === "a" || e.key === "A") && !showBankPopup) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSubmit, showBankPopup, showGroupPanel, navigate]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">

      {showBankPopup && (
        <BankDetailsPopup
          ledgerName={form.name || ""}
          bankForm={bankForm}
          setBankForm={setBankForm}
          onClose={handleBankClose}
          onAccept={() => setShowBankPopup(false)}
          isOD={groupLineage.isOD}
        />
      )}

      <div className="px-3 py-1.5 text-xs font-semibold bg-zinc-900 text-white flex justify-between items-center select-none shadow-sm">
        <span className="uppercase tracking-wider">Ledger Creation</span>
      </div>

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

        {/* Left: Name / Group / Opening Balance */}
        <div className="flex-1 flex flex-col min-w-0 shrink-0 bg-white">
          <div className="p-3 space-y-1">
            <FormRow label="Name" labelWidth="w-20" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={form.name || ""} onChange={setField("name")} />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-20" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.alias || ""} onChange={setField("alias")} />
            </FormRow>
          </div>

          <div className="p-3 border-t border-zinc-100 bg-zinc-50/20">
            <div
              className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-100/60 px-2 py-0.5 rounded transition-colors group"
              onClick={() => setShowGroupPanel(!showGroupPanel)}
            >
              <span className="w-16 text-sm shrink-0 font-medium text-zinc-500 group-hover:text-zinc-800">Under</span>
              <span className="text-zinc-400 mr-2 shrink-0">:</span>
              <span className="text-sm font-semibold text-zinc-800 underline decoration-dotted underline-offset-2 decoration-zinc-400 group-hover:decoration-zinc-800">
                {selectedGroup?.name || "—"}
              </span>
            </div>
          </div>

          <div className="flex-1" />

          <div className="border-t border-zinc-200 bg-zinc-50/50 p-3 flex items-center justify-center gap-2">
            <span className="text-sm font-semibold text-zinc-600">Opening Balance</span>
            <span className="text-sm text-zinc-500">( on {fyLabel} ) :</span>
            <input
              type="number"
              step="0.01"
              className="w-36 border border-zinc-300 rounded text-sm text-right px-2 py-1 outline-none focus:border-zinc-800 font-mono transition-all"
              value={form.opening_balance ?? 0}
              onChange={setNumber("opening_balance")}
            />
          </div>
        </div>

        {/* Right: Mailing, Banking, Tax */}
        <div className="w-[480px] border-l border-zinc-200 flex flex-col overflow-y-auto shrink-0 bg-zinc-50/25">
          <div className="p-3 flex justify-end">
            <div className="w-44 border border-zinc-200 rounded shrink-0 bg-white shadow-sm overflow-hidden">
              <div className="text-center text-[10px] font-bold border-b border-zinc-100 py-1 bg-zinc-50 text-zinc-500 uppercase tracking-wider">Total Opening Balance</div>
              <div className="h-14 flex items-center justify-center text-sm font-semibold tabular-nums text-zinc-800 font-mono">
                {Number(form.opening_balance || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Context 1: Inventory (Sales/Purchase/Expenses/Incomes) */}
          {groupLineage.isInventory && (
            <div className="p-3 border-t border-zinc-100 bg-white">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Inventory Affected</div>
              <FormRow label="Inventory values are affected" labelWidth="w-52" className="flex items-center min-h-[26px]">
                <select
                  className={selectCls}
                  value={form.maintain_inventory_values ? "Yes" : "No"}
                  onChange={(e) => setForm((f) => ({ ...f, maintain_inventory_values: e.target.value === "Yes" ? 1 : 0 }))}
                >
                  <option>No</option>
                  <option>Yes</option>
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
                  className={`${inputCls} text-right max-w-[100px] font-mono`}
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
                          className={`${inputCls} text-right max-w-[100px] font-mono`}
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
                      <div className="flex items-center text-[10px] text-zinc-500 font-mono pl-44 gap-4">
                        <span>CGST: {(statutoryForm.cgst_rate ?? 0).toFixed(2)}%</span>
                        <span>SGST: {(statutoryForm.sgst_rate ?? 0).toFixed(2)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Context 3: Bank Accounts inline parameters */}
          {groupLineage.isBank ? (
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
                    className={`${inputCls} text-right font-medium max-w-[120px] font-mono`}
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
          ) : (
            /* Context 4: General/Mailing/Debtor/Creditor fields */
            <>
              {groupLineage.isDebtorCreditor && (
                <div className="p-3 border-t border-zinc-100 bg-white">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Bill-wise Details</div>
                  <FormRow label="Maintain balances bill-by-bill" labelWidth="w-52" className="flex items-center min-h-[26px]">
                    <select
                      className={selectCls}
                      value={form.is_bill_wise ? "Yes" : "No"}
                      onChange={(e) => setForm((f) => ({ ...f, is_bill_wise: e.target.value === "Yes" ? 1 : 0 }))}
                    >
                      <option>No</option>
                      <option>Yes</option>
                    </select>
                  </FormRow>
                </div>
              )}

              {/* Mailing Details */}
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
                </div>
              </div>

              {/* Banking Details popup trigger */}
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
                        <span className="text-sm font-mono text-zinc-700">{bankForm.account_number}</span>
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

              {/* Tax Registration Details */}
              <div className="p-3 border-t border-zinc-100 bg-white">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Tax Registration Details</div>
                <div className="space-y-1">
                  <FormRow label="PAN/IT No." labelWidth="w-40" className="flex items-center min-h-[26px]">
                    <input className={inputCls} value={form.pan || ""} onChange={setField("pan")} />
                  </FormRow>
                  <FormRow label="Registration Type" labelWidth="w-40" className="flex items-center min-h-[26px]">
                    <select className={selectCls} value={form.registration_type || "Unregistered"} onChange={setField("registration_type")}>
                      <option value="Regular">Regular</option>
                      <option value="Composition">Composition</option>
                      <option value="Consumer">Consumer</option>
                      <option value="Unregistered">Unregistered</option>
                    </select>
                  </FormRow>
                  {(form.registration_type === "Regular" || form.registration_type === "Composition") && (
                    <FormRow label="GSTIN/UIN" labelWidth="w-40" className="flex items-center min-h-[26px]">
                      <input className={inputCls} value={form.gstin || ""} onChange={setField("gstin")} />
                    </FormRow>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Group Panel */}
        {showGroupPanel && (
          <div className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
            <div className="px-3 py-2 border-b border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase tracking-wider flex justify-between items-center select-none">
              <span>List of Groups</span>
              <button onClick={() => setShowGroupPanel(false)} className="text-sm font-bold text-zinc-400 hover:text-zinc-800 transition-colors">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <GroupTree
                tree={groupTree}
                selectedId={form.group_id as number}
                onSelect={(group: GroupType) => {
                  setSelectedGroup(group);
                  setForm((f) => ({ ...f, group_id: group.group_id }));
                  setShowGroupPanel(false);
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50">
        <Link to="/master/create" className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium">
          &larr; Back to Masters
        </Link>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-6 py-1.5 rounded bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 transition-all font-semibold shadow-sm hover:shadow active:scale-95 duration-150"
        >
          {loading ? "Saving..." : "Create"}
        </button>
      </div>
    </div>
  );
}