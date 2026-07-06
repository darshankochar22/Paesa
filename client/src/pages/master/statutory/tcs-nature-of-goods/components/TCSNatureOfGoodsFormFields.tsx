import React, { useEffect, useRef, useState } from "react";
import type { FormData } from "../hooks/useTCSNatureOfGoodsForm";

interface TCSNatureOfGoodsFormFieldsProps {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  setField: (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  isPredefined?: boolean;
  mode: "create" | "alter";
  onSubmitPrompt: () => void;
}

const activeClass = "bg-[#ffea5d] border-[#e6c300] text-zinc-950 px-2 py-0.5 outline-none border w-full font-mono font-bold text-xs uppercase";
const inactiveClass = "border-transparent bg-transparent text-zinc-900 px-2 py-0.5 outline-none border w-full font-mono font-bold text-xs uppercase";
const selectActiveClass = "bg-[#ffea5d] border-[#e6c300] text-zinc-950 px-1.5 py-0.5 outline-none border w-24 font-mono font-bold text-xs appearance-none";
const selectInactiveClass = "border-transparent bg-transparent text-zinc-900 px-1.5 py-0.5 outline-none border w-24 font-mono font-bold text-xs appearance-none";

const getFocusableFields = (form: FormData) => {
  const showZeroRated =
    Number(form.rate_individual_with_pan || 0) === 0 &&
    Number(form.rate_individual_without_pan || 0) === 0 &&
    Number(form.rate_other_with_pan || 0) === 0 &&
    Number(form.rate_other_without_pan || 0) === 0;

  const fields: string[] = ["name", "section", "payment_code"];
  
  const isZero = form.is_zero_rated === "Yes";
  if (!isZero) {
    fields.push(
      "rate_individual_with_pan",
      "rate_individual_without_pan",
      "rate_other_with_pan",
      "rate_other_without_pan"
    );
  }

  if (showZeroRated) {
    fields.push("is_zero_rated");
  }

  fields.push("tax_on_receipt_or_realization", "threshold_level");
  return fields;
};

export default function TCSNatureOfGoodsFormFields({
  form,
  setForm,
  setField,
  isPredefined = false,
  mode,
  onSubmitPrompt,
}: TCSNatureOfGoodsFormFieldsProps) {
  const [activeField, setActiveField] = useState<string>("name");

  // Input element refs
  const nameRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLInputElement>(null);
  const paymentCodeRef = useRef<HTMLInputElement>(null);
  const rateIndWithPanRef = useRef<HTMLInputElement>(null);
  const rateIndWithoutPanRef = useRef<HTMLInputElement>(null);
  const rateOtherWithPanRef = useRef<HTMLInputElement>(null);
  const rateOtherWithoutPanRef = useRef<HTMLInputElement>(null);
  const isZeroRatedRef = useRef<HTMLSelectElement>(null);
  const taxOnRealizationRef = useRef<HTMLSelectElement>(null);
  const thresholdLevelRef = useRef<HTMLInputElement>(null);

  // Focus effect
  useEffect(() => {
    if (isPredefined) return;
    const refMap: Record<string, React.RefObject<HTMLInputElement | HTMLSelectElement | null>> = {
      name: nameRef,
      section: sectionRef,
      payment_code: paymentCodeRef,
      rate_individual_with_pan: rateIndWithPanRef,
      rate_individual_without_pan: rateIndWithoutPanRef,
      rate_other_with_pan: rateOtherWithPanRef,
      rate_other_without_pan: rateOtherWithoutPanRef,
      is_zero_rated: isZeroRatedRef,
      tax_on_receipt_or_realization: taxOnRealizationRef,
      threshold_level: thresholdLevelRef,
    };
    refMap[activeField]?.current?.focus();
  }, [activeField, isPredefined]);

  const showZeroRated =
    Number(form.rate_individual_with_pan || 0) === 0 &&
    Number(form.rate_individual_without_pan || 0) === 0 &&
    Number(form.rate_other_with_pan || 0) === 0 &&
    Number(form.rate_other_without_pan || 0) === 0;

  // Rate change helper
  const handleRateChange = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow positive numbers and decimals
    let val = e.target.value;
    if (val !== "" && isNaN(Number(val))) return;

    setForm((f) => {
      const newForm = { ...f, [key]: val };
      const hasRate =
        Number(newForm.rate_individual_with_pan || 0) > 0 ||
        Number(newForm.rate_individual_without_pan || 0) > 0 ||
        Number(newForm.rate_other_with_pan || 0) > 0 ||
        Number(newForm.rate_other_without_pan || 0) > 0;

      if (hasRate) {
        newForm.is_zero_rated = "No";
      }
      return newForm;
    });
  };

  // Zero-rated toggle helper
  const handleZeroRatedChange = (val: "Yes" | "No") => {
    setForm((f) => {
      const newForm = { ...f, is_zero_rated: val };
      if (val === "Yes") {
        newForm.rate_individual_with_pan = "0";
        newForm.rate_individual_without_pan = "0";
        newForm.rate_other_with_pan = "0";
        newForm.rate_other_without_pan = "0";
      }
      return newForm;
    });
  };

  // Keyboard navigation
  useEffect(() => {
    if (isPredefined) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const fields = getFocusableFields(form);
      const idx = fields.indexOf(activeField);
      if (idx === -1) return;

      if (e.key === "Enter" || e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        if (idx === fields.length - 1) {
          onSubmitPrompt();
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

      // Quick Yes/No shortcuts
      if (
        activeField === "is_zero_rated" ||
        activeField === "tax_on_receipt_or_realization"
      ) {
        const key = e.key.toLowerCase();
        if (key === "y" || key === "n") {
          e.preventDefault();
          const val = key === "y" ? "Yes" : "No";
          if (activeField === "is_zero_rated") {
            handleZeroRatedChange(val);
          } else {
            setForm((f) => ({ ...f, [activeField]: val }));
          }
          if (idx < fields.length - 1) {
            setActiveField(fields[idx + 1]);
          } else {
            onSubmitPrompt();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeField, form, isPredefined, onSubmitPrompt]);

  const cls = (f: string) => (activeField === f ? activeClass : inactiveClass);
  const selectCls = (f: string) => (activeField === f ? selectActiveClass : selectInactiveClass);

  return (
    <div className="bg-white border-4 border-double border-zinc-400 w-[550px] shadow-2xl p-5 relative select-none font-mono text-[11px] text-zinc-950 animate-fade-in">
      
      {/* Title */}
      <div className="font-bold text-xs pb-3 mb-4 border-b border-zinc-200 tracking-wide text-zinc-900">
        TCS Nature of Goods {mode === "create" ? "Creation" : "Alteration"}
      </div>

      <div className="grid grid-cols-[280px_10px_1fr] items-center gap-y-1.5">
        
        {/* Name */}
        <div className="text-zinc-700 font-bold pl-1">Name</div>
        <div className="text-zinc-400 text-center font-bold">:</div>
        <div>
          <input
            ref={nameRef}
            type="text"
            className={cls("name")}
            value={form.name}
            onChange={setField("name")}
            onFocus={() => setActiveField("name")}
            disabled={isPredefined}
          />
        </div>

        {/* Section */}
        <div className="text-zinc-700 pl-1">Section</div>
        <div className="text-zinc-400 text-center font-bold">:</div>
        <div>
          <input
            ref={sectionRef}
            type="text"
            className={cls("section")}
            value={form.section}
            onChange={setField("section")}
            onFocus={() => setActiveField("section")}
            disabled={isPredefined}
          />
        </div>

        {/* Payment code */}
        <div className="text-zinc-700 pl-1">Payment code</div>
        <div className="text-zinc-400 text-center font-bold">:</div>
        <div>
          <input
            ref={paymentCodeRef}
            type="text"
            className={cls("payment_code")}
            value={form.payment_code}
            onChange={setField("payment_code")}
            onFocus={() => setActiveField("payment_code")}
            disabled={isPredefined}
          />
        </div>

        {/* Rates Section Header */}
        <div className="col-span-3 text-zinc-800 font-bold mt-2 border-b border-dashed border-zinc-200 pb-0.5 pl-1">
          Rate for individuals/HUF
        </div>

        {/* Individual Rate With PAN */}
        <div className="text-zinc-600 pl-6">With PAN</div>
        <div className="text-zinc-400 text-center font-bold">:</div>
        <div className="flex items-center gap-1">
          <input
            ref={rateIndWithPanRef}
            type="text"
            className={`${cls("rate_individual_with_pan")} w-24 text-right`}
            value={form.rate_individual_with_pan}
            onChange={handleRateChange("rate_individual_with_pan")}
            onFocus={() => setActiveField("rate_individual_with_pan")}
            disabled={isPredefined || form.is_zero_rated === "Yes"}
          />
          <span className="text-zinc-500 font-bold">%</span>
        </div>

        {/* Individual Rate Without PAN */}
        <div className="text-zinc-600 pl-6">Without PAN</div>
        <div className="text-zinc-400 text-center font-bold">:</div>
        <div className="flex items-center gap-1">
          <input
            ref={rateIndWithoutPanRef}
            type="text"
            className={`${cls("rate_individual_without_pan")} w-24 text-right`}
            value={form.rate_individual_without_pan}
            onChange={handleRateChange("rate_individual_without_pan")}
            onFocus={() => setActiveField("rate_individual_without_pan")}
            disabled={isPredefined || form.is_zero_rated === "Yes"}
          />
          <span className="text-zinc-500 font-bold">%</span>
        </div>

        {/* Rates Section 2 Header */}
        <div className="col-span-3 text-zinc-800 font-bold mt-2 border-b border-dashed border-zinc-200 pb-0.5 pl-1">
          Rate for other collectee types
        </div>

        {/* Other Rate With PAN */}
        <div className="text-zinc-600 pl-6">With PAN</div>
        <div className="text-zinc-400 text-center font-bold">:</div>
        <div className="flex items-center gap-1">
          <input
            ref={rateOtherWithPanRef}
            type="text"
            className={`${cls("rate_other_with_pan")} w-24 text-right`}
            value={form.rate_other_with_pan}
            onChange={handleRateChange("rate_other_with_pan")}
            onFocus={() => setActiveField("rate_other_with_pan")}
            disabled={isPredefined || form.is_zero_rated === "Yes"}
          />
          <span className="text-zinc-500 font-bold">%</span>
        </div>

        {/* Other Rate Without PAN */}
        <div className="text-zinc-600 pl-6">Without PAN</div>
        <div className="text-zinc-400 text-center font-bold">:</div>
        <div className="flex items-center gap-1">
          <input
            ref={rateOtherWithoutPanRef}
            type="text"
            className={`${cls("rate_other_without_pan")} w-24 text-right`}
            value={form.rate_other_without_pan}
            onChange={handleRateChange("rate_other_without_pan")}
            onFocus={() => setActiveField("rate_other_without_pan")}
            disabled={isPredefined || form.is_zero_rated === "Yes"}
          />
          <span className="text-zinc-500 font-bold">%</span>
        </div>

        <div className="col-span-3 mt-2 border-b border-zinc-200" />

        {/* Is zero rated */}
        {showZeroRated && (
          <>
            <div className="text-zinc-700 pl-1">Is zero rated</div>
            <div className="text-zinc-400 text-center font-bold">:</div>
            <div>
              <select
                ref={isZeroRatedRef}
                className={selectCls("is_zero_rated")}
                value={form.is_zero_rated}
                onChange={(e) => handleZeroRatedChange(e.target.value as "Yes" | "No")}
                onFocus={() => setActiveField("is_zero_rated")}
                disabled={isPredefined}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          </>
        )}

        {/* Tax calculation based on realisation */}
        <div className="text-zinc-700 pl-1">Tax calculation based on realisation</div>
        <div className="text-zinc-400 text-center font-bold">:</div>
        <div>
          <select
            ref={taxOnRealizationRef}
            className={selectCls("tax_on_receipt_or_realization")}
            value={form.tax_on_receipt_or_realization}
            onChange={(e) => setForm((f) => ({ ...f, tax_on_receipt_or_realization: e.target.value as "Yes" | "No" }))}
            onFocus={() => setActiveField("tax_on_receipt_or_realization")}
            disabled={isPredefined}
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        {/* Threshold/exemption limit */}
        <div className="text-zinc-700 pl-1">Threshold/exemption limit</div>
        <div className="text-zinc-400 text-center font-bold">:</div>
        <div>
          <input
            ref={thresholdLevelRef}
            type="text"
            className={`${cls("threshold_level")} w-36`}
            value={form.threshold_level}
            onChange={(e) => {
              const val = e.target.value;
              if (val !== "" && isNaN(Number(val))) return;
              setField("threshold_level")(e);
            }}
            onFocus={() => setActiveField("threshold_level")}
            disabled={isPredefined}
          />
        </div>

      </div>
    </div>
  );
}
