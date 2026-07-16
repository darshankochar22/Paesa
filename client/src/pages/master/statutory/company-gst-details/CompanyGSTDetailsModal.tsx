// Thin orchestrator for the Company GST Details dialog.
// Manages keyboard navigation, dropdown panel state, and accept-prompt state.
// Delegates rendering to focused sub-components.

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { NotificationBanner, PageTitleBar, MasterFormFooter } from '@/components/ui';
import { useGSTDetails } from './hooks/useGSTDetails';
import type { CompanyGSTDetails } from '@/types/entities/CompanyGSTDetails';
import GSTDetailsFormFields from './components/GSTDetailsFormFields';
import GSTDetailsListPanel from './components/GSTDetailsListPanel';
import GSTDetailsAcceptPrompt from './components/GSTDetailsAcceptPrompt';
import GSTClassificationSecondaryModal from './components/GSTClassificationSecondaryModal';
import SlabBasedRateDetails from './components/SlabBasedRateDetails';
import GSTEffectiveDatePrompt from './components/GSTEffectiveDatePrompt';
import StateWiseThresholdLimitModal from './components/StateWiseThresholdLimitModal';
import DownloadSettingsModal from './components/DownloadSettingsModal';
import { TALLY_FIELDS_CONFIG } from './config/dropdownConfig';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface CompanyGSTDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When true, render as an in-flow routed page (sits inside the app layout
   *  between the global Navbar and Footer) instead of a fixed full-screen
   *  overlay. Overlay is used by the F11 Company Features popup. */
  asPage?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CompanyGSTDetailsModal({
  isOpen,
  onClose,
  asPage = false,
}: CompanyGSTDetailsModalProps) {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const {
    form,
    gstRateDetails,
    setGstRateDetails,
    setField,
    loading,
    error,
    setError,
    success,
    setSuccess,
    saveDetails,
    hasGSTRegistrations,
  } = useGSTDetails({ companyId, isOpen });

  // ── UI state ────────────────────────────────────────────────────────────────
  const [activeField, setActiveField] = useState<string>('hsnSacType');
  const [listPanelOpen, setListPanelOpen] = useState(false);
  const [listOptions, setListOptions] = useState<string[]>([]);
  const [listTitle, setListTitle] = useState('');
  const [listSelectedIndex, setListSelectedIndex] = useState(0);
  const [showAcceptPrompt, setShowAcceptPrompt] = useState(false);
  const [classifications, setClassifications] = useState<any[]>([]);
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [showSlabOverlay, setShowSlabOverlay] = useState(false);
  const [showEffectiveDatePrompt, setShowEffectiveDatePrompt] = useState(false);
  const [effectiveDateTriggerContext, setEffectiveDateTriggerContext] = useState<'field' | 'save'>(
    'save',
  );
  const [showStateWiseModal, setShowStateWiseModal] = useState(false);
  const [showDownloadSettingsModal, setShowDownloadSettingsModal] = useState(false);
  const [registrations, setRegistrations] = useState<any[]>([]);

  const modalRef = useRef<HTMLDivElement>(null);

  // ── Load classifications & registrations ──────────────────────────────────────

  const fetchClassifications = () => {
    if (companyId) {
      window.api.gstClassification.getAll(companyId).then((res) => {
        if (res.success && res.gstClassifications) {
          setClassifications(res.gstClassifications);
        }
      });
    }
  };

  const fetchRegistrations = () => {
    if (companyId) {
      window.api.gstRegistration.getAll(companyId).then((res) => {
        if (res.success && res.gstRegistrations) {
          setRegistrations(res.gstRegistrations);
        }
      });
    }
  };

  useEffect(() => {
    if (isOpen && companyId) {
      fetchClassifications();
      fetchRegistrations();
    }
  }, [isOpen, companyId]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Returns the ordered list of focusable field IDs given current form state */
  const getFocusableFields = (): string[] => {
    const list: string[] = ['hsnSacType'];

    // Classification under HSN/SAC section — triggered by hsnSacType
    if (form.hsnSacType === 'Use GST Classification') {
      list.push('gstClassification');
    }

    if (form.hsnSacType === 'Specify Details Here') {
      list.push('hsnSacCode', 'description');
    }

    list.push('gstRateDetails');

    // Classification under GST Rate section — triggered by gstRateDetails
    if (gstRateDetails === 'Use GST Classification') {
      list.push('gstClassification');
    }

    // Only show taxability/rate when "Specify Details Here" — not for slab-based
    if (gstRateDetails === 'Specify Details Here') {
      list.push('taxabilityType');
      if (form.taxabilityType === 'Taxable') {
        list.push('gstRate');
      }
    }

    list.push(
      'interstateThresholdLimit',
      hasGSTRegistrations ? 'setStateWiseThresholdLimit' : 'intrastateThresholdLimit',
      'thresholdLimitIncludes',
      'createHSNSummaryFor',
    );

    if (form.createHSNSummaryFor !== 'None') {
      list.push('minimumHSNLength');
    }

    list.push('showGSTAdvances');

    if (form.showGSTAdvances) {
      list.push('gstAdvancesApplicableFrom');
    }

    list.push('updateGSTStatus');

    list.push('gstReturnsConfigured');
    return list;
  };

  /** Opens the right-side list panel for dropdown fields.
   *  Yes/No fields are inline <select>s (Ledger-style) — they never open a list. */
  const openDropdownPanel = (fieldId: string) => {
    const config = TALLY_FIELDS_CONFIG[fieldId];
    if (!config || config.type === 'input' || config.type === 'yesno') {
      setListPanelOpen(false);
      return;
    }

    let options = config.options ? [...config.options] : [];
    let title = config.title || '';

    if (fieldId === 'gstClassification') {
      // Preset names that should never appear in the user-facing classifications list
      const PRESET_NAMES = new Set([
        'GST 0%',
        'GST 5%',
        'GST 12%',
        'GST 18%',
        'GST 28%',
        'Exempt',
        'Nil Rated',
        'Non GST',
      ]);
      const userClassifications = classifications
        .map((c) => c.name || '')
        .filter((name) => name && !PRESET_NAMES.has(name));
      options = ['Create', ...userClassifications];
      title = 'List of Classifications';
    }

    setListOptions(options);
    setListTitle(title);
    setListPanelOpen(options.length > 0);

    // Resolve the current value for pre-selection
    let currentValue = '';
    if (fieldId === 'gstRateDetails') {
      currentValue = gstRateDetails;
    } else if (fieldId === 'gstClassification') {
      currentValue = form.gstClassification || '';
    } else {
      currentValue = String(form[fieldId as keyof CompanyGSTDetails] ?? '');
    }

    const idx = options.indexOf(currentValue);
    setListSelectedIndex(idx >= 0 ? idx : 0);
  };

  /** Move keyboard focus one step forward (+1) or backward (-1) */
  const moveFocus = (direction: 1 | -1, bypassPrompt = false) => {
    const fields = getFocusableFields();
    let index = fields.indexOf(activeField);
    if (index === -1) {
      setActiveField(fields[0]);
      return;
    }

    if (direction === 1 && activeField === 'description' && !bypassPrompt) {
      setEffectiveDateTriggerContext('field');
      setShowEffectiveDatePrompt(true);
      return;
    }

    if (
      direction === 1 &&
      activeField === 'gstReturnsConfigured' &&
      form.gstReturnsConfigured &&
      !bypassPrompt
    ) {
      setShowDownloadSettingsModal(true);
      return;
    }

    index += direction;
    if (index >= fields.length) {
      setEffectiveDateTriggerContext('save');
      setShowEffectiveDatePrompt(true);
    } else if (index < 0) {
      setActiveField(fields[0]);
    } else {
      setActiveField(fields[index]);
    }
  };

  /** Apply a value chosen from the list panel to the corresponding field */
  const handleSelectDropdownOption = (fieldId: string, val: string) => {
    // "Create" navigates to the real GST Classification master (not a duplicate modal).
    if (fieldId === 'gstClassification' && val === 'Create') {
      setListPanelOpen(false);
      navigate('/master/create/gst-classification');
      return;
    }

    // NOTE ON FOCUS ROUTING: after a field selection changes which rows are
    // visible, we must NOT rely on moveFocus() — getFocusableFields() closes over
    // the *current* render's state, so it would read the pre-change value and skip
    // (or land on) the wrong field. Every branch that alters visibility therefore
    // sets the next active field explicitly, exactly matching TallyPrime's order.
    if (fieldId === 'hsnSacType') {
      setField('hsnSacType', val);
      if (val === 'Not Defined') {
        // No HSN/SAC or Description — jump straight to GST Rate Details
        setField('hsnSacCode', '');
        setField('description', '');
        setActiveField('gstRateDetails');
      } else if (val === 'Specify Details Here') {
        // Walk through HSN/SAC → Description in order
        setActiveField('hsnSacCode');
      } else if (val === 'Use GST Classification') {
        // Only the Classification field is entered; HSN/SAC + Description are read-only
        setActiveField('gstClassification');
      } else if (val === 'Specify in Voucher') {
        // No detail fields — confirm effective date, then advance to GST Rate Details
        setEffectiveDateTriggerContext('field');
        setListPanelOpen(false);
        setTimeout(() => setShowEffectiveDatePrompt(true), 50);
      }
      return;
    } else if (fieldId === 'gstRateDetails') {
      setGstRateDetails(val);
      if (val === 'Not Defined') {
        // Skip Taxability Type + GST Rate → e-Way Bill Details
        setField('taxabilityType', 'Not Defined');
        setField('gstRate', 0);
        setActiveField('interstateThresholdLimit');
      } else if (val === 'Specify Details Here') {
        // Default to Taxable and enter the Taxability Type field
        setField('taxabilityType', 'Taxable');
        setActiveField('taxabilityType');
      } else if (val === 'Specify Slab-Based Rates') {
        // Open slab overlay immediately — do NOT moveFocus
        setListPanelOpen(false);
        setTimeout(() => setShowSlabOverlay(true), 50);
      } else if (val === 'Use GST Classification') {
        setActiveField('gstClassification');
      } else if (val === 'Specify in Voucher') {
        setEffectiveDateTriggerContext('field');
        setListPanelOpen(false);
        setTimeout(() => setShowEffectiveDatePrompt(true), 50);
      }
      return;
    } else if (fieldId === 'taxabilityType') {
      setField('taxabilityType', val);
      if (val === 'Taxable') {
        // Taxable → enter GST Rate
        setActiveField('gstRate');
      } else {
        // Exempt / Nil Rated → skip GST Rate, continue to e-Way Bill Details
        setActiveField('interstateThresholdLimit');
      }
      return;
    } else if (fieldId === 'gstClassification') {
      const selectedClass = classifications.find((c) => c.name === val);
      setField('gstClassification', val);
      if (selectedClass) {
        if (selectedClass.hsn_sac_code) setField('hsnSacCode', selectedClass.hsn_sac_code);
        if (selectedClass.description) setField('description', selectedClass.description);
        if (selectedClass.taxability) setField('taxabilityType', selectedClass.taxability);
        if (selectedClass.gst_rate !== undefined) setField('gstRate', selectedClass.gst_rate);
      }
    } else if (fieldId === 'createHSNSummaryFor') {
      setField('createHSNSummaryFor', val);
      if (val === 'None') {
        // Minimum length row disappears — confirm effective date then continue
        setEffectiveDateTriggerContext('field');
        setListPanelOpen(false);
        setTimeout(() => setShowEffectiveDatePrompt(true), 50);
      } else {
        // Enter the Minimum length of HSN/SAC field
        setActiveField('minimumHSNLength');
      }
      return;
    } else if (TALLY_FIELDS_CONFIG[fieldId]?.type === 'yesno') {
      const isYes = val === 'Yes';
      setField(fieldId as keyof CompanyGSTDetails, isYes);

      if (fieldId === 'setStateWiseThresholdLimit' && isYes) {
        setListPanelOpen(false);
        setTimeout(() => setShowStateWiseModal(true), 50);
        return;
      }

      if (fieldId === 'gstReturnsConfigured' && isYes) {
        setListPanelOpen(false);
        setTimeout(() => setShowDownloadSettingsModal(true), 50);
        return;
      }

      if (fieldId === 'showGSTAdvances') {
        // Yes reveals the "Applicable from" date; No skips straight past it.
        setActiveField(isYes ? 'gstAdvancesApplicableFrom' : 'updateGSTStatus');
        return;
      }
    } else if (fieldId === 'minimumHSNLength') {
      setField('minimumHSNLength', Number(val) || 4);
      setEffectiveDateTriggerContext('field');
      setListPanelOpen(false);
      setTimeout(() => setShowEffectiveDatePrompt(true), 50);
      return;
    } else {
      setField(fieldId as keyof CompanyGSTDetails, val);
    }
    moveFocus(1);
  };

  /** Called when secondary modal successfully creates a classification */
  const handleSecondarySaveSuccess = (newClassName: string) => {
    setSecondaryOpen(false);
    // Refresh classifications list, then auto-select the new one
    if (companyId) {
      window.api.gstClassification.getAll(companyId).then((res) => {
        if (res.success && res.gstClassifications) {
          setClassifications(res.gstClassifications);
          // Auto-select the newly created classification
          setField('gstClassification', newClassName);
          const newClass = res.gstClassifications.find((c: any) => c.name === newClassName);
          if (newClass) {
            if (newClass.hsn_sac_code) setField('hsnSacCode', newClass.hsn_sac_code);
            if (newClass.description) setField('description', newClass.description);
            if (newClass.taxability) setField('taxabilityType', newClass.taxability);
            if (newClass.gst_rate !== undefined) setField('gstRate', newClass.gst_rate);
          }
          moveFocus(1);
        }
      });
    }
  };

  /** Validate + save, then close the modal on success */
  const handleSave = async () => {
    const ok = await saveDetails();
    if (ok) {
      setTimeout(() => onClose(), 800);
    } else {
      setShowAcceptPrompt(false);
    }
  };

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Reset UI state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveField('hsnSacType');
      setShowAcceptPrompt(false);
      setSecondaryOpen(false);
      setShowSlabOverlay(false);
      setShowEffectiveDatePrompt(false);
      setShowDownloadSettingsModal(false);
      setShowStateWiseModal(false);
      setError(null);
      setSuccess(null);
      setTimeout(() => modalRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Sync list panel when active field or dependent form values change
  // Paused while either secondary modal, slab overlay, or state-wise modal is open
  useEffect(() => {
    if (
      isOpen &&
      !secondaryOpen &&
      !showSlabOverlay &&
      !showEffectiveDatePrompt &&
      !showStateWiseModal &&
      !showDownloadSettingsModal
    ) {
      openDropdownPanel(activeField);
    }
    if (
      showSlabOverlay ||
      showEffectiveDatePrompt ||
      showStateWiseModal ||
      showDownloadSettingsModal
    ) {
      setListPanelOpen(false);
    }
  }, [
    activeField,
    form.hsnSacType,
    form.taxabilityType,
    gstRateDetails,
    classifications,
    secondaryOpen,
    showSlabOverlay,
    showEffectiveDatePrompt,
    showStateWiseModal,
    showDownloadSettingsModal,
  ]);

  // Global keyboard handler — paused while sub-modals are open
  useEffect(() => {
    if (
      !isOpen ||
      secondaryOpen ||
      showSlabOverlay ||
      showEffectiveDatePrompt ||
      showStateWiseModal ||
      showDownloadSettingsModal
    )
      return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC — close panels/prompts in reverse order
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

      // Ctrl+A / Alt+A — immediately show effective date prompt
      if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setEffectiveDateTriggerContext('save');
        setShowEffectiveDatePrompt(true);
        return;
      }

      // Accept prompt keyboard shortcuts
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

      // Y/N shortcut for Yes/No fields (TallyPrime style)
      const fieldConfig = TALLY_FIELDS_CONFIG[activeField];
      if (fieldConfig && fieldConfig.type === 'yesno') {
        const char = e.key.toLowerCase();
        if (char === 'y' || char === 'n') {
          e.preventDefault();
          handleSelectDropdownOption(activeField, char === 'y' ? 'Yes' : 'No');
          return;
        }
      }

      // List panel navigation
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
          handleSelectDropdownOption(activeField, listOptions[listSelectedIndex]);
          return;
        }
      }

      // Standard field navigation
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
    isOpen,
    secondaryOpen,
    showSlabOverlay,
    showEffectiveDatePrompt,
    showStateWiseModal,
    activeField,
    listPanelOpen,
    listOptions,
    listSelectedIndex,
    showAcceptPrompt,
    form,
    gstRateDetails,
    classifications,
  ]);

  // ── Early return ─────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className={`${
        asPage ? 'flex-1 h-full' : 'fixed inset-0 z-[9999]'
      } flex flex-col bg-white select-none text-zinc-950 text-sm`}
    >
      {/* ── Top title bar (matches every other master) ─────────────────────── */}
      <PageTitleBar title="Company GST Details" subtitle={selectedCompany?.name} />

      {/* ── Body: form column + right-side list panel ──────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Main form column */}
        <div
          ref={modalRef}
          tabIndex={-1}
          className="flex-1 flex flex-col overflow-y-auto outline-none relative bg-white"
        >
          {/* Section title */}
          <div className="text-center font-bold text-xs pt-4 pb-2 border-b border-zinc-200 tracking-wide text-zinc-900">
            <span className="underline decoration-1 decoration-zinc-800 underline-offset-4">
              GST Rate and Other Details
            </span>
          </div>

          {/* Form fields — both columns */}
          <GSTDetailsFormFields
            form={form}
            gstRateDetails={gstRateDetails}
            activeField={activeField}
            setActiveField={setActiveField}
            setField={setField}
            slabRows={form.slabRates}
            onOpenSlab={() => setShowSlabOverlay(true)}
            hasGSTRegistrations={hasGSTRegistrations}
            onSelectValue={handleSelectDropdownOption}
          />

          {/* Error banner */}
          {error && (
            <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
          )}

          {/* Success banner */}
          {success && <NotificationBanner type="success" message={success} />}

          {/* Accept? prompt — positioned absolute inside the form column */}
          {showAcceptPrompt && (
            <GSTDetailsAcceptPrompt
              loading={loading}
              onAccept={handleSave}
              onCancel={() => {
                setShowAcceptPrompt(false);
                const fields = getFocusableFields();
                setActiveField(fields[fields.length - 1]);
              }}
            />
          )}
        </div>

        {/* ── Right-side list/dropdown panel ──────────────────────────────── */}
        {listPanelOpen && listOptions.length > 0 && (
          <GSTDetailsListPanel
            title={listTitle}
            options={listOptions}
            selectedIndex={listSelectedIndex}
            onSelect={(val) => handleSelectDropdownOption(activeField, val)}
          />
        )}
      </div>

      {/* ── Bottom footer (shared master footer) ───────────────────────────── */}
      <MasterFormFooter
        onCancel={onClose}
        onSubmit={() => {
          setEffectiveDateTriggerContext('save');
          setShowEffectiveDatePrompt(true);
        }}
        cancelLabel="Quit"
        submitLabel="Accept"
        loading={loading}
      />

      {/* ── Secondary Modal: GST Classification Creation ─────────────────── */}
      <GSTClassificationSecondaryModal
        isOpen={secondaryOpen}
        companyId={companyId ?? 0}
        onClose={() => setSecondaryOpen(false)}
        onSaveSuccess={handleSecondarySaveSuccess}
      />

      {/* ── Slab-Based Rate Details overlay ──────────────────────────────── */}
      <SlabBasedRateDetails
        isOpen={showSlabOverlay}
        initialRows={form.slabRates || []}
        onSave={(rows) => {
          setField('slabRates', rows);
          // Move focus forward after closing slab
          const fields = getFocusableFields();
          const idx = fields.indexOf('gstRateDetails');
          if (idx >= 0 && idx + 1 < fields.length) {
            setActiveField(fields[idx + 1]);
          }
        }}
        onClose={() => setShowSlabOverlay(false)}
      />

      {/* ── Effective Date Prompt overlay ─────────────────────────────────── */}
      <GSTEffectiveDatePrompt
        isOpen={showEffectiveDatePrompt}
        onAccept={(dateStr) => {
          setShowEffectiveDatePrompt(false);
          if (effectiveDateTriggerContext === 'field') {
            moveFocus(1, true);
          } else {
            setField('effectiveDate', dateStr);
            setShowAcceptPrompt(true);
          }
        }}
        onClose={() => setShowEffectiveDatePrompt(false)}
      />

      {/* ── State-wise Threshold Limit overlay ───────────────────────────── */}
      <StateWiseThresholdLimitModal
        isOpen={showStateWiseModal}
        initialLimits={form.stateWiseLimits || []}
        onSave={(limits) => {
          setField('stateWiseLimits', limits);
        }}
        onClose={() => {
          setShowStateWiseModal(false);
          moveFocus(1);
        }}
      />

      {/* ── Download Settings overlay ────────────────────────────────────── */}
      <DownloadSettingsModal
        isOpen={showDownloadSettingsModal}
        registrations={registrations}
        initialRegistration={form.downloadGSTRegistration || ''}
        initialReturnType={form.downloadReturnType || 'All Returns'}
        onSave={(reg, returnType) => {
          setField('downloadGSTRegistration', reg);
          setField('downloadReturnType', returnType);
          moveFocus(1, true);
        }}
        onClose={() => {
          setShowDownloadSettingsModal(false);
        }}
      />
    </div>
  );
}
