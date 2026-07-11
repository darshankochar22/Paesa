import { useState, useEffect } from 'react';
import type { TCSNatureOfGoodsType } from '@/types/entities/TCSNatureOfGoods';

const selectCls =
  'w-full bg-transparent text-[13px] outline-none py-1 px-1 cursor-pointer border-b border-transparent focus:border-zinc-400 transition-colors';

interface NatureOfGoodsDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: number;
  onOpenCreateForm: () => void;
  onCreated?: (name: string) => void;
}

export default function NatureOfGoodsDetailsModal({
  isOpen,
  onClose,
  companyId,
  onOpenCreateForm,
  onCreated,
}: NatureOfGoodsDetailsModalProps) {
  const [natureList, setNatureList] = useState<TCSNatureOfGoodsType[]>([]);
  const [selectedNature, setSelectedNature] = useState<string>('Undefined');
  const [listHighlight, setListHighlight] = useState<string>('Undefined');

  useEffect(() => {
    if (!isOpen || !companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await window.api.tcsNatureOfGoods.getAll(companyId);
        if (!cancelled && res.success && res.tcsNatureOfGoodsList) {
          setNatureList(res.tcsNatureOfGoodsList);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, companyId]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedNature('Undefined');
      setListHighlight('Undefined');
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleListClick = (name: string) => {
    setListHighlight(name);
    setSelectedNature(name);
  };

  const handleCreate = () => {
    onOpenCreateForm();
  };

  const handleAccept = () => {
    onCreated?.(selectedNature);
    onClose();
  };

  useEffect(() => {
    const handler = () => {
      if (companyId) {
        window.api.tcsNatureOfGoods.getAll(companyId).then((res) => {
          if (res.success && res.tcsNatureOfGoodsList) {
            setNatureList(res.tcsNatureOfGoodsList);
          }
        });
      }
    };
    window.addEventListener('tcs-nature-of-goods-created', handler);
    return () => window.removeEventListener('tcs-nature-of-goods-created', handler);
  }, [companyId]);

  if (!isOpen) return null;

  return (
    <div data-enter-nav-ignore className="fixed inset-0 z-[60] bg-black/30">
      {/* Main modal - centered horizontally, with right padding to leave room for the panel */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pr-72">
        <div className="bg-white border border-zinc-300 shadow-2xl w-[460px] flex flex-col">
          {/* Tally-style title bar */}
          <div className="px-4 py-2 border-b border-zinc-300 bg-zinc-50 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-zinc-900">Select Nature of Goods</span>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-700 text-lg font-bold leading-none"
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 bg-white">
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-zinc-700 w-36 shrink-0">Nature of Goods</span>
              <span className="text-zinc-400 mr-2">:</span>
              <select
                className={selectCls}
                value={selectedNature}
                onChange={(e) => {
                  setSelectedNature(e.target.value);
                  setListHighlight(e.target.value);
                }}
              >
                <option value="Undefined">Undefined</option>
                <option value="Any">Any</option>
                {natureList.map((n) => (
                  <option key={n.tcs_id} value={n.name}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-zinc-300 flex justify-end gap-2 bg-zinc-50">
            <button
              onClick={handleCreate}
              className="text-xs px-4 py-1.5 border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-medium"
            >
              Create
            </button>
            <button
              onClick={onClose}
              className="text-xs px-4 py-1.5 border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleAccept}
              className="text-xs px-6 py-1.5 bg-black text-white hover:bg-zinc-800 font-medium"
            >
              Ok
            </button>
          </div>
        </div>
      </div>

      {/* Right panel: sticks to extreme right edge */}
      <div className="absolute top-0 right-0 bottom-0 w-72 bg-white border-l border-zinc-300 flex flex-col shadow-2xl">
        <div className="px-3 py-2 border-b border-zinc-300 bg-zinc-50 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-zinc-900">List of Nature of Goods</span>
          <button
            onClick={handleCreate}
            className="text-xs px-3 py-0.5 border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-medium"
          >
            Create
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Any option */}
          <div
            className={`px-3 py-1.5 text-[13px] cursor-pointer select-none ${
              listHighlight === 'Any'
                ? 'bg-zinc-200 text-zinc-900 font-medium'
                : 'text-zinc-700 hover:bg-zinc-50'
            }`}
            onClick={() => handleListClick('Any')}
          >
            ◆ Any
          </div>
          {/* Undefined option */}
          <div
            className={`px-3 py-1.5 text-[13px] cursor-pointer select-none ${
              listHighlight === 'Undefined'
                ? 'bg-zinc-200 text-zinc-900 font-medium'
                : 'text-zinc-700 hover:bg-zinc-50'
            }`}
            onClick={() => handleListClick('Undefined')}
          >
            ◆ Undefined
          </div>
          {/* Dynamic list */}
          {natureList.map((n) => (
            <div
              key={n.tcs_id}
              className={`px-3 py-1.5 text-[13px] cursor-pointer select-none ${
                listHighlight === n.name
                  ? 'bg-zinc-200 text-zinc-900 font-medium'
                  : 'text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              {n.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
