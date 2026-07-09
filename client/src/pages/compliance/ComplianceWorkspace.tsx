import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FullScreenPanel from '@/components/ui/FullScreenPanel';
import Tabs from '@/components/ui/Tabs';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import DataTable, { type TableColumn } from '@/components/ui/DataTable';
import { useCompany } from '@/context/CompanyContext';
import type { IntegrationStatus } from '@/types/api/GstIntegrations';

const TABS = [
  { value: 'einvoice', label: 'e-Invoice' },
  { value: 'eway', label: 'e-Way Bill' },
  { value: 'filing', label: 'GST Filing' },
  { value: 'portal', label: 'Portal Downloads' },
];

function StatusBar({ status }: { status: IntegrationStatus | null }) {
  if (!status) return null;
  return (
    <div className="flex items-center gap-4 px-3 py-1.5 border-b border-zinc-200 bg-zinc-50 text-[11px] text-zinc-600">
      <span>
        Status:{' '}
        <span className="font-semibold text-zinc-900">
          {status.configured ? 'Connected' : 'Not configured'}
        </span>
      </span>
      {status.gstin && <span>GSTIN: {status.gstin}</span>}
      <span>Mode: {status.sandbox === false ? 'production' : 'sandbox'}</span>
      {!status.configured && (
        <span className="text-zinc-500">— set the GST_* variables in .env</span>
      )}
    </div>
  );
}

// ---- e-Invoice tab ----------------------------------------------------------
function EInvoiceTab({ companyId }: { companyId: number }) {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [st, rec] = await Promise.all([
      window.api.eInvoice.getStatus(companyId),
      window.api.eInvoice.getRecords(companyId),
    ]);
    setStatus(st);
    setRows(rec.success ? rec.records : []);
    setLoading(false);
  }, [companyId]);
  useEffect(() => {
    load();
  }, [load]);

  const cols: TableColumn[] = [
    { key: 'invoice_number', label: 'Invoice', span: 'col-span-2' },
    { key: 'invoice_date', label: 'Date', span: 'col-span-2' },
    {
      key: 'irn',
      label: 'IRN',
      span: 'col-span-4',
      render: (r) => (
        <span className="truncate" title={r.irn || ''}>
          {r.irn || '—'}
        </span>
      ),
    },
    { key: 'ack_no', label: 'Ack No', span: 'col-span-2', render: (r) => r.ack_no || '—' },
    {
      key: 'status',
      label: 'Status',
      span: 'col-span-2',
      render: (r) => (
        <span className={r.status === 'CANCELLED' ? 'font-bold' : ''}>{r.status}</span>
      ),
    },
  ];

  return (
    <div>
      <StatusBar status={status} />
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-zinc-500">
            {rows.length} IRN(s). Generate an e-Invoice from a sales voucher (Voucher View →
            e-Invoice).
          </span>
          <Button variant="secondary" size="sm" onClick={load}>
            Refresh
          </Button>
        </div>
        <DataTable
          columns={cols}
          rows={rows}
          rowKey={(r) => r.irn_id}
          loading={loading}
          variant="report"
          emptyMessage="No e-Invoices generated yet."
        />
      </div>
    </div>
  );
}

// ---- e-Way Bill tab ---------------------------------------------------------
// Direct NIC portal lookups (client-cred auth, no OTP). Each takes a single query value.
const EWAY_LOOKUPS: { value: string; label: string; param: string | null }[] = [
  { value: 'get', label: 'e-Way Bill by EWB No', param: 'EWB No' },
  { value: 'byDate', label: 'e-Way Bills by Date', param: 'Date (dd/mm/yyyy)' },
  { value: 'getGstinDetails', label: 'GSTIN details', param: 'GSTIN' },
  { value: 'getTransporterDetails', label: 'Transporter details', param: 'Transporter ID (TRN)' },
  { value: 'getHsnDetails', label: 'HSN details', param: 'HSN code' },
  { value: 'getErrorList', label: 'NIC error-code list', param: null },
];

function EwayTab({ companyId }: { companyId: number }) {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lkType, setLkType] = useState('get');
  const [lkValue, setLkValue] = useState('');
  const [lkBusy, setLkBusy] = useState(false);
  const [lkMsg, setLkMsg] = useState<string | null>(null);
  const [lkResult, setLkResult] = useState<unknown>(null);
  const activeLookup = EWAY_LOOKUPS.find((l) => l.value === lkType)!;

  const runLookup = async () => {
    if (activeLookup.param && !lkValue.trim()) {
      setLkMsg(`Enter ${activeLookup.param}.`);
      return;
    }
    setLkBusy(true);
    setLkMsg(null);
    setLkResult(null);
    const api = window.api.ewayBill as any;
    const v = lkValue.trim();
    const res = lkType === 'getErrorList' ? await api.getErrorList() : await api[lkType](v);
    setLkBusy(false);
    if (res.success) {
      setLkResult(res.data ?? null);
      const n = Array.isArray(res.data) ? res.data.length : null;
      setLkMsg(`OK${n != null ? ` — ${n} row(s)` : ''}`);
    } else setLkMsg(res.error || 'Lookup failed');
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [st, rec] = await Promise.all([
      window.api.ewayBill.getStatus(companyId),
      window.api.ewayBill.getRecords(companyId),
    ]);
    setStatus(st);
    setRows(rec.success ? rec.records : []);
    setLoading(false);
  }, [companyId]);
  useEffect(() => {
    load();
  }, [load]);

  const cols: TableColumn[] = [
    { key: 'ewb_no', label: 'EWB No', span: 'col-span-3' },
    { key: 'ewb_date', label: 'Date', span: 'col-span-2', render: (r) => r.ewb_date || '—' },
    {
      key: 'valid_upto',
      label: 'Valid Upto',
      span: 'col-span-3',
      render: (r) => r.valid_upto || '—',
    },
    {
      key: 'irn',
      label: 'IRN',
      span: 'col-span-2',
      render: (r) => (
        <span className="truncate" title={r.irn || ''}>
          {r.irn ? 'linked' : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      span: 'col-span-2',
      render: (r) => (
        <span className={r.status === 'CANCELLED' ? 'font-bold' : ''}>{r.status}</span>
      ),
    },
  ];

  return (
    <div>
      <StatusBar status={status} />
      <div className="p-3">
        <div className="border border-zinc-200 p-3 mb-4">
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2">
            e-Way Bill lookups
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-56">
              <label className="text-[10px] text-zinc-500 block mb-0.5">Lookup</label>
              <Select
                value={lkType}
                onChange={(e) => {
                  setLkType(e.target.value);
                  setLkValue('');
                  setLkResult(null);
                  setLkMsg(null);
                }}
                options={EWAY_LOOKUPS.map((l) => ({ value: l.value, label: l.label }))}
              />
            </div>
            {activeLookup.param && (
              <div className="w-56">
                <label className="text-[10px] text-zinc-500 block mb-0.5">
                  {activeLookup.param}
                </label>
                <Input value={lkValue} onChange={(e) => setLkValue(e.target.value)} />
              </div>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={runLookup}
              disabled={lkBusy || !status?.configured}
            >
              Fetch
            </Button>
            {lkMsg && <span className="text-[11px] text-zinc-700 pb-2">{lkMsg}</span>}
          </div>
          {lkResult != null && (
            <pre className="border border-zinc-200 bg-zinc-50 text-[11px] text-zinc-800 font-mono p-3 mt-2 overflow-auto max-h-[40vh] whitespace-pre-wrap break-words">
              {JSON.stringify(lkResult, null, 2)}
            </pre>
          )}
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-zinc-500">
            {rows.length} e-Way Bill(s). Generate from a sales voucher (Voucher View → e-Way Bill).
          </span>
          <Button variant="secondary" size="sm" onClick={load}>
            Refresh
          </Button>
        </div>
        <DataTable
          columns={cols}
          rows={rows}
          rowKey={(r) => r.ewb_id}
          loading={loading}
          variant="report"
          emptyMessage="No e-Way Bills generated yet."
        />
      </div>
    </div>
  );
}

// ---- GST Filing tab ---------------------------------------------------------
function FilingTab({ companyId, fyId }: { companyId: number; fyId: number | undefined }) {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [returnType, setReturnType] = useState('GSTR1');
  const [period, setPeriod] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [session, setSession] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [st, f] = await Promise.all([
      window.api.gstFiling.getStatus(companyId),
      window.api.gstFiling.getFilings(companyId),
    ]);
    setStatus(st);
    setSession(!!(st as any)?.gstSession);
    setRows(f.success ? f.filings : []);
    setLoading(false);
  }, [companyId]);
  useEffect(() => {
    load();
  }, [load]);

  // Open a GSTN session: send a login OTP to the taxpayer's registered mobile, then verify it.
  const login = async () => {
    setBusy(true);
    setMsg('Sending login OTP to the registered mobile…');
    const r = await window.api.gstFiling.requestOtp(companyId);
    if (!r.success) {
      setBusy(false);
      setMsg(r.error || 'Could not send OTP');
      return;
    }
    const otp = window.prompt("Enter the OTP sent to the taxpayer's GSTN-registered mobile:") || '';
    if (!otp.trim()) {
      setBusy(false);
      setMsg('Login cancelled');
      return;
    }
    const a = await window.api.gstFiling.authenticate({ company_id: companyId, otp: otp.trim() });
    setBusy(false);
    if (a.success) {
      setSession(true);
      setMsg('GSTN session active — you can Save / File now.');
    } else setMsg(a.error || 'OTP verification failed');
  };

  const run = async (kind: 'prepare' | 'save') => {
    if (!period.match(/^\d{6}$/)) {
      setMsg('Enter the return period as MMYYYY (e.g. 062026).');
      return;
    }
    setBusy(true);
    setMsg(null);
    const args = {
      company_id: companyId,
      return_type: returnType,
      fy_id: fyId || 0,
      return_period: period,
    };
    const res =
      kind === 'prepare'
        ? await window.api.gstFiling.prepare(args)
        : await window.api.gstFiling.saveToPortal(args);
    setBusy(false);
    setMsg(
      res.success
        ? `${kind} ok${res.reference_id ? ` — ref ${res.reference_id}` : ''}`
        : res.error || `${kind} failed`,
    );
    load();
  };

  // File with EVC: request an EVC OTP (distinct from the login OTP), then commit.
  const file = async () => {
    if (!period.match(/^\d{6}$/)) {
      setMsg('Enter the return period as MMYYYY (e.g. 062026).');
      return;
    }
    if (!window.confirm(`File ${returnType} for ${period}? Filing is irreversible.`)) return;
    setBusy(true);
    setMsg('Sending EVC OTP to the registered mobile…');
    const e = await window.api.gstFiling.requestEvc(companyId);
    if (!e.success) {
      setBusy(false);
      setMsg(e.error || 'Could not send EVC OTP');
      return;
    }
    const otp = window.prompt('Enter the EVC OTP sent to the registered mobile to file:') || '';
    if (!otp.trim()) {
      setBusy(false);
      setMsg('Filing cancelled');
      return;
    }
    const res = await window.api.gstFiling.fileReturn({
      company_id: companyId,
      return_type: returnType,
      fy_id: fyId || 0,
      return_period: period,
      evc_otp: otp.trim(),
    });
    setBusy(false);
    setMsg(res.success ? `Filed — ARN ${res.arn || '(pending)'}` : res.error || 'file failed');
    load();
  };

  const cols: TableColumn[] = [
    { key: 'return_type', label: 'Return', span: 'col-span-2' },
    { key: 'return_period', label: 'Period', span: 'col-span-2' },
    {
      key: 'status',
      label: 'Status',
      span: 'col-span-2',
      render: (r) => <span className={r.status === 'FILED' ? 'font-bold' : ''}>{r.status}</span>,
    },
    { key: 'arn', label: 'ARN', span: 'col-span-3', render: (r) => r.arn || '—' },
    { key: 'updated_at', label: 'Updated', span: 'col-span-3' },
  ];

  return (
    <div>
      <StatusBar status={status} />
      <div className="p-3">
        <div className="border border-zinc-200 p-3 mb-4">
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2">
            Prepare &amp; file a return
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40">
              <label className="text-[10px] text-zinc-500 block mb-0.5">Return</label>
              <Select
                value={returnType}
                onChange={(e) => setReturnType(e.target.value)}
                options={[
                  { value: 'GSTR1', label: 'GSTR-1' },
                  { value: 'GSTR3B', label: 'GSTR-3B' },
                ]}
              />
            </div>
            <div className="w-40">
              <label className="text-[10px] text-zinc-500 block mb-0.5">Period (MMYYYY)</label>
              <Input
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="062026"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={() => run('prepare')} disabled={busy}>
              Prepare
            </Button>
            <Button
              variant={session ? 'secondary' : 'primary'}
              size="sm"
              onClick={login}
              disabled={busy || !status?.configured}
            >
              {session ? 'Session active ✓ — re-login' : 'Login to GSTN (OTP)'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => run('save')}
              disabled={busy || !status?.configured || !session}
            >
              Save to portal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={file}
              disabled={busy || !status?.configured || !session}
            >
              File
            </Button>
            {msg && <span className="text-[11px] text-zinc-700 pb-2">{msg}</span>}
          </div>
          <p className="text-[10px] text-zinc-400 mt-2">
            Prepare computes locally. Login opens a GSTN session via an OTP to the registered
            mobile. Save uploads (reversible). File commits with a second EVC OTP (irreversible).
          </p>
        </div>
        <DataTable
          columns={cols}
          rows={rows}
          rowKey={(r) => r.filing_id}
          loading={loading}
          variant="report"
          emptyMessage="No filings yet."
        />
      </div>
    </div>
  );
}

// ---- Portal Downloads tab ---------------------------------------------------
// Pulls supplier/return data straight from the GSTN portal (GSTR-2A/2B section downloads,
// summaries, return tracking) over the taxpayer's live OTP session. Everything here rides the
// gstPortalService seam wired to window.api.gstFiling.
const PORTAL_RETURNS: { value: string; label: string; sections: string[] }[] = [
  {
    value: 'gstr2a',
    label: 'GSTR-2A (inward)',
    sections: ['b2b', 'b2ba', 'cdn', 'cdna', 'isd', 'tds', 'tcs', 'impg'],
  },
  { value: 'gstr2b', label: 'GSTR-2B (ITC statement)', sections: ['all', 'b2b', 'cdnr', 'impg'] },
  { value: 'gstr2x', label: 'GSTR-2X (TDS/TCS credit)', sections: ['tds', 'tcs'] },
];

function PortalTab({ companyId }: { companyId: number }) {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [session, setSession] = useState(false);
  const [retType, setRetType] = useState('gstr2a');
  const [section, setSection] = useState('b2b');
  const [period, setPeriod] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  const load = useCallback(async () => {
    const st = await window.api.gstFiling.getStatus(companyId);
    setStatus(st);
    setSession(!!(st as any)?.gstSession);
  }, [companyId]);
  useEffect(() => {
    load();
  }, [load]);

  const sections = PORTAL_RETURNS.find((r) => r.value === retType)?.sections || [];

  // Same GSTN login as the Filing tab — the session is server-side global, so logging in here
  // unlocks Save/File on the Filing tab too (and vice-versa).
  const login = async () => {
    setBusy(true);
    setMsg('Sending login OTP to the registered mobile…');
    const r = await window.api.gstFiling.requestOtp(companyId);
    if (!r.success) {
      setBusy(false);
      setMsg(r.error || 'Could not send OTP');
      return;
    }
    const otp = window.prompt("Enter the OTP sent to the taxpayer's GSTN-registered mobile:") || '';
    if (!otp.trim()) {
      setBusy(false);
      setMsg('Login cancelled');
      return;
    }
    const a = await window.api.gstFiling.authenticate({ company_id: companyId, otp: otp.trim() });
    setBusy(false);
    if (a.success) {
      setSession(true);
      setMsg('GSTN session active — you can download now.');
    } else setMsg(a.error || 'OTP verification failed');
  };

  const download = async () => {
    if (!period.match(/^\d{6}$/)) {
      setMsg('Enter the return period as MMYYYY (e.g. 062026).');
      return;
    }
    setBusy(true);
    setMsg(null);
    setResult(null);
    const res = await window.api.gstFiling.getSection(retType, section, { retperiod: period });
    setBusy(false);
    if (res.success) {
      setResult(res.data ?? null);
      const n = Array.isArray(res.data) ? res.data.length : null;
      setMsg(
        `Downloaded ${retType.toUpperCase()} / ${section} for ${period}${n != null ? ` — ${n} row(s)` : ''}.`,
      );
    } else {
      setMsg(res.error || 'Download failed');
    }
  };

  const rowCount = Array.isArray(result) ? result.length : null;

  return (
    <div>
      <StatusBar status={status} />
      <div className="p-3">
        <div className="border border-zinc-200 p-3 mb-4">
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2">
            Download from GST portal
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-52">
              <label className="text-[10px] text-zinc-500 block mb-0.5">Return</label>
              <Select
                value={retType}
                onChange={(e) => {
                  const t = e.target.value;
                  setRetType(t);
                  setSection(PORTAL_RETURNS.find((r) => r.value === t)?.sections[0] || '');
                }}
                options={PORTAL_RETURNS.map((r) => ({ value: r.value, label: r.label }))}
              />
            </div>
            <div className="w-40">
              <label className="text-[10px] text-zinc-500 block mb-0.5">Section</label>
              <Select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                options={sections.map((s) => ({ value: s, label: s.toUpperCase() }))}
              />
            </div>
            <div className="w-40">
              <label className="text-[10px] text-zinc-500 block mb-0.5">Period (MMYYYY)</label>
              <Input
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="062026"
              />
            </div>
            <Button
              variant={session ? 'secondary' : 'primary'}
              size="sm"
              onClick={login}
              disabled={busy || !status?.configured}
            >
              {session ? 'Session active ✓ — re-login' : 'Login to GSTN (OTP)'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={download}
              disabled={busy || !status?.configured || !session}
            >
              Download
            </Button>
            {msg && <span className="text-[11px] text-zinc-700 pb-2">{msg}</span>}
          </div>
          <p className="text-[10px] text-zinc-400 mt-2">
            Login opens a GSTN session via an OTP to the registered mobile. Downloads pull live
            portal data for the period — the raw portal response is shown below for reconciliation.
          </p>
        </div>

        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-zinc-500">
            {result == null
              ? 'No data downloaded yet.'
              : rowCount != null
                ? `${rowCount} row(s) in this section.`
                : 'Portal response:'}
          </span>
        </div>
        <pre className="border border-zinc-200 bg-zinc-50 text-[11px] text-zinc-800 font-mono p-3 overflow-auto max-h-[52vh] whitespace-pre-wrap break-words">
          {result == null ? '—' : JSON.stringify(result, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default function ComplianceWorkspace() {
  const navigate = useNavigate();
  const { tab } = useParams();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const active = TABS.some((t) => t.value === tab) ? (tab as string) : 'einvoice';

  if (!companyId) {
    return (
      <FullScreenPanel title="GST & e-Invoicing" onClose={() => navigate('/')}>
        <div className="p-6 text-xs text-zinc-500">Select a company first.</div>
      </FullScreenPanel>
    );
  }

  return (
    <FullScreenPanel title="GST & e-Invoicing" onClose={() => navigate('/')}>
      <div className="flex flex-col min-h-full">
        <div className="sticky top-0 z-10 bg-white">
          <Tabs tabs={TABS} value={active} onChange={(v) => navigate(`/compliance/${v}`)} />
        </div>
        <div className="flex-1 min-h-0">
          {active === 'einvoice' && <EInvoiceTab companyId={companyId} />}
          {active === 'eway' && <EwayTab companyId={companyId} />}
          {active === 'filing' && <FilingTab companyId={companyId} fyId={activeFY?.fy_id} />}
          {active === 'portal' && <PortalTab companyId={companyId} />}
        </div>
      </div>
    </FullScreenPanel>
  );
}
