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

// ─────────────────────────────────────────────────────────────────────────────
// Dropdown configuration: maps field IDs → list title + options
// ─────────────────────────────────────────────────────────────────────────────

const DROPDOWN_CONFIGS: Record<string, { title: string; options: string[] }> = {
  hsnSacType: {
    title: "List of HSN/SAC Details",
    options: ["Not Defined", "Goods", "Services"],
  },
  gstRateDetails: {
    title: "GST Rate Details",
    options: ["Not Defined", "Specified Here"],
  },
  taxabilityType: {
    title: "Taxability Type",
    options: ["Taxable", "Exempt", "Nil Rated", "Non GST"],
  },
  thresholdLimitIncludes: {
    title: "Threshold Limit Includes",
    options: ["Value of Invoice", "Taxable Value"],
  },
  createHSNSummaryFor: {
    title: "Create HSN/SAC Summary For",
    options: ["All Sections", "Outward Supplies", "Inward Supplies"],
  },
  showGSTAdvances: {
    title: "Show GST Advances...",
    options: ["No", "Yes"],
  },
  updateGSTStatus: {
    title: "Update GST Status...",
    options: ["No", "Yes"],
  },
  gstReturnsConfigured: {
    title: "Set/Alter details...",
    options: ["No", "Yes"],
  },
};

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

  const modalRef = useRef<HTMLDivElement>(null);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Returns the ordered list of focusable field IDs given current form state */
  const getFocusableFields = (): string[] => {
    const list: string[] = ["hsnSacType"];
    if (form.hsnSacType !== "Not Defined") {
      list.push("hsnSacCode", "description");
    }
    list.push("gstRateDetails");
    if (gstRateDetails === "Specified Here") {
      list.push("taxabilityType");
      if (form.taxabilityType === "Taxable") {
        list.push("gstRate");
      }
    }
    list.push(
      "interstateThresholdLimit",
      "intrastateThresholdLimit",
      "thresholdLimitIncludes",
      "createHSNSummaryFor",
      "minimumHSNLength",
      "showGSTAdvances",
      "updateGSTStatus",
      "gstReturnsConfigured"
    );
    return list;
  };

  /** Opens the right-side list panel for dropdown fields */
  const openDropdownPanel = (fieldId: string) => {
    const config = DROPDOWN_CONFIGS[fieldId];
    if (!config) {
      setListPanelOpen(false);
      return;
    }

    setListOptions(config.options);
    setListTitle(config.title);
    setListPanelOpen(true);

    // Resolve the current value for this field to pre-select in the panel
    let currentValue = "";
    if (fieldId === "gstRateDetails") {
      currentValue = gstRateDetails;
    } else if (["showGSTAdvances", "updateGSTStatus", "gstReturnsConfigured"].includes(fieldId)) {
      currentValue = form[fieldId as keyof CompanyGSTDetails] ? "Yes" : "No";
    } else {
      currentValue = String(form[fieldId as keyof CompanyGSTDetails] ?? "");
    }

    const idx = config.options.indexOf(currentValue);
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
    if (fieldId === "gstRateDetails") {
      setGstRateDetails(val as "Not Defined" | "Specified Here");
      if (val === "Not Defined") {
        setField("taxabilityType", "Not Defined");
        setField("gstRate", 0);
      } else {
        setField("taxabilityType", "Taxable");
      }
    } else if (["showGSTAdvances", "updateGSTStatus", "gstReturnsConfigured"].includes(fieldId)) {
      setField(fieldId as keyof CompanyGSTDetails, val === "Yes");
    } else {
      setField(fieldId as keyof CompanyGSTDetails, val);
    }
    moveFocus(1);
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
      setError(null);
      setSuccess(null);
      openDropdownPanel("hsnSacType");
      setTimeout(() => modalRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Sync list panel when active field or dependent form values change
  useEffect(() => {
    if (isOpen) {
      openDropdownPanel(activeField);
    }
  }, [activeField, form.hsnSacType, form.taxabilityType, gstRateDetails]);

  // Global keyboard handler
  useEffect(() => {
    if (!isOpen) return;

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

      // List panel navigation
      if (listPanelOpen) {
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
    activeField,
    listPanelOpen,
    listOptions,
    listSelectedIndex,
    showAcceptPrompt,
    form,
    gstRateDetails,
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

          {/* Footer buttons */}
          <div className="px-6 py-3 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0 font-sans">
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
    </div>
  );
}
