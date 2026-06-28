import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { INDIAN_STATES } from "@/constants/states";
import { FormRow, PageTitleBar, RightActionPanel } from "@/components/ui";
import RightPanel from "@/components/RightPanel.tsx";
import type { TaxUnitType } from "@/types/entities";
import { ExciseDetailsPopup, EMPTY_TARIFF, type Tariff } from "./exciseDetailsPopups";

// ── Field styling — strict black/white/zinc (focus shown via border, NOT colour) ──
const activeClass =
  "bg-zinc-100 border-zinc-800 text-zinc-950 px-2 py-0.5 outline-none border w-64 font-mono font-bold text-xs uppercase";
const inactiveClass =
  "bg-transparent border-transparent text-zinc-900 px-2 py-0.5 outline-none border hover:border-zinc-200 w-64 font-mono font-bold text-xs uppercase";
const fieldCls = (isActive: boolean) => (isActive ? activeClass : inactiveClass);

const FIELDS = ["name", "alias", "address", "state", "pincode", "telephone", "registeredFor", "setAlterExciseDetails"];

// "Registered for" — the statutory registration the tax unit is created under.
const REGISTERED_FOR_OPTIONS = ["Excise"];

export default function TaxCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [form, setForm] = useState({
    name: "", alias: "", address: "", state: "", pincode: "", telephone: "", setAlterExciseDetails: false,
  });
  const [registeredFor, setRegisteredFor] = useState("Excise");

  // Excise sub-details (saved with the tax unit)
  const [registrationType, setRegistrationType] = useState("Importer");
  const [typeOfManufacturer, setTypeOfManufacturer] = useState("Regular");
  const [eccNumber, setEccNumber] = useState("");
  const [setAlterTariff, setSetAlterTariff] = useState(false);
  const [tariff, setTariff] = useState<Tariff>({ ...EMPTY_TARIFF });
  const [setAlterRule11, setSetAlterRule11] = useState(false);
  const [rule11Book, setRule11Book] = useState("");

  const [showExcisePopup, setShowExcisePopup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeField, setActiveField] = useState("name");
  const [showAccept, setShowAccept] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const aliasRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLSelectElement>(null);
  const pincodeRef = useRef<HTMLInputElement>(null);
  const telephoneRef = useRef<HTMLInputElement>(null);
  const registeredForRef = useRef<HTMLSelectElement>(null);
  const setAlterExciseDetailsRef = useRef<HTMLSelectElement>(null);

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleExciseToggle = (val: boolean) => {
    setForm((prev) => ({ ...prev, setAlterExciseDetails: val }));
    if (val) setShowExcisePopup(true);
  };

  const resetForm = () => {
    setForm({ name: "", alias: "", address: "", state: "", pincode: "", telephone: "", setAlterExciseDetails: false });
    setRegisteredFor("Excise");
    setRegistrationType("Importer");
    setTypeOfManufacturer("Regular");
    setEccNumber("");
    setSetAlterTariff(false);
    setTariff({ ...EMPTY_TARIFF });
    setSetAlterRule11(false);
    setRule11Book("");
    setActiveField("name");
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (!companyId) { setError("No company selected"); return; }
    setSaving(true);
    setError(null);

    const payload: TaxUnitType = {
      company_id: companyId,
      name: form.name,
      alias: form.alias || undefined,
      address_line1: form.address || undefined,
      state: form.state || undefined,
      pincode: form.pincode || undefined,
      telephone: form.telephone || undefined,
      registered_for: registeredFor || "Excise",
      set_alter_excise_details: form.setAlterExciseDetails ? 1 : 0,
      registration_type: registrationType,
      type_of_manufacturer: registrationType === "Manufacturer" ? typeOfManufacturer : undefined,
      ecc_number: eccNumber || undefined,
      set_alter_excise_tariff: setAlterTariff ? 1 : 0,
      tariff_name: setAlterTariff ? tariff.name || undefined : undefined,
      hsn_code: setAlterTariff ? tariff.hsn || undefined : undefined,
      reporting_uom: setAlterTariff ? tariff.uom || undefined : undefined,
      valuation_type: setAlterTariff ? tariff.valuationType || undefined : undefined,
      tariff_rate: setAlterTariff ? Number(tariff.rate) || 0 : undefined,
      tariff_rate_per_unit: setAlterTariff ? Number(tariff.ratePerUnit) || 0 : undefined,
      set_alter_rule11_book: setAlterRule11 ? 1 : 0,
      rule11_book: setAlterRule11 ? rule11Book || undefined : undefined,
    };

    try {
      const result = await window.api.taxUnits.create(payload);
      if (result.success) resetForm();
      else setError(result.error || "Failed to save tax unit");
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleQuit = () => navigate("/master/create");

  useEffect(() => {
    if (showExcisePopup) return;

    if (showAccept) {
      const handler = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (key === "y" || e.key === "Enter") { e.preventDefault(); setShowAccept(false); handleSave(); }
        else if (key === "n" || e.key === "Escape") { e.preventDefault(); setShowAccept(false); }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); handleQuit(); return; }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") { e.preventDefault(); setShowAccept(true); return; }
      if (e.altKey && e.key.toLowerCase() === "c") { e.preventDefault(); navigate("/master/alter/tax-units"); return; }

      const idx = FIELDS.indexOf(activeField);
      if (idx !== -1) {
        if (e.key === "Enter" || e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
          e.preventDefault();
          if (idx === FIELDS.length - 1) setShowAccept(true);
          else setActiveField(FIELDS[idx + 1]);
          return;
        }
        if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
          e.preventDefault();
          if (idx > 0) setActiveField(FIELDS[idx - 1]);
          return;
        }
        if (activeField === "setAlterExciseDetails") {
          const key = e.key.toLowerCase();
          if (key === "y" || key === "n") {
            e.preventDefault();
            const val = key === "y";
            handleExciseToggle(val);
            if (!val) setShowAccept(true);
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave, navigate, companyId, activeField, showExcisePopup, showAccept]);

  useEffect(() => {
    if (showExcisePopup) return;
    const refMap: Record<string, React.RefObject<HTMLInputElement | HTMLSelectElement | null>> = {
      name: nameRef, alias: aliasRef, address: addressRef, state: stateRef,
      pincode: pincodeRef, telephone: telephoneRef, registeredFor: registeredForRef,
      setAlterExciseDetails: setAlterExciseDetailsRef,
    };
    refMap[activeField]?.current?.focus();
  }, [activeField, showExcisePopup]);

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-100 font-mono text-[11px] select-none text-zinc-950">
      <PageTitleBar title="Tax Unit Creation" />

      <div className="flex flex-1 min-h-0 relative">
        <div className="flex-1 bg-white border-r border-zinc-300 flex flex-col overflow-y-auto">
          <div className="p-6 space-y-1.5 flex-1 max-w-2xl">

            {error && (
              <div className="mb-2 px-2 py-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded">{error}</div>
            )}

            <FormRow label="Name" labelWidth="w-56">
              <input ref={nameRef} className={fieldCls(activeField === "name")} value={form.name} onChange={set("name")} onFocus={() => setActiveField("name")} />
            </FormRow>

            <FormRow label="(alias)" labelWidth="w-56">
              <input ref={aliasRef} className={fieldCls(activeField === "alias")} value={form.alias} onChange={set("alias")} onFocus={() => setActiveField("alias")} />
            </FormRow>

            <div className="py-2" />

            {/* Address — single line, on the same row as its label */}
            <FormRow label="Address" labelWidth="w-56">
              <input ref={addressRef} className={`${fieldCls(activeField === "address")} normal-case`} value={form.address} onChange={set("address")} onFocus={() => setActiveField("address")} />
            </FormRow>

            <div className="py-2" />

            <FormRow label="State" labelWidth="w-56">
              <select ref={stateRef} className={fieldCls(activeField === "state")} value={form.state}
                onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))} onFocus={() => setActiveField("state")}>
                <option value="">Not Applicable</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormRow>

            <FormRow label="Pincode" labelWidth="w-56">
              <input ref={pincodeRef} className={fieldCls(activeField === "pincode")} value={form.pincode} onChange={set("pincode")} onFocus={() => setActiveField("pincode")} />
            </FormRow>

            <FormRow label="Telephone" labelWidth="w-56">
              <input ref={telephoneRef} className={fieldCls(activeField === "telephone")} value={form.telephone} onChange={set("telephone")} onFocus={() => setActiveField("telephone")} />
            </FormRow>

            <div className="py-2" />

            <FormRow label="Registered for" labelWidth="w-56">
              <select ref={registeredForRef} className={fieldCls(activeField === "registeredFor")}
                value={registeredFor} onChange={(e) => setRegisteredFor(e.target.value)} onFocus={() => setActiveField("registeredFor")}>
                {REGISTERED_FOR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormRow>

            <div className="py-2" />

            <FormRow label="Set/alter excise details" labelWidth="w-56">
              <select ref={setAlterExciseDetailsRef} className={fieldCls(activeField === "setAlterExciseDetails")}
                value={form.setAlterExciseDetails ? "Yes" : "No"} onChange={(e) => handleExciseToggle(e.target.value === "Yes")} onFocus={() => setActiveField("setAlterExciseDetails")}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </FormRow>

          </div>

          <div className="border-t border-zinc-200 flex text-xs shrink-0 font-sans">
            <button onClick={handleQuit} disabled={saving} className="flex-1 py-2 text-center hover:bg-zinc-100 border-r border-zinc-200 disabled:opacity-50">Quit (Esc)</button>
            <button onClick={() => setShowAccept(true)} disabled={saving} className="flex-1 py-2 text-center hover:bg-zinc-100 disabled:opacity-50 font-bold">Accept (Alt+A)</button>
          </div>
        </div>

        <div className="w-64 flex-shrink-0 bg-zinc-50 border-l border-zinc-300 flex flex-col font-sans">
          <RightPanel />
          <RightActionPanel actions={[
            { key: "Alt+A", label: saving ? "Saving..." : "Accept", onClick: () => setShowAccept(true) },
            { key: "Esc", label: "Quit", onClick: handleQuit },
          ]} />
        </div>
      </div>

      {showExcisePopup && (
        <ExciseDetailsPopup
          companyId={companyId}
          unitName={form.name}
          registrationType={registrationType}
          setRegistrationType={setRegistrationType}
          typeOfManufacturer={typeOfManufacturer}
          setTypeOfManufacturer={setTypeOfManufacturer}
          eccNumber={eccNumber}
          setEccNumber={setEccNumber}
          setAlterTariff={setAlterTariff}
          setSetAlterTariff={setSetAlterTariff}
          tariff={tariff}
          setTariff={setTariff}
          setAlterRule11={setAlterRule11}
          setSetAlterRule11={setSetAlterRule11}
          rule11Book={rule11Book}
          setRule11Book={setRule11Book}
          onClose={() => setShowExcisePopup(false)}
        />
      )}

      {showAccept && (
        <div className="absolute bottom-16 right-72 bg-white border border-zinc-800 w-[165px] shadow-2xl p-3 flex flex-col items-center z-[10000] font-mono text-zinc-950">
          <h4 className="font-bold text-[11px] mb-3">Accept?</h4>
          <div className="flex items-center gap-3 w-full justify-center">
            <button onClick={() => { setShowAccept(false); handleSave(); }} disabled={saving}
              className="text-[11px] px-3 py-0.5 border border-zinc-800 bg-zinc-900 text-white hover:bg-black font-bold focus:outline-none min-w-[55px] text-center disabled:opacity-50">Yes</button>
            <button onClick={() => setShowAccept(false)}
              className="text-[11px] px-3 py-0.5 border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold focus:outline-none min-w-[55px] text-center">No</button>
          </div>
        </div>
      )}
    </div>
  );
}
