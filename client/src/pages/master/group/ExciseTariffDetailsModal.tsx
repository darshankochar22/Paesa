import { useState, useEffect } from "react";

const inputCls = "w-full bg-transparent text-[13px] outline-none py-1 px-1 placeholder:text-zinc-400 border-b border-transparent focus:border-zinc-400 transition-colors";

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
  const [valuationType, setValuationType] = useState("Ad Valorem");
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
    <div className="fixed inset-0 z-[60] bg-black/30">
      {/* Main modal - centered horizontally, with right padding to leave room for the panel */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pr-72">
        <div className="bg-white border border-zinc-300 shadow-2xl w-[480px] flex flex-col">
          {/* Tally-style title bar */}
          <div className="px-4 py-2 border-b border-zinc-300 bg-zinc-50 text-center">
            <span className="text-[13px] font-semibold text-zinc-900">Excise Tariff Details</span>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[13px] text-zinc-700 w-44 shrink-0">Tariff name</span>
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
              <span className="text-[13px] text-zinc-700 w-44 shrink-0">HSN code</span>
              <span className="text-zinc-400 mr-2">:</span>
              <input
                className={inputCls}
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                placeholder=""
              />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[13px] text-zinc-700 w-44 shrink-0">Reporting unit of measure</span>
              <span className="text-zinc-400 mr-2">:</span>
              <span className="text-[13px] text-zinc-900 font-medium">{reportingUom}</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[13px] text-zinc-700 w-44 shrink-0">Valuation type</span>
              <span className="text-zinc-400 mr-2">:</span>
              <span className="text-[13px] text-zinc-900 font-medium">{valuationType}</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[13px] text-zinc-700 w-44 shrink-0">Rate</span>
              <span className="text-zinc-400 mr-2">:</span>
              <input
                className={inputCls}
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0"
              />
              <span className="text-[13px] text-zinc-500">%</span>
            </div>
          </div>

          {/* Footer */}
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

      {/* Right panel: sticks to extreme right edge */}
      <div className="absolute top-0 right-0 bottom-0 w-72 bg-white border-l border-zinc-300 flex flex-col shadow-2xl">
        {valuationType !== "Ad Valorem" && valuationType !== "Ad Quantum" && valuationType !== "Valorem + Quantum" ? (
          // Show UoM list
          <>
            <div className="px-3 py-2 border-b border-zinc-300 bg-zinc-50">
              <span className="text-[13px] font-semibold text-zinc-900">List of Excise Reporting UoMs</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div
                className={`px-3 py-1.5 text-[13px] cursor-pointer select-none ${
                  reportingUom === "Undefined" ? "bg-zinc-200 text-zinc-900 font-medium" : "text-zinc-700 hover:bg-zinc-50"
                }`}
                onClick={() => setReportingUom("Undefined")}
              >
                ◆ Undefined
              </div>
              {EXCISE_UOMS.map((u) => (
                <div
                  key={u.code}
                  className={`px-3 py-1.5 text-[13px] cursor-pointer select-none ${
                    reportingUom === u.code ? "bg-zinc-200 text-zinc-900 font-medium" : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                  onClick={() => setReportingUom(u.code)}
                >
                  <div className="flex">
                    <span className="w-16 shrink-0">{u.code}</span>
                    <span className="italic">{u.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          // Show Valuation Types list
          <>
            <div className="px-3 py-2 border-b border-zinc-300 bg-zinc-50">
              <span className="text-[13px] font-semibold text-zinc-900">List of Valuation Types</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {["Undefined", ...VALUATION_TYPES].map((t) => (
                <div
                  key={t}
                  className={`px-3 py-1.5 text-[13px] cursor-pointer select-none ${
                    valuationType === t ? "bg-zinc-200 text-zinc-900 font-medium" : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                  onClick={() => setValuationType(t)}
                >
                  {t === "Undefined" ? "◆ " : ""}{t}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
