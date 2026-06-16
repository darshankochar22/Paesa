import { useState, useEffect } from "react";

const inputCls = "w-full bg-transparent text-[13px] outline-none py-1 px-1 placeholder:text-zinc-400 border-b border-transparent focus:border-zinc-400 transition-colors";

interface TDSNatureOfPaymentCreationProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: number;
  onCreated?: (name: string) => void;
}

export default function TDSNatureOfPaymentCreation({
  isOpen,
  onClose,
  companyId,
  onCreated,
}: TDSNatureOfPaymentCreationProps) {
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [paymentCode, setPaymentCode] = useState("");
  const [remittanceCode, setRemittanceCode] = useState("");
  const [rateIndividualWithPan, setRateIndividualWithPan] = useState("0");
  const [rateOtherWithPan, setRateOtherWithPan] = useState("0");
  const [isZeroRated, setIsZeroRated] = useState("");
  const [thresholdLimit, setThresholdLimit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setSection("");
      setPaymentCode("");
      setRemittanceCode("");
      setRateIndividualWithPan("0");
      setRateOtherWithPan("0");
      setIsZeroRated("");
      setThresholdLimit("");
      setError(null);
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

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!companyId) {
      setError("No company selected.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await window.api.tdsNatureOfPayment.create({
        company_id: companyId,
        name: name.trim(),
        section: section.trim() || undefined,
        payment_code: paymentCode.trim() || undefined,
        remittance_code: remittanceCode.trim() || undefined,
        rate_individual_with_pan: Number(rateIndividualWithPan) || 0,
        rate_other_with_pan: Number(rateOtherWithPan) || 0,
        is_zero_rated: isZeroRated === "Yes" ? 1 : 0,
        threshold_limit: Number(thresholdLimit) || 0,
      });
      if (res.success && res.tdsNatureOfPayment) {
        const createdName = res.tdsNatureOfPayment.name || name.trim();
        onCreated?.(createdName);
        onClose();
      } else {
        setError(res.error || "Failed to create nature of payment.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30">
      <div className="bg-white border border-zinc-300 shadow-2xl w-[580px] max-h-[90vh] flex flex-col">
        {/* Tally-style title bar */}
        <div className="px-4 py-2 border-b border-zinc-300 bg-zinc-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-zinc-900">
              TDS Nature of Payment
            </span>
            <span className="text-[13px] text-zinc-500">Creation (Secondary)</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 text-lg font-bold leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 bg-white">
          {error && (
            <div className="mb-3 p-2 border border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs">dismiss</button>
            </div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <span className="text-[13px] text-zinc-700 w-48 shrink-0">Name</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input
              autoFocus
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=""
            />
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-[13px] text-zinc-700 w-48 shrink-0">Section</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input
              className={inputCls}
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder=""
            />
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-[13px] text-zinc-700 w-48 shrink-0">Payment code</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input
              className={inputCls}
              value={paymentCode}
              onChange={(e) => setPaymentCode(e.target.value)}
              placeholder=""
            />
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-[13px] text-zinc-700 w-48 shrink-0">Remittance code</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input
              className={inputCls}
              value={remittanceCode}
              onChange={(e) => setRemittanceCode(e.target.value)}
              placeholder=""
            />
          </div>

          <div className="mb-3">
            <div className="text-[13px] font-semibold text-zinc-800 mb-2">Rate for individuals/HUF</div>
            <div className="flex items-center gap-2 ml-6">
              <span className="text-[13px] text-zinc-700 w-28 shrink-0">With PAN</span>
              <span className="text-zinc-400 mr-2">:</span>
              <input
                className={inputCls}
                type="number"
                value={rateIndividualWithPan}
                onChange={(e) => setRateIndividualWithPan(e.target.value)}
                placeholder="0"
              />
              <span className="text-[13px] text-zinc-500">%</span>
            </div>
          </div>

          <div className="mb-3">
            <div className="text-[13px] font-semibold text-zinc-800 mb-2">Rate for other deductee types</div>
            <div className="flex items-center gap-2 ml-6">
              <span className="text-[13px] text-zinc-700 w-28 shrink-0">With PAN</span>
              <span className="text-zinc-400 mr-2">:</span>
              <input
                className={inputCls}
                type="number"
                value={rateOtherWithPan}
                onChange={(e) => setRateOtherWithPan(e.target.value)}
                placeholder="0"
              />
              <span className="text-[13px] text-zinc-500">%</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-[13px] text-zinc-700 w-48 shrink-0">Is zero rated</span>
            <span className="text-zinc-400 mr-2">:</span>
            <button
              type="button"
              onClick={() => setIsZeroRated(isZeroRated === "Yes" ? "No" : "Yes")}
              className="text-[13px] py-0.5 px-2 min-w-[28px] text-center font-medium hover:bg-zinc-100"
            >
              {isZeroRated || "No"}
            </button>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-[13px] text-zinc-700 w-48 shrink-0">Threshold/exemption limit</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input
              className={inputCls}
              type="number"
              value={thresholdLimit}
              onChange={(e) => setThresholdLimit(e.target.value)}
              placeholder=""
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-300 flex justify-end gap-2 bg-zinc-50 shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="text-xs px-5 py-1.5 border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs px-6 py-1.5 bg-black text-white hover:bg-zinc-800 font-medium disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
