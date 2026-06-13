import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { INDIAN_STATES } from "@/constants/states";
import {
  FormRow,
  PageTitleBar,
  RightActionPanel,
  SearchInput,
  DataTable,
} from "@/components/ui";
import RightPanel from "@/components/RightPanel.tsx";
import type { TaxUnitType } from "@/types/entities";

const inputCls =
  "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-400 transition-colors bg-[#fffbe6] rounded";

const REGISTRATION_TYPES = ["Dealer", "Importer", "Manufacturer"];

function ExciseDetailsPopup({
  unitName,
  registrationType,
  setRegistrationType,
  eccNumber,
  setEccNumber,
  setAlterTariff,
  setSetAlterTariff,
  setAlterRule11,
  setSetAlterRule11,
  onClose,
}: {
  unitName: string;
  registrationType: string;
  setRegistrationType: (v: string) => void;
  eccNumber: string;
  setEccNumber: (v: string) => void;
  setAlterTariff: boolean;
  setSetAlterTariff: (v: boolean) => void;
  setAlterRule11: boolean;
  setSetAlterRule11: (v: boolean) => void;
  onClose: () => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white border border-zinc-300 shadow-lg w-[560px] font-mono text-sm">
        <div className="text-center py-3 border-b border-zinc-200">
          <div className="font-bold text-base">Excise Details</div>
          <div className="text-zinc-500 text-xs italic">({registrationType} Unit)</div>
        </div>

        <div className="p-5 space-y-3 relative">
          <FormRow label="Unit name" labelWidth="w-56">
            <span className="text-sm font-semibold px-1.5">{unitName || "KI"}</span>
          </FormRow>

          <FormRow label="Registration type" labelWidth="w-56">
            <div className="relative flex-1">
              <button
                className="w-full text-left text-sm font-semibold px-1.5 py-0.5 bg-[#fffbe6] border border-zinc-300 rounded"
                onClick={() => setShowDropdown((v) => !v)}
              >
                {registrationType}
              </button>
              {showDropdown && (
                <div className="absolute left-full top-0 ml-1 w-44 bg-white border border-zinc-300 shadow-md z-10">
                  <div className="bg-[#1a3a6a] text-white text-xs px-2 py-1 font-semibold">
                    List of Registration Types
                  </div>
                  {REGISTRATION_TYPES.map((type) => (
                    <div
                      key={type}
                      className={`px-3 py-1 text-sm cursor-pointer ${
                        type === registrationType
                          ? "bg-[#f5a623] text-white font-semibold"
                          : "hover:bg-zinc-100"
                      }`}
                      onClick={() => {
                        setRegistrationType(type);
                        setShowDropdown(false);
                      }}
                    >
                      {type}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FormRow>

          <div className="py-1" />

          <FormRow label="ECC number" labelWidth="w-56">
            <input
              className={inputCls}
              value={eccNumber}
              onChange={(e) => setEccNumber(e.target.value)}
            />
          </FormRow>

          <FormRow label="Set/alter excise tariff details" labelWidth="w-56">
            <button
              className="text-sm font-semibold px-1.5 py-0.5 bg-white border border-transparent hover:border-zinc-200 rounded min-w-[40px] text-left"
              onClick={() => setSetAlterTariff(!setAlterTariff)}
            >
              {setAlterTariff ? "Yes" : "No"}
            </button>
          </FormRow>

          <FormRow label="Set/alter Rule 11 book details" labelWidth="w-56">
            <button
              className="text-sm font-semibold px-1.5 py-0.5 bg-white border border-transparent hover:border-zinc-200 rounded min-w-[40px] text-left"
              onClick={() => setSetAlterRule11(!setAlterRule11)}
            >
              {setAlterRule11 ? "Yes" : "No"}
            </button>
          </FormRow>
        </div>

        <div className="border-t border-zinc-200 flex text-xs">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-center hover:bg-zinc-100 border-r border-zinc-200"
          >
            <span className="text-[#2a4a7a] font-bold">Q</span>: Quit
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 text-center hover:bg-zinc-100"
          >
            <span className="text-[#2a4a7a] font-bold">A</span>: Accept
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TaxAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [taxUnitsList, setTaxUnitsList] = useState<TaxUnitType[]>([]);
  const [selectedTaxUnit, setSelectedTaxUnit] = useState<TaxUnitType | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    alias: "",
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    addressLine4: "",
    state: "",
    pincode: "",
    telephone: "",
    setAlterExciseDetails: false,
  });

  // Excise sub-details
  const [registrationType, setRegistrationType] = useState("Importer");
  const [eccNumber, setEccNumber] = useState("");
  const [setAlterTariff, setSetAlterTariff] = useState(false);
  const [setAlterRule11, setSetAlterRule11] = useState(false);

  const [showExcisePopup, setShowExcisePopup] = useState(false);

  const fetchTaxUnits = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await window.api.taxUnits.getAll(companyId);
      if (res.success) {
        setTaxUnitsList(res.taxUnits || []);
      } else {
        setError(res.error || "Failed to load tax units");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load tax units");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxUnits();
  }, [companyId]);

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleExciseToggle = () => {
    const newVal = !form.setAlterExciseDetails;
    setForm((prev) => ({ ...prev, setAlterExciseDetails: newVal }));
    if (newVal) setShowExcisePopup(true);
  };

  const handleSelect = (unit: TaxUnitType) => {
    setSelectedTaxUnit(unit);
    setForm({
      name: unit.name || "",
      alias: unit.alias || "",
      addressLine1: unit.address_line1 || "",
      addressLine2: unit.address_line2 || "",
      addressLine3: unit.address_line3 || "",
      addressLine4: unit.address_line4 || "",
      state: unit.state || "",
      pincode: unit.pincode || "",
      telephone: unit.telephone || "",
      setAlterExciseDetails: unit.set_alter_excise_details === 1,
    });
    setRegistrationType(unit.registration_type || "Importer");
    setEccNumber(unit.ecc_number || "");
    setSetAlterTariff(unit.set_alter_excise_tariff === 1);
    setSetAlterRule11(unit.set_alter_rule11_book === 1);
    setError(null);
    setSuccess(null);
  };

  const handleBack = () => {
    setSelectedTaxUnit(null);
    setError(null);
    setSuccess(null);
    fetchTaxUnits();
  };

  const handleSave = async () => {
    if (!selectedTaxUnit || !selectedTaxUnit.tax_unit_id) return;
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: TaxUnitType & { tax_unit_id: number } = {
      tax_unit_id: selectedTaxUnit.tax_unit_id,
      company_id: companyId!,
      name: form.name,
      alias: form.alias || null,
      address_line1: form.addressLine1 || null,
      address_line2: form.addressLine2 || null,
      address_line3: form.addressLine3 || null,
      address_line4: form.addressLine4 || null,
      state: form.state || null,
      pincode: form.pincode || null,
      telephone: form.telephone || null,
      registered_for: "Excise",
      set_alter_excise_details: form.setAlterExciseDetails ? 1 : 0,
      registration_type: registrationType,
      ecc_number: eccNumber || null,
      set_alter_excise_tariff: setAlterTariff ? 1 : 0,
      set_alter_rule11_book: setAlterRule11 ? 1 : 0,
    };

    try {
      const result = await window.api.taxUnits.update(payload);

      if (result.success) {
        setSuccess("Tax unit updated successfully!");
        setTimeout(() => {
          handleBack();
        }, 1000);
      } else {
        setError(result.error || "Failed to update tax unit");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTaxUnit || !selectedTaxUnit.tax_unit_id) return;
    if (!confirm("Are you sure you want to delete this tax unit?")) return;

    setSaving(true);
    setError(null);

    try {
      const result = await window.api.taxUnits.delete(selectedTaxUnit.tax_unit_id);
      if (result.success) {
        setSuccess("Tax unit deleted successfully!");
        setTimeout(() => {
          handleBack();
        }, 1000);
      } else {
        setError(result.error || "Failed to delete tax unit");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (selectedTaxUnit) {
          handleBack();
        } else {
          navigate("/master/alter");
        }
      }
      if (selectedTaxUnit && (e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSave();
      }
      if (selectedTaxUnit && e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDelete();
      }
      if (!selectedTaxUnit && e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        navigate("/master/create/tax-units");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedTaxUnit, handleSave, navigate, companyId]);

  // If in selection mode
  if (!selectedTaxUnit) {
    const filteredList = taxUnitsList.filter(
      (t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.alias && t.alias.toLowerCase().includes(search.toLowerCase())) ||
        (t.ecc_number && t.ecc_number.toLowerCase().includes(search.toLowerCase()))
    );

    const columns = [
      {
        key: "name",
        label: "Tax Unit Name",
        span: "col-span-5",
        render: (r: TaxUnitType) => (
          <span className="font-bold text-zinc-950 uppercase">{r.name}</span>
        ),
      },
      {
        key: "alias",
        label: "Alias",
        span: "col-span-3",
        render: (r: TaxUnitType) => (
          <span className="text-zinc-500 font-semibold">{r.alias || "—"}</span>
        ),
      },
      {
        key: "registration_type",
        label: "Reg Type",
        span: "col-span-2",
        render: (r: TaxUnitType) => (
          <span className="text-zinc-500 uppercase">{r.registration_type || "—"}</span>
        ),
      },
      {
        key: "ecc_number",
        label: "ECC Number",
        span: "col-span-2",
        render: (r: TaxUnitType) => (
          <span className="text-zinc-700 font-bold uppercase">{r.ecc_number || "—"}</span>
        ),
      },
    ];

    const actions = [
      { key: "Alt+C", label: "Create Tax Unit", onClick: () => navigate("/master/create/tax-units") },
      { key: "Esc", label: "Quit", onClick: () => navigate("/master/alter") },
    ];

    return (
      <div className="flex flex-col h-screen w-screen bg-white select-none font-mono text-sm">
        <PageTitleBar title="Alter Tax Unit" subtitle="Select Tax Unit to Alter" />
        <div className="p-3 bg-zinc-50 border-b border-zinc-200 shrink-0">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search tax units by name, alias, or ECC number…"
            autoFocus
          />
        </div>
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex flex-col bg-white border-r border-zinc-300">
            {error && (
              <div className="p-3 text-red-700 bg-red-50 border-b border-red-200 text-xs flex justify-between items-center">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="font-bold">&times;</button>
              </div>
            )}
            <DataTable
              columns={columns}
              rows={filteredList}
              rowKey={(r: TaxUnitType) => String(r.tax_unit_id)}
              onRowClick={handleSelect}
              loading={loading}
              emptyMessage="No Tax Units found."
            />
          </div>
          <RightActionPanel actions={actions} />
        </div>
        <div className="border-t border-zinc-200 p-3 flex justify-end bg-zinc-50">
          <button
            onClick={() => navigate("/master/alter")}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm"
          >
            Quit
          </button>
        </div>
      </div>
    );
  }

  // If in edit mode
  const alterActions = [
    { key: "Alt+A", label: "Accept", onClick: handleSave },
    { key: "Alt+D", label: "Delete", onClick: handleDelete },
    { key: "Esc", label: "Quit", onClick: handleBack },
  ];

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-100 font-mono text-sm select-none">
      <PageTitleBar title="Tax Unit Alteration" subtitle={selectedTaxUnit.name} />

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 bg-white border-r border-zinc-300 flex flex-col overflow-y-auto">
          <div className="p-4 space-y-1 flex-1">
            {error && (
              <div className="mb-2 px-2 py-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded flex justify-between items-center">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="font-bold">&times;</button>
              </div>
            )}
            {success && (
              <div className="mb-2 px-2 py-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded flex justify-between items-center">
                <span>{success}</span>
                <button onClick={() => setSuccess(null)} className="font-bold">&times;</button>
              </div>
            )}

            <FormRow label="Name" labelWidth="w-40">
              <input autoFocus className={inputCls} value={form.name} onChange={set("name")} />
            </FormRow>

            <FormRow label="(alias)" labelWidth="w-40">
              <input className={inputCls} value={form.alias} onChange={set("alias")} />
            </FormRow>

            <div className="py-2" />

            <FormRow label="Address" labelWidth="w-40" className="items-start">
              <div className="flex flex-col gap-0.5 flex-1">
                <input className={inputCls} value={form.addressLine1} onChange={set("addressLine1")} />
                <input className={inputCls} value={form.addressLine2} onChange={set("addressLine2")} />
                <input className={inputCls} value={form.addressLine3} onChange={set("addressLine3")} />
                <input className={inputCls} value={form.addressLine4} onChange={set("addressLine4")} />
              </div>
            </FormRow>

            <div className="py-3" />

            <FormRow label="State" labelWidth="w-40">
              <select
                className="w-40 bg-white text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-400 transition-colors rounded truncate"
                value={form.state}
                onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
              >
                <option value="">Not Applicable</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FormRow>

            <FormRow label="Pincode" labelWidth="w-40">
              <input className={inputCls} value={form.pincode} onChange={set("pincode")} />
            </FormRow>

            <FormRow label="Telephone" labelWidth="w-40">
              <input className={inputCls} value={form.telephone} onChange={set("telephone")} />
            </FormRow>

            <div className="py-2" />

            <FormRow label="Registered for" labelWidth="w-40">
              <span className="text-sm font-semibold px-1.5 py-0.5">Excise</span>
            </FormRow>

            <div className="py-2" />

            <FormRow label="Set/alter excise details" labelWidth="w-48">
              <button
                className="text-sm font-semibold px-1.5 py-0.5 bg-white border border-transparent hover:border-zinc-200 rounded min-w-[40px] text-left"
                onClick={handleExciseToggle}
              >
                {form.setAlterExciseDetails ? "Yes" : "No"}
              </button>
            </FormRow>
          </div>

          <div className="border-t border-zinc-200 flex text-xs shrink-0">
            <button
              onClick={handleDelete}
              disabled={saving}
              className="py-2 px-4 text-center hover:bg-red-50 text-red-600 border-r border-zinc-200 disabled:opacity-50"
            >
              Delete
            </button>
            <div className="flex-1" />
            <button
              onClick={handleBack}
              disabled={saving}
              className="py-2 px-4 text-center hover:bg-zinc-100 border-l border-r border-zinc-200 disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="py-2 px-6 text-center bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 font-bold"
            >
              Accept
            </button>
          </div>
        </div>

        <div className="w-64 flex-shrink-0 bg-zinc-50 border-l border-zinc-300 flex flex-col">
          <RightPanel />
          <RightActionPanel actions={alterActions} />
        </div>
      </div>

      {showExcisePopup && (
        <ExciseDetailsPopup
          unitName={form.name}
          registrationType={registrationType}
          setRegistrationType={setRegistrationType}
          eccNumber={eccNumber}
          setEccNumber={setEccNumber}
          setAlterTariff={setAlterTariff}
          setSetAlterTariff={setSetAlterTariff}
          setAlterRule11={setAlterRule11}
          setSetAlterRule11={setSetAlterRule11}
          onClose={() => setShowExcisePopup(false)}
        />
      )}
    </div>
  );
}