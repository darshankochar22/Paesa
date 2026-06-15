import { useState, useEffect } from "react";

const inputCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm placeholder:text-zinc-400 border-b border-transparent focus:border-zinc-300 transition-colors";

const EXCISE_UOMS = [
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

const VALUATION_TYPES = ["Ad Quantum", "Ad Valorem", "Valorem + Quantum"];

interface ExciseTariffDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExciseTariffDetailsModal({ isOpen, onClose }: ExciseTariffDetailsModalProps) {
  const [tariffName, setTariffName] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [reportingUom, setReportingUom] = useState("Undefined");
  const [showUomList, setShowUomList] = useState(false);
  const [valuationType, setValuationType] = useState("Ad Valorem");
  const [showValuationList, setShowValuationList] = useState(false);
  const [rate, setRate] = useState("0");

  useEffect(() => {
    if (!isOpen) {
      setTariffName("");
      setHsnCode("");
      setReportingUom("Undefined");
      setValuationType("Ad Valorem");
      setRate("0");
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="bg-white border border-zinc-200 rounded shadow-xl w-[520px] flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 text-center">
          <span className="text-sm font-semibold text-zinc-800">Excise Tariff Details</span>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-zinc-600 w-44">Tariff name</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input
              autoFocus
              className={inputCls}
              value={tariffName}
              onChange={(e) => setTariffName(e.target.value)}
              placeholder=""
            />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-zinc-600 w-44">HSN code</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input className={inputCls} value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} placeholder="" />
          </div>
          <div className="flex items-center gap-2 mb-3 relative">
            <span className="text-sm text-zinc-600 w-44">Reporting unit of measure</span>
            <span className="text-zinc-400 mr-2">:</span>
            <button
              onClick={() => { setShowUomList(!showUomList); setShowValuationList(false); }}
              className="text-sm py-1 px-1 text-left flex-1 border-b border-transparent hover:border-zinc-300"
            >
              {reportingUom}
            </button>
            {showUomList && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-zinc-300 rounded shadow-lg w-64 max-h-60 overflow-y-auto z-10">
                <div className="px-2 py-1 bg-zinc-100 border-b border-zinc-200 flex">
                  <span className="text-xs font-semibold text-zinc-600 w-16">Excise UoM</span>
                  <span className="text-xs font-semibold text-zinc-600">Description</span>
                </div>
                <div
                  className={`px-2 py-1 cursor-pointer text-[13px] ${reportingUom === "Undefined" ? "bg-amber-300" : "hover:bg-zinc-50"}`}
                  onClick={() => { setReportingUom("Undefined"); setShowUomList(false); }}
                >
                  ◆ Undefined
                </div>
                {EXCISE_UOMS.map((u) => (
                  <div
                    key={u.code}
                    className="px-2 py-1 cursor-pointer text-[13px] hover:bg-zinc-50 flex"
                    onClick={() => { setReportingUom(u.code); setShowUomList(false); }}
                  >
                    <span className="w-16">{u.code}</span>
                    <span className="italic">{u.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mb-3 relative">
            <span className="text-sm text-zinc-600 w-44">Valuation type</span>
            <span className="text-zinc-400 mr-2">:</span>
            <button
              onClick={() => { setShowValuationList(!showValuationList); setShowUomList(false); }}
              className="text-sm py-1 px-1 text-left flex-1 border-b border-transparent hover:border-zinc-300"
            >
              {valuationType}
            </button>
            {showValuationList && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-zinc-300 rounded shadow-lg w-48 z-10">
                <div className="px-2 py-1 bg-zinc-100 border-b border-zinc-200 text-xs font-semibold text-zinc-600">
                  List of Valuation Types
                </div>
                {["Undefined", ...VALUATION_TYPES].map((t) => (
                  <div
                    key={t}
                    className={`px-2 py-1 cursor-pointer text-[13px] ${valuationType === t ? "bg-amber-300" : "hover:bg-zinc-50"}`}
                    onClick={() => { setValuationType(t); setShowValuationList(false); }}
                  >
                    {t === "Undefined" ? "◆ " : ""}{t}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-zinc-600 w-44">Rate</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input className={inputCls} type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
            <span className="text-sm text-zinc-500">%</span>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
          <button
            onClick={onClose}
            className="text-xs px-5 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 transition-colors font-medium"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
