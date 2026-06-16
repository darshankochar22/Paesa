import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, FormRow, RightActionPanel } from "@/components/ui";
import { useTDSDetails } from "./hooks/useTDSDetails";

const activeClass = "bg-[#ffea5d] border-[#e6c300] text-zinc-950 px-2 py-0.5 outline-none border w-64 font-mono font-bold text-xs";
const inactiveClass = "border-transparent bg-transparent text-zinc-900 px-2 py-0.5 outline-none border w-64 font-mono font-bold text-xs";
const getSelectCls = (isActive: boolean) =>
  `${isActive ? activeClass : inactiveClass}`;
const getInputCls = (isActive: boolean) =>
  `${isActive ? activeClass : inactiveClass}`;

interface PersonResponsibleModalProps {
  form: any;
  setField: (field: any, val: any) => void;
  onSubmit: () => void;
  onClose: () => void;
}

function PersonResponsibleModal({
  form,
  setField,
  onSubmit,
  onClose,
}: PersonResponsibleModalProps) {
  const [activeField, setActiveField] = useState("name");
  const fields = ["name", "designation", "pan", "phone", "email"];

  const nameRef = useRef<HTMLInputElement>(null);
  const designationRef = useRef<HTMLInputElement>(null);
  const panRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refMap: Record<string, React.RefObject<HTMLInputElement | null>> = {
      name: nameRef,
      designation: designationRef,
      pan: panRef,
      phone: phoneRef,
      email: emailRef,
    };
    refMap[activeField]?.current?.focus();
  }, [activeField]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const idx = fields.indexOf(activeField);
      if (idx === -1) return;

      if (e.key === "Enter" || e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        if (idx === fields.length - 1) {
          onSubmit();
        } else {
          setActiveField(fields[idx + 1]);
        }
        return;
      }
      if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault();
        if (idx > 0) {
          setActiveField(fields[idx - 1]);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeField, onSubmit, onClose]);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999] font-mono text-[11px]">
      <div className="bg-white border-4 border-double border-zinc-400 shadow-2xl w-[550px] p-5">
        <div className="text-center font-bold text-xs pb-3 border-b border-zinc-200 uppercase tracking-wide">
          Person Responsible Details
        </div>

        <div className="py-4 space-y-2 relative">
          <FormRow label="Name" labelWidth="w-40">
            <input
              ref={nameRef}
              className={getInputCls(activeField === "name")}
              value={form.personResponsibleName}
              onChange={(e) => setField("personResponsibleName", e.target.value)}
              onFocus={() => setActiveField("name")}
            />
          </FormRow>

          <FormRow label="Designation" labelWidth="w-40">
            <input
              ref={designationRef}
              className={getInputCls(activeField === "designation")}
              value={form.personResponsibleDesignation}
              onChange={(e) => setField("personResponsibleDesignation", e.target.value)}
              onFocus={() => setActiveField("designation")}
            />
          </FormRow>

          <FormRow label="PAN" labelWidth="w-40">
            <input
              ref={panRef}
              className={getInputCls(activeField === "pan")}
              value={form.personResponsiblePan}
              onChange={(e) => setField("personResponsiblePan", e.target.value.toUpperCase())}
              maxLength={10}
              onFocus={() => setActiveField("pan")}
              placeholder="e.g. ABCDE1234F"
            />
          </FormRow>

          <FormRow label="Mobile / Phone" labelWidth="w-40">
            <input
              ref={phoneRef}
              className={getInputCls(activeField === "phone")}
              value={form.personResponsiblePhone}
              onChange={(e) => setField("personResponsiblePhone", e.target.value)}
              onFocus={() => setActiveField("phone")}
            />
          </FormRow>

          <FormRow label="Email" labelWidth="w-40">
            <input
              ref={emailRef}
              className={getInputCls(activeField === "email")}
              value={form.personResponsibleEmail}
              onChange={(e) => setField("personResponsibleEmail", e.target.value)}
              onFocus={() => setActiveField("email")}
            />
          </FormRow>
        </div>

        <div className="border-t border-zinc-200 pt-3 flex justify-end gap-3 shrink-0 font-sans">
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] px-4 py-1 border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="text-[11px] px-4 py-1 border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold focus:outline-none"
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}

const FIELDS = [
  "tanRegNumber",
  "tan",
  "deductorType",
  "deductorBranch",
  "setAlterPersonResponsible",
  "ignoreItExemption",
  "activateTdsForItems",
];

export default function TDSDetailsCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const {
    form,
    setField,
    loading,
    error,
    setError,
    success,
    setSuccess,
    saveDetails,
  } = useTDSDetails({
    companyId,
    onSaveSuccess: () => {
      setTimeout(() => navigate("/master/create"), 1000);
    },
  });

  const [showPersonModal, setShowPersonModal] = useState(false);
  const [activeField, setActiveField] = useState("tanRegNumber");
  const [showAccept, setShowAccept] = useState(false);

  const tanRegNumberRef = useRef<HTMLInputElement>(null);
  const tanRef = useRef<HTMLInputElement>(null);
  const deductorTypeRef = useRef<HTMLSelectElement>(null);
  const deductorBranchRef = useRef<HTMLInputElement>(null);
  const setAlterPersonResponsibleRef = useRef<HTMLSelectElement>(null);
  const ignoreItExemptionRef = useRef<HTMLSelectElement>(null);
  const activateTdsForItemsRef = useRef<HTMLSelectElement>(null);

  const handlePersonModalSubmit = () => {
    setShowPersonModal(false);
    setActiveField("ignoreItExemption");
  };

  const handlePersonModalClose = () => {
    setShowPersonModal(false);
    setField("setAlterPersonResponsible", false);
    setActiveField("setAlterPersonResponsible");
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (showPersonModal) return;

      if (showAccept) {
        const key = e.key.toLowerCase();
        if (key === "y" || e.key === "Enter") {
          e.preventDefault();
          setShowAccept(false);
          saveDetails();
        } else if (key === "n" || e.key === "Escape") {
          e.preventDefault();
          setShowAccept(false);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/master/create");
        return;
      }

      if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setShowAccept(true);
        return;
      }

      const idx = FIELDS.indexOf(activeField);
      if (idx !== -1) {
        if (e.key === "Enter" || e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
          e.preventDefault();
          if (activeField === "setAlterPersonResponsible" && form.setAlterPersonResponsible) {
            setShowPersonModal(true);
          } else if (idx === FIELDS.length - 1) {
            setShowAccept(true);
          } else {
            setActiveField(FIELDS[idx + 1]);
          }
          return;
        }
        if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
          e.preventDefault();
          if (idx > 0) {
            setActiveField(FIELDS[idx - 1]);
          }
          return;
        }

        if (
          activeField === "setAlterPersonResponsible" ||
          activeField === "ignoreItExemption" ||
          activeField === "activateTdsForItems"
        ) {
          const key = e.key.toLowerCase();
          if (key === "y" || key === "n") {
            e.preventDefault();
            const val = key === "y";
            setField(activeField, val);
            if (activeField === "setAlterPersonResponsible" && val) {
              setShowPersonModal(true);
            } else if (idx === FIELDS.length - 1) {
              setShowAccept(true);
            } else {
              setActiveField(FIELDS[idx + 1]);
            }
          }
        }
      }
    },
    [showPersonModal, showAccept, activeField, form.setAlterPersonResponsible, saveDetails, navigate, setField]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (showPersonModal || showAccept) return;

    const refMap: Record<string, React.RefObject<HTMLInputElement | HTMLSelectElement | null>> = {
      tanRegNumber: tanRegNumberRef,
      tan: tanRef,
      deductorType: deductorTypeRef,
      deductorBranch: deductorBranchRef,
      setAlterPersonResponsible: setAlterPersonResponsibleRef,
      ignoreItExemption: ignoreItExemptionRef,
      activateTdsForItems: activateTdsForItemsRef,
    };
    refMap[activeField]?.current?.focus();
  }, [activeField, showPersonModal, showAccept]);

  const actions = [
    { key: "Alt+A", label: "Accept", onClick: () => setShowAccept(true) },
    { key: "Esc", label: "Quit", onClick: () => navigate("/master/create") },
  ];

  return (
    <div className="flex-grow flex flex-col h-full bg-white select-none text-zinc-950 relative">
      <PageTitleBar title="Company TDS Deductor Details" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-4 py-2 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center shrink-0 font-sans">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-4 py-2 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center shrink-0 font-sans">
          <span>• {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 font-bold">&times;</button>
        </div>
      )}

      <div className="flex-grow flex min-h-0 relative">
        <div className="flex-grow overflow-y-auto p-6 bg-zinc-50 font-mono text-zinc-800 text-[11px]">
          <div className="max-w-2xl mx-auto bg-white border border-zinc-200 rounded shadow-sm p-6 space-y-4">
            <div className="text-center font-bold text-xs border-b border-zinc-200 pb-3 mb-4 tracking-wide text-zinc-900 uppercase">
              Company TDS Deductor Details
            </div>

            <div className="space-y-1.5">
              <FormRow label="TAN registration number" labelWidth="w-[340px]">
                <input
                  ref={tanRegNumberRef}
                  className={getInputCls(activeField === "tanRegNumber")}
                  value={form.tanRegNumber}
                  onChange={(e) => setField("tanRegNumber", e.target.value)}
                  onFocus={() => setActiveField("tanRegNumber")}
                  placeholder="e.g. TANR12345A"
                />
              </FormRow>

              <FormRow label="Tax deduction and collection Account Number (TAN)" labelWidth="w-[340px]">
                <input
                  ref={tanRef}
                  className={getInputCls(activeField === "tan")}
                  value={form.tan}
                  onChange={(e) => setField("tan", e.target.value.toUpperCase())}
                  onFocus={() => setActiveField("tan")}
                  placeholder="e.g. BLRP01234D"
                  maxLength={10}
                />
              </FormRow>

              <FormRow label="Deductor type" labelWidth="w-[340px]">
                <select
                  ref={deductorTypeRef}
                  className={getSelectCls(activeField === "deductorType")}
                  value={form.deductorType}
                  onChange={(e) => setField("deductorType", e.target.value)}
                  onFocus={() => setActiveField("deductorType")}
                >
                  <option value="Company">Company</option>
                  <option value="Individual/HUF">Individual/HUF</option>
                </select>
              </FormRow>

              <FormRow label="Deductor branch/division" labelWidth="w-[340px]">
                <input
                  ref={deductorBranchRef}
                  className={getInputCls(activeField === "deductorBranch")}
                  value={form.deductorBranch}
                  onChange={(e) => setField("deductorBranch", e.target.value)}
                  onFocus={() => setActiveField("deductorBranch")}
                  placeholder="e.g. Bangalore South"
                />
              </FormRow>

              <FormRow label="Set/alter details of person responsible" labelWidth="w-[340px]">
                <select
                  ref={setAlterPersonResponsibleRef}
                  className={getSelectCls(activeField === "setAlterPersonResponsible")}
                  value={form.setAlterPersonResponsible ? "Yes" : "No"}
                  onChange={(e) => {
                    const val = e.target.value === "Yes";
                    setField("setAlterPersonResponsible", val);
                    if (val) {
                      setShowPersonModal(true);
                    }
                  }}
                  onFocus={() => setActiveField("setAlterPersonResponsible")}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </FormRow>
            </div>

            <div className="text-center font-bold text-xs py-2 my-2 text-zinc-900 border-t border-zinc-100 tracking-wide uppercase">
              Rate & Exemption Details
            </div>

            <div className="space-y-1.5">
              <FormRow label="Ignore IT exemption limit for TDS deduction" labelWidth="w-[340px]">
                <select
                  ref={ignoreItExemptionRef}
                  className={getSelectCls(activeField === "ignoreItExemption")}
                  value={form.ignoreItExemption ? "Yes" : "No"}
                  onChange={(e) => setField("ignoreItExemption", e.target.value === "Yes")}
                  onFocus={() => setActiveField("ignoreItExemption")}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </FormRow>

              <FormRow label="Activate TDS for stock items" labelWidth="w-[340px]">
                <select
                  ref={activateTdsForItemsRef}
                  className={getSelectCls(activeField === "activateTdsForItems")}
                  value={form.activateTdsForItems ? "Yes" : "No"}
                  onChange={(e) => setField("activateTdsForItems", e.target.value === "Yes")}
                  onFocus={() => setActiveField("activateTdsForItems")}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </FormRow>
            </div>
          </div>
        </div>

        <RightActionPanel actions={actions} />
      </div>

      {showPersonModal && (
        <PersonResponsibleModal
          form={form}
          setField={setField}
          onSubmit={handlePersonModalSubmit}
          onClose={handlePersonModalClose}
        />
      )}

      {showAccept && (
        <div className="absolute bottom-16 right-72 bg-white border-2 border-[#4c90e2] w-[165px] rounded shadow-2xl p-3 flex flex-col items-center z-[10000] font-mono animate-fade-in text-zinc-950">
          <h4 className="font-bold text-[11px] mb-3">Accept?</h4>
          <div className="flex items-center gap-3 w-full justify-center">
            <button
              onClick={() => {
                setShowAccept(false);
                saveDetails();
              }}
              disabled={loading}
              className="text-[11px] px-3 py-0.5 border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold focus:outline-none min-w-[55px] text-center disabled:opacity-50 transition-colors cursor-pointer"
            >
              Yes
            </button>
            <button
              onClick={() => setShowAccept(false)}
              className="text-[11px] px-3 py-0.5 border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold focus:outline-none min-w-[55px] text-center transition-colors cursor-pointer"
            >
              No
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-zinc-200 p-3 flex justify-end bg-zinc-50 shrink-0 font-sans">
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/master/create")}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium"
          >
            Quit
          </button>
          <button
            onClick={() => setShowAccept(true)}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}