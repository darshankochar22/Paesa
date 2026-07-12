import * as React from 'react';
import { useEscape } from '@/hooks/useEscape';

export interface SavedView {
  name: string;
  isDefault: boolean;
  saveFor: 'all' | 'company';
  withMaster: boolean;
  withPeriod: boolean;
}

interface Props {
  defaultName: string;
  onSave: (v: SavedView) => void;
  onClose: () => void;
}

const ROW = 'flex items-center justify-between px-1 py-1.5 border-b border-gray-200';
const LBL = 'text-[11px] text-black font-semibold pr-4';

/**
 * TallyPrime "Save View" dialog. Basic form collapses extra config behind a
 * "Show additional configuration: Yes/No" toggle, matching the screenshots.
 * Strict gray theme; Yes/No rendered as a two-button segmented control (no color).
 */
export default function SaveViewDialog({ defaultName, onSave, onClose }: Props) {
  const [name, setName] = React.useState(defaultName);
  const [isDefault, setDefault] = React.useState(false);
  const [showMore, setShowMore] = React.useState(false);
  const [saveFor, setSaveFor] = React.useState<'all' | 'company'>('all');
  const [withMaster, setWithMaster] = React.useState(false);
  const [withPeriod, setWithPeriod] = React.useState(false);

  useEscape(onClose);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onSave({ name: name.trim() || defaultName, isDefault, saveFor, withMaster, withPeriod });
      }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [name, isDefault, saveFor, withMaster, withPeriod, defaultName, onSave]);

  const YesNo = ({ value, onChange }: { value: boolean; onChange: (b: boolean) => void }) => (
    <div className="flex border border-gray-200 text-[10px] font-bold">
      <button
        onClick={() => onChange(true)}
        className={`px-3 py-0.5 ${value ? 'bg-black text-white' : 'bg-white text-black'}`}
      >
        Yes
      </button>
      <button
        onClick={() => onChange(false)}
        className={`px-3 py-0.5 border-l border-gray-200 ${!value ? 'bg-black text-white' : 'bg-white text-black'}`}
      >
        No
      </button>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/[0.06]"
      onClick={onClose}
    >
      <div
        className="mt-20 w-[420px] bg-white border border-gray-200 shadow-lg flex flex-col select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-1.5 bg-white border-b-2 border-gray-200">
          <span className="font-bold text-xs tracking-wide">Save View</span>
        </div>

        <div className="px-4 py-3">
          <div className="mb-3">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-black mb-1">
              Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-1 text-[11px] border border-gray-200 focus:border-gray-200 outline-none font-mono"
            />
          </div>

          <div className={ROW}>
            <span className={LBL}>Set this as default view for the report</span>
            <YesNo value={isDefault} onChange={setDefault} />
          </div>
          <div className={ROW}>
            <span className={LBL}>Show additional configuration</span>
            <YesNo value={showMore} onChange={setShowMore} />
          </div>

          {showMore && (
            <>
              <div className={ROW}>
                <span className={LBL}>Save for</span>
                <select
                  value={saveFor}
                  onChange={(e) => setSaveFor(e.target.value as 'all' | 'company')}
                  className="text-[11px] border border-gray-200 px-2 py-0.5 outline-none focus:border-gray-200 bg-white"
                >
                  <option value="all">All Companies — (On This Computer)</option>
                  <option value="company">This Company</option>
                </select>
              </div>
              <div className={ROW}>
                <span className={LBL}>Save with the master selected to open the report</span>
                <YesNo value={withMaster} onChange={setWithMaster} />
              </div>
              <div className={ROW}>
                <span className={LBL}>Save with the selected period</span>
                <YesNo value={withPeriod} onChange={setWithPeriod} />
              </div>
            </>
          )}
        </div>

        <div className="px-3 py-1.5 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 text-[11px] font-semibold border border-gray-200 bg-white text-black hover:bg-black/[0.03]"
          >
            Quit
          </button>
          <button
            onClick={() =>
              onSave({
                name: name.trim() || defaultName,
                isDefault,
                saveFor,
                withMaster,
                withPeriod,
              })
            }
            className="px-3 py-1 text-[11px] font-semibold bg-black text-white hover:bg-black/80"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
