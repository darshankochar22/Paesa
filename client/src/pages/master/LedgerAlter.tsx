import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import GroupTree from "../../../components/GroupTree";
import { useCompany } from "../../context/CompanyContext";
import type { GroupType, LedgerType } from "../../types/api";

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
];

const GST_APPLICABILITY = [
  "Not Applicable",
  "Goods",
  "Services",
  "Both",
];

export default function LedgerAlter() {
  const { selectedCompany, activeFY } = useCompany();

  const [ledgers, setLedgers] = useState<LedgerType[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [groupTree, setGroupTree] = useState<any[]>([]);

  const [selectedLedgerId, setSelectedLedgerId] = useState<number | null>(null);

  const [loading,setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showGroupPanel, setShowGroupPanel] = useState(false);

  const [form, setForm] = useState<any>({
    name: "",
    alias: "",
    group_id: null,
    ledger_type: "General",
    nature: "",
    opening_balance: 0,
    closing_balance: 0,

    mailing_name: "",
    address1: "",
    address2: "",
    city: "",
    state: "Not Applicable",
    country: "India",
    pincode: "",
    phone: "",
    email: "",

    pan: "",
    gstin: "",
    registration_type: "Unregistered",

    bank_details: null,

    statutory_details: null,
  });

  const companyId = selectedCompany?.company_id;


  const loadInitial = useCallback(async () => {
  try {
    setLoading(true);

    const [ledgerRes, groupRes, treeRes] = await Promise.all([
      window.api.ledger.getAll(companyId!),
      window.api.group.getAll(companyId!),
      window.api.group.getTree(companyId!),
    ]);

    if (ledgerRes.success) {
      setLedgers(ledgerRes.ledgers || []);
    }

    if (groupRes.success) {
      setGroups(groupRes.groups || []);
    }

    if (treeRes.success) {
      setGroupTree(treeRes.tree || []);
    }
  } catch (err) {
    console.error(err);
    setError("Failed to load data");
  } finally {
    setLoading(false);
  }
}, [companyId]);

useEffect(() => {
  if (!companyId) return;

  Promise.resolve().then(loadInitial);
}, [companyId]);

  const loadLedger = async (ledgerId: number) => {
    try {
      setLoading(true);
      setError("");

      const res = await window.api.ledger.getById(ledgerId);

      if (!res.success || !res.ledger) {
        setError("Ledger not found.");
        return;
      }

      const l = res.ledger;

      setSelectedLedgerId(ledgerId);

      setForm({
        ledger_id: l.ledger_id,

        name: l.name || "",
        alias: l.alias || "",
        group_id: l.group_id || null,
        ledger_type: l.ledger_type || "General",
        nature: l.nature || "",

        opening_balance: l.opening_balance || 0,
        closing_balance: l.closing_balance || 0,

        mailing_name: l.mailing_name || "",
        address1: l.address1 || "",
        address2: l.address2 || "",
        city: l.city || "",
        state: l.state || "Not Applicable",
        country: l.country || "India",
        pincode: l.pincode || "",
        phone: l.phone || "",
        email: l.email || "",

        pan: l.pan || "",
        gstin: l.gstin || "",
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

  const updateField = (key: string, value: any) => {
    setForm((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateBankField = (key: string, value: any) => {
    setForm((prev: any) => ({
      ...prev,
      bank_details: {
        ...(prev.bank_details || {}),
        [key]: value,
      },
    }));
  };

  const updateStatField = (key: string, value: any) => {
    setForm((prev: any) => ({
      ...prev,
      statutory_details: {
        ...(prev.statutory_details || {}),
        [key]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!form.name?.trim()) {
      setError("Ledger name required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
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
        address1: form.address1,
        address2: form.address2,
        city: form.city,
        state: form.state,
        country: form.country,
        pincode: form.pincode,
        phone: form.phone,
        email: form.email,

        pan: form.pan,
        gstin: form.gstin,
        registration_type: form.registration_type,

        bank_details: form.bank_details,

        statutory_details: form.statutory_details,
      };

      const res = await window.api.ledger.update(payload);

      if (!res.success) {
        setError(res.error || "Failed to update ledger.");
        return;
      }

      setSuccess("Ledger updated successfully.");

      await loadInitial();
    } catch {
      setError("Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const groupName = (id?: number) => {
    return groups.find((g) => g.group_id === id)?.name || "—";
  };

  const fyLabel = useMemo(() => {
    if (!activeFY?.start_date) return "1-Apr-24";

    const d = new Date(activeFY.start_date);

    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  }, [activeFY]);

  const inputCls =
    "flex-1 border border-transparent px-1 py-0.5 text-sm bg-transparent outline-none focus:border-amber-300 focus:bg-amber-50";

  const rowCls = "flex items-center min-h-[24px]";

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="bg-[#b4c6e7] border-b border-[#8a9bc0] px-3 py-1 text-sm font-medium flex justify-between">
        <span>Alter Ledger</span>
        <span>Tally Prime</span>
      </div>

      {error && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 text-xs px-3 py-1">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-b border-green-200 text-green-700 text-xs px-3 py-1">
          {success}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT */}
        <div className="w-[260px] border-r overflow-y-auto">
          <div className="p-2 border-b bg-zinc-50 text-xs font-medium uppercase">
            Ledgers
          </div>

          {ledgers.map((ledger) => (
            <button
              key={ledger.ledger_id}
              onClick={() => loadLedger(ledger.ledger_id!)}
              className={`w-full text-left px-3 py-1.5 text-sm border-b hover:bg-amber-50 ${
                selectedLedgerId === ledger.ledger_id
                  ? "bg-amber-100"
                  : ""
              }`}
            >
              {ledger.name}
            </button>
          ))}
        </div>

        {/* CENTER */}
        <div className="flex-1 overflow-y-auto">
          {!selectedLedgerId ? (
            <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
              Select ledger to alter
            </div>
          ) : (
            <div className="p-3 space-y-4">
              {/* BASIC */}
              <div className="space-y-1">
                <div className={rowCls}>
                  <label className="w-32 text-sm">Name</label>
                  <span className="mr-2">:</span>

                  <input
                    className={`${inputCls} bg-amber-100 border-amber-300`}
                    value={form.name}
                    onChange={(e) =>
                      updateField("name", e.target.value)
                    }
                  />
                </div>

                <div className={rowCls}>
                  <label className="w-32 text-sm">Alias</label>
                  <span className="mr-2">:</span>

                  <input
                    className={inputCls}
                    value={form.alias}
                    onChange={(e) =>
                      updateField("alias", e.target.value)
                    }
                  />
                </div>

                <div
                  className={`${rowCls} cursor-pointer hover:bg-zinc-50`}
                  onClick={() =>
                    setShowGroupPanel(!showGroupPanel)
                  }
                >
                  <label className="w-32 text-sm">Under</label>
                  <span className="mr-2">:</span>

                  <div className="text-sm">
                    {groupName(form.group_id)}
                  </div>
                </div>
              </div>

              {/* MAILING */}
              <div className="border-t pt-3">
                <div className="text-sm font-semibold mb-2">
                  Mailing Details
                </div>

                <div className="space-y-1">
                  <div className={rowCls}>
                    <label className="w-32 text-sm">
                      Mailing Name
                    </label>

                    <span className="mr-2">:</span>

                    <input
                      className={inputCls}
                      value={form.mailing_name}
                      onChange={(e) =>
                        updateField(
                          "mailing_name",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className={rowCls}>
                    <label className="w-32 text-sm">Address 1</label>

                    <span className="mr-2">:</span>

                    <input
                      className={inputCls}
                      value={form.address1}
                      onChange={(e) =>
                        updateField("address1", e.target.value)
                      }
                    />
                  </div>

                  <div className={rowCls}>
                    <label className="w-32 text-sm">Address 2</label>

                    <span className="mr-2">:</span>

                    <input
                      className={inputCls}
                      value={form.address2}
                      onChange={(e) =>
                        updateField("address2", e.target.value)
                      }
                    />
                  </div>

                  <div className={rowCls}>
                    <label className="w-32 text-sm">State</label>

                    <span className="mr-2">:</span>

                    <select
                      className={inputCls}
                      value={form.state}
                      onChange={(e) =>
                        updateField("state", e.target.value)
                      }
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* BANK */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">
                    Banking Details
                  </div>

                  <button
                    onClick={() =>
                      updateField(
                        "bank_details",
                        form.bank_details
                          ? null
                          : {
                              account_holder_name: "",
                              account_number: "",
                              ifsc_code: "",
                              bank_name: "",
                            }
                      )
                    }
                    className="text-xs text-blue-600"
                  >
                    {form.bank_details ? "Remove" : "Add"}
                  </button>
                </div>

                {form.bank_details && (
                  <div className="space-y-1 mt-2">
                    <div className={rowCls}>
                      <label className="w-40 text-sm">
                        Account Holder
                      </label>

                      <span className="mr-2">:</span>

                      <input
                        className={inputCls}
                        value={
                          form.bank_details.account_holder_name
                        }
                        onChange={(e) =>
                          updateBankField(
                            "account_holder_name",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className={rowCls}>
                      <label className="w-40 text-sm">
                        Account Number
                      </label>

                      <span className="mr-2">:</span>

                      <input
                        className={inputCls}
                        value={
                          form.bank_details.account_number
                        }
                        onChange={(e) =>
                          updateBankField(
                            "account_number",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className={rowCls}>
                      <label className="w-40 text-sm">
                        IFSC Code
                      </label>

                      <span className="mr-2">:</span>

                      <input
                        className={inputCls}
                        value={form.bank_details.ifsc_code}
                        onChange={(e) =>
                          updateBankField(
                            "ifsc_code",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* GST */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">
                    GST Details
                  </div>

                  <button
                    onClick={() =>
                      updateField(
                        "statutory_details",
                        form.statutory_details
                          ? null
                          : {
                              gst_applicability:
                                "Not Applicable",
                            }
                      )
                    }
                    className="text-xs text-blue-600"
                  >
                    {form.statutory_details
                      ? "Remove"
                      : "Add"}
                  </button>
                </div>

                {form.statutory_details && (
                  <div className="space-y-1 mt-2">
                    <div className={rowCls}>
                      <label className="w-40 text-sm">
                        GST Applicability
                      </label>

                      <span className="mr-2">:</span>

                      <select
                        className={inputCls}
                        value={
                          form.statutory_details
                            .gst_applicability
                        }
                        onChange={(e) =>
                          updateStatField(
                            "gst_applicability",
                            e.target.value
                          )
                        }
                      >
                        {GST_APPLICABILITY.map((g) => (
                          <option key={g}>{g}</option>
                        ))}
                      </select>
                    </div>

                    <div className={rowCls}>
                      <label className="w-40 text-sm">
                        GST Rate
                      </label>

                      <span className="mr-2">:</span>

                      <input
                        type="number"
                        className={inputCls}
                        value={
                          form.statutory_details.gst_rate || 0
                        }
                        onChange={(e) =>
                          updateStatField(
                            "gst_rate",
                            Number(e.target.value)
                          )
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* GROUP PANEL */}
        {showGroupPanel && (
          <div className="w-[300px] border-l bg-[#e8f0f8]">
            <div className="bg-[#b4c6e7] border-b border-[#8a9bc0] px-2 py-1 text-sm font-medium flex justify-between">
              <span>Groups</span>

              <button
                onClick={() => setShowGroupPanel(false)}
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto h-full">
              <GroupTree
                tree={groupTree}
                selectedId={form.group_id}
                onSelect={(group: GroupType) => {
                  updateField("group_id", group.group_id);
                  setShowGroupPanel(false);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      {selectedLedgerId && (
        <div className="border-t bg-zinc-50 px-3 py-2 flex justify-between items-center">
          <div className="text-sm">
            Opening Balance (on {fyLabel}) :
            <span className="font-medium ml-2">
              {Number(form.opening_balance || 0).toFixed(
                2
              )}
            </span>
          </div>

          <div className="flex gap-2">
            <Link
              to="/master/alter"
              className="border px-4 py-1 text-sm"
            >
              Cancel
            </Link>

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-black text-white px-5 py-1 text-sm"
            >
              {saving ? "Saving..." : "Update"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}