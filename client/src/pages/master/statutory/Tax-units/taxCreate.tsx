import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { INDIAN_STATES } from "@/constants/states";
import { FormRow, PageTitleBar, RightActionPanel } from "@/components/ui";
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

export default function TaxCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

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

  // Excise sub-details (lifted up so they can be saved with the tax unit)
  const [registrationType, setRegistrationType] = useState("Importer");
  const [eccNumber, setEccNumber] = useState("");
  const [setAlterTariff, setSetAlterTariff] = useState(false);
  const [setAlterRule11, setSetAlterRule11] = useState(false);

  const [showExcisePopup, setShowExcisePopup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleExciseToggle = () => {
    const newVal = !form.setAlterExciseDetails;
    setForm((prev) => ({ ...prev, setAlterExciseDetails: newVal }));
    if (newVal) setShowExcisePopup(true);
  };

  const resetForm = () => {
    setForm({
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
    setRegistrationType("Importer");
    setEccNumber("");
    setSetAlterTariff(false);
    setSetAlterRule11(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!companyId) {
      setError("No company selected");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: TaxUnitType = {
      company_id: companyId,
      name: form.name,
      alias: form.alias || undefined,
      address_line1: form.addressLine1 || undefined,
      address_line2: form.addressLine2 || undefined,
      address_line3: form.addressLine3 || undefined,
      address_line4: form.addressLine4 || undefined,
      state: form.state || undefined,
      pincode: form.pincode || undefined,
      telephone: form.telephone || undefined,
      registered_for: "Excise",
      set_alter_excise_details: form.setAlterExciseDetails ? 1 : 0,
      registration_type: registrationType,
      ecc_number: eccNumber || undefined,
      set_alter_excise_tariff: setAlterTariff ? 1 : 0,
      set_alter_rule11_book: setAlterRule11 ? 1 : 0,
    };

    try {
      const result = await window.api.taxUnits.create(payload);

      if (result.success) {
        resetForm();
      } else {
        setError(result.error || "Failed to save tax unit");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleQuit = () => {
    navigate("/master/create");
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleQuit();
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSave();
      }
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        navigate("/master/alter/tax-units");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave, navigate, companyId]);

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-100 font-mono text-sm select-none">
      {/* Title bar */}
      <PageTitleBar title="Tax Unit Creation" />

      <div className="flex flex-1 min-h-0">
        {/* Left form panel */}
        <div className="flex-1 bg-white border-r border-zinc-300 flex flex-col overflow-y-auto">
          <div className="p-4 space-y-1 flex-1">

            {error && (
              <div className="mb-2 px-2 py-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
                {error}
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

            {/* State — fixed width, white bg, no overflow */}
            <FormRow label="State" labelWidth="w-40">
              <select
                className="w-40 bg-white text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-400 transition-colors rounded truncate"
                value={form.state}
                onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
              >
                <option value="">Not Applicable</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
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

          {/* Bottom action bar */}
          <div className="border-t border-zinc-200 flex text-xs">
            <button
              onClick={handleQuit}
              disabled={saving}
              className="flex-1 py-2 text-center hover:bg-zinc-100 border-r border-zinc-200 disabled:opacity-50"
            >
              <span className="text-[#2a4a7a] font-bold">Q</span>: Quit
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 text-center hover:bg-zinc-100 disabled:opacity-50"
            >
              <span className="text-[#2a4a7a] font-bold">A</span>: {saving ? "Saving..." : "Accept"}
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-64 flex-shrink-0 bg-zinc-50 border-l border-zinc-300 flex flex-col">
          <RightPanel />
          <RightActionPanel
            actions={[
              {
                key: "F12",
                label: "Configure",
                onClick: () => {
                  // handle configure action
                },
              },
              {
                key: "Ctrl+A",
                label: saving ? "Saving..." : "Accept",
                onClick: handleSave,
              },
              {
                key: "Esc",
                label: "Quit",
                onClick: handleQuit,
              },
            ]}
          />
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