import { useState } from "react";
import type { CompanyType } from "../types/api";

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh",
  "Andaman & Nicobar","Chandigarh","Dadra & Nagar Haveli","Daman & Diu",
  "Lakshadweep","Puducherry",
];

interface FormData {
  company_id: number;
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

function Row({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center border-b border-blue-800 last:border-0 min-h-[32px]">
      <span className="w-56 text-sm text-zinc-400 shrink-0 py-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-zinc-600 mr-2">:</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

const inputCls =
  "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm placeholder:text-zinc-400";
const selectCls =
  "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm cursor-pointer";

interface Props {
  company: CompanyType;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AlterCompany({ company, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<FormData>({
    company_id: company.company_id ?? 0,
    name: company.name ?? "",
    mailing_name: company.mailing_name ?? "",
    address1: company.address1 ?? "",
    address2: company.address2 ?? "",
    state: company.state ?? "Madhya Pradesh",
    country: company.country ?? "India",
    pincode: company.pincode ?? "",
    telephone: company.telephone ?? "",
    mobile: company.mobile ?? "",
    fax: company.fax ?? "",
    email: company.email ?? "",
    website: company.website ?? "",
    base_currency_symbol: company.base_currency_symbol ?? "₹",
    formal_name: company.formal_name ?? "",
    financial_year_beginning_from: company.financial_year_beginning_from ?? "",
    books_beginning_from: company.books_beginning_from ?? "",
    password: "",
  });

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
      const result = await window.api.company.update(form);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to update company.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">

      <div className="px-6 py-3 border-b border-blue-800 flex items-center justify-between shrink-0">
        <span className="font-semibold text-base">Alter Company</span>
        <span className="text-xs text-zinc-600">Ctrl+A to accept &nbsp;|&nbsp; Esc to cancel</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6">

        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-600 mb-2">Basic</div>
          <Row label="Name" required>
            <input autoFocus className={inputCls} value={form.name} onChange={set("name")} placeholder="Company name" />
          </Row>
          <Row label="Mailing Name">
            <input className={inputCls} value={form.mailing_name} onChange={set("mailing_name")} placeholder="Defaults to name" />
          </Row>
          <Row label="Formal Name">
            <input className={inputCls} value={form.formal_name} onChange={set("formal_name")} placeholder="Full legal name" />
          </Row>
          <Row label="Base Currency Symbol">
            <select className={selectCls} value={form.base_currency_symbol} onChange={set("base_currency_symbol")}>
              <option value="₹">₹ — Indian Rupee</option>
              <option value="$">$ — US Dollar</option>
              <option value="€">€ — Euro</option>
              <option value="£">£ — British Pound</option>
            </select>
          </Row>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-600 mb-2">Address</div>
          <Row label="Address Line 1">
            <input className={inputCls} value={form.address1} onChange={set("address1")} placeholder="Street / Building" />
          </Row>
          <Row label="Address Line 2">
            <input className={inputCls} value={form.address2} onChange={set("address2")} placeholder="Area / Locality" />
          </Row>
          <Row label="State">
            <select className={selectCls} value={form.state} onChange={set("state")}>
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Row>
          <Row label="Country">
            <input className={inputCls} value={form.country} onChange={set("country")} />
          </Row>
          <Row label="Pincode">
            <input className={inputCls} value={form.pincode} onChange={set("pincode")} maxLength={6} placeholder="6-digit" />
          </Row>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-600 mb-2">Contact</div>
          <Row label="Telephone">
            <input className={inputCls} value={form.telephone} onChange={set("telephone")} />
          </Row>
          <Row label="Mobile">
            <input className={inputCls} value={form.mobile} onChange={set("mobile")} />
          </Row>
          <Row label="Fax">
            <input className={inputCls} value={form.fax} onChange={set("fax")} />
          </Row>
          <Row label="Email">
            <input className={inputCls} type="email" value={form.email} onChange={set("email")} />
          </Row>
          <Row label="Website">
            <input className={inputCls} value={form.website} onChange={set("website")} />
          </Row>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-600 mb-2">Financial Year</div>
          <Row label="F.Y. Beginning From" required>
            <input className={inputCls} type="date" value={form.financial_year_beginning_from} onChange={set("financial_year_beginning_from")} />
          </Row>
          <Row label="Books Beginning From" required>
            <input className={inputCls} type="date" value={form.books_beginning_from} onChange={set("books_beginning_from")} />
          </Row>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-600 mb-2">Security</div>
          <Row label="Password">
            <input className={inputCls} type="password" value={form.password} onChange={set("password")} placeholder="Leave blank to keep current" />
          </Row>
        </div>

      </div>


      {error && (
        <div className="px-6 py-2 bg-red-950 border-t border-red-900 text-red-400 text-sm flex justify-between items-center shrink-0">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-300 text-xs ml-4">dismiss</button>
        </div>
      )}

      <div className="px-6 py-3 border-t border-blue-800 flex justify-end gap-3 shrink-0">
        <button
          onClick={onCancel}
          className="text-sm px-4 py-1.5 rounded border border-blue-300 text-blue-600 hover:bg-blue-100 hover:border-blue-400 hover:text-blue-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-5 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? "Updating..." : "Accept"}
        </button>
      </div>

    </div>
  );
}
