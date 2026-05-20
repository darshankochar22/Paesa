import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
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

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent";
const selectCls = "bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent";

export default function LedgerCreate() {
  const { selectedCompany, activeFY } = useCompany();
  const [groupTree, setGroupTree] = useState<(GroupType & { children?: GroupType[] })[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [provideBank, setProvideBank] = useState<"No" | "Yes">("No");
  const [showBankPopup, setShowBankPopup] = useState(false);

  const [form, setForm] = useState<Partial<LedgerType>>(INITIAL_FORM);
  const [bankForm, setBankForm] = useState<BankDetails>(EMPTY_BANK_DETAILS);
  const [statutoryForm] = useState<StatutoryDetails>(EMPTY_STATUTORY);

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

  const validate = (): string | null => {
    if (!form.name?.trim()) return "Name is required.";
    if (!companyId) return "No company selected.";
    return null;
  };

  const handleSubmit = async () => {
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
        is_bill_wise: 0,
        maintain_inventory_values: 0,
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

      if (provideBank === "Yes") {
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

      if (statutoryForm.gst_applicability && statutoryForm.gst_applicability !== "Not Applicable") {
        payload.statutory_details = {
          gst_applicability: statutoryForm.gst_applicability,
          hsn_sac_code: statutoryForm.hsn_sac_code?.trim() || undefined,
          gst_rate: Number(statutoryForm.gst_rate) || 0,
          cgst_rate: Number(statutoryForm.cgst_rate) || 0,
          sgst_rate: Number(statutoryForm.sgst_rate) || 0,
          igst_rate: Number(statutoryForm.igst_rate) || 0,
        };
      }

      const res = await window.api.ledger.create(payload);
      if (res.success) {
        setSuccess(`Ledger "${form.name}" created.`);
        setForm(INITIAL_FORM);
        setProvideBank("No");
        setBankForm(EMPTY_BANK_DETAILS);
      } else {
        setError(res.error || "Failed to create ledger.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">

      {showBankPopup && (
        <BankDetailsPopup
          ledgerName={form.name || ""}
          bankForm={bankForm}
          setBankForm={setBankForm}
          onClose={handleBankClose}
          onAccept={() => setShowBankPopup(false)}
        />
      )}

      <div className="px-3 py-1 text-sm font-medium flex justify-between items-center select-none">
        <span>Ledger Creation</span>
      </div>

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

        {/* Left: Name / Group / Opening Balance */}
        <div className="flex-1 flex flex-col min-w-0 shrink-0">
          <div className="p-2 space-y-0.5">
            <FormRow label="Name" labelWidth="w-16" className="flex items-center min-h-[22px]">
              <input autoFocus className={inputCls} value={form.name || ""} onChange={setField("name")} />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-16" className="flex items-center min-h-[22px]">
              <input className={inputCls} value={form.alias || ""} onChange={setField("alias")} />
            </FormRow>
          </div>

          <div className="p-2">
            <div
              className="flex items-center min-h-[22px] cursor-pointer hover:bg-zinc-50"
              onClick={() => setShowGroupPanel(!showGroupPanel)}
            >
              <span className="w-16 text-sm shrink-0">Under</span>
              <span className="text-zinc-600 mr-2 shrink-0">:</span>
              <span className="text-sm px-1 py-0.5">{selectedGroup?.name || "—"}</span>
            </div>
          </div>

          <div className="flex-1" />

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
        </div>

        {/* Right: Mailing, Banking, Tax */}
        <div className="w-[480px] border-l flex flex-col overflow-y-auto shrink-0">
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

          {/* Tax Registration */}
          <div className="p-2">
            <div className="text-sm font-semibold mb-1.5 underline decoration-1 underline-offset-2">Tax Registration Details</div>
            <FormRow label="PAN/IT No." labelWidth="w-40" className="flex items-center min-h-[22px]">
              <input className={inputCls} value={form.pan || ""} onChange={setField("pan")} />
            </FormRow>
          </div>
        </div>

        {/* Group Panel */}
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
                  setSelectedGroup(group);
                  setForm((f) => ({ ...f, group_id: group.group_id }));
                  setShowGroupPanel(false);
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="border-t p-2 flex justify-between items-center bg-zinc-50">
        <Link to="/master/create" className="text-xs text-zinc-500 hover:text-zinc-800">
          &larr; Back to Masters
        </Link>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-5 py-1 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? "Saving..." : "Create"}
        </button>
      </div>
    </div>
  );
}