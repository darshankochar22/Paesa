import { useState, useEffect } from "react";

const selectCls = "bg-transparent text-[13px] outline-none py-1 px-1 rounded-sm cursor-pointer border-b border-transparent focus:border-zinc-400 transition-colors";
const inputCls = "w-full bg-transparent text-[13px] outline-none py-1 px-1 placeholder:text-zinc-400 border-b border-transparent focus:border-zinc-400 transition-colors";

const EXCISE_UOMS = [
  { code: "Undefined", desc: "Undefined" },
  { code: "10GMS", desc: "10 Grams" },
  { code: "1KKWH", desc: "1000 Kilowatt Hours" },
  { code: "C/K", desc: "Carats" },
  { code: "CM", desc: "Centimetre" },
  { code: "CM3", desc: "Cubic Centimetre" },
  { code: "G", desc: "Grams" },
  { code: "GI F/S", desc: "Gram of Fissile Isotopes" },
  { code: "KG", desc: "Kilograms" },
  { code: "KL", desc: "Kilolitre" },
  { code: "L", desc: "Litre" },
  { code: "M", desc: "Metre" },
  { code: "M2", desc: "Square Metre" },
  { code: "M3", desc: "Cubic Metre" },
  { code: "MM", desc: "Millimetre" },
  { code: "MT", desc: "Metric Tonne" },
  { code: "PA", desc: "Number of Pairs" },
  { code: "Q", desc: "Quintal" },
  { code: "T", desc: "Ton" },
  { code: "TU", desc: "Thousand in Nos" },
  { code: "U", desc: "Numbers" },
];

const VALUATION_TYPES = ["Undefined", "Ad Quantum", "Ad Valorem", "Valorem + Quantum"];

interface ExciseTariffDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3 last:mb-0">
      <span className="text-[13px] text-zinc-700 w-44 shrink-0">{label}</span>
      <span className="text-zinc-400 mr-2">:</span>
      <div className="flex-1 flex items-center gap-1">{children}</div>
    </div>
  );
}

export default function ExciseTariffDetailsModal({ isOpen, onClose }: ExciseTariffDetailsModalProps) {
  const [tariffName, setTariffName] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [reportingUom, setReportingUom] = useState("Undefined");
  const [valuationType, setValuationType] = useState("Ad Valorem");
  const [rate, setRate] = useState("0");
  const [ratePerUnit, setRatePerUnit] = useState("0");

  useEffect(() => {
    if (!isOpen) {
      setTariffName("");
      setHsnCode("");
      setReportingUom("Undefined");
      setValuationType("Ad Valorem");
      setRate("0");
      setRatePerUnit("0");
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const showRate = valuationType === "Ad Valorem" || valuationType === "Valorem + Quantum";
  const showRatePerUnit = valuationType === "Ad Quantum" || valuationType === "Valorem + Quantum";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="bg-white border border-zinc-300 shadow-2xl w-[480px] flex flex-col">
        <div className="px-4 py-2 border-b border-zinc-300 bg-zinc-50 text-center">
          <span className="text-[13px] font-semibold text-zinc-900">Excise Tariff Details</span>
        </div>

        <div className="px-5 py-4 bg-white">
          <Row label="Tariff name">
            <input
              autoFocus
              className={inputCls}
              value={tariffName}
              onChange={(e) => setTariffName(e.target.value)}
            />
          </Row>
          <Row label="HSN code">
            <input
              className={inputCls}
              value={hsnCode}
              onChange={(e) => setHsnCode(e.target.value)}
            />
          </Row>
          <Row label="Reporting unit of measure">
            <select
              className={selectCls}
              value={reportingUom}
              onChange={(e) => setReportingUom(e.target.value)}
            >
              {EXCISE_UOMS.map((u) => (
                <option key={u.code} value={u.code}>
                  {u.code === "Undefined" ? "Undefined" : `${u.code} - ${u.desc}`}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Valuation type">
            <select
              className={selectCls}
              value={valuationType}
              onChange={(e) => setValuationType(e.target.value)}
            >
              {VALUATION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Row>
          {showRate && (
            <Row label="Rate">
              <input
                className={inputCls}
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
              <span className="text-[13px] text-zinc-500">%</span>
            </Row>
          )}
          {showRatePerUnit && (
            <Row label="Rate per Unit">
              <input
                className={inputCls}
                type="number"
                min="0"
                step="0.01"
                value={ratePerUnit}
                onChange={(e) => setRatePerUnit(e.target.value)}
              />
            </Row>
          )}
        </div>

        <div className="px-4 py-3 border-t border-zinc-300 flex justify-end gap-2 bg-zinc-50">
          <button
            onClick={onClose}
            className="text-xs px-4 py-1.5 border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="text-xs px-6 py-1.5 bg-black text-white hover:bg-zinc-800 font-medium"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
