import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FormRow } from "@/components/ui";
import {
  REGISTRATION_TYPES,
  MANUFACTURER_TYPES,
  VALUATION_TYPES,
  EXCISE_REPORTING_UOMS,
  showsRatePercent,
  showsRatePerUnit,
} from "./taxUnitsConstants";

// Shared by Tax Unit Create + Alter (Issue #42) — the nested Excise Details flow.

const popupInput =
  "w-64 bg-zinc-50 border border-zinc-300 text-zinc-950 px-2 py-0.5 outline-none focus:border-zinc-800 font-mono font-bold text-xs";

export interface Tariff {
  name: string;
  hsn: string;
  uom: string;
  valuationType: string;
  rate: string;
  ratePerUnit: string;
}
export const EMPTY_TARIFF: Tariff = {
  name: "",
  hsn: "",
  uom: "Undefined",
  valuationType: "Undefined",
  rate: "",
  ratePerUnit: "",
};

// ═══════════════════ Excise Tariff Details (nested popup) ═══════════════════
function ExciseTariffPopup({
  tariff,
  setTariff,
  onClose,
}: {
  tariff: Tariff;
  setTariff: (t: Tariff) => void;
  onClose: () => void;
}) {
  const upd = (patch: Partial<Tariff>) => setTariff({ ...tariff, ...patch });
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] font-mono text-[11px]">
      <div className="bg-white border border-zinc-800 shadow-2xl w-[520px] p-5">
        <div className="text-center font-bold text-xs pb-3 border-b border-zinc-200 uppercase tracking-wide">
          Excise Tariff Details
        </div>
        <div className="py-4 space-y-2">
          <FormRow label="Tariff name" labelWidth="w-52">
            <input autoFocus className={popupInput} value={tariff.name} onChange={(e) => upd({ name: e.target.value })} />
          </FormRow>
          <FormRow label="HSN code" labelWidth="w-52">
            <input className={popupInput} value={tariff.hsn} onChange={(e) => upd({ hsn: e.target.value })} />
          </FormRow>
          <FormRow label="Reporting unit of measure" labelWidth="w-52">
            <select className={popupInput} value={tariff.uom} onChange={(e) => upd({ uom: e.target.value })}>
              {EXCISE_REPORTING_UOMS.map((u) => (
                <option key={u.code} value={u.code}>{u.code === "Undefined" ? "Undefined" : `${u.code} — ${u.label}`}</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Valuation type" labelWidth="w-52">
            <select className={popupInput} value={tariff.valuationType} onChange={(e) => upd({ valuationType: e.target.value })}>
              {VALUATION_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </FormRow>
          {showsRatePercent(tariff.valuationType) && (
            <FormRow label="Rate" labelWidth="w-52">
              <span className="flex items-center gap-1">
                <input type="number" min={0} step="0.01" className="w-44 bg-zinc-50 border border-zinc-300 px-2 py-0.5 outline-none focus:border-zinc-800 font-mono font-bold text-xs text-right"
                  value={tariff.rate} onChange={(e) => upd({ rate: e.target.value })} />
                <span className="text-zinc-500">%</span>
              </span>
            </FormRow>
          )}
          {showsRatePerUnit(tariff.valuationType) && (
            <FormRow label="Rate per Unit" labelWidth="w-52">
              <input type="number" min={0} step="0.01" className="w-44 bg-zinc-50 border border-zinc-300 px-2 py-0.5 outline-none focus:border-zinc-800 font-mono font-bold text-xs text-right"
                value={tariff.ratePerUnit} onChange={(e) => upd({ ratePerUnit: e.target.value })} />
            </FormRow>
          )}
        </div>
        <div className="border-t border-zinc-200 pt-3 flex justify-end">
          <button onClick={onClose} className="text-[11px] px-4 py-1 border border-zinc-800 bg-zinc-900 text-white hover:bg-black font-bold">Ok</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════ Excise Book selection (Rule 11, nested popup) ═══════════════════
function ExciseBookPopup({
  companyId,
  onPick,
  onClose,
}: {
  companyId?: number;
  onPick: (name: string) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [books, setBooks] = useState<{ excise_book_id: number; name: string }[]>([]);
  useEffect(() => {
    if (!companyId) return;
    window.api.exciseBook.getAll(companyId).then((r: any) => {
      if (r.success) setBooks(r.books ?? r.exciseBooks ?? r.data ?? []);
    });
  }, [companyId]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] font-mono text-[11px]">
      <div className="bg-white border border-zinc-800 shadow-2xl w-[320px] max-h-[70vh] flex flex-col">
        <div className="text-center font-bold text-xs py-2 border-b border-zinc-800 bg-zinc-900 text-white uppercase tracking-wide">
          Excise Book
        </div>
        <div className="flex-1 overflow-y-auto">
          {books.length === 0 && (
            <div className="px-3 py-3 text-zinc-400 text-[11px]">No excise books yet.</div>
          )}
          {books.map((b, i) => (
            <button key={b.excise_book_id ?? i} onClick={() => onPick(b.name)}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-900 hover:text-white border-b border-zinc-100">
              {i + 1}. {b.name}
            </button>
          ))}
        </div>
        <div className="border-t border-zinc-200 flex">
          <button onClick={() => navigate("/master/create/excise-book")}
            className="flex-1 py-2 text-center hover:bg-zinc-100 border-r border-zinc-200 font-bold">Create</button>
          <button onClick={onClose} className="flex-1 py-2 text-center hover:bg-zinc-100">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════ Excise Details popup (entry point) ═══════════════════
export function ExciseDetailsPopup({
  companyId,
  unitName,
  registrationType,
  setRegistrationType,
  typeOfManufacturer,
  setTypeOfManufacturer,
  eccNumber,
  setEccNumber,
  setAlterTariff,
  setSetAlterTariff,
  tariff,
  setTariff,
  setAlterRule11,
  setSetAlterRule11,
  rule11Book,
  setRule11Book,
  onClose,
}: {
  companyId?: number;
  unitName: string;
  registrationType: string;
  setRegistrationType: (v: string) => void;
  typeOfManufacturer: string;
  setTypeOfManufacturer: (v: string) => void;
  eccNumber: string;
  setEccNumber: (v: string) => void;
  setAlterTariff: boolean;
  setSetAlterTariff: (v: boolean) => void;
  tariff: Tariff;
  setTariff: (t: Tariff) => void;
  setAlterRule11: boolean;
  setSetAlterRule11: (v: boolean) => void;
  rule11Book: string;
  setRule11Book: (v: string) => void;
  onClose: () => void;
}) {
  const isManufacturer = registrationType === "Manufacturer";
  const [showTariff, setShowTariff] = useState(false);
  const [showBook, setShowBook] = useState(false);

  useEffect(() => {
    if (showTariff || showBook) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, showTariff, showBook]);

  const toggleTariff = (v: boolean) => { setSetAlterTariff(v); if (v) setShowTariff(true); };
  const toggleRule11 = (v: boolean) => { setSetAlterRule11(v); if (v) setShowBook(true); };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 font-mono text-[11px]">
      <div className="bg-white border border-zinc-800 shadow-2xl w-[580px] p-5">
        <div className="text-center font-bold text-xs pb-3 border-b border-zinc-200 uppercase tracking-wide">
          Excise Details
          <span className="text-zinc-500 text-[10px] italic ml-1">({registrationType} Unit)</span>
        </div>

        <div className="py-4 space-y-2">
          <FormRow label="Unit name" labelWidth="w-56">
            <span className="font-bold text-zinc-950 uppercase px-2 py-0.5">{unitName || "—"}</span>
          </FormRow>

          <FormRow label="Registration type" labelWidth="w-56">
            <select className={popupInput} value={registrationType} onChange={(e) => setRegistrationType(e.target.value)}>
              {REGISTRATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormRow>

          {isManufacturer && (
            <FormRow label="Type of manufacturer" labelWidth="w-56">
              <select className={popupInput} value={typeOfManufacturer} onChange={(e) => setTypeOfManufacturer(e.target.value)}>
                {MANUFACTURER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormRow>
          )}

          <FormRow label="ECC number" labelWidth="w-56">
            <input className={popupInput} value={eccNumber} onChange={(e) => setEccNumber(e.target.value)} />
          </FormRow>

          <FormRow label="Set/alter excise tariff details" labelWidth="w-56">
            <select className={popupInput} value={setAlterTariff ? "Yes" : "No"} onChange={(e) => toggleTariff(e.target.value === "Yes")}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </FormRow>
          {setAlterTariff && tariff.name && (
            <div className="pl-[15rem] text-[10px] text-zinc-500 italic">{tariff.name} · {tariff.valuationType}</div>
          )}

          <FormRow label="Set/alter Rule 11 book details" labelWidth="w-56">
            <select className={popupInput} value={setAlterRule11 ? "Yes" : "No"} onChange={(e) => toggleRule11(e.target.value === "Yes")}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </FormRow>
          {setAlterRule11 && rule11Book && (
            <div className="pl-[15rem] text-[10px] text-zinc-500 italic">Book: {rule11Book}</div>
          )}
        </div>

        <div className="border-t border-zinc-200 pt-3 flex justify-end gap-3">
          <button onClick={onClose} className="text-[11px] px-4 py-1 border border-zinc-800 bg-zinc-900 text-white hover:bg-black font-bold">Ok</button>
        </div>
      </div>

      {showTariff && (
        <ExciseTariffPopup tariff={tariff} setTariff={setTariff} onClose={() => setShowTariff(false)} />
      )}
      {showBook && (
        <ExciseBookPopup companyId={companyId} onPick={(name) => { setRule11Book(name); setShowBook(false); }} onClose={() => setShowBook(false)} />
      )}
    </div>
  );
}
