import { useState, useEffect } from "react";
import type { TDSNatureOfPaymentType } from "@/types/entities/TDSNatureOfPayment";

const inputCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm placeholder:text-zinc-400 border-b border-transparent focus:border-zinc-300 transition-colors";
const selectCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm cursor-pointer border-b border-transparent focus:border-zinc-300 transition-colors";

interface NatureOfPaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: number;
}

export default function NatureOfPaymentDetailsModal({ isOpen, onClose, companyId }: NatureOfPaymentDetailsModalProps) {
  const [natureList, setNatureList] = useState<TDSNatureOfPaymentType[]>([]);
  const [selectedNature, setSelectedNature] = useState<string>("Undefined");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNatureName, setNewNatureName] = useState("");

  useEffect(() => {
    if (!isOpen || !companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await window.api.tdsNatureOfPayment.getAll(companyId);
        if (!cancelled && res.success && res.tdsNatureOfPaymentList) {
          setNatureList(res.tdsNatureOfPaymentList);
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, companyId]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedNature("Undefined");
      setShowCreateForm(false);
      setNewNatureName("");
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

  const handleCreateNature = async () => {
    if (!newNatureName.trim() || !companyId) return;
    try {
      const res = await window.api.tdsNatureOfPayment.create({
        company_id: companyId,
        name: newNatureName.trim(),
      });
      if (res.success && res.tdsNatureOfPayment) {
        setNatureList((prev) => [...prev, res.tdsNatureOfPayment]);
        setSelectedNature(res.tdsNatureOfPayment.name || newNatureName.trim());
        setShowCreateForm(false);
        setNewNatureName("");
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-zinc-200 rounded shadow-xl w-[520px] max-h-[80vh] flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-800">Nature of Payment Details</span>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-lg font-bold">&times;</button>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-zinc-600 w-40">Nature of Payment</span>
            <span className="text-zinc-400 mr-2">:</span>
            <select
              className={selectCls}
              value={selectedNature}
              onChange={(e) => setSelectedNature(e.target.value)}
            >
              <option value="Undefined">Undefined</option>
              <option value="Any">Any</option>
              {natureList.map((n) => (
                <option key={n.tds_id} value={n.name}>{n.name}</option>
              ))}
            </select>
          </div>

          {showCreateForm && (
            <div className="border rounded p-4 mt-2 bg-zinc-50">
              <div className="text-sm font-semibold text-zinc-800 mb-3">Create Nature of Payment</div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-zinc-600 w-32">Name</span>
                <span className="text-zinc-400 mr-2">:</span>
                <input
                  autoFocus
                  className={inputCls}
                  value={newNatureName}
                  onChange={(e) => setNewNatureName(e.target.value)}
                  placeholder="Enter name"
                />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-zinc-600 w-32">Section</span>
                <span className="text-zinc-400 mr-2">:</span>
                <input className={inputCls} placeholder="" />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-zinc-600 w-32">Payment code</span>
                <span className="text-zinc-400 mr-2">:</span>
                <input className={inputCls} placeholder="" />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-zinc-600 w-32">Remittance code</span>
                <span className="text-zinc-400 mr-2">:</span>
                <input className={inputCls} placeholder="" />
              </div>
              <div className="text-xs font-semibold text-zinc-700 mb-2">Rate for individuals/HUF</div>
              <div className="flex items-center gap-2 mb-3 ml-4">
                <span className="text-sm text-zinc-600 w-28">With PAN</span>
                <span className="text-zinc-400 mr-2">:</span>
                <input className={inputCls} type="number" defaultValue="0" placeholder="0 %" />
                <span className="text-sm text-zinc-500">%</span>
              </div>
              <div className="text-xs font-semibold text-zinc-700 mb-2">Rate for other deductee types</div>
              <div className="flex items-center gap-2 mb-3 ml-4">
                <span className="text-sm text-zinc-600 w-28">With PAN</span>
                <span className="text-zinc-400 mr-2">:</span>
                <input className={inputCls} type="number" defaultValue="0" placeholder="0 %" />
                <span className="text-sm text-zinc-500">%</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-zinc-600 w-32">Is zero rated</span>
                <span className="text-zinc-400 mr-2">:</span>
                <input className={inputCls} placeholder="" />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-zinc-600 w-32">Threshold/exemption limit</span>
                <span className="text-zinc-400 mr-2">:</span>
                <input className={inputCls} type="number" placeholder="" />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => { setShowCreateForm(false); setNewNatureName(""); }}
                  className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNature}
                  className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 transition-colors font-medium"
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
          <button
            onClick={() => setShowCreateForm(true)}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition-colors font-medium"
          >
            Create
          </button>
          <button
            onClick={onClose}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 transition-colors font-medium"
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}
