import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CompanyType } from '@/types/api';

const FY_YEARS = Array.from({ length: 26 }, (_, i) => 2001 + i);

const STATES = [
  'Not Applicable',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu & Kashmir',
  'Ladakh',
  'Andaman & Nicobar',
  'Chandigarh',
  'Dadra & Nagar Haveli',
  'Daman & Diu',
  'Lakshadweep',
  'Puducherry',
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

export default function CompanyAlter() {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState<CompanyType[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selected, setSelected] = useState<CompanyType | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.api.company
      .getAll()
      .then((res) => {
        if (res.success) setCompanies(res.companies ?? []);
        else setListError(res.error || 'Failed to load companies.');
      })
      .catch(() => setListError('Unexpected error.'))
      .finally(() => setLoadingList(false));
  }, []);

  const handleSelect = (c: CompanyType) => {
    setSelected(c);
    setForm({
      company_id: c.company_id ?? 0,
      name: c.name ?? '',
      mailing_name: c.mailing_name ?? '',
      address1: c.address1 ?? '',
      address2: c.address2 ?? '',
      state: c.state ?? 'Not Applicable',
      country: c.country ?? 'India',
      pincode: c.pincode ?? '',
      telephone: c.telephone ?? '',
      mobile: c.mobile ?? '',
      fax: c.fax ?? '',
      email: c.email ?? '',
      website: c.website ?? '',
      base_currency_symbol: c.base_currency_symbol ?? '₹',
      formal_name: c.formal_name ?? '',
      financial_year_beginning_from: c.financial_year_beginning_from?.substring(0, 4)
        ? `${c.financial_year_beginning_from.substring(0, 4)}-04-01`
        : '',
      books_beginning_from: c.books_beginning_from ?? '',
      password: '',
    });
  };

  const set =
    (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => (f ? { ...f, [key]: e.target.value } : f));

  const handleSubmit = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      setError('Company name is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.company.update(form);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Failed to update company.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  // ── EDIT FORM VIEW ─────────────────────────────────────────────────────────
  if (selected && form) {
    return (
      <div className="flex flex-col h-full bg-white select-none">
        <div className="px-4 py-1.5 border-b border-zinc-300 bg-zinc-100 shrink-0">
          <span className="font-semibold text-sm text-zinc-800">Company Alteration</span>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* LEFT COLUMN */}
          <div className="flex-1 flex flex-col border-r border-zinc-200 overflow-y-auto px-4 py-2">
            <div className="flex items-start border-b border-zinc-100 min-h-[28px]">
              <span className="w-44 text-sm text-zinc-700 shrink-0 py-1 pr-2">Company Name</span>
              <span className="text-zinc-500 mr-2 py-1 shrink-0">:</span>
              <input
                autoFocus
                className="flex-1 bg-zinc-50 border border-zinc-300 focus:border-zinc-600 text-sm outline-none py-1 px-2 text-zinc-900"
                value={form.name}
                onChange={set('name')}
              />
            </div>

            <div className="flex items-start border-b border-zinc-100 min-h-[28px]">
              <span className="w-44 text-sm text-zinc-700 shrink-0 py-1 pr-2">Mailing Name</span>
              <span className="text-zinc-500 mr-2 py-1 shrink-0">:</span>
              <input
                className="flex-1 bg-transparent text-sm outline-none py-1 px-1 text-zinc-900"
                value={form.mailing_name}
                onChange={set('mailing_name')}
              />
            </div>

            <div className="flex items-start border-b border-zinc-100 min-h-[28px]">
              <span className="w-44 text-sm text-zinc-700 shrink-0 py-1 pr-2">Address</span>
              <span className="text-zinc-500 mr-2 py-1 shrink-0">:</span>
              <div className="flex-1 flex flex-col">
                <input
                  className="flex-1 bg-transparent text-sm outline-none py-1 px-1 text-zinc-900 border-b border-zinc-100"
                  value={form.address1}
                  onChange={set('address1')}
                />
                <input
                  className="flex-1 bg-transparent text-sm outline-none py-1 px-1 text-zinc-900"
                  value={form.address2}
                  onChange={set('address2')}
                />
              </div>
            </div>

            <div className="flex items-start border-b border-zinc-100 min-h-[28px]">
              <span className="w-44 text-sm text-zinc-700 shrink-0 py-1 pr-2">State</span>
              <span className="text-zinc-500 mr-2 py-1 shrink-0">:</span>
              <div className="flex items-center flex-1">
                <span className="text-sm text-zinc-500 mr-1">•</span>
                <select
                  className="flex-1 bg-transparent text-sm outline-none py-1 px-1 text-zinc-900 cursor-pointer"
                  value={form.state}
                  onChange={set('state')}
                >
                  {STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-start border-b border-zinc-100 min-h-[28px]">
              <span className="w-44 text-sm text-zinc-700 shrink-0 py-1 pr-2">Country</span>
              <span className="text-zinc-500 mr-2 py-1 shrink-0">:</span>
              <input
                className="flex-1 bg-transparent text-sm outline-none py-1 px-1 text-zinc-900"
                value={form.country}
                onChange={set('country')}
              />
            </div>

            <div className="flex items-start border-b border-zinc-100 min-h-[28px]">
              <span className="w-44 text-sm text-zinc-700 shrink-0 py-1 pr-2">Pincode</span>
              <span className="text-zinc-500 mr-2 py-1 shrink-0">:</span>
              <input
                className="flex-1 bg-transparent text-sm outline-none py-1 px-1 text-zinc-900"
                value={form.pincode}
                onChange={set('pincode')}
                maxLength={6}
              />
            </div>

            <div className="flex items-start border-b border-zinc-100 min-h-[28px]">
              <span className="w-44 text-sm text-zinc-700 shrink-0 py-1 pr-2">Telephone</span>
              <span className="text-zinc-500 mr-2 py-1 shrink-0">:</span>
              <input
                className="flex-1 bg-transparent text-sm outline-none py-1 px-1 text-zinc-900"
                value={form.telephone}
                onChange={set('telephone')}
              />
            </div>

            <div className="flex items-start border-b border-zinc-100 min-h-[28px]">
              <span className="w-44 text-sm text-zinc-700 shrink-0 py-1 pr-2">Mobile</span>
              <span className="text-zinc-500 mr-2 py-1 shrink-0">:</span>
              <input
                className="flex-1 bg-transparent text-sm outline-none py-1 px-1 text-zinc-900"
                value={form.mobile}
                onChange={set('mobile')}
              />
            </div>

            <div className="flex items-start border-b border-zinc-100 min-h-[28px]">
              <span className="w-44 text-sm text-zinc-700 shrink-0 py-1 pr-2">Fax</span>
              <span className="text-zinc-500 mr-2 py-1 shrink-0">:</span>
              <input
                className="flex-1 bg-transparent text-sm outline-none py-1 px-1 text-zinc-900"
                value={form.fax}
                onChange={set('fax')}
              />
            </div>

            <div className="flex items-start border-b border-zinc-100 min-h-[28px]">
              <span className="w-44 text-sm text-zinc-700 shrink-0 py-1 pr-2">E-mail</span>
              <span className="text-zinc-500 mr-2 py-1 shrink-0">:</span>
              <input
                className="flex-1 bg-transparent text-sm outline-none py-1 px-1 text-zinc-900"
                type="email"
                value={form.email}
                onChange={set('email')}
              />
            </div>

            <div className="flex items-start border-b border-zinc-100 min-h-[28px]">
              <span className="w-44 text-sm text-zinc-700 shrink-0 py-1 pr-2">Website</span>
              <span className="text-zinc-500 mr-2 py-1 shrink-0">:</span>
              <input
                className="flex-1 bg-transparent text-sm outline-none py-1 px-1 text-zinc-900"
                value={form.website}
                onChange={set('website')}
              />
            </div>

            <div className="flex items-start border-b border-zinc-100 min-h-[28px]">
              <span className="w-44 text-sm text-zinc-700 shrink-0 py-1 pr-2">
                Base Currency symbol
              </span>
              <span className="text-zinc-500 mr-2 py-1 shrink-0">:</span>
              <select
                className="flex-1 bg-transparent text-sm outline-none py-1 px-1 text-zinc-900 cursor-pointer"
                value={form.base_currency_symbol}
                onChange={set('base_currency_symbol')}
              >
                <option value="₹">₹</option>
                <option value="$">$</option>
                <option value="€">€</option>
                <option value="£">£</option>
              </select>
            </div>

            <div className="flex items-start border-b border-zinc-100 min-h-[28px]">
              <span className="w-44 text-sm text-zinc-700 shrink-0 py-1 pr-2">Formal name</span>
              <span className="text-zinc-500 mr-2 py-1 shrink-0">:</span>
              <input
                className="flex-1 bg-transparent text-sm outline-none py-1 px-1 text-zinc-900"
                value={form.formal_name}
                onChange={set('formal_name')}
              />
            </div>

            <div className="flex items-start border-b border-zinc-100 min-h-[28px]">
              <span className="w-44 text-sm text-zinc-700 shrink-0 py-1 pr-2">Vault Password</span>
              <span className="text-zinc-500 mr-2 py-1 shrink-0">:</span>
              <input
                className="flex-1 bg-transparent text-sm outline-none py-1 px-1 text-zinc-900"
                type="password"
                value={form.password}
                onChange={set('password')}
              />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="w-64 flex flex-col px-4 py-2 shrink-0">
            <div className="text-xs text-zinc-400 uppercase tracking-widest mb-3 border-b border-zinc-200 pb-1">
              F2: Period
            </div>

            <div className="flex items-start border-b border-zinc-100 min-h-[28px]">
              <span className="w-44 text-sm text-zinc-700 shrink-0 py-1 pr-2">
                Financial year beginning from
              </span>
            </div>
            <div className="pl-2 mb-3">
              <select
                className="w-full text-sm text-zinc-900 outline-none py-1 bg-transparent cursor-pointer"
                value={form.financial_year_beginning_from}
                onChange={set('financial_year_beginning_from')}
              >
                {FY_YEARS.map((y) => (
                  <option key={y} value={`${y}-04-01`}>
                    1 Apr {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-start border-b border-zinc-100 min-h-[28px]">
              <span className="w-44 text-sm text-zinc-700 shrink-0 py-1 pr-2">
                Books beginning from
              </span>
            </div>
            <div className="pl-2 mb-3">
              <input
                type="date"
                className="w-full text-sm text-zinc-900 outline-none py-1 bg-transparent cursor-pointer"
                value={form.books_beginning_from}
                onChange={set('books_beginning_from')}
              />
            </div>

            <div className="mt-4 border-t border-zinc-200 pt-3 space-y-1">
              <div className="text-xs text-zinc-400">Financial Year</div>
              <div className="text-sm text-zinc-800 font-medium">
                {form.financial_year_beginning_from
                  ? `1 Apr ${form.financial_year_beginning_from.substring(0, 4)}`
                  : '—'}
              </div>
              <div className="text-xs text-zinc-400 mt-2">Books From</div>
              <div className="text-sm text-zinc-800 font-medium">
                {form.books_beginning_from || '—'}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="px-4 py-2 border-t border-zinc-200 text-red-600 text-sm flex justify-between items-center shrink-0">
            <span>⚠ {error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 text-xs ml-4"
            >
              dismiss
            </button>
          </div>
        )}

        <div className="px-4 py-2 border-t border-zinc-200 flex justify-end gap-3 shrink-0 bg-zinc-50">
          <button
            onClick={() => {
              setSelected(null);
              setForm(null);
            }}
            className="text-sm px-4 py-1.5 border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-sm px-5 py-1.5 bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Updating...' : 'Accept'}
          </button>
        </div>
      </div>
    );
  }

  // ── COMPANY LIST VIEW ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white select-none">
      <div className="px-4 py-1.5 border-b border-zinc-300 bg-zinc-100 shrink-0">
        <span className="font-semibold text-sm text-zinc-800">Alter Company — Select Company</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loadingList && <div className="px-4 py-6 text-sm text-zinc-400">Loading companies...</div>}
        {listError && <div className="px-4 py-6 text-sm text-red-500">⚠ {listError}</div>}
        {!loadingList && !listError && companies.length === 0 && (
          <div className="px-4 py-6 text-sm text-zinc-400">No companies found.</div>
        )}
        {!loadingList &&
          !listError &&
          companies.map((c, i) => (
            <button
              key={c.company_id}
              onClick={() => handleSelect(c)}
              className="w-full text-left flex items-center gap-4 px-4 py-2 border-b border-zinc-100 hover:bg-zinc-50 transition-colors group"
            >
              <span className="text-xs text-zinc-400 w-5 shrink-0">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-800 truncate">{c.name}</div>
                {c.mailing_name && c.mailing_name !== c.name && (
                  <div className="text-xs text-zinc-400 truncate">{c.mailing_name}</div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-zinc-400">{c.state || '—'}</div>
                <div className="text-xs text-zinc-300">
                  {c.financial_year_beginning_from
                    ? `FY ${c.financial_year_beginning_from.substring(0, 4)}`
                    : ''}
                </div>
              </div>
              <span className="text-zinc-300 group-hover:text-zinc-500 text-sm">›</span>
            </button>
          ))}
      </div>

      <div className="px-4 py-2 border-t border-zinc-200 flex justify-end shrink-0 bg-zinc-50">
        <button
          onClick={() => navigate('/')}
          className="text-sm px-4 py-1.5 border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
