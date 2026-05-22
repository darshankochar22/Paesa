import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, RightActionPanel } from "@/components/ui";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded ";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-24 ";

interface FormData {
  name: string;
  formal_name: string;
  iso_code: string;
  symbol: string;
  decimal_places: string;
  decimal_symbol: string;
  decimal_places_in_words: string;
  suffix_symbol_to_amount: "No" | "Yes";
  show_amount_in_millions: "No" | "Yes";
  add_space_between_amount_and_symbol: "No" | "Yes";
}

const INITIAL: FormData = {
  name: "",
  formal_name: "",
  iso_code: "",
  symbol: "",
  decimal_places: "2",
  decimal_symbol: ".",
  decimal_places_in_words: "",
  suffix_symbol_to_amount: "No",
  show_amount_in_millions: "No",
  add_space_between_amount_and_symbol: "No",
};

export default function CurrencyCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const companyId = selectedCompany?.company_id;

  const setField = (key: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return "Currency name is required.";
    if (!form.iso_code.trim()) return "ISO Currency Code is required.";
    if (!companyId) return "No company selected.";
    const decimals = Number(form.decimal_places);
    if (isNaN(decimals) || decimals < 0 || decimals > 10) return "Decimal places must be a number between 0 and 10.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.currency.create({
        company_id: companyId!,
        name: form.name.trim(),
        formal_name: form.formal_name.trim() || undefined,
        iso_code: form.iso_code.trim().toUpperCase(),
        symbol: form.symbol.trim() || undefined,
        decimal_places: Number(form.decimal_places) || 2,
        decimal_symbol: form.decimal_symbol.trim() || ".",
        decimal_places_in_words: form.decimal_places_in_words.trim() || undefined,
        suffix_symbol_to_amount: form.suffix_symbol_to_amount === "Yes" ? 1 : 0,
        show_amount_in_millions: form.show_amount_in_millions === "Yes" ? 1 : 0,
        add_space_between_amount_and_symbol: form.add_space_between_amount_and_symbol === "Yes" ? 1 : 0,
      });

      if (result.success) {
        setSuccess(`Currency "${form.name}" created successfully.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create currency.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [form, companyId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/master/create");
      }
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        navigate("/master/alter/currency");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate]);

  const currencyActions = [
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Alt+C", label: "Alter Mode", onClick: () => navigate("/master/alter/currency") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/master/create") },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Currency Creation" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold font-sans">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center">
          <span>• {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs font-bold font-sans">&times;</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="p-3 space-y-1.5 max-w-2xl">
            <FormRow label="Currency Symbol" required labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={form.symbol} onChange={setField("symbol")} placeholder="e.g. ₹" />
            </FormRow>
            <FormRow label="Formal Name" required labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.name} onChange={setField("name")} placeholder="e.g. Indian Rupee" />
            </FormRow>
            <FormRow label="ISO Currency Code" required labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.iso_code} onChange={setField("iso_code")} placeholder="e.g. INR" maxLength={3} />
            </FormRow>
            <FormRow label="Decimal Places" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input className={inputCls} type="number" min="0" max="10" value={form.decimal_places} onChange={setField("decimal_places")} />
            </FormRow>
            <FormRow label="Decimal Symbol" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.decimal_symbol} onChange={setField("decimal_symbol")} placeholder="." maxLength={1} />
            </FormRow>
            <FormRow label="Decimal Places in Words" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.decimal_places_in_words} onChange={setField("decimal_places_in_words")} placeholder="e.g. Paise" />
            </FormRow>
            <FormRow label="Suffix Symbol to Amount" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.suffix_symbol_to_amount} onChange={setField("suffix_symbol_to_amount")}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
            <FormRow label="Show Amount in Millions" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.show_amount_in_millions} onChange={setField("show_amount_in_millions")}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
            <FormRow label="Add Space between Amount & Symbol" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.add_space_between_amount_and_symbol} onChange={setField("add_space_between_amount_and_symbol")}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
          </div>
          <div className="flex-1" />
        </div>

        <RightActionPanel actions={currencyActions} />
      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50">
        <button onClick={() => navigate("/master/create")} className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium">
          &larr; Back to Masters
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium font-sans"
        >
          {loading ? "Saving..." : "Create"}
        </button>
      </div>
    </div>
  );
}
