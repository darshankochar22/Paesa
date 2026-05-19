import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";
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

type Mode = "list" | "create" | "edit";

const LEDGER_TYPES = ["General", "Cash", "Bank", "Duties & Taxes", "Expenses", "Income", "Sundry Debtors", "Sundry Creditors"];
const NATURES = ["Assets", "Liabilities", "Income", "Expenses"];
const REG_TYPES = ["Unregistered", "Registered", "Composition", "SEZ"];

export default function Ledgers() {
  const { selectedCompany } = useCompany();
  const [ledgers, setLedgers] = useState<LedgerType[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("list");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<Partial<LedgerType>>({});

  const companyId = selectedCompany?.company_id;

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const [lRes, gRes] = await Promise.all([
        window.api.ledger.getAll(companyId),
        window.api.group.getAll(companyId),
      ]);
      if (lRes.success) setLedgers(lRes.ledgers ?? []);
      if (gRes.success) setGroups(gRes.groups ?? []);
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
        const [lRes, gRes] = await Promise.all([
          window.api.ledger.getAll(companyId),
          window.api.group.getAll(companyId),
        ]);
        if (cancelled) return;
        if (lRes.success) setLedgers(lRes.ledgers ?? []);
        if (gRes.success) setGroups(gRes.groups ?? []);
      } catch (e) {
        if (!cancelled) setError("Failed to load data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const resetForm = () => {
    setForm({
      name: "",
      alias: "",
      group_id: undefined,
      ledger_type: "General",
      nature: "Assets",
      opening_balance: 0,
      closing_balance: 0,
      is_bill_wise: 0,
      maintain_inventory_values: 0,
      mailing_name: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      country: "",
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
  };

  const startCreate = () => {
    resetForm();
    setEditingId(null);
    setMode("create");
    setError(null);
    setSuccess(null);
  };

  const startEdit = async (id: number) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await window.api.ledger.getById(id);
      if (res.success && res.ledger) {
        setForm({ ...res.ledger });
        setEditingId(id);
        setMode("edit");
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

  const setField = (key: keyof LedgerType) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const setNumber = (key: keyof LedgerType) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value === "" ? undefined : Number(e.target.value) }));

  const setToggle = (key: keyof LedgerType) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.checked ? 1 : 0 }));

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
      let res;
      const payload = {
        company_id: companyId!,
        name: form.name!.trim(),
        alias: form.alias?.trim() || undefined,
        group_id: form.group_id ? Number(form.group_id) : undefined,
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

      if (mode === "edit" && editingId) {
        res = await window.api.ledger.update({ ...payload, ledger_id: editingId });
      } else {
        res = await window.api.ledger.create(payload);
      }

      if (res.success) {
        setSuccess(mode === "edit" ? `Ledger "${form.name}" updated.` : `Ledger "${form.name}" created.`);
        await fetchData();
        if (mode === "create") {
          resetForm();
        } else {
          setMode("list");
          setEditingId(null);
        }
      } else {
        setError(res.error || "Failed to save ledger.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  const groupName = (id?: number) => groups.find(g => g.group_id === id)?.name || "—";

  return (
    <div className="min-h-screen p-6">
      <Link to="/" className="px-4 py-2 inline-block rounded hover:bg-zinc-100 transition-colors">
        ← Back
      </Link>

      <div className="mt-4 bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h1 className="text-lg font-semibold text-gray-800">
            Ledgers
          </h1>
          {mode === "list" && (
            <button
              onClick={startCreate}
              className="text-sm px-4 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
            >
              + New Ledger
            </button>
          )}
          {mode !== "list" && (
            <button
              onClick={() => { setMode("list"); setEditingId(null); setError(null); setSuccess(null); }}
              className="text-sm px-4 py-1.5 rounded border text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              ← Back to List
            </button>
          )}
        </div>

        {error && (
          <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm flex justify-between items-center">
            <span>⚠ {error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs">dismiss</button>
          </div>
        )}
        {success && (
          <div className="px-6 py-2 bg-green-50 border-b border-green-200 text-green-700 text-sm flex justify-between items-center">
            <span>✓ {success}</span>
            <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs">dismiss</button>
          </div>
        )}

        {mode === "list" ? (
          <div className="overflow-x-auto">
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
          <div className="px-6 py-6 flex flex-col gap-6 max-w-4xl">
            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">General</div>
              <div className="border rounded overflow-hidden">
                <Row label="Name" required>
                  <input autoFocus className={inputCls} value={form.name || ""} onChange={setField("name")} placeholder="Ledger name" />
                </Row>
                <Row label="Alias">
                  <input className={inputCls} value={form.alias || ""} onChange={setField("alias")} placeholder="Short name (optional)" />
                </Row>
                <Row label="Under (Group)">
                  <select className={selectCls} value={form.group_id || ""} onChange={setField("group_id")}>
                    <option value="">— None —</option>
                    {groups.map(g => (
                      <option key={g.group_id} value={g.group_id}>{g.name}</option>
                    ))}
                  </select>
                </Row>
                <Row label="Ledger Type">
                  <select className={selectCls} value={form.ledger_type || "General"} onChange={setField("ledger_type")}>
                    {LEDGER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Row>
                <Row label="Nature">
                  <select className={selectCls} value={form.nature || "Assets"} onChange={setField("nature")}>
                    {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
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
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Tax & Bank Details</div>
              <div className="border rounded overflow-hidden">
                <Row label="GSTIN">
                  <input className={inputCls} value={form.gstin || ""} onChange={setField("gstin")} placeholder="GSTIN" />
                </Row>
                <Row label="PAN">
                  <input className={inputCls} value={form.pan || ""} onChange={setField("pan")} placeholder="PAN" />
                </Row>
                <Row label="Registration Type">
                  <select className={selectCls} value={form.registration_type || "Unregistered"} onChange={setField("registration_type")}>
                    {REG_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Row>
                <Row label="Bank Name">
                  <input className={inputCls} value={form.bank_name || ""} onChange={setField("bank_name")} placeholder="Bank Name" />
                </Row>
                <Row label="Account Number">
                  <input className={inputCls} value={form.account_number || ""} onChange={setField("account_number")} placeholder="Account Number" />
                </Row>
                <Row label="IFSC Code">
                  <input className={inputCls} value={form.ifsc_code || ""} onChange={setField("ifsc_code")} placeholder="IFSC Code" />
                </Row>
              </div>
            </div>

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
                {loading ? "Saving..." : (mode === "edit" ? "Update" : "Create")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
