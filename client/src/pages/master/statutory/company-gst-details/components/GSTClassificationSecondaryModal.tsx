import { useEffect, useState, useRef } from 'react';
import { NotificationBanner, FormRow } from '@/components/ui';
import GSTDetailsListPanel from './GSTDetailsListPanel';
import SlabBasedRateDetails, { type SlabRow } from './SlabBasedRateDetails';

interface GSTClassificationSecondaryModalProps {
  isOpen: boolean;
  companyId: number;
  onClose: () => void;
  onSaveSuccess: (newClassificationName: string) => void;
}

const SECONDARY_DROPDOWN_CONFIGS: Record<string, { title: string; options: string[] }> = {
  hsnSacType: {
    title: 'List of HSN/SAC Details',
    options: ['Not Defined', 'Specify Details Here'],
  },
  gstRateDetails: {
    title: 'GST Rate Details',
    options: ['Not Defined', 'Specify Details Here', 'Specify Slab-Based Rates'],
  },
  taxabilityType: {
    title: 'Taxability Type',
    options: ['Taxable', 'Exempt', 'Nil Rated', 'Non GST'],
  },
};

export default function GSTClassificationSecondaryModal({
  isOpen,
  companyId,
  onClose,
  onSaveSuccess,
}: GSTClassificationSecondaryModalProps) {
  if (!isOpen) return null;

  // ── Form state ──────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [hsnSacType, setHsnSacType] = useState('Not Defined');
  const [hsnSacCode, setHsnSacCode] = useState('');
  const [description, setDescription] = useState('');
  const [gstRateDetails, setGstRateDetails] = useState('Not Defined');
  const [taxabilityType, setTaxabilityType] = useState('Taxable');
  const [gstRate, setGstRate] = useState(0);
  const [slabRows, setSlabRows] = useState<SlabRow[]>([]);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [activeField, setActiveField] = useState('name');
  const [listPanelOpen, setListPanelOpen] = useState(false);
  const [listOptions, setListOptions] = useState<string[]>([]);
  const [listTitle, setListTitle] = useState('');
  const [listSelectedIndex, setListSelectedIndex] = useState(0);
  const [showAcceptPrompt, setShowAcceptPrompt] = useState(false);
  const [showSlabOverlay, setShowSlabOverlay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const nameRef = useRef<HTMLInputElement>(null);
  const hsnCodeRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const rateRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
    setActiveField('name');
    nameRef.current?.focus();
  }, []);

  // ── Focus sync ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeField === 'name') nameRef.current?.focus();
    else if (activeField === 'hsnSacCode') hsnCodeRef.current?.focus();
    else if (activeField === 'description') descRef.current?.focus();
    else if (activeField === 'gstRate') rateRef.current?.focus();
  }, [activeField]);

  // ── List panel sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    openDropdownPanel(activeField);
  }, [activeField, hsnSacType, gstRateDetails]);

  // ── Field order ─────────────────────────────────────────────────────────────
  const getFocusableFields = (): string[] => {
    const list = ['name', 'hsnSacType'];
    if (hsnSacType === 'Specify Details Here') {
      list.push('hsnSacCode', 'description');
    }
    list.push('gstRateDetails');
    // Only show taxability/rate when "Specify Details Here" (NOT slab-based)
    if (gstRateDetails === 'Specify Details Here') {
      list.push('taxabilityType');
      if (taxabilityType === 'Taxable') {
        list.push('gstRate');
      }
    }
    return list;
  };

  const openDropdownPanel = (fieldId: string) => {
    const config = SECONDARY_DROPDOWN_CONFIGS[fieldId];
    if (!config) {
      setListPanelOpen(false);
      return;
    }
    setListOptions(config.options);
    setListTitle(config.title);
    setListPanelOpen(true);

    let currentValue = '';
    if (fieldId === 'hsnSacType') currentValue = hsnSacType;
    else if (fieldId === 'gstRateDetails') currentValue = gstRateDetails;
    else if (fieldId === 'taxabilityType') currentValue = taxabilityType;

    const idx = config.options.indexOf(currentValue);
    setListSelectedIndex(idx >= 0 ? idx : 0);
  };

  const moveFocus = (direction: 1 | -1) => {
    const fields = getFocusableFields();
    let idx = fields.indexOf(activeField);
    if (idx === -1) {
      setActiveField(fields[0]);
      return;
    }
    idx += direction;
    if (idx >= fields.length) {
      setShowAcceptPrompt(true);
    } else if (idx < 0) {
      setActiveField(fields[0]);
    } else {
      setActiveField(fields[idx]);
    }
  };

  const handleSelectOption = (fieldId: string, val: string) => {
    if (fieldId === 'hsnSacType') {
      setHsnSacType(val);
    } else if (fieldId === 'gstRateDetails') {
      setGstRateDetails(val);
      // When slab-based is selected, open slab overlay immediately after moving focus
      if (val === 'Specify Slab-Based Rates') {
        setListPanelOpen(false);
        setTimeout(() => setShowSlabOverlay(true), 50);
        return; // don't moveFocus — slab overlay takes over
      }
    } else if (fieldId === 'taxabilityType') {
      setTaxabilityType(val);
    }
    moveFocus(1);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      setShowAcceptPrompt(false);
      setActiveField('name');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        company_id: companyId,
        name: name.trim(),
        description: hsnSacType === 'Specify Details Here' ? description : '',
        hsn_sac_code: hsnSacType === 'Specify Details Here' ? hsnSacCode : '',
        taxability:
          gstRateDetails === 'Not Defined'
            ? 'Not Defined'
            : gstRateDetails === 'Specify Slab-Based Rates'
              ? 'Slab-Based'
              : taxabilityType,
        gst_rate:
          gstRateDetails === 'Specify Details Here' && taxabilityType === 'Taxable' ? gstRate : 0,
        rate_type: gstRateDetails,
        slab_rows: gstRateDetails === 'Specify Slab-Based Rates' ? JSON.stringify(slabRows) : null,
        is_active: 1,
      };

      const result = await window.api.gstClassification.create(payload);
      if (result.success) {
        onSaveSuccess(name.trim());
      } else {
        setError(result.error || 'Failed to create GST classification');
        setShowAcceptPrompt(false);
      }
    } catch {
      setError('An unexpected error occurred');
      setShowAcceptPrompt(false);
    } finally {
      setLoading(false);
    }
  };

  // ── Keyboard handler (paused while slab overlay is open) ────────────────────
  useEffect(() => {
    if (showSlabOverlay) return; // slab overlay handles its own keys

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showAcceptPrompt) {
          setShowAcceptPrompt(false);
        } else if (listPanelOpen) {
          setListPanelOpen(false);
        } else {
          onClose();
        }
        return;
      }

      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setShowAcceptPrompt(true);
        return;
      }

      if (showAcceptPrompt) {
        const k = e.key.toLowerCase();
        if (k === 'y' || e.key === 'Enter') {
          e.preventDefault();
          handleSave();
        } else if (k === 'n') {
          e.preventDefault();
          setShowAcceptPrompt(false);
          const fields = getFocusableFields();
          setActiveField(fields[fields.length - 1]);
        }
        return;
      }

      if (listPanelOpen && listOptions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setListSelectedIndex((prev) => (prev + 1) % listOptions.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setListSelectedIndex((prev) => (prev - 1 + listOptions.length) % listOptions.length);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSelectOption(activeField, listOptions[listSelectedIndex]);
          return;
        }
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        moveFocus(e.shiftKey ? -1 : 1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveFocus(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveFocus(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showSlabOverlay,
    activeField,
    listPanelOpen,
    listOptions,
    listSelectedIndex,
    showAcceptPrompt,
    name,
    hsnSacType,
    hsnSacCode,
    description,
    gstRateDetails,
    taxabilityType,
    gstRate,
  ]);

  // ── Styles ──────────────────────────────────────────────────────────────────
  const activeClass = 'bg-white border-black text-black';
  const inactiveClass = 'border-transparent bg-transparent text-zinc-900';
  const dropdownStyle = (isActive: boolean) =>
    `px-2 py-0.5 border cursor-pointer font-bold select-none ${isActive ? activeClass : inactiveClass}`;
  const inputStyle = (isActive: boolean) =>
    `px-2 py-0.5 border outline-none font-bold ${isActive ? activeClass : inactiveClass}`;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center font-mono text-[11px]">
      <div
        ref={containerRef}
        tabIndex={-1}
        className="outline-none flex gap-4 max-h-[85vh] items-stretch animate-fade-in"
      >
        <div className="bg-white border border-zinc-500 w-[550px] flex flex-col shadow-2xl overflow-hidden relative">
          {/* Header */}
          <div className="bg-black text-white font-bold text-xs py-2 px-3 tracking-wide flex justify-between">
            <span>GST Classification Creation (Secondary)</span>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Name */}
            <FormRow label="Name" labelWidth="w-36" className="flex items-center min-h-[26px]">
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setActiveField('name')}
                className={`${inputStyle(activeField === 'name')} w-full`}
              />
            </FormRow>

            {/* ── HSN/SAC & Related Details ───────────────────────────────── */}
            <div className="border-t border-zinc-200 pt-3 space-y-3">
              <div className="font-bold text-zinc-800 text-[10px] uppercase">
                HSN/SAC &amp; Related Details
              </div>

              <FormRow
                label="HSN/SAC Details"
                labelWidth="w-36"
                className="flex items-center min-h-[26px]"
              >
                <div
                  onClick={() => setActiveField('hsnSacType')}
                  className={`${dropdownStyle(activeField === 'hsnSacType')} w-full`}
                >
                  {hsnSacType}
                </div>
              </FormRow>

              {hsnSacType === 'Specify Details Here' && (
                <>
                  <FormRow
                    label="HSN/SAC"
                    labelWidth="w-36"
                    className="flex items-center min-h-[26px]"
                  >
                    <input
                      ref={hsnCodeRef}
                      type="text"
                      maxLength={8}
                      value={hsnSacCode}
                      onChange={(e) => setHsnSacCode(e.target.value.replace(/\D/g, ''))}
                      onFocus={() => setActiveField('hsnSacCode')}
                      className={`${inputStyle(activeField === 'hsnSacCode')} w-28`}
                    />
                  </FormRow>

                  <FormRow
                    label="Description"
                    labelWidth="w-36"
                    className="flex items-center min-h-[26px]"
                  >
                    <input
                      ref={descRef}
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onFocus={() => setActiveField('description')}
                      className={`${inputStyle(activeField === 'description')} w-full`}
                    />
                  </FormRow>
                </>
              )}
            </div>

            {/* ── GST Rate & Related Details ──────────────────────────────── */}
            <div className="border-t border-zinc-200 pt-3 space-y-3">
              <div className="font-bold text-zinc-800 text-[10px] uppercase">
                GST Rate &amp; Related Details
              </div>

              <FormRow
                label="GST Rate Details"
                labelWidth="w-36"
                className="flex items-center min-h-[26px]"
              >
                <div
                  onClick={() => setActiveField('gstRateDetails')}
                  className={`${dropdownStyle(activeField === 'gstRateDetails')} w-full`}
                >
                  {gstRateDetails}
                </div>
              </FormRow>

              {/* Slab-Based: show summary row + Edit button */}
              {gstRateDetails === 'Specify Slab-Based Rates' && (
                <FormRow
                  label="Slab Rates"
                  labelWidth="w-36"
                  className="flex items-center min-h-[26px]"
                >
                  <button
                    onClick={() => setShowSlabOverlay(true)}
                    className="text-left px-2 py-0.5 font-bold text-black underline hover:text-black text-xs"
                  >
                    {slabRows.length > 0
                      ? `${slabRows.length} slab(s) configured — Edit`
                      : 'Not configured — Click to define'}
                  </button>
                </FormRow>
              )}

              {/* Specify Details Here: Taxability + GST Rate */}
              {gstRateDetails === 'Specify Details Here' && (
                <>
                  <FormRow
                    label="Taxability Type"
                    labelWidth="w-36"
                    className="flex items-center min-h-[26px]"
                  >
                    <div
                      onClick={() => setActiveField('taxabilityType')}
                      className={`${dropdownStyle(activeField === 'taxabilityType')} w-full`}
                    >
                      {taxabilityType}
                    </div>
                  </FormRow>

                  {taxabilityType === 'Taxable' && (
                    <FormRow
                      label="GST Rate"
                      labelWidth="w-36"
                      className="flex items-center min-h-[26px]"
                    >
                      <div className="flex items-center gap-1">
                        <input
                          ref={rateRef}
                          type="number"
                          value={gstRate || ''}
                          onChange={(e) => setGstRate(Number(e.target.value))}
                          onFocus={() => setActiveField('gstRate')}
                          className={`${inputStyle(activeField === 'gstRate')} w-20 text-right`}
                        />
                        <span className="font-bold text-zinc-500">%</span>
                      </div>
                    </FormRow>
                  )}
                </>
              )}
            </div>

            {error && <NotificationBanner type="error" message={error} />}
          </div>

          {/* Action bar */}
          <div className="bg-zinc-100 border-t border-zinc-300 px-4 py-2 flex justify-between items-center text-[10px] text-zinc-600 font-sans shrink-0">
            <div className="flex gap-4">
              <span>
                <span className="underline font-bold text-zinc-800">Q</span>: Quit
              </span>
              <span>
                <span className="underline font-bold text-zinc-800">A</span>lt+A: Accept
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1 rounded border border-zinc-200 bg-white text-zinc-600  text-xs font-medium"
              >
                Quit
              </button>
              <button
                onClick={() => setShowAcceptPrompt(true)}
                disabled={loading}
                className="px-4 py-1 rounded bg-black text-white  disabled:opacity-50 text-xs font-medium"
              >
                {loading ? 'Saving...' : 'Accept'}
              </button>
            </div>
          </div>

          {/* Accept dialog */}
          {showAcceptPrompt && (
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-[10001]">
              <div className="bg-white border-2 border-black px-6 py-4 shadow-xl text-center w-52">
                <div className="font-bold text-xs text-black mb-3">Accept?</div>
                <div className="flex justify-center gap-4 text-xs font-bold">
                  <button onClick={handleSave} className="px-3 py-1 bg-black text-white  w-14">
                    Yes
                  </button>
                  <button
                    onClick={() => setShowAcceptPrompt(false)}
                    className="px-3 py-1 border border-black text-black  w-14"
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right-side list panel */}
        {listPanelOpen && listOptions.length > 0 && (
          <GSTDetailsListPanel
            title={listTitle}
            options={listOptions}
            selectedIndex={listSelectedIndex}
            onSelect={(val) => handleSelectOption(activeField, val)}
          />
        )}
      </div>

      {/* Slab-Based Rate Details overlay (renders on top of this modal) */}
      <SlabBasedRateDetails
        isOpen={showSlabOverlay}
        initialRows={slabRows}
        onSave={(rows) => setSlabRows(rows)}
        onClose={() => setShowSlabOverlay(false)}
      />
    </div>
  );
}
