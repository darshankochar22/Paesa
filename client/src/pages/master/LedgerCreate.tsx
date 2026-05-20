import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";
import GroupTree from "../../../components/GroupTree";
import type { LedgerType, GroupType } from "../../types/api";

const INDIAN_STATES = [
  "Select",
  "List Of States",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const REG_TYPES = ["Unregistered", "Regular", "Composition", "SEZ"];
const GST_APPLICABILITIES = ["Not Applicable", "Goods", "Services", "Both"];

const TXN_TYPES_DEFAULT = ["End of List", "Cheque", "e-Fund Transfer", "Others"];
const TXN_TYPES_EXTRA = ["ATM-Card", "ECS", "Electronic Cheque", "Electronic DD/PO"];

interface BankDetails {
  account_holder_name?: string;
  account_number?: string;
  ifsc_code?: string;
  swift_code?: string;
  bank_name?: string;
  branch_name?: string;
  bank_configuration?: string;
  cheque_book_start_no?: string;
  cheque_book_end_no?: string;
  enable_cheque_printing?: number;
  cheque_printing_configuration?: string;
  od_limit?: number;
  transaction_type?: string;
}

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


interface BankDetailsPopupProps {
  ledgerName: string;
  bankForm: BankDetails;
  setBankForm: React.Dispatch<React.SetStateAction<BankDetails>>;
  onClose: () => void;
  onAccept: () => void;
}

function BankDetailsPopup({ ledgerName, bankForm, setBankForm, onClose, onAccept }: BankDetailsPopupProps) {
  const [showMore, setShowMore] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<string>(bankForm.transaction_type || "");

  const setBankField = (key: keyof BankDetails) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setBankForm((f) => ({ ...f, [key]: e.target.value }));

  const setBankNumber = (key: keyof BankDetails) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setBankForm((f) => ({ ...f, [key]: e.target.value === "" ? undefined : Number(e.target.value) }));

  const setBankToggle = (key: keyof BankDetails) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setBankForm((f) => ({ ...f, [key]: e.target.checked ? 1 : 0 }));

  const handleTxnSelect = (txn: string) => {
    if (txn === "End of List") return;
    setSelectedTxn(txn);
    setBankForm((f) => ({ ...f, transaction_type: txn }));
  };

  const txnList = showMore
    ? [...TXN_TYPES_DEFAULT, ...TXN_TYPES_EXTRA]
    : TXN_TYPES_DEFAULT;

  const rowCls = "flex items-center min-h-[22px]";
  const labelCls = "w-44 text-sm shrink-0";
  const colonCls = "text-sm mr-2 shrink-0 w-3";
  const inputCls = "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent focus:border-zinc-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-zinc-300 shadow-sm w-[680px] flex flex-col" style={{ minHeight: 380 }}>

        {/* Header */}
        <div className="bg-zinc-800 text-white text-sm px-3 py-1 font-medium select-none flex justify-between items-center">
          <span>
            Bank Details For :{" "}
            <span className="font-semibold">{ledgerName || "—"}</span>
          </span>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-base leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">

          {/* Left — fields */}
          <div className="flex-1 p-3 space-y-0.5 overflow-y-auto">

            <div className={rowCls}>
              <label className={labelCls}>Account Holder Name</label>
              <span className={colonCls}>:</span>
              <input className={inputCls} value={bankForm.account_holder_name || ""} onChange={setBankField("account_holder_name")} />
            </div>
            <div className={rowCls}>
              <label className={labelCls}>Account Number</label>
              <span className={colonCls}>:</span>
              <input className={inputCls} value={bankForm.account_number || ""} onChange={setBankField("account_number")} />
            </div>
            <div className={rowCls}>
              <label className={labelCls}>IFSC Code</label>
              <span className={colonCls}>:</span>
              <input className={inputCls} value={bankForm.ifsc_code || ""} onChange={setBankField("ifsc_code")} />
            </div>
            <div className={rowCls}>
              <label className={labelCls}>SWIFT Code</label>
              <span className={colonCls}>:</span>
              <input className={inputCls} value={bankForm.swift_code || ""} onChange={setBankField("swift_code")} />
            </div>
            <div className={rowCls}>
              <label className={labelCls}>Bank Name</label>
              <span className={colonCls}>:</span>
              <input className={inputCls} value={bankForm.bank_name || ""} onChange={setBankField("bank_name")} />
            </div>
            <div className={rowCls}>
              <label className={labelCls}>Branch Name</label>
              <span className={colonCls}>:</span>
              <input className={inputCls} value={bankForm.branch_name || ""} onChange={setBankField("branch_name")} />
            </div>
            <div className={rowCls}>
              <label className={labelCls}>OD Limit</label>
              <span className={colonCls}>:</span>
              <input
                className="w-28 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent focus:border-zinc-300 text-right"
                type="number"
                step="0.01"
                value={bankForm.od_limit ?? 0}
                onChange={setBankNumber("od_limit")}
              />
            </div>

            <div className="pt-1" />

            <div className={rowCls}>
              <label className={labelCls}>Transaction Type</label>
              <span className={colonCls}>:</span>
              <span className="text-sm px-1 py-0.5 text-zinc-700">
                {selectedTxn || <span className="text-zinc-400 italic text-xs">select from list →</span>}
              </span>
            </div>

            <div className="pt-1" />

            <div className="flex items-center min-h-[22px]">
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!bankForm.enable_cheque_printing}
                  onChange={setBankToggle("enable_cheque_printing")}
                  className="rounded"
                />
                Enable Cheque Printing
              </label>
            </div>

            {!!bankForm.enable_cheque_printing && (
              <>
                <div className={rowCls}>
                  <label className={labelCls}>Cheque Book Start No</label>
                  <span className={colonCls}>:</span>
                  <input className={inputCls} value={bankForm.cheque_book_start_no || ""} onChange={setBankField("cheque_book_start_no")} />
                </div>
                <div className={rowCls}>
                  <label className={labelCls}>Cheque Book End No</label>
                  <span className={colonCls}>:</span>
                  <input className={inputCls} value={bankForm.cheque_book_end_no || ""} onChange={setBankField("cheque_book_end_no")} />
                </div>
                <div className={rowCls}>
                  <label className={labelCls}>Cheque Print Config</label>
                  <span className={colonCls}>:</span>
                  <input className={inputCls} value={bankForm.cheque_printing_configuration || ""} onChange={setBankField("cheque_printing_configuration")} />
                </div>
              </>
            )}
          </div>

          {/* Right — transaction type list */}
          <div className="w-52 border-l border-zinc-200 flex flex-col shrink-0">
            <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-200 bg-zinc-50 select-none">
              <span className="text-xs font-medium text-zinc-700">Transaction Type</span>
              <button
                onClick={() => setShowMore((v) => !v)}
                className="text-xs text-zinc-500 hover:text-zinc-800 underline underline-offset-1"
              >
                {showMore ? "Show Less" : "Show More"}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {txnList.map((txn) => (
                <div
                  key={txn}
                  onClick={() => handleTxnSelect(txn)}
                  className={[
                    "text-sm px-2 py-0.5 border-b border-zinc-100 select-none",
                    txn === "End of List"
                      ? "text-zinc-400 italic cursor-default"
                      : "cursor-pointer hover:bg-zinc-100",
                    selectedTxn === txn
                      ? "bg-zinc-800 text-white hover:bg-zinc-800"
                      : "",
                  ].join(" ")}
                >
                  {txn}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 px-3 py-1.5 flex justify-end gap-2 bg-zinc-50">
          <button
            onClick={onClose}
            className="text-sm px-4 py-0.5 border border-zinc-300 hover:bg-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onAccept}
            className="text-sm px-5 py-0.5 bg-black text-white hover:bg-zinc-800 transition-colors font-medium"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}


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
  const [provideGst, setProvideGst] = useState<"No" | "Yes">("No");

  const [form, setForm] = useState<Partial<LedgerType>>({
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
    bank_name: "",
    account_number: "",
    ifsc_code: "",
  });

  const [bankForm, setBankForm] = useState<BankDetails>({
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
    swift_code: "",
    bank_name: "",
    branch_name: "",
    bank_configuration: "",
    cheque_book_start_no: "",
    cheque_book_end_no: "",
    enable_cheque_printing: 0,
    cheque_printing_configuration: "",
    od_limit: 0,
    transaction_type: "",
  });

  const [statutoryForm, setStatutoryForm] = useState<StatutoryDetails>({
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
  });

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
          const allGroups = allRes.groups ?? [];
          const capital = allGroups.find((g: GroupType) => g.name === "Capital Account");
          if (capital && !selectedGroup) {
            setSelectedGroup(capital);
            setForm((f) => ({ ...f, group_id: capital.group_id }));
          }
        }
      } catch (e) {
        if (!cancelled) setError("Failed to load groups.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const handleGroupSelect = (group: GroupType) => {
    setSelectedGroup(group);
    setForm((f) => ({ ...f, group_id: group.group_id }));
    setShowGroupPanel(false);
  };

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

  const setStatField = (key: keyof StatutoryDetails) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setStatutoryForm((f) => ({ ...f, [key]: e.target.value }));

  const setStatNumber = (key: keyof StatutoryDetails) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setStatutoryForm((f) => ({ ...f, [key]: e.target.value === "" ? undefined : Number(e.target.value) }));

  const handleProvideBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as "No" | "Yes";
    setProvideBank(val);
    if (val === "Yes") setShowBankPopup(true);
  };

  const handleBankAccept = () => {
    setShowBankPopup(false);
  };

  const handleBankClose = () => {
    setShowBankPopup(false);
    setProvideBank("No");
    setBankForm({
      account_holder_name: "",
      account_number: "",
      ifsc_code: "",
      swift_code: "",
      bank_name: "",
      branch_name: "",
      bank_configuration: "",
      cheque_book_start_no: "",
      cheque_book_end_no: "",
      enable_cheque_printing: 0,
      cheque_printing_configuration: "",
      od_limit: 0,
      transaction_type: "",
    });
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
        bank_name: form.bank_name?.trim() || undefined,
        account_number: form.account_number?.trim() || undefined,
        ifsc_code: form.ifsc_code?.trim() || undefined,
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

      if (provideGst === "Yes") {
        payload.statutory_details = {
          gst_applicability: statutoryForm.gst_applicability || "Not Applicable",
          hsn_sac_code: statutoryForm.hsn_sac_code?.trim() || undefined,
          hsn_sac_description: statutoryForm.hsn_sac_description?.trim() || undefined,
          gst_rate: Number(statutoryForm.gst_rate) || 0,
          cgst_rate: Number(statutoryForm.cgst_rate) || 0,
          sgst_rate: Number(statutoryForm.sgst_rate) || 0,
          igst_rate: Number(statutoryForm.igst_rate) || 0,
          type_of_duty_tax: statutoryForm.type_of_duty_tax?.trim() || undefined,
          percentage_of_calculation: Number(statutoryForm.percentage_of_calculation) || 0,
          statutory_details: statutoryForm.statutory_details?.trim() || undefined,
        };
      }

      const res = await window.api.ledger.create(payload);
      if (res.success) {
        setSuccess(`Ledger "${form.name}" created.`);
        setForm({
          name: "", alias: "", opening_balance: 0, mailing_name: "",
          address1: "", address2: "", city: "", state: "Select",
          country: "India", pincode: "", phone: "", email: "",
          gstin: "", pan: "", registration_type: "Unregistered",
          bank_name: "", account_number: "", ifsc_code: "",
        });
        setProvideBank("No");
        setProvideGst("No");
        setBankForm({
          account_holder_name: "", account_number: "", ifsc_code: "",
          swift_code: "", bank_name: "", branch_name: "", bank_configuration: "",
          cheque_book_start_no: "", cheque_book_end_no: "",
          enable_cheque_printing: 0, cheque_printing_configuration: "",
          od_limit: 0, transaction_type: "",
        });
        setStatutoryForm({
          gst_applicability: "Not Applicable", hsn_sac_code: "",
          hsn_sac_description: "", gst_rate: 0, cgst_rate: 0,
          sgst_rate: 0, igst_rate: 0, type_of_duty_tax: "",
          percentage_of_calculation: 0, statutory_details: "",
        });
      } else {
        setError(res.error || "Failed to create ledger.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent";
  const selectCls = "bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent";
  const rowCls = "flex items-center min-h-[22px]";
  const labelCls = "w-16 text-sm shrink-0";
  const colonCls = "text-sm mr-2 shrink-0 w-3";

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

        <div className="flex-1 flex flex-col min-w-0 shrink-0">
          <div className="p-2 space-y-0.5">
            <div className={rowCls}>
              <label className={labelCls}>Name</label>
              <span className={colonCls}>:</span>
              <input autoFocus className={`${inputCls} bg-transparent`} value={form.name || ""} onChange={setField("name")} />
            </div>
            <div className={rowCls}>
              <label className={labelCls}>(alias)</label>
              <span className={colonCls}>:</span>
              <input className={inputCls} value={form.alias || ""} onChange={setField("alias")} />
            </div>
          </div>

          <div className="p-2">
            <div className={`${rowCls} cursor-pointer hover:bg-zinc-50`} onClick={() => setShowGroupPanel(!showGroupPanel)}>
              <label className={labelCls}>Under</label>
              <span className={colonCls}>:</span>
              <span className="text-sm px-1 py-0.5">
                {selectedGroup?.name || "\u2014"}
              </span>
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

        {/* Right detail panel */}
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
              <div className={rowCls}>
                <label className="w-20 text-sm shrink-0">Name</label>
                <span className={colonCls}>:</span>
                <input className={inputCls} value={form.mailing_name || ""} onChange={setField("mailing_name")} />
              </div>
              <div className="flex items-start min-h-[22px]">
                <label className="w-20 text-sm shrink-0 pt-0.5">Address</label>
                <span className="text-sm mr-2 shrink-0 w-3 pt-0.5">:</span>
                <div className="flex-1 space-y-0.5">
                  <input className={`${inputCls} w-full`} value={form.address1 || ""} onChange={setField("address1")} />
                  <input className={`${inputCls} w-full`} value={form.address2 || ""} onChange={setField("address2")} />
                </div>
              </div>
              <div className={rowCls}>
                <label className="w-20 text-sm shrink-0">State</label>
                <span className={colonCls}>:</span>
                <select className={selectCls} value={form.state || "Select"} onChange={setField("state")}>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className={rowCls}>
                <label className="w-20 text-sm shrink-0">Country</label>
                <span className={colonCls}>:</span>
                <input className={inputCls} value={form.country || ""} onChange={setField("country")} />
              </div>
              <div className={rowCls}>
                <label className="w-20 text-sm shrink-0">Pincode</label>
                <span className={colonCls}>:</span>
                <input className={inputCls} value={form.pincode || ""} onChange={setField("pincode")} />
              </div>
            </div>
          </div>

          {/* Banking Details */}
          <div className="p-2">
            <div className="text-sm font-semibold mb-1.5 underline decoration-1 underline-offset-2">Banking Details</div>
            <div className={rowCls}>
              <label className="w-40 text-sm shrink-0">Provide bank details</label>
              <span className={colonCls}>:</span>
              <select
                className={selectCls}
                value={provideBank}
                onChange={handleProvideBankChange}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            {/* Show summary of filled bank details if accepted */}
            {provideBank === "Yes" && !showBankPopup && (
              <div className="mt-1.5 pl-2 space-y-0.5">
                {bankForm.bank_name && (
                  <div className={rowCls}>
                    <label className="w-40 text-sm shrink-0 text-zinc-500">Bank Name</label>
                    <span className={colonCls}>:</span>
                    <span className="text-sm">{bankForm.bank_name}</span>
                  </div>
                )}
                {bankForm.account_number && (
                  <div className={rowCls}>
                    <label className="w-40 text-sm shrink-0 text-zinc-500">Account Number</label>
                    <span className={colonCls}>:</span>
                    <span className="text-sm">{bankForm.account_number}</span>
                  </div>
                )}
                {bankForm.transaction_type && (
                  <div className={rowCls}>
                    <label className="w-40 text-sm shrink-0 text-zinc-500">Transaction Type</label>
                    <span className={colonCls}>:</span>
                    <span className="text-sm">{bankForm.transaction_type}</span>
                  </div>
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
            <div className="space-y-0.5">
              <div className={rowCls}>
                <label className="w-40 text-sm shrink-0">PAN/IT No.</label>
                <span className={colonCls}>:</span>
                <input className={inputCls} value={form.pan || ""} onChange={setField("pan")} />
              </div>
            </div>
          </div>
        </div>

        {/* Group panel */}
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
                onSelect={handleGroupSelect}
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