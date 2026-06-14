// Thin orchestrator for the Company GST Details dialog.
// Manages keyboard navigation, dropdown panel state, and accept-prompt state.
// Delegates rendering to focused sub-components.

import { useEffect, useState, useRef } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useGSTDetails } from "./hooks/useGSTDetails";
import type { CompanyGSTDetails } from "@/types/entities/CompanyGSTDetails";
import GSTDetailsFormFields from "./components/GSTDetailsFormFields";
import GSTDetailsListPanel from "./components/GSTDetailsListPanel";
import GSTDetailsAcceptPrompt from "./components/GSTDetailsAcceptPrompt";
import GSTClassificationSecondaryModal from "./components/GSTClassificationSecondaryModal";
import SlabBasedRateDetails, { type SlabRow } from "./components/SlabBasedRateDetails";
import GSTEffectiveDatePrompt from "./components/GSTEffectiveDatePrompt";
import { TALLY_FIELDS_CONFIG } from "./config/dropdownConfig";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface CompanyGSTDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CompanyGSTDetailsModal({ isOpen, onClose }: CompanyGSTDetailsModalProps) {
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
  } = useGSTDetails({ companyId, isOpen });

  // ── UI state ────────────────────────────────────────────────────────────────
  const [activeField, setActiveField] = useState<string>("hsnSacType");
  const [listPanelOpen, setListPanelOpen] = useState(false);
  const [listOptions, setListOptions] = useState<string[]>([]);
  const [listTitle, setListTitle] = useState("");
  const [listSelectedIndex, setListSelectedIndex] = useState(0);
  const [showAcceptPrompt, setShowAcceptPrompt] = useState(false);
  const [classifications, setClassifications] = useState<any[]>([]);
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [showSlabOverlay, setShowSlabOverlay] = useState(false);
  const [showEffectiveDatePrompt, setShowEffectiveDatePrompt] = useState(false);
  const [slabRows, setSlabRows] = useState<SlabRow[]>([]);

  const modalRef = useRef<HTMLDivElement>(null);

  // ── Load classifications ─────────────────────────────────────────────────────

  const fetchClassifications = () => {
    if (companyId) {
      window.api.gstClassification.getAll(companyId).then((res) => {
        if (res.success && res.gstClassifications) {
          setClassifications(res.gstClassifications);
        }
      });
    }
  };

  useEffect(() => {
    if (isOpen && companyId) {
      fetchClassifications();
    }
  }, [isOpen, companyId]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Returns the ordered list of focusable field IDs given current form state */
  const getFocusableFields = (): string[] => {
    const list: string[] = ["hsnSacType"];

    // Classification under HSN/SAC section — triggered by hsnSacType
    if (form.hsnSacType === "Use GST Classification") {
      list.push("gstClassification");
    }

    if (form.hsnSacType === "Specify Details Here") {
      list.push("hsnSacCode", "description");
    }

    list.push("gstRateDetails");

    // Classification under GST Rate section — triggered by gstRateDetails
    if (gstRateDetails === "Use GST Classification") {
      list.push("gstClassification");
    }

    // Only show taxability/rate when "Specify Details Here" — not for slab-based
    if (gstRateDetails === "Specify Details Here") {
      list.push("taxabilityType");
      if (form.taxabilityType === "Taxable") {
        list.push("gstRate");
      }
    }

    list.push(
      "interstateThresholdLimit",
      "intrastateThresholdLimit",
      "thresholdLimitIncludes",
      "createHSNSummaryFor"
    );

    if (form.createHSNSummaryFor !== "None") {
      list.push("minimumHSNLength");
    }

    list.push(
      "showGSTAdvances",
      "updateGSTStatus",
      "gstReturnsConfigured"
    );
    return list;
  };

  /** Opens the right-side list panel for dropdown fields */
  const openDropdownPanel = (fieldId: string) => {
    const config = TALLY_FIELDS_CONFIG[fieldId];
    if (!config || config.type === "input") {
      setListPanelOpen(false);
      return;
    }

    let options = config.options ? [...config.options] : [];
    let title = config.title || "";

    if (fieldId === "gstClassification") {
      // Preset names that should never appear in the user-facing classifications list
      const PRESET_NAMES = new Set([
        "GST 0%", "GST 5%", "GST 12%", "GST 18%", "GST 28%",
        "Exempt", "Nil Rated", "Non GST",
      ]);
      const userClassifications = classifications
        .map((c) => c.name || "")
        .filter((name) => name && !PRESET_NAMES.has(name));
      options = ["Create", ...userClassifications];
      title = "List of Classifications";
    }

    setListOptions(options);
    setListTitle(title);
    setListPanelOpen(options.length > 0);

    // Resolve the current value for pre-selection
    let currentValue = "";
    if (fieldId === "gstRateDetails") {
      currentValue = gstRateDetails;
    } else if (fieldId === "gstClassification") {
      currentValue = form.gstClassification || "";
    } else if (config.type === "yesno") {
      currentValue = form[fieldId as keyof CompanyGSTDetails] ? "Yes" : "No";
    } else {
      currentValue = String(form[fieldId as keyof CompanyGSTDetails] ?? "");
    }

    const idx = options.indexOf(currentValue);
    setListSelectedIndex(idx >= 0 ? idx : 0);
  };

  /** Move keyboard focus one step forward (+1) or backward (-1) */
  const moveFocus = (direction: 1 | -1) => {
    const fields = getFocusableFields();
    let index = fields.indexOf(activeField);
    if (index === -1) {
      setActiveField(fields[0]);
      return;
    }
    index += direction;
    if (index >= fields.length) {
      setShowAcceptPrompt(true);
    } else if (index < 0) {
      setActiveField(fields[0]);
    } else {
      setActiveField(fields[index]);
    }
  };

  /** Apply a value chosen from the list panel to the corresponding field */
  const handleSelectDropdownOption = (fieldId: string, val: string) => {
    // Special case: "Create" opens the secondary classification creation screen
    if (fieldId === "gstClassification" && val === "Create") {
      setListPanelOpen(false);
      setSecondaryOpen(true);
      return;
    }

    if (fieldId === "hsnSacType") {
      setField("hsnSacType", val);
      if (val === "Not Defined") {
        setField("hsnSacCode", "");
        setField("description", "");
      } else if (val === "Specify in Voucher") {
        setListPanelOpen(false);
        setTimeout(() => setShowEffectiveDatePrompt(true), 50);
        return;
      }
    } else if (fieldId === "gstRateDetails") {
      setGstRateDetails(val);
      if (val === "Not Defined") {
        setField("taxabilityType", "Not Defined");
        setField("gstRate", 0);
      } else if (val === "Specify Details Here") {
        setField("taxabilityType", "Taxable");
      } else if (val === "Specify Slab-Based Rates") {
        // Open slab overlay immediately — do NOT moveFocus
        setListPanelOpen(false);
        setTimeout(() => setShowSlabOverlay(true), 50);
        return;
      } else if (val === "Use GST Classification") {
        // Jump directly to gstClassification — moveFocus would use stale state
        // and miss the field since gstRateDetails hasn't re-rendered yet
        setActiveField("gstClassification");
        return;
      } else if (val === "Specify in Voucher") {
        setListPanelOpen(false);
        setTimeout(() => setShowEffectiveDatePrompt(true), 50);
        return;
      }
    } else if (fieldId === "gstClassification") {
      const selectedClass = classifications.find((c) => c.name === val);
      setField("gstClassification", val);
      if (selectedClass) {
        if (selectedClass.hsn_sac_code) setField("hsnSacCode", selectedClass.hsn_sac_code);
        if (selectedClass.description) setField("description", selectedClass.description);
        if (selectedClass.taxability) setField("taxabilityType", selectedClass.taxability);
        if (selectedClass.gst_rate !== undefined) setField("gstRate", selectedClass.gst_rate);
      }
    } else if (fieldId === "createHSNSummaryFor") {
      setField("createHSNSummaryFor", val);
      if (val === "None") {
        setListPanelOpen(false);
        setTimeout(() => setShowEffectiveDatePrompt(true), 50);
        return;
      }
    } else if (TALLY_FIELDS_CONFIG[fieldId]?.type === "yesno") {
      setField(fieldId as keyof CompanyGSTDetails, val === "Yes");
    } else if (fieldId === "minimumHSNLength") {
      setField("minimumHSNLength", Number(val) || 4);
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
          setField("gstClassification", newClassName);
          const newClass = res.gstClassifications.find((c: any) => c.name === newClassName);
          if (newClass) {
            if (newClass.hsn_sac_code) setField("hsnSacCode", newClass.hsn_sac_code);
            if (newClass.description) setField("description", newClass.description);
            if (newClass.taxability) setField("taxabilityType", newClass.taxability);
            if (newClass.gst_rate !== undefined) setField("gstRate", newClass.gst_rate);
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
      setActiveField("hsnSacType");
      setShowAcceptPrompt(false);
      setSecondaryOpen(false);
      setShowSlabOverlay(false);
      setShowEffectiveDatePrompt(false);
      setSlabRows([]);
      setError(null);
      setSuccess(null);
      setTimeout(() => modalRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Sync list panel when active field or dependent form values change
  // Paused while either secondary modal or slab overlay is open
  useEffect(() => {
    if (isOpen && !secondaryOpen && !showSlabOverlay && !showEffectiveDatePrompt) {
      openDropdownPanel(activeField);
    }
    if (showSlabOverlay || showEffectiveDatePrompt) {
      setListPanelOpen(false);
    }
  }, [activeField, form.hsnSacType, form.taxabilityType, gstRateDetails, classifications, secondaryOpen, showSlabOverlay, showEffectiveDatePrompt]);

  // Global keyboard handler — paused while sub-modals are open
  useEffect(() => {
    if (!isOpen || secondaryOpen || showSlabOverlay || showEffectiveDatePrompt) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC — close panels/prompts in reverse order
      if (e.key === "Escape") {
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

      // Ctrl+A / Alt+A — immediately show accept prompt
      if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setShowAcceptPrompt(true);
        return;
      }

      // Accept prompt keyboard shortcuts
      if (showAcceptPrompt) {
        const k = e.key.toLowerCase();
        if (k === "y" || e.key === "Enter") {
          e.preventDefault();
          handleSave();
        } else if (k === "n") {
          e.preventDefault();
          setShowAcceptPrompt(false);
          const fields = getFocusableFields();
          setActiveField(fields[fields.length - 1]);
        }
        return;
      }

      // Y/N shortcut for Yes/No fields (TallyPrime style)
      const fieldConfig = TALLY_FIELDS_CONFIG[activeField];
      if (fieldConfig && fieldConfig.type === "yesno") {
        const char = e.key.toLowerCase();
        if (char === "y" || char === "n") {
          e.preventDefault();
          handleSelectDropdownOption(activeField, char === "y" ? "Yes" : "No");
          return;
        }
      }

      // List panel navigation
      if (listPanelOpen && listOptions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setListSelectedIndex((prev) => (prev + 1) % listOptions.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setListSelectedIndex((prev) => (prev - 1 + listOptions.length) % listOptions.length);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          handleSelectDropdownOption(activeField, listOptions[listSelectedIndex]);
          return;
        }
      }

      // Standard field navigation
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        moveFocus(e.shiftKey ? -1 : 1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        moveFocus(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveFocus(-1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    secondaryOpen,
    showSlabOverlay,
    showEffectiveDatePrompt,
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
    <div className="fixed inset-0 bg-zinc-900/40 z-[9999] flex items-center justify-center backdrop-blur-[1px] select-none text-zinc-950 font-mono text-[11px]">
      <div
        ref={modalRef}
        tabIndex={-1}
        className="outline-none flex gap-4 max-h-[95vh] items-stretch animate-fade-in"
      >
        {/* ── Main dialog box ──────────────────────────────────────────────── */}
        <div className="bg-white border border-zinc-400 w-[900px] flex flex-col shadow-2xl overflow-hidden relative">

          {/* Dialog title */}
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
            slabRows={slabRows}
            onOpenSlab={() => setShowSlabOverlay(true)}
          />

          {/* Error banner */}
          {error && (
            <div className="px-6 py-2 border-t border-red-200 bg-red-50 text-red-700 text-xs font-bold font-sans flex justify-between items-center">
              <span>• {error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700 font-bold font-sans"
              >
                &times;
              </button>
            </div>
          )}

          {/* Success banner */}
          {success && (
            <div className="px-6 py-2 border-t border-green-200 bg-green-50 text-green-700 text-xs font-bold font-sans">
              <span>• {success}</span>
            </div>
          )}

          {/* Footer — TallyPrime-style action bar */}
          <div className="px-6 py-2 border-t border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0 font-sans text-[10px] text-zinc-500">
            <div className="flex gap-4">
              <span>
                <span className="underline font-bold text-zinc-700">Q</span>: Quit
              </span>
              <span>
                <span className="underline font-bold text-zinc-700">A</span>: Accept
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium"
              >
                Quit
              </button>
              <button
                onClick={() => setShowAcceptPrompt(true)}
                disabled={loading}
                className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium"
              >
                {loading ? "Saving..." : "Accept"}
              </button>
            </div>
          </div>

          {/* Accept? prompt — positioned absolute inside the dialog */}
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
        initialRows={slabRows}
        onSave={(rows) => {
          setSlabRows(rows);
          // Move focus forward after closing slab
          const fields = getFocusableFields();
          const idx = fields.indexOf("gstRateDetails");
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
          // For now, we don't persist the effective date in the DB as there is no column,
          // but we accept it and advance focus.
          setShowEffectiveDatePrompt(false);
          moveFocus(1);
        }}
        onClose={() => setShowEffectiveDatePrompt(false)}
      />
    </div>
  );
}
