import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";
import GroupTree from "../../../components/GroupTree";
import type { LedgerType, GroupType } from "../../types/api";

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start border-b last:border-0 min-h-[36px]">
      <span className="w-48 text-sm text-zinc-500 shrink-0 py-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-zinc-400 mr-2 py-1.5">:</span>
      <div className="flex-1 py-1">{children}</div>
    </div>
  );
}

const inputCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm placeholder:text-zinc-400 border-b border-transparent focus:border-zinc-300 transition-colors";
const selectCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm cursor-pointer border-b border-transparent focus:border-zinc-300 transition-colors";

const LEDGER_TYPES = ["General", "Cash", "Bank", "Duties & Taxes", "Expenses", "Income", "Sundry Debtors", "Sundry Creditors"];
const NATURES = ["Assets", "Liabilities", "Income", "Expenses"];
const REG_TYPES = ["Unregistered", "Registered", "Composition", "SEZ"];
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
  const { selectedCompany } = useCompany();
  const [ledgers, setLedgers] = useState<LedgerType[]>([]);
  const [groupTree, setGroupTree] = useState<(GroupType & { children?: GroupType[] })[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("list");
  const [editingId, setEditingId] = useState<number | null>(null);

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
          setBankForm({ ...l.bank_details });
        } else {
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
          setStatutoryForm({ ...l.statutory_details });
        } else {
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

  const selectedGroup = useMemo(
    () => groups.find((g) => g.group_id === form.group_id),
    [groups, form.group_id]
  );
  const groupName_ = selectedGroup?.name || "";

  const showBankSection = ["Bank Accounts", "Bank OD A/c"].includes(groupName_);
  const showSundrySection = ["Sundry Debtors", "Sundry Creditors"].includes(groupName_);
  const showStatutoryOnly = ["Duties & Taxes"].includes(groupName_);

  const setField = (key: keyof LedgerType) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const setNumber = (key: keyof LedgerType) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value === "" ? undefined : Number(e.target.value) }));

  const setToggle = (key: keyof LedgerType) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.checked ? 1 : 0 }));

  const setBankField = (key: keyof BankDetails) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
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
  };

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
        state: form.state?.trim() || undefined,
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

      if (showBankSection) {
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

      if (showStatutoryOnly || showSundrySection) {
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

  return (
    <div className="flex-1 flex">
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link to="/master/alter" className="text-sm text-zinc-500 hover:text-zinc-800">
              &larr; Back to Masters
            </Link>
            <h1 className="text-lg font-semibold text-zinc-800">
              {mode === "list" ? "Alter Ledgers" : "Edit Ledger"}
            </h1>
          </div>
          {mode === "edit" && (
            <button
              onClick={() => { setMode("list"); setEditingId(null); setError(null); setSuccess(null); }}
              className="text-sm px-4 py-1.5 rounded border text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              &larr; Back to List
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-2 border border-red-200 text-red-700 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs">dismiss</button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-2 border border-green-200 text-green-700 text-sm flex justify-between items-center">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs">dismiss</button>
          </div>
        )}

        {mode === "list" ? (
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
        ) : (
          <div className="flex flex-col gap-6 max-w-3xl">
            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">General</div>
              <div className="border rounded overflow-hidden">
                <Row label="Name" required>
                  <input autoFocus className={inputCls} value={form.name || ""} onChange={setField("name")} placeholder="Ledger name" />
                </Row>
                <Row label="Alias">
                  <input className={inputCls} value={form.alias || ""} onChange={setField("alias")} placeholder="Short name (optional)" />
                </Row>
                <Row label="Ledger Type">
                  <select className={selectCls} value={form.ledger_type || "General"} onChange={setField("ledger_type")}>
                    {LEDGER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Row>
                <Row label="Nature">
                  <select className={selectCls} value={form.nature || "Assets"} onChange={setField("nature")}>
                    {NATURES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Row>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Balances</div>
              <div className="border rounded overflow-hidden">
                <Row label="Opening Balance">
                  <input className={inputCls} type="number" step="0.01" value={form.opening_balance ?? 0} onChange={setNumber("opening_balance")} />
                </Row>
                <Row label="Closing Balance">
                  <input className={inputCls} type="number" step="0.01" value={form.closing_balance ?? 0} onChange={setNumber("closing_balance")} />
                </Row>
              </div>
            </div>

            {showBankSection && (
              <div>
                <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Bank Details</div>
                <div className="border rounded overflow-hidden">
                  <Row label="Account Holder Name">
                    <input className={inputCls} value={bankForm.account_holder_name || ""} onChange={setBankField("account_holder_name")} placeholder="Account holder" />
                  </Row>
                  <Row label="Account Number">
                    <input className={inputCls} value={bankForm.account_number || ""} onChange={setBankField("account_number")} placeholder="Account number" />
                  </Row>
                  <Row label="IFSC Code">
                    <input className={inputCls} value={bankForm.ifsc_code || ""} onChange={setBankField("ifsc_code")} placeholder="IFSC Code" />
                  </Row>
                  <Row label="SWIFT Code">
                    <input className={inputCls} value={bankForm.swift_code || ""} onChange={setBankField("swift_code")} placeholder="SWIFT Code" />
                  </Row>
                  <Row label="Bank Name">
                    <input className={inputCls} value={bankForm.bank_name || ""} onChange={setBankField("bank_name")} placeholder="Bank name" />
                  </Row>
                  <Row label="Branch Name">
                    <input className={inputCls} value={bankForm.branch_name || ""} onChange={setBankField("branch_name")} placeholder="Branch name" />
                  </Row>
                  <Row label="Cheque Book Start No">
                    <input className={inputCls} value={bankForm.cheque_book_start_no || ""} onChange={setBankField("cheque_book_start_no")} placeholder="Start number" />
                  </Row>
                  <Row label="Cheque Book End No">
                    <input className={inputCls} value={bankForm.cheque_book_end_no || ""} onChange={setBankField("cheque_book_end_no")} placeholder="End number" />
                  </Row>
                  <Row label="OD Limit">
                    <input className={inputCls} type="number" step="0.01" value={bankForm.od_limit ?? 0} onChange={setBankNumber("od_limit")} />
                  </Row>
                  <div className="border-b last:border-0 min-h-[36px] flex items-center px-1 py-1">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={!!bankForm.enable_cheque_printing} onChange={setBankToggle("enable_cheque_printing")} className="rounded" />
                      Enable Cheque Printing
                    </label>
                  </div>
                  <Row label="Cheque Print Config">
                    <input className={inputCls} value={bankForm.cheque_printing_configuration || ""} onChange={setBankField("cheque_printing_configuration")} placeholder="Cheque printing configuration" />
                  </Row>
                </div>
              </div>
            )}

            {showSundrySection && (
              <>
                <div>
                  <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Mailing Details</div>
                  <div className="border rounded overflow-hidden">
                    <Row label="Mailing Name">
                      <input className={inputCls} value={form.mailing_name || ""} onChange={setField("mailing_name")} placeholder="Mailing name" />
                    </Row>
                    <Row label="Address Line 1">
                      <input className={inputCls} value={form.address1 || ""} onChange={setField("address1")} placeholder="Address" />
                    </Row>
                    <Row label="Address Line 2">
                      <input className={inputCls} value={form.address2 || ""} onChange={setField("address2")} placeholder="Address" />
                    </Row>
                    <Row label="City">
                      <input className={inputCls} value={form.city || ""} onChange={setField("city")} placeholder="City" />
                    </Row>
                    <Row label="State">
                      <input className={inputCls} value={form.state || ""} onChange={setField("state")} placeholder="State" />
                    </Row>
                    <Row label="Country">
                      <input className={inputCls} value={form.country || ""} onChange={setField("country")} placeholder="Country" />
                    </Row>
                    <Row label="Pincode">
                      <input className={inputCls} value={form.pincode || ""} onChange={setField("pincode")} placeholder="Pincode" />
                    </Row>
                    <Row label="Phone">
                      <input className={inputCls} value={form.phone || ""} onChange={setField("phone")} placeholder="Phone" />
                    </Row>
                    <Row label="Email">
                      <input className={inputCls} type="email" value={form.email || ""} onChange={setField("email")} placeholder="Email" />
                    </Row>
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Tax Details</div>
                  <div className="border rounded overflow-hidden">
                    <Row label="GSTIN">
                      <input className={inputCls} value={form.gstin || ""} onChange={setField("gstin")} placeholder="GSTIN" />
                    </Row>
                    <Row label="PAN">
                      <input className={inputCls} value={form.pan || ""} onChange={setField("pan")} placeholder="PAN" />
                    </Row>
                    <Row label="Registration Type">
                      <select className={selectCls} value={form.registration_type || "Unregistered"} onChange={setField("registration_type")}>
                        {REG_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </Row>
                  </div>
                </div>
              </>
            )}

            {(showStatutoryOnly || showSundrySection) && (
              <div>
                <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Statutory Details</div>
                <div className="border rounded overflow-hidden">
                  <Row label="GST Applicability">
                    <select className={selectCls} value={statutoryForm.gst_applicability || "Not Applicable"} onChange={setStatField("gst_applicability")}>
                      {GST_APPLICABILITIES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </Row>
                  <Row label="HSN/SAC Code">
                    <input className={inputCls} value={statutoryForm.hsn_sac_code || ""} onChange={setStatField("hsn_sac_code")} placeholder="HSN/SAC Code" />
                  </Row>
                  <Row label="HSN/SAC Description">
                    <input className={inputCls} value={statutoryForm.hsn_sac_description || ""} onChange={setStatField("hsn_sac_description")} placeholder="Description" />
                  </Row>
                  <Row label="GST Rate (%)">
                    <input className={inputCls} type="number" step="0.01" min="0" max="100" value={statutoryForm.gst_rate ?? 0} onChange={setStatNumber("gst_rate")} />
                  </Row>
                  <Row label="CGST Rate (%)">
                    <input className={inputCls} type="number" step="0.01" min="0" max="100" value={statutoryForm.cgst_rate ?? 0} onChange={setStatNumber("cgst_rate")} />
                  </Row>
                  <Row label="SGST Rate (%)">
                    <input className={inputCls} type="number" step="0.01" min="0" max="100" value={statutoryForm.sgst_rate ?? 0} onChange={setStatNumber("sgst_rate")} />
                  </Row>
                  <Row label="IGST Rate (%)">
                    <input className={inputCls} type="number" step="0.01" min="0" max="100" value={statutoryForm.igst_rate ?? 0} onChange={setStatNumber("igst_rate")} />
                  </Row>
                  <Row label="Type of Duty/Tax">
                    <input className={inputCls} value={statutoryForm.type_of_duty_tax || ""} onChange={setStatField("type_of_duty_tax")} placeholder="Type of duty/tax" />
                  </Row>
                  <Row label="% of Calculation">
                    <input className={inputCls} type="number" step="0.01" value={statutoryForm.percentage_of_calculation ?? 0} onChange={setStatNumber("percentage_of_calculation")} />
                  </Row>
                  <Row label="Statutory Details">
                    <input className={inputCls} value={statutoryForm.statutory_details || ""} onChange={setStatField("statutory_details")} placeholder="Additional statutory details" />
                  </Row>
                </div>
              </div>
            )}

            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Options</div>
              <div className="border rounded overflow-hidden px-4 py-3 flex gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!form.is_bill_wise} onChange={setToggle("is_bill_wise")} className="rounded" />
                  Maintain Bill-wise Details
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!form.maintain_inventory_values} onChange={setToggle("maintain_inventory_values")} className="rounded" />
                  Maintain Inventory Values
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setMode("list"); setEditingId(null); }}
                className="text-sm px-4 py-1.5 rounded border text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="text-sm px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
              >
                {loading ? "Saving..." : "Update"}
              </button>
            </div>
          </div>
        )}
      </div>

      {mode === "edit" && (
        <div className="w-72 border-l bg-zinc-50/50 flex flex-col">
          <div className="px-4 py-3 border-b text-sm font-medium text-zinc-600">
            Under Group
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
  );
}
