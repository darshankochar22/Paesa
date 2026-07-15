import { useState, useCallback, useRef } from 'react';
import LedgerListPanel from '../LedgerListPanel';
import { VoucherPopupShell } from '@/components/tally-ui/VoucherPopupShell';

// Backing shape mirrors the voucher_manufacturer_importer_details table
// (snake_case) so it round-trips through create/read/update untouched.
export interface ManufacturerImporterDetails {
  name?: string;
  address_type?: string;
  address?: string;
  excise_regn_no?: string;
  importer_exporter_code?: string;
  excise_range?: string;
  division?: string;
  commissionerate?: string;
  invoice_no?: string;
  invoice_date?: string;
}

interface Props {
  partyLedger: any;
  allLedgers: any[];
  initialDetails?: ManufacturerImporterDetails | null;
  onClose: () => void;
  onSave: (details: ManufacturerImporterDetails) => void;
  onCreateLedger: () => void;
}

const ledgerAddress = (l: any) =>
  [l?.address1, l?.address2, l?.city, l?.pincode].filter(Boolean).join('\n');

const labelCls = 'w-44 text-sm text-black shrink-0';
const colonCls = 'text-sm text-black shrink-0';
const inputCls =
  'flex-1 min-w-0 text-sm bg-white border border-gray-400 px-1 py-0 outline-none focus:border-black';

export default function ManufacturerImporterDetailsPopup({
  partyLedger,
  allLedgers,
  initialDetails,
  onClose,
  onSave,
  onCreateLedger,
}: Props) {
  const [form, setForm] = useState<ManufacturerImporterDetails>({
    name: initialDetails?.name ?? partyLedger?.name ?? '',
    address_type: initialDetails?.address_type ?? 'Primary',
    address: initialDetails?.address ?? ledgerAddress(partyLedger),
    excise_regn_no: initialDetails?.excise_regn_no ?? '',
    importer_exporter_code: initialDetails?.importer_exporter_code ?? '',
    excise_range: initialDetails?.excise_range ?? '',
    division: initialDetails?.division ?? '',
    commissionerate: initialDetails?.commissionerate ?? '',
    invoice_no: initialDetails?.invoice_no ?? '',
    invoice_date: initialDetails?.invoice_date ?? '',
  });

  const set = (field: keyof ManufacturerImporterDetails, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const [showLedgerPanel, setShowLedgerPanel] = useState(false);
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  // Move focus to the field right AFTER the Name input, so closing the ledger
  // picker hands control back into the form and Enter keeps advancing. Focusing
  // Name itself would re-open the picker (its onFocus) and trap Enter in a loop.
  const focusAfterName = () => {
    const root = contentRef.current;
    if (!root) return;
    const fields = Array.from(root.querySelectorAll<HTMLElement>('input, select, textarea')).filter(
      (el) => !(el as HTMLInputElement).disabled && el.offsetParent !== null,
    );
    const fields = Array.from(root.querySelectorAll<HTMLElement>('input, select, textarea')).filter(
      (el) => !(el as HTMLInputElement).disabled && el.offsetParent !== null,
    );
    const nameEl = root.querySelector<HTMLElement>('[data-mid-name]');
    const idx = nameEl ? fields.indexOf(nameEl) : -1;
    const next = idx >= 0 ? fields[idx + 1] : undefined;
    if (next) {
      next.focus();
      if (next.tagName === 'INPUT') (next as HTMLInputElement).select();
    }
  };

  // Picking a ledger fills Name + Address (matches the Party Details picker).
  const handleLedgerSelect = useCallback((item: any) => {
    setForm((prev) => ({
      ...prev,
      name: item.name,
      address: ledgerAddress(item) || prev.address,
    }));
    setShowLedgerPanel(false);
    setLedgerSearchTerm('');
    // Hand focus back into the form so Enter continues to the next field.
    setTimeout(focusAfterName, 0);
  }, []);

  // Close the picker and return focus to the form (Enter keeps flowing).
  const dismissPicker = () => {
    setShowLedgerPanel(false);
    setLedgerSearchTerm('');
    setTimeout(focusAfterName, 0);
  };

  // While the picker is open, Esc / Cancel closes it, not the whole popup.
  const handleClose = () => {
    if (showLedgerPanel) {
      dismissPicker();
    } else {
      onClose();
    }
  };
  const handleAccept = () => {
    if (!showLedgerPanel) onSave(form);
  };

  return (
    <>
      <VoucherPopupShell
        title="Manufacturer / Importer Details"
        headerRight={partyLedger?.name}
        onClose={handleClose}
        onAccept={handleAccept}
      >
        <div ref={contentRef} className="max-w-2xl space-y-2">
          <div className="flex items-center gap-2">
            <span className={labelCls}>Name</span>
            <span className={colonCls}>:</span>
            <input
              type="text"
              data-mid-name
              className={inputCls}
              value={form.name ?? ''}
              onChange={(e) => set('name', e.target.value)}
              onFocus={() => {
                setShowLedgerPanel(true);
                setLedgerSearchTerm('');
              }}
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2">
            <span className={labelCls}>Address Type</span>
            <span className={colonCls}>:</span>
            <select
              className={inputCls}
              value={form.address_type || 'Primary'}
              onChange={(e) => set('address_type', e.target.value)}
            >
              <option value="Primary">♦ Primary</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex items-start gap-2">
            <span className={`${labelCls} pt-0.5`}>Address</span>
            <span className={`${colonCls} pt-0.5`}>:</span>
            <textarea
              className={`${inputCls} resize-none h-16`}
              value={form.address ?? ''}
              onChange={(e) => set('address', e.target.value)}
            />
          </div>

          <div className="pt-2 border-t border-gray-300 space-y-2">
            <div className="flex items-center gap-2">
              <span className={labelCls}>Excise Regn No.</span>
              <span className={colonCls}>:</span>
              <input
                type="text"
                className={inputCls}
                value={form.excise_regn_no ?? ''}
                onChange={(e) => set('excise_regn_no', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={labelCls}>Importer Exporter Code</span>
              <span className={colonCls}>:</span>
              <input
                type="text"
                className={inputCls}
                value={form.importer_exporter_code ?? ''}
                onChange={(e) => set('importer_exporter_code', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={labelCls}>Range</span>
              <span className={colonCls}>:</span>
              <input
                type="text"
                className={inputCls}
                value={form.excise_range ?? ''}
                onChange={(e) => set('excise_range', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={labelCls}>Division</span>
              <span className={colonCls}>:</span>
              <input
                type="text"
                className={inputCls}
                value={form.division ?? ''}
                onChange={(e) => set('division', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={labelCls}>Commissionerate</span>
              <span className={colonCls}>:</span>
              <input
                type="text"
                className={inputCls}
                value={form.commissionerate ?? ''}
                onChange={(e) => set('commissionerate', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={labelCls}>Invoice No.</span>
              <span className={colonCls}>:</span>
              <input
                type="text"
                className={inputCls}
                value={form.invoice_no ?? ''}
                onChange={(e) => set('invoice_no', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={labelCls}>Invoice Date</span>
              <span className={colonCls}>:</span>
              <input
                type="date"
                className="w-44 shrink-0 text-sm bg-white border border-gray-400 px-1 py-0 outline-none focus:border-black"
                value={form.invoice_date ?? ''}
                onChange={(e) => set('invoice_date', e.target.value)}
              />
            </div>
          </div>
        </div>
      </VoucherPopupShell>

      {showLedgerPanel && (
        <div className="fixed inset-y-0 right-0 z-[60] shadow-2xl">
          <LedgerListPanel
            title="List of Ledger Accounts"
            items={allLedgers}
            searchTerm={ledgerSearchTerm}
            onSearchChange={setLedgerSearchTerm}
            onSelect={handleLedgerSelect}
            onClose={dismissPicker}
            onCreateNew={onCreateLedger}
            createLabel="Create"
            height="h-screen"
          />
        </div>
      )}
    </>
  );
}
