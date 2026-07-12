import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { Button } from '@/components/shadcn/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/shadcn/table';
import { EmptyState } from '@/components/blocks/EmptyState';
import { cn } from '@/lib/utils';

interface TaxAmount {
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  cess: number;
}

const ZERO: TaxAmount = { txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0 };

// GST state codes → name, for labelling table 3.2's per-state rows.
const GST_STATE_NAMES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman & Diu',
  '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh',
  '96': 'Foreign',
  '97': 'Other Territory',
};
export const posStateLabel = (pos: any) => {
  const code = String(pos ?? '').padStart(2, '0');
  return GST_STATE_NAMES[code] || `State ${pos ?? '?'}`;
};

function fmt(n: number) {
  return n ? n.toFixed(2) : '';
}

function taxTotal(t: TaxAmount) {
  return t.iamt + t.camt + t.samt + t.cess;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function periodLabelFor(month: string, year: string) {
  const m = Number(month);
  const y = Number(year);
  const lastDay = new Date(y, m, 0).getDate();
  const yy = String(y).slice(-2);
  return `1-${MONTHS[m - 1]}-${yy} to ${lastDay}-${MONTHS[m - 1]}-${yy}`;
}

export default function GSTR3BView() {
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
  // F5 Nature View — Liability (outward) + ITC (inward), split Local/Interstate.
  const [natureView, setNatureView] = useState(false);
  const [includedRows, setIncludedRows] = useState<any[]>([]);

  // Drill from the summary lines into the per-voucher-type Statistics screen.
  const openStatistics = () => {
    navigate('/master/statutory/gst/return-statistics', {
      state: {
        registration: location.state?.registration || fetchedRegistration,
        month: selectedMonth,
        year: selectedYear,
        returnType: 'GSTR3B',
      },
    });
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gstr3bData, setGstr3bData] = useState<any>(null);
  const [fetchedRegistration, setFetchedRegistration] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [filing, setFiling] = useState<{
    status?: string;
    arn?: string | null;
    filed_at?: string | null;
  } | null>(null);

  const activeRegistration = location.state?.registration || fetchedRegistration;
  const registrationName = activeRegistration?.state_id
    ? `${activeRegistration.state_id} Registration`
    : 'All Registrations';

  const returnPeriod = `${selectedMonth}${selectedYear}`;

  const loadData = async (forceGenerate = false) => {
    if (!companyId || !fyId) return;

    if (!location.state?.registration && !fetchedRegistration) {
      try {
        const regRes = await window.api.gstRegistration.getAll(companyId);
        if (regRes.success && regRes.gstRegistrations?.length > 0) {
          setFetchedRegistration(regRes.gstRegistrations[0]);
        }
      } catch (err) {
        console.error('Failed to fetch registrations', err);
      }
    }

    try {
      setLoading(true);
      setError(null);
      // Scope the return to the registration we drilled into.
      const regId = (location.state?.registration || fetchedRegistration)?.gst_id ?? null;
      let result;
      if (forceGenerate) {
        result = await window.api.gst.generateGSTR3B({
          company_id: companyId,
          fy_id: fyId,
          return_period: returnPeriod,
          gst_registration_id: regId,
        });
      } else {
        result = await window.api.gst.getGSTR3B({
          company_id: companyId,
          fy_id: fyId,
          return_period: returnPeriod,
          gst_registration_id: regId,
        });
      }

      if (result.success) {
        setGstr3bData(result.payload);
      } else {
        setError(result.error || 'Failed to load GSTR-3B data.');
      }

      // Real classification counts — same engine as the drill screens.
      const statsRes = await window.api.gst.getReturnStatistics({
        company_id: companyId,
        fy_id: fyId,
        return_period: returnPeriod,
        return_type: 'GSTR3B',
        gst_registration_id: regId,
      });
      setStats(statsRes.success && statsRes.statistics ? statsRes.statistics.totals : null);

      // Included voucher rows feed the F5 Nature View (Liability vs ITC × Local/Interstate).
      const incRes = await window.api.gst.getReturnVouchers({
        company_id: companyId,
        fy_id: fyId,
        return_period: returnPeriod,
        return_type: 'GSTR3B',
        gst_registration_id: regId,
        bucket: 'included',
      });
      setIncludedRows(incRes.success ? incRes.rows || [] : []);

      // Real filing status (Status / ARN header) from gst_filings.
      const info = await window.api.gstFiling.getFilingInfo({
        company_id: companyId,
        return_type: 'GSTR3B',
        return_period: returnPeriod,
      });
      setFiling(info.success ? info : null);
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
      return_type: 'GSTR3B',
      fy_id: fyId,
      return_period: returnPeriod,
      arn: arn.trim() || null,
    });
    if (res.success) loadData(false);
    else setError(res.error || 'Failed to mark as filed.');
  };

  useEffect(() => {
    loadData(false);
  }, [companyId, fyId, selectedMonth, selectedYear]);

  const handleExportJson = () => {
    if (!gstr3bData) return;
    const jsonStr = JSON.stringify(gstr3bData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GSTR3B_${activeRegistration?.gstin || 'Export'}_${returnPeriod}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Section data derived from payload ──────────────────────────────────────

  // 3.1 Tax on Outward and Reverse Charge Inward Supplies
  const s31_osup_det: TaxAmount = gstr3bData?.sup_details?.osup_det ?? ZERO; // (a) outward taxable
  const s31_osup_zero: TaxAmount = gstr3bData?.sup_details?.osup_zero ?? ZERO; // (b) outward zero-rated
  const s31_osup_nil_exmp: TaxAmount = gstr3bData?.sup_details?.osup_nil_exmp ?? ZERO; // (c) other outward
  const s31_isup_rev: TaxAmount = gstr3bData?.sup_details?.isup_rev ?? ZERO; // (d) inward reverse charge
  const s31_osup_nongst: TaxAmount = gstr3bData?.sup_details?.osup_nongst ?? ZERO; // (e) non-GST

  // 3.2 Interstate Supplies — aggregate for the section row; the per-state breakup
  // lives on the drilled "GSTR-3B - Summary" screen (Tally's pattern).
  const interSupTotal: TaxAmount = [
    ...(gstr3bData?.inter_sup?.unreg_details || []),
    ...(gstr3bData?.inter_sup?.comp_details || []),
    ...(gstr3bData?.inter_sup?.uin_details || []),
  ].reduce(
    (acc: TaxAmount, r: any) => ({
      txval: acc.txval + (r?.txval || 0),
      iamt: acc.iamt + (r?.iamt || 0),
      camt: acc.camt,
      samt: acc.samt,
      cess: acc.cess,
    }),
    { ...ZERO },
  );

  // 4 ITC
  const s4A_itc_avl_impg: TaxAmount = gstr3bData?.itc_elg?.itc_avl?.[0] ?? ZERO; // import of goods
  const s4A_itc_avl_imps: TaxAmount = gstr3bData?.itc_elg?.itc_avl?.[1] ?? ZERO; // import of services
  const s4A_itc_avl_isrc: TaxAmount = gstr3bData?.itc_elg?.itc_avl?.[2] ?? ZERO; // inward supplies liable to reverse charge
  const s4A_itc_avl_isd: TaxAmount = gstr3bData?.itc_elg?.itc_avl?.[3] ?? ZERO; // inward supplies from ISD
  const s4A_itc_avl_ohh: TaxAmount = gstr3bData?.itc_elg?.itc_avl?.[4] ?? ZERO; // all other ITC
  const s4B_itc_rev: TaxAmount = gstr3bData?.itc_elg?.itc_rev?.[0] ?? ZERO;
  const s4D1_itc_reclaim: TaxAmount = gstr3bData?.itc_elg?.itc_inelg?.[0] ?? ZERO;
  const s4D2_itc_inelg: TaxAmount = gstr3bData?.itc_elg?.itc_inelg?.[1] ?? ZERO;

  // Net ITC (A - B)
  const s4C: TaxAmount = {
    txval: 0,
    iamt:
      s4A_itc_avl_impg.iamt +
      s4A_itc_avl_imps.iamt +
      s4A_itc_avl_isrc.iamt +
      s4A_itc_avl_isd.iamt +
      s4A_itc_avl_ohh.iamt -
      s4B_itc_rev.iamt,
    camt:
      s4A_itc_avl_impg.camt +
      s4A_itc_avl_imps.camt +
      s4A_itc_avl_isrc.camt +
      s4A_itc_avl_isd.camt +
      s4A_itc_avl_ohh.camt -
      s4B_itc_rev.camt,
    samt:
      s4A_itc_avl_impg.samt +
      s4A_itc_avl_imps.samt +
      s4A_itc_avl_isrc.samt +
      s4A_itc_avl_isd.samt +
      s4A_itc_avl_ohh.samt -
      s4B_itc_rev.samt,
    cess:
      s4A_itc_avl_impg.cess +
      s4A_itc_avl_imps.cess +
      s4A_itc_avl_isrc.cess +
      s4A_itc_avl_isd.cess +
      s4A_itc_avl_ohh.cess -
      s4B_itc_rev.cess,
  };

  // 5 Exempt / Nil / Non-GST
  const s5_nil: TaxAmount = gstr3bData?.inward_sup?.isup_details?.[0] ?? ZERO;
  const s5_nongst: TaxAmount = gstr3bData?.inward_sup?.isup_details?.[1] ?? ZERO;

  // 6.1 Interest / Late fee
  const s61_intr: TaxAmount = gstr3bData?.intr_ltfee?.intr_details ?? ZERO;

  const sumTax = (list: TaxAmount[]): TaxAmount =>
    list.reduce(
      (acc, r) => ({
        txval: acc.txval + r.txval,
        iamt: acc.iamt + r.iamt,
        camt: acc.camt + r.camt,
        samt: acc.samt + r.samt,
        cess: acc.cess + r.cess,
      }),
      { ...ZERO },
    );

  // Section aggregates — Tally's return view shows one row per table with its
  // total; the line-wise breakup opens on drill ("GSTR-3B - Summary").
  const s31Total = sumTax([
    s31_osup_det,
    s31_osup_zero,
    s31_osup_nil_exmp,
    s31_isup_rev,
    s31_osup_nongst,
  ]);
  const s4ATotal = sumTax([
    s4A_itc_avl_impg,
    s4A_itc_avl_imps,
    s4A_itc_avl_isrc,
    s4A_itc_avl_isd,
    s4A_itc_avl_ohh,
  ]);
  const s5Total = sumTax([s5_nil, s5_nongst]);

  // ── Row definitions — Tally's compact return view ───────────────────────────

  type RowDef =
    | { type: 'section'; label: string }
    | { type: 'subsection'; label: string }
    // sectionKey → drills to the "GSTR-3B - Summary" breakdown of that table.
    | {
        type: 'data';
        label: string;
        data: TaxAmount;
        indent?: number;
        bold?: boolean;
        sectionKey?: string;
      };

  const rows: RowDef[] = [
    {
      type: 'data',
      label: '3.1 Tax on Outward and Reverse Charge Inward Supplies',
      data: s31Total,
      bold: true,
      sectionKey: '3.1',
    },
    {
      type: 'data',
      label: '3.2 Interstate Supplies',
      data: interSupTotal,
      bold: true,
      sectionKey: '3.2',
    },
    { type: 'section', label: '4 Eligible for Input Tax Credit' },
    {
      type: 'data',
      label: 'A. Input Tax Credit Available (either in part or in full)',
      data: s4ATotal,
      indent: 1,
      sectionKey: '4A',
    },
    { type: 'data', label: 'B. Input Tax Credit Reversed', data: s4B_itc_rev, indent: 1 },
    {
      type: 'data',
      label: 'C. Net Input Tax Credit Available (A) - (B)',
      data: s4C,
      indent: 1,
    },
    { type: 'subsection', label: 'D. Other Details' },
    {
      type: 'data',
      label: '1. ITC reclaimed which was reversed under Table 4(B)(2) in earlier tax period',
      data: s4D1_itc_reclaim,
      indent: 2,
    },
    {
      type: 'data',
      label: '2. Ineligible ITC under section 16(4) and ITC restricted due to PoS rules',
      data: s4D2_itc_inelg,
      indent: 2,
    },
    {
      type: 'data',
      label: '5 Exempt, Nil Rated, and Non-GST Inward Supplies',
      data: s5Total,
      bold: true,
    },
    {
      type: 'data',
      label: '5.1 Interest, Late Fee, Penalty and Others',
      data: s61_intr,
      bold: true,
    },
  ];

  // ── F5 Nature View — Liability (outward) + ITC (inward), split Local/Interstate ──
  // Outward vouchers (Sales / Credit Note / Debit Note) drive the tax liability;
  // inward vouchers (Purchase) drive the input tax credit. Matches Tally's Nature View.
  const OUTWARD_TYPES = new Set(['Sales', 'Credit Note', 'Debit Note']);
  const nature = useMemo(() => {
    const mk = (): TaxAmount => ({ ...ZERO });
    const g = {
      liab_local: mk(),
      liab_inter: mk(),
      itc_local: mk(),
      itc_inter: mk(),
    };
    for (const r of includedRows) {
      const outward = OUTWARD_TYPES.has(r.voucher_type);
      const bucket = outward
        ? r.is_interstate
          ? 'liab_inter'
          : 'liab_local'
        : r.is_interstate
          ? 'itc_inter'
          : 'itc_local';
      const t = g[bucket as keyof typeof g];
      t.txval += r.taxable || 0;
      t.iamt += r.igst || 0;
      t.camt += r.cgst || 0;
      t.samt += r.sgst || 0;
      t.cess += r.cess || 0;
    }
    return g;
  }, [includedRows]);

  const liabTotal = sumTax([nature.liab_local, nature.liab_inter]);
  const itcTotal = sumTax([nature.itc_local, nature.itc_inter]);

  type NatureRow =
    | { kind: 'header'; label: string }
    | {
        kind: 'data';
        label: string;
        data: TaxAmount;
        indent: number;
        bold?: boolean;
        top?: boolean;
      };

  const natureRows: NatureRow[] = [
    { kind: 'header', label: 'Liability (Including Inward Reverse Charge Supplies)' },
    { kind: 'data', label: 'Outward Supplies', data: liabTotal, indent: 1, bold: true },
    { kind: 'data', label: 'Local Supplies', data: nature.liab_local, indent: 2 },
    { kind: 'data', label: 'Taxable', data: nature.liab_local, indent: 3 },
    { kind: 'data', label: 'Interstate Supplies', data: nature.liab_inter, indent: 2 },
    { kind: 'data', label: 'Taxable', data: nature.liab_inter, indent: 3 },
    {
      kind: 'data',
      label: 'Liability from Outward Supplies',
      data: liabTotal,
      indent: 1,
      top: true,
    },
    {
      kind: 'data',
      label: 'Total Tax Liability',
      data: liabTotal,
      indent: 0,
      bold: true,
      top: true,
    },
    { kind: 'header', label: 'Input Tax Credit' },
    { kind: 'data', label: 'Local Supplies', data: nature.itc_local, indent: 1 },
    { kind: 'data', label: 'Taxable', data: nature.itc_local, indent: 2 },
    { kind: 'data', label: 'Interstate Supplies', data: nature.itc_inter, indent: 1 },
    { kind: 'data', label: 'Taxable', data: nature.itc_inter, indent: 2 },
    { kind: 'data', label: 'Total', data: itcTotal, indent: 1, top: true },
    {
      kind: 'data',
      label: 'Eligible for Input Tax Credit',
      data: itcTotal,
      indent: 0,
      bold: true,
      top: true,
    },
  ];

  return (
    <TallyReportLayout
      title="GSTR-3B"
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
          <EmptyState message="Computing and compiling GSTR-3B payload..." className="italic" />
        )}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {/* Top Summary */}
        <div className="flex flex-col border-b border-gray-300">
          <div className="flex font-bold px-2 py-1 border-b border-gray-200">
            <div className="flex-1">P a r t i c u l a r s</div>
            <div className="w-32 text-right">Voucher Count</div>
          </div>
          <div
            className="flex px-2 py-0.5 font-bold bg-[#ffcc00] cursor-pointer"
            onClick={() => openStatistics()}
          >
            <div className="flex-1">Total Vouchers</div>
            <div className="w-32 text-right">{stats ? stats.total : ''}</div>
          </div>
          <div
            className="flex px-4 py-0.5 cursor-pointer hover:bg-[#e6f2ff]"
            onClick={() =>
              // Tally: "GSTR-3B - Included in Return" voucher-type summary (Sales/Purchase).
              navigate('/master/statutory/gst/included-summary', {
                state: {
                  registration: activeRegistration,
                  month: selectedMonth,
                  year: selectedYear,
                  returnType: 'GSTR3B',
                  statusLabel: 'Included in Return',
                },
              })
            }
          >
            <div className="flex-1">Included in Return</div>
            <div className="w-32 text-right">
              {stats ? stats.included_ok + stats.included_pending : ''}
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
                  returnType: 'GSTR3B',
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
              // Tally: categorized "Uncertain Transactions" tree, then per-exception
              // resolution lists (GSTR-3B covers inward + outward supplies).
              navigate('/master/statutory/gst/uncertain/breakdown', {
                state: {
                  registration: activeRegistration,
                  month: selectedMonth,
                  year: selectedYear,
                  annual: false,
                  returnType: 'GSTR3B',
                  reportTitle: 'GSTR-3B',
                  supplyGroupLabel: 'Inward and Outward Supplies',
                },
              })
            }
          >
            <div className="flex-1">Uncertain Transactions (Corrections needed)</div>
            <div className="w-32 text-right">{stats ? stats.uncertain : ''}</div>
          </div>
        </div>

        {/* Main Table */}
        <Table className="text-xs table-fixed">
          <TableHeader>
            <TableRow className="border-b border-gray-300 hover:bg-transparent">
              <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">
                P a r t i c u l a r s
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
            </TableRow>
            <TableRow className="hover:bg-transparent border-0">
              <TableCell colSpan={7} className="px-2 py-1 font-bold">
                {natureView ? 'Nature View' : 'Return View'}
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {natureView &&
              natureRows.map((row, idx) => {
                if (row.kind === 'header') {
                  return (
                    <TableRow key={idx} className="border-0 hover:bg-transparent">
                      <TableCell colSpan={7} className="px-2 pt-2 pb-0.5 font-bold text-black">
                        {row.label}
                      </TableCell>
                    </TableRow>
                  );
                }
                const hasData = taxTotal(row.data) !== 0 || row.data.txval !== 0;
                const indentPl =
                  row.indent === 3
                    ? 'pl-14'
                    : row.indent === 2
                      ? 'pl-10'
                      : row.indent === 1
                        ? 'pl-6'
                        : '';
                return (
                  <TableRow
                    key={idx}
                    className={cn(
                      'border-0 hover:bg-transparent',
                      hasData ? 'text-black' : 'text-gray-500',
                    )}
                  >
                    <TableCell
                      className={cn(
                        'px-2 py-0.5',
                        indentPl,
                        row.bold && 'font-bold',
                        row.top && 'border-t border-gray-300',
                      )}
                    >
                      {row.label}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'px-2 py-0.5 text-right',
                        row.top && 'border-t border-gray-300',
                      )}
                    >
                      {fmt(row.data.txval)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'px-2 py-0.5 text-right',
                        row.top && 'border-t border-gray-300',
                      )}
                    >
                      {fmt(row.data.iamt)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'px-2 py-0.5 text-right',
                        row.top && 'border-t border-gray-300',
                      )}
                    >
                      {fmt(row.data.camt)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'px-2 py-0.5 text-right',
                        row.top && 'border-t border-gray-300',
                      )}
                    >
                      {fmt(row.data.samt)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'px-2 py-0.5 text-right',
                        row.top && 'border-t border-gray-300',
                      )}
                    >
                      {fmt(row.data.cess)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'px-2 py-0.5 text-right',
                        row.top && 'border-t border-gray-300',
                      )}
                    >
                      {fmt(taxTotal(row.data))}
                    </TableCell>
                  </TableRow>
                );
              })}
            {!natureView &&
              rows.map((row, idx) => {
                if (row.type === 'section') {
                  return (
                    <TableRow key={idx} className="border-0 hover:bg-transparent">
                      <TableCell colSpan={7} className="px-2 py-0.5 font-bold text-black">
                        {row.label}
                      </TableCell>
                    </TableRow>
                  );
                }

                if (row.type === 'subsection') {
                  return (
                    <TableRow key={idx} className="border-0 hover:bg-transparent">
                      <TableCell colSpan={7} className="px-2 py-0.5 pl-6 text-black">
                        {row.label}
                      </TableCell>
                    </TableRow>
                  );
                }

                // data row — rows with a sectionKey open the "GSTR-3B - Summary"
                // breakdown of that table (3.1 → 3.1a–e, 4A → ITC lines 1–5, …).
                const isSelected = selectedRow === idx;
                const indentPl = row.indent === 2 ? 'pl-10' : row.indent === 1 ? 'pl-6' : '';
                const hasData = taxTotal(row.data) !== 0 || row.data.txval !== 0;
                const clickable = !!row.sectionKey;
                return (
                  <TableRow
                    key={idx}
                    onClick={() => {
                      if (!clickable) return;
                      setSelectedRow(idx);
                      navigate('/master/statutory/gstr3b/section-summary', {
                        state: {
                          registration: activeRegistration,
                          month: selectedMonth,
                          year: selectedYear,
                          sectionKey: row.sectionKey,
                        },
                      });
                    }}
                    className={cn(
                      'border-0',
                      clickable && 'cursor-pointer hover:bg-[#e6f2ff]',
                      isSelected
                        ? 'bg-[#ffcc00] text-black font-bold hover:bg-[#ffcc00]'
                        : hasData
                          ? 'text-black'
                          : 'text-gray-500',
                    )}
                  >
                    <TableCell className={cn('px-2 py-0.5', indentPl, row.bold && 'font-bold')}>
                      {row.label}
                    </TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{fmt(row.data.txval)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{fmt(row.data.iamt)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{fmt(row.data.camt)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{fmt(row.data.samt)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">{fmt(row.data.cess)}</TableCell>
                    <TableCell className="px-2 py-0.5 text-right">
                      {fmt(taxTotal(row.data))}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </TallyReportLayout>
  );
}
