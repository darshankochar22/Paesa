import { useState } from "react";

const FY_YEARS = Array.from({ length: 26 }, (_, i) => 2001 + i);

const STATES = [
  "Not Applicable",
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh",
  "Andaman & Nicobar","Chandigarh","Dadra & Nagar Haveli","Daman & Diu",
  "Lakshadweep","Puducherry",
];

interface FormData {
  name: string;
  mailing_name: string;
  address1: string;
  address2: string;
  state: string;
  country: string;
  pincode: string;
  telephone: string;
  mobile: string;
  fax: string;
  email: string;
  website: string;
  base_currency_symbol: string;
  formal_name: string;
  financial_year_beginning_from: string;
  books_beginning_from: string;
  password: string;
}

const INITIAL: FormData = {
  name: "",
  mailing_name: "",
  address1: "",
  address2: "",
  state: "Not Applicable",
  country: "India",
  pincode: "",
  telephone: "",
  mobile: "+91 -",
  fax: "",
  email: "",
  website: "",
  base_currency_symbol: "₹",
  formal_name: "INR",
  financial_year_beginning_from: `${new Date().getFullYear()}-04-01`,
  books_beginning_from: `${new Date().getFullYear()}-04-01`,
  password: "",
};

const rowCls = "flex items-start border-b border-zinc-100 last:border-0 min-h-[28px]";
const labelCls = "w-44 text-sm text-zinc-700 shrink-0 py-1 pr-2";
const colonCls = "text-zinc-500 mr-2 py-1 shrink-0";
const inputCls = "flex-1 bg-transparent text-sm outline-none py-1 px-1 text-zinc-900";
const selectCls = "flex-1 bg-transparent text-sm outline-none py-1 px-1 text-zinc-900 cursor-pointer";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={rowCls}>
      <span className={labelCls}>{label}</span>
      <span className={colonCls}>:</span>
      {children}
    </div>
  );
}

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CompanyCreate({ onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Company name is required."); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.company.create(form);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to create company.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  const getFYLabel = (val: string) => {
    const d = new Date(val);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${d.getDate()} ${months[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
  };

  return (
    <div className="flex flex-col h-full bg-white select-none">

      {/* Title bar */}
      <div className="px-4 py-1.5 border-b border-zinc-300 bg-zinc-100 shrink-0">
        <span className="font-semibold text-sm text-zinc-800">Company Creation</span>
      </div>

      {/* Main body — two column layout like Tally */}
      <div className="flex-1 flex min-h-0">

        {/* LEFT COLUMN — all fields */}
        <div className="flex-1 flex flex-col border-r border-zinc-200 overflow-y-auto px-4 py-2">

          {/* Company Data Path */}
          <div className="flex items-center min-h-[28px] mb-3 border-b border-zinc-200 pb-2">
            <span className={labelCls}>Company Data Path</span>
            <span className={colonCls}>:</span>
            <span className="text-sm text-zinc-500 italic">Auto (managed by app)</span>
          </div>

          {/* Company Name */}
          <Row label="Company Name">
            <input
              autoFocus
              className={`${inputCls} focus:border-zinc-600 px-2`}
              value={form.name}
              onChange={set("name")}
            />
          </Row>

          {/* Mailing Name */}
          <Row label="Mailing Name">
            <input
              className={inputCls}
              value={form.mailing_name}
              onChange={set("mailing_name")}
            />
          </Row>

          {/* Address — multiline like Tally */}
          <div className={rowCls}>
            <span className={labelCls}>Address</span>
            <span className={colonCls}>:</span>
            <div className="flex-1 flex flex-col">
              <input
                className={`${inputCls} border-b border-zinc-100`}
                value={form.address1}
                onChange={set("address1")}
                placeholder=""
              />
              <input
                className={inputCls}
                value={form.address2}
                onChange={set("address2")}
                placeholder=""
              />
            </div>
          </div>

          {/* State */}
          <Row label="State">
            <div className="flex items-center flex-1">
              <span className="text-sm text-zinc-500 mr-1">•</span>
              <select className={selectCls} value={form.state} onChange={set("state")}>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </Row>

          {/* Country */}
          <Row label="Country">
            <input className={inputCls} value={form.country} onChange={set("country")} />
          </Row>

          {/* Pincode */}
          <Row label="Pincode">
            <input className={inputCls} value={form.pincode} onChange={set("pincode")} maxLength={6} />
          </Row>

          {/* Telephone */}
          <Row label="Telephone">
            <input className={inputCls} value={form.telephone} onChange={set("telephone")} />
          </Row>

          {/* Mobile */}
          <Row label="Mobile">
            <input className={inputCls} value={form.mobile} onChange={set("mobile")} />
          </Row>

          {/* Fax */}
          <Row label="Fax">
            <input className={inputCls} value={form.fax} onChange={set("fax")} />
          </Row>

          {/* Email */}
          <Row label="E-mail">
            <input className={inputCls} type="email" value={form.email} onChange={set("email")} />
          </Row>

          {/* Website */}
          <Row label="Website">
            <input className={inputCls} value={form.website} onChange={set("website")} />
          </Row>

          {/* Base Currency */}
          <Row label="Base Currency symbol">
            <select className={selectCls} value={form.base_currency_symbol} onChange={set("base_currency_symbol")}>
              <option value="₹">₹</option>
              <option value="$">$</option>
              <option value="€">€</option>
              <option value="£">£</option>
            </select>
          </Row>

          {/* Formal Name */}
          <Row label="Formal name">
            <input className={inputCls} value={form.formal_name} onChange={set("formal_name")} />
          </Row>

          {/* Password */}
          <Row label="Tally Vault Password">
            <input className={inputCls} type="password" value={form.password} onChange={set("password")} />
          </Row>

        </div>

        {/* RIGHT COLUMN — FY details, like Tally's right panel */}
        <div className="w-64 flex flex-col px-4 py-2 shrink-0">

          <div className="text-xs text-zinc-400 uppercase tracking-widest mb-3 border-b border-zinc-200 pb-1">
            F2: Period
          </div>

          <div className={rowCls}>
            <span className="w-44 text-sm text-zinc-700 shrink-0 py-1 pr-2">Financial year beginning from</span>
          </div>
          <div className="pl-2 mb-3">
            <select
              className="w-full text-sm text-zinc-900 outline-none py-1 bg-transparent cursor-pointer"
              value={form.financial_year_beginning_from}
              onChange={set("financial_year_beginning_from")}
            >
              {FY_YEARS.map((y) => (
                <option key={y} value={`${y}-04-01`}>
                  1 Apr {y}
                </option>
              ))}
            </select>
          </div>

          <div className={rowCls}>
            <span className="w-44 text-sm text-zinc-700 shrink-0 py-1 pr-2">Books beginning from</span>
          </div>
          <div className="pl-2 mb-3">
            <input
              type="date"
              className="w-full text-sm text-zinc-900 outline-none py-1 bg-transparent cursor-pointer"
              value={form.books_beginning_from}
              onChange={set("books_beginning_from")}
            />
          </div>

          {/* Preview */}
          <div className="mt-4 border-t border-zinc-200 pt-3 space-y-1">
            <div className="text-xs text-zinc-400">Financial Year</div>
            <div className="text-sm text-zinc-800 font-medium">
              {getFYLabel(form.financial_year_beginning_from)}
            </div>
            <div className="text-xs text-zinc-400 mt-2">Books From</div>
            <div className="text-sm text-zinc-800 font-medium">
              {getFYLabel(form.books_beginning_from)}
            </div>
          </div>

        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 border-t border-zinc-200 text-red-600 text-sm flex justify-between items-center shrink-0">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs ml-4">dismiss</button>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2 border-t border-zinc-200 flex justify-end gap-3 shrink-0 bg-zinc-50">
        <button
          onClick={onCancel}
          className="text-sm px-4 py-1.5 border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-5 py-1.5 bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? "Creating..." : "Accept"}
        </button>
      </div>

    </div>
  );
}
