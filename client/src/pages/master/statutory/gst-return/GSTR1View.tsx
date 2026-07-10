import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { Button } from '@/components/shadcn/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/shadcn/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shadcn/dialog';
import { EmptyState } from '@/components/blocks/EmptyState';
import { cn } from '@/lib/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function periodLabelFor(month: string, year: string) {
  const m = Number(month);
  const y = Number(year);
  const lastDay = new Date(y, m, 0).getDate();
  const yy = String(y).slice(-2);
  return `1-${MONTHS[m - 1]}-${yy} to ${lastDay}-${MONTHS[m - 1]}-${yy}`;
}

export default function GSTR1View() {
  const { selectedCompany, activeFY } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const today = new Date();
  // When drilled in from Track GST Return Activities, land on the clicked period.
  const [selectedMonth] = useState(
    location.state?.month || String(today.getMonth() + 1).padStart(2, '0'),
  );
  const [selectedYear] = useState(location.state?.year || String(today.getFullYear()));
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gstr1Data, setGstr1Data] = useState<any>(null);
  const [gstr1Errors, setGstr1Errors] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filing, setFiling] = useState<{
    status?: string;
    arn?: string | null;
    filed_at?: string | null;
  } | null>(null);
  const [showErrorsDialog, setShowErrorsDialog] = useState(false);
  const [fetchedRegistration, setFetchedRegistration] = useState<any>(null);
  // True once we know which registration to scope to (the drilled-in one, or the company's
  // first registration when opened standalone). Gates the first data load so the report
  // always takes the live, registration-scoped path — identical to the Track drill — instead
  // of the stale company-wide cached snapshot the backend returns for a null registration.
  const [regResolved, setRegResolved] = useState(false);
  // F5 Nature View — included outward supplies split Local/Interstate × Taxable/Exempted.
  const [natureView, setNatureView] = useState(false);
  const [includedRows, setIncludedRows] = useState<any[]>([]);

  const activeRegistration = location.state?.registration || fetchedRegistration;
  const registrationName = activeRegistration?.state_id
    ? `${activeRegistration.state_id} Registration`
    : ' All Registrations';

  const returnPeriod = `${selectedMonth}${selectedYear}`;

  const loadData = async (forceGenerate = false) => {
    if (!companyId || !fyId) return;
    // Wait until the registration is resolved, so we always compute live and
    // registration-scoped (exactly like the Track drill) — never the stale company-wide
    // cached snapshot the backend returns when the registration id is null.
    if (!regResolved) return;
    try {
      setLoading(true);
      setError(null);
      let result;
      // Scope the return to the registration we drilled into (Assam, etc.), so the
      // counts reflect that GSTIN's outward supplies — not the whole company's.
      const regId = activeRegistration?.gst_id ?? null;
      if (forceGenerate) {
        result = await window.api.gst.generateGSTR1({
          company_id: companyId,
          fy_id: fyId,
          return_period: returnPeriod,
          gst_registration_id: regId,
        });
      } else {
        result = await window.api.gst.getGSTR1({
          company_id: companyId,
          fy_id: fyId,
          return_period: returnPeriod,
          gst_registration_id: regId,
        });
      }

      if (result.success) {
        setGstr1Data(result.payload);
        setGstr1Errors(result.errors || []);
      } else {
        setError(result.error || 'Failed to load GSTR-1 data.');
      }

      // Real Total/Included/Not-Relevant/Uncertain counts — same classifier as the
      // Statistics, Not-Relevant and Uncertain drill screens, so all numbers agree.
      const statsRes = await window.api.gst.getReturnStatistics({
        company_id: companyId,
        fy_id: fyId,
        return_period: returnPeriod,
        return_type: 'GSTR1',
        gst_registration_id: regId,
      });
      setStats(statsRes.success && statsRes.statistics ? statsRes.statistics.totals : null);

      // Real filing status (Status / ARN / ARN Date header) from gst_filings.
      const info = await window.api.gstFiling.getFilingInfo({
        company_id: companyId,
        return_type: 'GSTR1',
        return_period: returnPeriod,
      });
      setFiling(info.success ? info : null);

      // Included voucher rows feed the F5 Nature View aggregation.
      const incRes = await window.api.gst.getReturnVouchers({
        company_id: companyId,
        fy_id: fyId,
        return_period: returnPeriod,
        return_type: 'GSTR1',
        gst_registration_id: regId,
        bucket: 'included',
      });
      setIncludedRows(incRes.success ? incRes.rows || [] : []);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsFiled = async () => {
    if (!companyId || !fyId) return;
    const arn =
      window.prompt('Enter ARN (Acknowledgement Reference Number), or leave blank:', '') ?? '';
    const res = await window.api.gstFiling.markAsFiled({
      company_id: companyId,
      return_type: 'GSTR1',
      fy_id: fyId,
      return_period: returnPeriod,
      arn: arn.trim() || null,
    });
    if (res.success) loadData(false);
    else setError(res.error || 'Failed to mark as filed.');
  };

  // Resolve which registration to scope to before the first load. Drilled in from Track →
  // use that registration. Opened standalone → default to the company's first registration.
  // Either way regId ends up non-null, forcing the live compute path.
  useEffect(() => {
    if (location.state?.registration) {
      setRegResolved(true);
      return;
    }
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const regRes = await window.api.gstRegistration.getAll(companyId);
        if (!cancelled && regRes.success && regRes.gstRegistrations?.length > 0) {
          setFetchedRegistration(regRes.gstRegistrations[0]);
        }
      } catch (err) {
        console.error('Failed to fetch registrations', err);
      } finally {
        if (!cancelled) setRegResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, location.state]);

  useEffect(() => {
    loadData(false);
  }, [companyId, fyId, selectedMonth, selectedYear, regResolved, fetchedRegistration]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'a' && e.altKey) {
        e.preventDefault();
        navigate('/utilities/copilot', {
          state: {
            initialPrompt:
              'Analyze my GSTR-1 return data. Please highlight any anomalies and provide GST correction suggestions.',
          },
        });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigate]);

  // Drill from the "Total Vouchers / Included / Not Relevant" summary lines into the
  // per-voucher-type Statistics screen, scoped to this registration + period.
  const openStatistics = () => {
    navigate('/master/statutory/gst/return-statistics', {
      state: {
        registration: activeRegistration,
        month: selectedMonth,
        year: selectedYear,
        returnType: 'GSTR1',
      },
    });
  };

  // "Included in Return" and its Ready-for-Upload / Not-Uploaded sub-lines drill to the
  // included voucher-type summary; the label follows the drilled line into the register.
  const openIncluded = (statusLabel: string) => {
    navigate('/master/statutory/gst/included-summary', {
      state: {
        registration: activeRegistration,
        month: selectedMonth,
        year: selectedYear,
        returnType: 'GSTR1',
        statusLabel,
      },
    });
  };

  const handleExportJson = () => {
    if (!gstr1Data) return;
    const jsonStr = JSON.stringify(gstr1Data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GSTR1_${activeRegistration?.gstin || 'Export'}_${returnPeriod}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Summaries calculation
  const b2bData = useMemo(() => {
    if (!gstr1Data || !gstr1Data.b2b)
      return { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0, val: 0 };
    let count = 0,
      txval = 0,
      iamt = 0,
      camt = 0,
      samt = 0,
      csamt = 0,
      val = 0;
    gstr1Data.b2b.forEach((party: any) => {
      party.inv.forEach((inv: any) => {
        count++;
        val += inv.val;
        inv.itms.forEach((itm: any) => {
          txval += itm.itm_det.txval;
          iamt += itm.itm_det.iamt || 0;
          camt += itm.itm_det.camt || 0;
          samt += itm.itm_det.samt || 0;
          csamt += itm.itm_det.csamt || 0;
        });
      });
    });
    return { count, txval, iamt, camt, samt, csamt, val };
  }, [gstr1Data]);

  const b2clData = useMemo(() => {
    if (!gstr1Data || !gstr1Data.b2cl)
      return { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0, val: 0 };
    let count = 0,
      txval = 0,
      iamt = 0,
      camt = 0,
      samt = 0,
      csamt = 0,
      val = 0;
    gstr1Data.b2cl.forEach((stateGroup: any) => {
      stateGroup.inv.forEach((inv: any) => {
        count++;
        val += inv.val;
        inv.itms.forEach((itm: any) => {
          txval += itm.itm_det.txval;
          iamt += itm.itm_det.iamt || 0;
          camt += itm.itm_det.camt || 0;
          samt += itm.itm_det.samt || 0;
          csamt += itm.itm_det.csamt || 0;
        });
      });
    });
    return { count, txval, iamt, camt, samt, csamt, val };
  }, [gstr1Data]);

  const b2csData = useMemo(() => {
    if (!gstr1Data || !gstr1Data.b2cs)
      return { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0, val: 0 };
    let count = 0,
      txval = 0,
      iamt = 0,
      camt = 0,
      samt = 0,
      csamt = 0,
      val = 0;
    gstr1Data.b2cs.forEach((item: any) => {
      count++;
      txval += item.txval;
      iamt += item.iamt || 0;
      camt += item.camt || 0;
      samt += item.samt || 0;
      csamt += item.csamt || 0;
      val +=
        item.txval + (item.iamt || 0) + (item.camt || 0) + (item.samt || 0) + (item.csamt || 0);
    });
    return { count, txval, iamt, camt, samt, csamt, val };
  }, [gstr1Data]);

  const cdnrData = useMemo(() => {
    if (!gstr1Data || !gstr1Data.cdnr)
      return { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0, val: 0 };
    let count = 0,
      txval = 0,
      iamt = 0,
      camt = 0,
      samt = 0,
      csamt = 0,
      val = 0;
    gstr1Data.cdnr.forEach((party: any) => {
      party.nt.forEach((note: any) => {
        count++;
        val += note.val;
        note.itms.forEach((itm: any) => {
          txval += itm.itm_det.txval;
          iamt += itm.itm_det.iamt || 0;
          camt += itm.itm_det.camt || 0;
          samt += itm.itm_det.samt || 0;
          csamt += itm.itm_det.csamt || 0;
        });
      });
    });
    return { count, txval, iamt, camt, samt, csamt, val };
  }, [gstr1Data]);

  // Exports (table 6A) — IGST-only (WPAY) or zero-rated (WOPAY); itms are flat, not itm_det.
  const exportsData = useMemo(() => {
    if (!gstr1Data || !gstr1Data.exp)
      return { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0, val: 0 };
    let count = 0,
      txval = 0,
      iamt = 0,
      csamt = 0,
      val = 0;
    gstr1Data.exp.forEach((grp: any) => {
      (grp.inv || []).forEach((inv: any) => {
        count++;
        val += inv.val || 0;
        (inv.itms || []).forEach((it: any) => {
          txval += it.txval || 0;
          iamt += it.iamt || 0;
          csamt += it.csamt || 0;
        });
      });
    });
    return { count, txval, iamt, camt: 0, samt: 0, csamt, val };
  }, [gstr1Data]);

  // CDNUR — credit/debit notes to unregistered (exports/B2CL); itms carry itm_det.
  const cdnurData = useMemo(() => {
    if (!gstr1Data || !gstr1Data.cdnur)
      return { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0, val: 0 };
    let count = 0,
      txval = 0,
      iamt = 0,
      camt = 0,
      samt = 0,
      csamt = 0,
      val = 0;
    gstr1Data.cdnur.forEach((note: any) => {
      count++;
      val += note.val || 0;
      (note.itms || []).forEach((itm: any) => {
        const d = itm.itm_det || itm;
        txval += d.txval || 0;
        iamt += d.iamt || 0;
        camt += d.camt || 0;
        samt += d.samt || 0;
        csamt += d.csamt || 0;
      });
    });
    return { count, txval, iamt, camt, samt, csamt, val };
  }, [gstr1Data]);

  // Nil rated / exempt / non-GST (table 8) — value only, no tax.
  const nilData = useMemo(() => {
    if (!gstr1Data || !gstr1Data.nil || !gstr1Data.nil.inv)
      return { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0, val: 0 };
    let count = 0,
      txval = 0;
    gstr1Data.nil.inv.forEach((r: any) => {
      count++;
      txval += (r.nil_amt || 0) + (r.expt_amt || 0) + (r.ngsup_amt || 0);
    });
    return { count, txval, iamt: 0, camt: 0, samt: 0, csamt: 0, val: txval };
  }, [gstr1Data]);

  const EMPTY = { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0, val: 0 };
  // `section` keys map to the drill engine's classifier; null = a section with no
  // book data (amendments/advances) — its drill shows an honestly empty screen.
  const rows = [
    { label: 'B2B Invoices - 4A, 4B, 4C, 6B, 6C', data: b2bData, bold: true, section: 'b2b' },
    { label: 'B2C (Large) Invoices - 5A, 5B', data: b2clData, section: 'b2cl' },
    { label: 'Exports Invoices - 6A', data: exportsData, section: 'exports' },
    { label: 'Credit or Debit Notes (Registered) - 9B', data: cdnrData, section: 'cdnr' },
    { label: 'Credit or Debit Notes (Unregistered) - 9B', data: cdnurData, section: 'cdnur' },
    { label: 'Amended B2B Invoices - 9A', data: EMPTY, section: null },
    { label: 'Amended B2C (Large) Invoices - 9A', data: EMPTY, section: null },
    { label: 'Amended Exports Invoices - 9A', data: EMPTY, section: null },
    { label: 'Amended Credit or Debit Notes (Registered) - 9C', data: EMPTY, section: null },
    { label: 'Amended Credit or Debit Notes (Unregistered) - 9C', data: EMPTY, section: null },
    { label: 'B2C (Small) Invoices - 7', data: b2csData, section: 'b2cs' },
    { label: 'Nil Rated Invoices - 8A, 8B, 8C, 8D', data: nilData, section: 'nil' },
    { label: 'Amendment B2C (Small) Invoices - 10', data: EMPTY, section: null },
    { label: 'Tax Liability (Advances Received) - 11A(1), 11A(2)', data: EMPTY, section: null },
    { label: 'Adjustment of Advances - 11B(1), 11B(2)', data: EMPTY, section: null },
    { label: 'Amended Tax Liability (Advances Received) - 11A', data: EMPTY, section: null },
    { label: 'Amendment of Adjusted Advances - 11B', data: EMPTY, section: null },
    { label: 'HSN Summary - 12 (B2B - B2C Supplies)', data: EMPTY, section: 'hsn' },
    { label: 'Document Summary - 13', data: EMPTY, section: 'docs' },
  ];

  // Nature View rows: Local vs Interstate, Taxable vs Exempted, from included vouchers.
  const natureRows = useMemo(() => {
    const mk = () => ({ count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0, val: 0 });
    const groups: Record<string, any> = {
      'Local Supplies - Taxable': mk(),
      'Local Supplies - Exempted': mk(),
      'Interstate Supplies - Taxable': mk(),
      'Interstate Supplies - Exempted': mk(),
    };
    for (const r of includedRows) {
      const zone = r.is_interstate ? 'Interstate Supplies' : 'Local Supplies';
      const kind = (r.tax || 0) > 0 || (r.rate || 0) > 0 ? 'Taxable' : 'Exempted';
      const g = groups[`${zone} - ${kind}`];
      g.count++;
      g.txval += r.taxable || 0;
      g.iamt += r.igst || 0;
      g.camt += r.cgst || 0;
      g.samt += r.sgst || 0;
      g.csamt += r.cess || 0;
      g.val += r.invoice || 0;
    }
    return Object.entries(groups).map(([label, data]) => ({ label, data }));
  }, [includedRows]);

  const grandTotal = [
    b2bData,
    b2clData,
    b2csData,
    cdnrData,
    exportsData,
    cdnurData,
    nilData,
  ].reduce(
    (acc, d) => ({
      count: acc.count + d.count,
      txval: acc.txval + d.txval,
      iamt: acc.iamt + d.iamt,
      camt: acc.camt + d.camt,
      samt: acc.samt + d.samt,
      csamt: acc.csamt + d.csamt,
      val: acc.val + d.val,
    }),
    { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0, val: 0 },
  );

  return (
    <TallyReportLayout
      title="GSTR-1"
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <>
          <div className="flex gap-4">
            <span className="w-32">GST Registration</span>
            <span className="font-bold">: {registrationName}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-32">Status</span>
            <span className="font-bold">: {filing?.status || 'Not Filed'}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-32">ARN</span>
            <span className="font-bold">: {filing?.arn || ''}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-32">ARN Date</span>
            <span className="font-bold">: {filing?.filed_at || ''}</span>
          </div>
        </>
      }
      rightSubtitle={
        <>
          <div>{periodLabelFor(selectedMonth, selectedYear)}</div>
          <div className="font-normal text-black-700">
            Last online GST activity: No Activity Found
          </div>
        </>
      }
      footerControls={
        <div className="flex items-center gap-4 ml-4">
          <Button
            onClick={() => setNatureView(!natureView)}
            variant="ghost"
            size="xs"
            className="h-auto p-0 font-bold text-black-900 hover:underline hover:bg-transparent"
          >
            {natureView ? 'F5: Return View' : 'F5: Nature View'}
          </Button>
          <Button
            onClick={() => loadData(true)}
            variant="ghost"
            size="xs"
            className="h-auto p-0 font-bold text-black-900 hover:underline hover:bg-transparent"
          >
            Refresh
          </Button>
          <Button
            onClick={handleMarkAsFiled}
            variant="ghost"
            size="xs"
            className="h-auto p-0 font-bold text-black-900 hover:underline hover:bg-transparent"
          >
            F10: {filing?.status === 'Filed' ? 'Filed ✓' : 'Mark as Filed'}
          </Button>
          <Button
            onClick={handleExportJson}
            variant="ghost"
            size="xs"
            className="h-auto p-0 font-bold text-black-900 hover:underline hover:bg-transparent"
          >
            Alt+E: Export JSON
          </Button>
        </div>
      }
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && (
          <EmptyState message="Computing and compiling GSTR-1 payload..." className="italic" />
        )}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {/* Top Summary Table */}
        <div className="flex flex-col border-b border-gray-300">
          <div className="flex font-bold px-2 py-1 border-b border-gray-200">
            <div className="flex-1">P a r t i c u l a r s</div>
            <div className="w-32 text-right">Voucher Count</div>
          </div>
          <div
            className="flex px-2 py-0.5 font-bold cursor-pointer hover:bg-[#e6f2ff]"
            onClick={() => openStatistics()}
          >
            <div className="flex-1">Total Vouchers</div>
            <div className="w-32 text-right">{stats ? stats.total : ''}</div>
          </div>
          <div
            className="flex px-4 py-0.5 cursor-pointer hover:bg-[#e6f2ff]"
            onClick={() => openIncluded('Included in Return')}
          >
            <div className="flex-1">Included in Return</div>
            <div className="w-32 text-right">
              {stats ? stats.included_ok + stats.included_pending : ''}
            </div>
          </div>
          {/* Included splits Tally-style: complete vouchers awaiting export vs not yet on
              the portal. Offline books have no upload round-trip, so both mirror Included. */}
          <div
            className="flex px-6 py-0.5 text-[#ff8c00] cursor-pointer hover:bg-[#e6f2ff]"
            onClick={() => openIncluded('Ready for Upload')}
          >
            <div className="flex-1">Ready for Upload</div>
            <div className="w-32 text-right">
              {stats ? stats.included_ok + stats.included_pending || '' : ''}
            </div>
          </div>
          <div
            className="flex px-6 py-0.5 text-[#ff8c00] cursor-pointer hover:bg-[#e6f2ff]"
            onClick={() => openIncluded('Not Uploaded')}
          >
            <div className="flex-1">Not Uploaded</div>
            <div className="w-32 text-right">
              {stats ? stats.included_ok + stats.included_pending || '' : ''}
            </div>
          </div>
          <div
            className="flex px-4 py-0.5 text-gray-600 cursor-pointer hover:bg-[#e6f2ff]"
            onClick={() =>
              navigate('/master/statutory/gst/not-relevant', {
                state: {
                  registration: activeRegistration,
                  month: selectedMonth,
                  year: selectedYear,
                  returnType: 'GSTR1',
                },
              })
            }
          >
            <div className="flex-1">Not Relevant for This Return</div>
            <div className="w-32 text-right">{stats ? stats.not_relevant : ''}</div>
          </div>
          <div
            className="flex px-4 py-0.5 text-[#ff8c00] font-bold pb-2 cursor-pointer hover:underline"
            onClick={() =>
              // Tally shows the categorized exception tree first; each concrete
              // exception then opens the Resolution of Uncertain Transactions list.
              navigate('/master/statutory/gst/uncertain/breakdown', {
                state: {
                  registration: activeRegistration,
                  month: selectedMonth,
                  year: selectedYear,
                  annual: false,
                  returnType: 'GSTR1',
                  reportTitle: 'GSTR-1',
                  supplyGroupLabel: 'Outward Supplies',
                },
              })
            }
          >
            <div className="flex-1">Uncertain Transactions (Corrections needed)</div>
            <div className="w-32 text-right">{stats ? stats.uncertain : ''}</div>
          </div>
        </div>

        {/* Particulars Table */}
        <Table className="text-xs table-fixed">
          <TableHeader>
            <TableRow className="border-b border-gray-300 hover:bg-transparent">
              <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">
                P a r t i c u l a r s
              </TableHead>
              <TableHead className="h-auto w-20 px-2 py-1 text-center align-bottom font-bold text-black">
                Vch Count
                <br />
                (Summary)
              </TableHead>
              <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">
                Taxable
                <br />
                Amount
              </TableHead>
              <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">
                IGST
              </TableHead>
              <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">
                CGST
              </TableHead>
              <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">
                SGST/
                <br />
                UTGST
              </TableHead>
              <TableHead className="h-auto w-20 px-2 py-1 text-right align-bottom font-bold text-black">
                Cess
              </TableHead>
              <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">
                Tax
                <br />
                Amount
              </TableHead>
              <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">
                Invoice
                <br />
                Amount
              </TableHead>
            </TableRow>
            <TableRow className="hover:bg-transparent border-0">
              <TableCell colSpan={9} className="px-2 py-1 font-bold">
                {natureView ? 'Nature View' : 'Return View'}
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {natureView &&
              natureRows.map((row) => (
                <TableRow
                  key={row.label}
                  className={cn('border-0', row.data.count === 0 ? 'text-gray-600' : 'text-black')}
                >
                  <TableCell className="px-2 py-0.5 pl-4">{row.label}</TableCell>
                  <TableCell className="px-2 py-0.5 text-center">{row.data.count || ''}</TableCell>
                  <TableCell className="px-2 py-0.5 text-right">
                    {row.data.txval ? row.data.txval.toFixed(2) : ''}
                  </TableCell>
                  <TableCell className="px-2 py-0.5 text-right">
                    {row.data.iamt ? row.data.iamt.toFixed(2) : ''}
                  </TableCell>
                  <TableCell className="px-2 py-0.5 text-right">
                    {row.data.camt ? row.data.camt.toFixed(2) : ''}
                  </TableCell>
                  <TableCell className="px-2 py-0.5 text-right">
                    {row.data.samt ? row.data.samt.toFixed(2) : ''}
                  </TableCell>
                  <TableCell className="px-2 py-0.5 text-right">
                    {row.data.csamt ? row.data.csamt.toFixed(2) : ''}
                  </TableCell>
                  <TableCell className="px-2 py-0.5 text-right">
                    {row.data.iamt + row.data.camt + row.data.samt + row.data.csamt
                      ? (row.data.iamt + row.data.camt + row.data.samt + row.data.csamt).toFixed(2)
                      : ''}
                  </TableCell>
                  <TableCell className="px-2 py-0.5 text-right">
                    {row.data.val ? row.data.val.toFixed(2) : ''}
                  </TableCell>
                </TableRow>
              ))}
            {!natureView &&
              rows.map((row, idx) => {
                const isSelected = selectedRow === idx;
                return (
                  <TableRow
                    key={idx}
                    onClick={() => {
                      setSelectedRow(idx);
                      navigate('/master/statutory/gstr1/section', {
                        state: {
                          registration: activeRegistration,
                          month: selectedMonth,
                          year: selectedYear,
                          section: row.section,
                          label: row.label,
                          returnType: 'GSTR1',
                        },
                      });
                    }}
                    className={cn(
                      'border-0 cursor-pointer hover:bg-[#e6f2ff]',
                      isSelected
                        ? 'bg-[#ffcc00] text-black font-bold hover:bg-[#ffcc00]'
                        : row.data.count === 0
                          ? 'text-gray-600'
                          : 'text-black',
                    )}
                  >
                    <TableCell className="px-2 py-0.5 pl-4">{row.label}</TableCell>
                    <TableCell className="px-2 py-0.5 text-center">
                      {row.data.count || ''}
                    </TableCell>
                    <TableCell className="px-2 py-0.5 text-right">
                      {row.data.txval ? row.data.txval.toFixed(2) : ''}
                    </TableCell>
                    <TableCell className="px-2 py-0.5 text-right">
                      {row.data.iamt ? row.data.iamt.toFixed(2) : ''}
                    </TableCell>
                    <TableCell className="px-2 py-0.5 text-right">
                      {row.data.camt ? row.data.camt.toFixed(2) : ''}
                    </TableCell>
                    <TableCell className="px-2 py-0.5 text-right">
                      {row.data.samt ? row.data.samt.toFixed(2) : ''}
                    </TableCell>
                    <TableCell className="px-2 py-0.5 text-right">
                      {row.data.csamt ? row.data.csamt.toFixed(2) : ''}
                    </TableCell>
                    <TableCell className="px-2 py-0.5 text-right">
                      {row.data.iamt + row.data.camt + row.data.samt + row.data.csamt
                        ? (row.data.iamt + row.data.camt + row.data.samt + row.data.csamt).toFixed(
                            2,
                          )
                        : ''}
                    </TableCell>
                    <TableCell className="px-2 py-0.5 text-right">
                      {row.data.val ? row.data.val.toFixed(2) : ''}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>

          {/* Total Row */}
          <TableFooter className="bg-transparent">
            <TableRow className="border-t border-gray-300 hover:bg-transparent font-bold">
              <TableCell className="px-2 py-1 text-center pr-4">Total</TableCell>
              <TableCell className="w-20 px-2 py-1 text-center">{grandTotal.count || ''}</TableCell>
              <TableCell className="w-24 px-2 py-1 text-right">
                {grandTotal.txval ? grandTotal.txval.toFixed(2) : ''}
              </TableCell>
              <TableCell className="w-24 px-2 py-1 text-right">
                {grandTotal.iamt ? grandTotal.iamt.toFixed(2) : ''}
              </TableCell>
              <TableCell className="w-24 px-2 py-1 text-right">
                {grandTotal.camt ? grandTotal.camt.toFixed(2) : ''}
              </TableCell>
              <TableCell className="w-24 px-2 py-1 text-right">
                {grandTotal.samt ? grandTotal.samt.toFixed(2) : ''}
              </TableCell>
              <TableCell className="w-20 px-2 py-1 text-right">
                {grandTotal.csamt ? grandTotal.csamt.toFixed(2) : ''}
              </TableCell>
              <TableCell className="w-24 px-2 py-1 text-right">
                {grandTotal.iamt + grandTotal.camt + grandTotal.samt + grandTotal.csamt
                  ? (
                      grandTotal.iamt +
                      grandTotal.camt +
                      grandTotal.samt +
                      grandTotal.csamt
                    ).toFixed(2)
                  : ''}
              </TableCell>
              <TableCell className="w-24 px-2 py-1 text-right">
                {grandTotal.val ? grandTotal.val.toFixed(2) : ''}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <Dialog open={showErrorsDialog} onOpenChange={setShowErrorsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 font-bold">
              Uncertain Transactions (GST Exceptions)
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Table className="text-xs">
              <TableHeader className="bg-zinc-100">
                <TableRow>
                  <TableHead className="font-bold">Voucher No</TableHead>
                  <TableHead className="font-bold">Error Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gstr1Errors.map((err, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium text-blue-600 cursor-pointer">
                      {err.voucher_number || 'N/A'}
                    </TableCell>
                    <TableCell className="text-red-600">{err.error}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowErrorsDialog(false)} size="sm">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TallyReportLayout>
  );
}
