import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";
import GroupTree from "../../../components/GroupTree";
import type { LedgerType, GroupType } from "../../types/api";

const INDIAN_STATES = [
  "Not Applicable",
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

type Mode = "list" | "edit";

export default function LedgerAlter() {
  const { selectedCompany, activeFY } = useCompany();
  const [ledgers, setLedgers] = useState<LedgerType[]>([]);
  const [groupTree, setGroupTree] = useState<(GroupType & { children?: GroupType[] })[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [provideBank, setProvideBank] = useState<"No" | "Yes">("No");
  const [provideGst, setProvideGst] = useState<"No" | "Yes">("No");

  const [form, setForm] = useState<Partial<LedgerType>>({});
  const [bankForm, setBankForm] = useState<BankDetails>({});
  const [statutoryForm, setStatutoryForm] = useState<StatutoryDetails>({});

  const companyId = selectedCompany?.company_id;

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const [lRes, treeRes, gRes] = await Promise.all([
        window.api.ledger.getAll(companyId),
        window.api.group.getTree(companyId),
        window.api.group.getAll(companyId),
      ]);
      if (lRes.success) setLedgers(lRes.ledgers ?? []);
      if (treeRes.success && treeRes.tree) setGroupTree(treeRes.tree ?? []);
      if (gRes.success && gRes.groups) setGroups(gRes.groups ?? []);
    } catch (e) {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [lRes, treeRes, gRes] = await Promise.all([
          window.api.ledger.getAll(companyId),
          window.api.group.getTree(companyId),
          window.api.group.getAll(companyId),
        ]);
        if (cancelled) return;
        if (lRes.success) setLedgers(lRes.ledgers ?? []);
        if (treeRes.success && treeRes.tree) setGroupTree(treeRes.tree ?? []);
        if (gRes.success && gRes.groups) setGroups(gRes.groups ?? []);
      } catch (e) {
        if (!cancelled) setError("Failed to load data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const startEdit = async (id: number) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await window.api.ledger.getById(id);
      if (res.success && res.ledger) {
        const l: any = res.ledger;
        setForm({ ...l });
        setEditingId(id);
        setMode("edit");

        if (l.bank_details) {
          setProvideBank("Yes");
          setBankForm({ ...l.bank_details });
        } else {
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
          });
        }

        if (l.statutory_details) {
          setProvideGst("Yes");
          setStatutoryForm({ ...l.statutory_details });
        } else {
          setProvideGst("No");
          setStatutoryForm({
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
        }
      } else {
        setError(res.error || "Ledger not found.");
      }
    } catch (e) {
      setError("Failed to fetch ledger.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ledger: LedgerType) => {
    if (!ledger.ledger_id) return;
    if (ledger.is_predefined) {
      setError("Cannot delete predefined ledgers.");
      return;
    }
    if (!confirm(`Delete ledger "${ledger.name}"?`)) return;
    setLoading(true);
    try {
      const res = await window.api.ledger.delete(ledger.ledger_id);
      if (res.success) {
        setSuccess(`Ledger "${ledger.name}" deleted.`);
        await fetchData();
      } else {
        setError(res.error || "Failed to delete ledger.");
      }
    } catch (e) {
      setError("Unexpected error during delete.");
    } finally {
      setLoading(false);
    }
  };

  const groupName = (id?: number) => groups.find((g) => g.group_id === id)?.name || "\u2014";

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

  const setBankToggle = (key: keyof BankDetails) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setBankForm((f) => ({ ...f, [key]: e.target.checked ? 1 : 0 }));

  const setStatField = (key: keyof StatutoryDetails) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setStatutoryForm((f) => ({ ...f, [key]: e.target.value }));

  const setStatNumber = (key: keyof StatutoryDetails) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setStatutoryForm((f) => ({ ...f, [key]: e.target.value === "" ? undefined : Number(e.target.value) }));

  const handleGroupSelect = (group: GroupType) => {
    setForm((f) => ({ ...f, group_id: group.group_id }));
    setShowGroupPanel(false);
  };

  const fyLabel = useMemo(() => {
    if (activeFY?.start_date) {
      const d = new Date(activeFY.start_date);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getDate()}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
    }
    return "1-Apr-24";
  }, [activeFY]);

  const handleSubmit = async () => {
    if (!form.name?.trim()) { setError("Name is required."); return; }
    if (!companyId) { setError("No company selected."); return; }

    setLoading(true); setError(null); setSuccess(null);
    try {
      const payload: any = {
        ledger_id: editingId!,
        company_id: companyId!,
        name: form.name!.trim(),
        alias: form.alias?.trim() || undefined,
        group_id: form.group_id || undefined,
        ledger_type: form.ledger_type || "General",
        nature: form.nature || undefined,
        opening_balance: Number(form.opening_balance) || 0,
        closing_balance: Number(form.closing_balance) || 0,
        is_bill_wise: form.is_bill_wise ? 1 : 0,
        maintain_inventory_values: form.maintain_inventory_values ? 1 : 0,
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

      const res = await window.api.ledger.update(payload);
      if (res.success) {
        setSuccess(`Ledger "${form.name}" updated.`);
        await fetchData();
        setMode("list");
        setEditingId(null);
      } else {
        setError(res.error || "Failed to update ledger.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent focus:border-amber-300 focus:bg-amber-50";
  const selectCls = "bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent focus:border-amber-300 focus:bg-amber-50";
  const rowCls = "flex items-center min-h-[24px]";
  const labelCls = "w-24 text-sm shrink-0";
  const colonCls = "text-sm mr-1";

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <div className="bg-[#b4c6e7] px-3 py-1 text-sm font-medium flex justify-between items-center border-b border-[#8a9bc0] select-none">
        <span>{mode === "list" ? "Alter Ledgers" : "Alter Ledger"}</span>
        
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

      {mode === "list" ? (
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <Link to="/master/alter" className="text-sm text-zinc-500 hover:text-zinc-800">
              &larr; Back to Masters
            </Link>
          </div>
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-500 bg-gray-50">
                  <th className="px-4 py-2 text-left border">Name</th>
                  <th className="px-4 py-2 text-left border">Under</th>
                  <th className="px-4 py-2 text-left border">Type</th>
                  <th className="px-4 py-2 text-left border">Nature</th>
                  <th className="px-4 py-2 text-right border">Opening</th>
                  <th className="px-4 py-2 text-center border">Status</th>
                  <th className="px-4 py-2 text-right border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ledgers.map((l) => {
                  const isPredefined = l.is_predefined === 1;
                  return (
                    <tr key={l.ledger_id} className="hover:bg-gray-50 border-b">
                      <td className="px-4 py-2 border font-medium">{l.name}</td>
                      <td className="px-4 py-2 border">{groupName(l.group_id)}</td>
                      <td className="px-4 py-2 border">{l.ledger_type}</td>
                      <td className="px-4 py-2 border">{l.nature}</td>
                      <td className="px-4 py-2 border text-right tabular-nums">{Number(l.opening_balance).toFixed(2)}</td>
                      <td className="px-4 py-2 border text-center">
                        {isPredefined ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">Predefined</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-2 border text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(l.ledger_id!)}
                            className="text-xs px-2 py-1 rounded border border-zinc-300 hover:bg-zinc-100 transition-colors"
                          >
                            Edit
                          </button>
                          {!isPredefined && (
                            <button
                              onClick={() => handleDelete(l)}
                              className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-100 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {ledgers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No ledgers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex p-2 gap-3">
              <div className="flex-1 space-y-0.5">
                <div className={rowCls}>
                  <label className={labelCls}>Name</label>
                  <span className={colonCls}>:</span>
                  <input autoFocus className={`${inputCls} bg-amber-50 border-amber-300`} value={form.name || ""} onChange={setField("name")} />
                </div>
                <div className={rowCls}>
                  <label className={labelCls}>(alias)</label>
                  <span className={colonCls}>:</span>
                  <input className={inputCls} value={form.alias || ""} onChange={setField("alias")} />
                </div>
                <div className={`${rowCls} cursor-pointer hover:bg-zinc-50`} onClick={() => setShowGroupPanel(!showGroupPanel)}>
                  <label className={labelCls}>Under</label>
                  <span className={colonCls}>:</span>
                  <span className="text-sm">{groupName(form.group_id)}</span>
                </div>
              </div>

              <div className="w-44 border shrink-0">
                <div className="text-center text-xs border-b py-0.5 bg-zinc-50">Total Opening Balance</div>
                <div className="h-16 flex items-center justify-center text-sm font-medium tabular-nums">
                  {Number(form.opening_balance || 0).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex-1" />

            <div className="border-t p-2 flex items-center justify-center gap-2">
              <span className="text-sm font-medium">Opening Balance</span>
              <span className="text-sm">( on {fyLabel} ) :</span>
              <input type="number" step="0.01" className="w-32 border border-zinc-300 text-sm text-right px-1 py-0.5" value={form.opening_balance ?? 0} onChange={setNumber("opening_balance")} />
            </div>
          </div>

          <div className="w-[420px] border-l flex flex-col overflow-y-auto shrink-0">
            <div className="border-b p-2">
              <div className="text-sm font-semibold mb-1.5 underline decoration-1 underline-offset-2">Mailing Details</div>
              <div className="space-y-0.5">
                <div className={rowCls}>
                  <label className="w-20 text-sm shrink-0">Name</label>
                  <span className={colonCls}>:</span>
                  <input className={inputCls} value={form.mailing_name || ""} onChange={setField("mailing_name")} />
                </div>
                <div className="flex items-start min-h-[24px]">
                  <label className="w-20 text-sm shrink-0 pt-0.5">Address</label>
                  <span className="text-sm mr-1 pt-0.5">:</span>
                  <div className="flex-1 space-y-0.5">
                    <input className={`${inputCls} w-full`} value={form.address1 || ""} onChange={setField("address1")} />
                    <input className={`${inputCls} w-full`} value={form.address2 || ""} onChange={setField("address2")} />
                  </div>
                </div>
                <div className={rowCls}>
                  <label className="w-20 text-sm shrink-0">City</label>
                  <span className={colonCls}>:</span>
                  <input className={inputCls} value={form.city || ""} onChange={setField("city")} />
                </div>
                <div className={rowCls}>
                  <label className="w-20 text-sm shrink-0">State</label>
                  <span className={colonCls}>:</span>
                  <select className={selectCls} value={form.state || "Not Applicable"} onChange={setField("state")}>
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
                <div className={rowCls}>
                  <label className="w-20 text-sm shrink-0">Phone</label>
                  <span className={colonCls}>:</span>
                  <input className={inputCls} value={form.phone || ""} onChange={setField("phone")} />
                </div>
                <div className={rowCls}>
                  <label className="w-20 text-sm shrink-0">Email</label>
                  <span className={colonCls}>:</span>
                  <input className={inputCls} type="email" value={form.email || ""} onChange={setField("email")} />
                </div>
              </div>
            </div>

            <div className="border-b p-2">
              <div className="text-sm font-semibold mb-1.5 underline decoration-1 underline-offset-2">Banking Details</div>
              <div className={rowCls}>
                <label className="w-40 text-sm shrink-0">Provide bank details</label>
                <span className={colonCls}>:</span>
                <select className={selectCls} value={provideBank} onChange={(e) => setProvideBank(e.target.value as "No" | "Yes")}>
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </div>
              {provideBank === "Yes" && (
                <div className="mt-1.5 space-y-0.5 pl-2">
                  <div className={rowCls}>
                    <label className="w-40 text-sm shrink-0">Account Holder Name</label>
                    <span className={colonCls}>:</span>
                    <input className={inputCls} value={bankForm.account_holder_name || ""} onChange={setBankField("account_holder_name")} />
                  </div>
                  <div className={rowCls}>
                    <label className="w-40 text-sm shrink-0">Account Number</label>
                    <span className={colonCls}>:</span>
                    <input className={inputCls} value={bankForm.account_number || ""} onChange={setBankField("account_number")} />
                  </div>
                  <div className={rowCls}>
                    <label className="w-40 text-sm shrink-0">IFSC Code</label>
                    <span className={colonCls}>:</span>
                    <input className={inputCls} value={bankForm.ifsc_code || ""} onChange={setBankField("ifsc_code")} />
                  </div>
                  <div className={rowCls}>
                    <label className="w-40 text-sm shrink-0">SWIFT Code</label>
                    <span className={colonCls}>:</span>
                    <input className={inputCls} value={bankForm.swift_code || ""} onChange={setBankField("swift_code")} />
                  </div>
                  <div className={rowCls}>
                    <label className="w-40 text-sm shrink-0">Bank Name</label>
                    <span className={colonCls}>:</span>
                    <input className={inputCls} value={bankForm.bank_name || ""} onChange={setBankField("bank_name")} />
                  </div>
                  <div className={rowCls}>
                    <label className="w-40 text-sm shrink-0">Branch Name</label>
                    <span className={colonCls}>:</span>
                    <input className={inputCls} value={bankForm.branch_name || ""} onChange={setBankField("branch_name")} />
                  </div>
                  <div className={rowCls}>
                    <label className="w-40 text-sm shrink-0">Cheque Book Start No</label>
                    <span className={colonCls}>:</span>
                    <input className={inputCls} value={bankForm.cheque_book_start_no || ""} onChange={setBankField("cheque_book_start_no")} />
                  </div>
                  <div className={rowCls}>
                    <label className="w-40 text-sm shrink-0">Cheque Book End No</label>
                    <span className={colonCls}>:</span>
                    <input className={inputCls} value={bankForm.cheque_book_end_no || ""} onChange={setBankField("cheque_book_end_no")} />
                  </div>
                  <div className={rowCls}>
                    <label className="w-40 text-sm shrink-0">OD Limit</label>
                    <span className={colonCls}>:</span>
                    <input className={inputCls} type="number" step="0.01" value={bankForm.od_limit ?? 0} onChange={setBankNumber("od_limit")} />
                  </div>
                  <div className="flex items-center min-h-[24px]">
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="checkbox" checked={!!bankForm.enable_cheque_printing} onChange={setBankToggle("enable_cheque_printing")} className="rounded" />
                      Enable Cheque Printing
                    </label>
                  </div>
                  <div className={rowCls}>
                    <label className="w-40 text-sm shrink-0">Cheque Print Config</label>
                    <span className={colonCls}>:</span>
                    <input className={inputCls} value={bankForm.cheque_printing_configuration || ""} onChange={setBankField("cheque_printing_configuration")} />
                  </div>
                </div>
              )}
            </div>

            <div className="p-2">
              <div className="text-sm font-semibold mb-1.5 underline decoration-1 underline-offset-2">Tax Registration Details</div>
              <div className="space-y-0.5">
                <div className={rowCls}>
                  <label className="w-40 text-sm shrink-0">PAN/IT No.</label>
                  <span className={colonCls}>:</span>
                  <input className={inputCls} value={form.pan || ""} onChange={setField("pan")} />
                </div>
                <div className={rowCls}>
                  <label className="w-40 text-sm shrink-0">Registration type</label>
                  <span className={colonCls}>:</span>
                  <select className={selectCls} value={form.registration_type || "Unregistered"} onChange={setField("registration_type")}>
                    {REG_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className={rowCls}>
                  <label className="w-40 text-sm shrink-0 pl-4">GSTIN/UIN</label>
                  <span className={colonCls}>:</span>
                  <input className={inputCls} value={form.gstin || ""} onChange={setField("gstin")} />
                </div>
                <div className={rowCls}>
                  <label className="w-40 text-sm shrink-0 pl-4">Set/Alter additional GST details</label>
                  <span className={colonCls}>:</span>
                  <select className={selectCls} value={provideGst} onChange={(e) => setProvideGst(e.target.value as "No" | "Yes")}>
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </div>
                {provideGst === "Yes" && (
                  <div className="mt-1.5 space-y-0.5 pl-6">
                    <div className={rowCls}>
                      <label className="w-40 text-sm shrink-0">GST Applicability</label>
                      <span className={colonCls}>:</span>
                      <select className={selectCls} value={statutoryForm.gst_applicability || "Not Applicable"} onChange={setStatField("gst_applicability")}>
                        {GST_APPLICABILITIES.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className={rowCls}>
                      <label className="w-40 text-sm shrink-0">HSN/SAC Code</label>
                      <span className={colonCls}>:</span>
                      <input className={inputCls} value={statutoryForm.hsn_sac_code || ""} onChange={setStatField("hsn_sac_code")} />
                    </div>
                    <div className={rowCls}>
                      <label className="w-40 text-sm shrink-0">HSN/SAC Description</label>
                      <span className={colonCls}>:</span>
                      <input className={inputCls} value={statutoryForm.hsn_sac_description || ""} onChange={setStatField("hsn_sac_description")} />
                    </div>
                    <div className={rowCls}>
                      <label className="w-40 text-sm shrink-0">GST Rate (%)</label>
                      <span className={colonCls}>:</span>
                      <input className={inputCls} type="number" step="0.01" min="0" max="100" value={statutoryForm.gst_rate ?? 0} onChange={setStatNumber("gst_rate")} />
                    </div>
                    <div className={rowCls}>
                      <label className="w-40 text-sm shrink-0">CGST Rate (%)</label>
                      <span className={colonCls}>:</span>
                      <input className={inputCls} type="number" step="0.01" min="0" max="100" value={statutoryForm.cgst_rate ?? 0} onChange={setStatNumber("cgst_rate")} />
                    </div>
                    <div className={rowCls}>
                      <label className="w-40 text-sm shrink-0">SGST Rate (%)</label>
                      <span className={colonCls}>:</span>
                      <input className={inputCls} type="number" step="0.01" min="0" max="100" value={statutoryForm.sgst_rate ?? 0} onChange={setStatNumber("sgst_rate")} />
                    </div>
                    <div className={rowCls}>
                      <label className="w-40 text-sm shrink-0">IGST Rate (%)</label>
                      <span className={colonCls}>:</span>
                      <input className={inputCls} type="number" step="0.01" min="0" max="100" value={statutoryForm.igst_rate ?? 0} onChange={setStatNumber("igst_rate")} />
                    </div>
                    <div className={rowCls}>
                      <label className="w-40 text-sm shrink-0">Type of Duty/Tax</label>
                      <span className={colonCls}>:</span>
                      <input className={inputCls} value={statutoryForm.type_of_duty_tax || ""} onChange={setStatField("type_of_duty_tax")} />
                    </div>
                    <div className={rowCls}>
                      <label className="w-40 text-sm shrink-0">% of Calculation</label>
                      <span className={colonCls}>:</span>
                      <input className={inputCls} type="number" step="0.01" value={statutoryForm.percentage_of_calculation ?? 0} onChange={setStatNumber("percentage_of_calculation")} />
                    </div>
                    <div className={rowCls}>
                      <label className="w-40 text-sm shrink-0">Statutory Details</label>
                      <span className={colonCls}>:</span>
                      <input className={inputCls} value={statutoryForm.statutory_details || ""} onChange={setStatField("statutory_details")} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {mode === "edit" && showGroupPanel && (
            <div className="w-72 border-l bg-zinc-50/50 flex flex-col">
              <div className="px-4 py-3 border-b text-sm font-medium text-zinc-600 flex justify-between items-center">
                <span>Under Group</span>
                <button onClick={() => setShowGroupPanel(false)} className="text-xs text-zinc-400 hover:text-zinc-600">&times;</button>
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
      )}

      {mode === "edit" && (
        <div className="border-t p-2 flex justify-between items-center bg-zinc-50">
          <button
            onClick={() => { setMode("list"); setEditingId(null); setError(null); setSuccess(null); }}
            className="text-xs text-zinc-500 hover:text-zinc-800"
          >
            &larr; Back to List
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => { setMode("list"); setEditingId(null); }}
              className="text-sm px-4 py-1 rounded border text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="text-sm px-5 py-1 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
            >
              {loading ? "Saving..." : "Update"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
