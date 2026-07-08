import { useState, useEffect } from 'react';
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
const posStateLabel = (pos: any) => {
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

  // 3.2 Interstate Supplies — GSTN requires one row per destination state (pos). The backend
  // emits per-state arrays; expand each recipient category into a row per state (falling back
  // to a single zero row when there were none of that kind).
  const buildInterSupRows = (label: string, details: any[]): any[] => {
    const arr = (details || []).filter((r: any) => r && (r.txval || r.iamt));
    if (arr.length === 0) return [{ type: 'data', label, data: ZERO, indent: 1 }];
    return arr.map((r: any) => ({
      type: 'data',
      label: `${label} — ${posStateLabel(r.pos)}`,
      data: { txval: r.txval || 0, iamt: r.iamt || 0, camt: 0, samt: 0, cess: 0 },
      indent: 1,
    }));
  };
  const interSupRows = [
    ...buildInterSupRows(
      'Supplies made to Unregistered Persons',
      gstr3bData?.inter_sup?.unreg_details,
    ),
    ...buildInterSupRows(
      'Supplies made to Composition Taxable Persons',
      gstr3bData?.inter_sup?.comp_details,
    ),
    ...buildInterSupRows('Supplies made to UIN holders', gstr3bData?.inter_sup?.uin_details),
  ];

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

  // Footer total = total outward liability (section 3.1, incl. reverse charge inward)
  const liabilityRows = [
    s31_osup_det,
    s31_osup_zero,
    s31_osup_nil_exmp,
    s31_isup_rev,
    s31_osup_nongst,
  ];
  const footerTotal: TaxAmount = liabilityRows.reduce(
    (acc, r) => ({
      txval: acc.txval + r.txval,
      iamt: acc.iamt + r.iamt,
      camt: acc.camt + r.camt,
      samt: acc.samt + r.samt,
      cess: acc.cess + r.cess,
    }),
    { ...ZERO },
  );

  // ── Row definitions ─────────────────────────────────────────────────────────

  type RowDef =
    | { type: 'section'; label: string }
    | { type: 'subsection'; label: string }
    | { type: 'data'; label: string; data: TaxAmount; indent?: number; bold?: boolean }
    | { type: 'blank' };

  const rows: RowDef[] = [
    // ── 3.1 ──
    { type: 'section', label: '3.1 Tax on Outward and Reverse Charge Inward Supplies' },
    {
      type: 'data',
      label: '(a) Outward taxable supplies (other than zero rated, nil and exempted)',
      data: s31_osup_det,
      indent: 1,
    },
    {
      type: 'data',
      label: '(b) Outward taxable supplies (zero rated)',
      data: s31_osup_zero,
      indent: 1,
    },
    {
      type: 'data',
      label: '(c) Other outward supplies (Nil rated, exempted)',
      data: s31_osup_nil_exmp,
      indent: 1,
    },
    {
      type: 'data',
      label: '(d) Inward supplies (liable to reverse charge)',
      data: s31_isup_rev,
      indent: 1,
    },
    { type: 'data', label: '(e) Non-GST outward supplies', data: s31_osup_nongst, indent: 1 },
    // ── 3.2 ──
    { type: 'section', label: '3.2 Interstate Supplies' },
    ...interSupRows,
    // ── 4 ──
    { type: 'section', label: '4 Eligible for Input Tax Credit' },
    { type: 'subsection', label: 'A. Input Tax Credit Available (either in part or in full)' },
    { type: 'data', label: '(1) Import of Goods', data: s4A_itc_avl_impg, indent: 2 },
    { type: 'data', label: '(2) Import of Services', data: s4A_itc_avl_imps, indent: 2 },
    {
      type: 'data',
      label: '(3) Inward supplies liable to reverse charge (other than 1 & 2 above)',
      data: s4A_itc_avl_isrc,
      indent: 2,
    },
    { type: 'data', label: '(4) Inward supplies from ISD', data: s4A_itc_avl_isd, indent: 2 },
    { type: 'data', label: '(5) All other ITC', data: s4A_itc_avl_ohh, indent: 2 },
    { type: 'subsection', label: 'B. Input Tax Credit Reversed' },
    {
      type: 'data',
      label: '(1) As per rules 38, 42 & 43 of CGST Rules and section 17(5)',
      data: s4B_itc_rev,
      indent: 2,
    },
    { type: 'data', label: '(2) Others', data: ZERO, indent: 2 },
    { type: 'subsection', label: 'C. Net Input Tax Credit Available (A) - (B)' },
    { type: 'data', label: '', data: s4C, indent: 2 },
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
    // ── 5 ──
    { type: 'section', label: '5 Exempt, Nil Rated, and Non-GST Inward Supplies' },
    {
      type: 'data',
      label: '(a) From a supplier under composition scheme, Exempt and Nil rated supply',
      data: s5_nil,
      indent: 1,
    },
    { type: 'data', label: '(b) Non-GST supply', data: s5_nongst, indent: 1 },
    // ── 6.1 ──
    { type: 'section', label: '6.1 Interest, Late Fee, Penalty and Others' },
    { type: 'data', label: 'Interest', data: s61_intr, indent: 1 },
    { type: 'data', label: 'Late Fee', data: ZERO, indent: 1 },
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
            onClick={() => loadData(true)}
            variant="ghost"
            size="xs"
            className="h-auto p-0 font-bold text-black-900 hover:underline hover:bg-transparent"
          >
            F5: Refresh
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
            onClick={() => openStatistics()}
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
              navigate('/master/statutory/gst/uncertain', {
                state: {
                  registration: activeRegistration,
                  month: selectedMonth,
                  year: selectedYear,
                  returnType: 'GSTR3B',
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
                Return View
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((row, idx) => {
              if (row.type === 'blank') {
                return (
                  <TableRow key={idx} className="border-0 h-2">
                    <TableCell colSpan={7} />
                  </TableRow>
                );
              }

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

              // data row
              const isSelected = selectedRow === idx;
              const indentPl = row.indent === 2 ? 'pl-10' : 'pl-6';
              const hasData = taxTotal(row.data) !== 0 || row.data.txval !== 0;

              // ITC section rows (4…) drill to inward (Purchase) documents; the outward
              // liability rows (3.1/3.2) drill to the included outward vouchers.
              const isItcRow =
                /Input Tax Credit|Import of|Inward supplies|reverse charge|ITC/i.test(row.label);
              return (
                <TableRow
                  key={idx}
                  onClick={() => {
                    setSelectedRow(idx);
                    navigate('/master/statutory/gst/voucher-register', {
                      state: {
                        registration: activeRegistration,
                        month: selectedMonth,
                        year: selectedYear,
                        returnType: 'GSTR3B',
                        bucket: 'included',
                        voucherType: isItcRow ? 'Purchase' : undefined,
                        subtitle: row.label,
                      },
                    });
                  }}
                  className={cn(
                    'border-0 cursor-pointer hover:bg-[#e6f2ff]',
                    isSelected
                      ? 'bg-[#ffcc00] text-black font-bold hover:bg-[#ffcc00]'
                      : hasData
                        ? 'text-black'
                        : 'text-gray-500',
                  )}
                >
                  <TableCell className={cn('px-2 py-0.5', indentPl)}>{row.label}</TableCell>
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

          <TableFooter className="bg-transparent">
            <TableRow className="border-t border-gray-300 hover:bg-transparent font-bold">
              <TableCell className="px-2 py-1">Total</TableCell>
              <TableCell className="px-2 py-1 text-right">{fmt(footerTotal.txval)}</TableCell>
              <TableCell className="px-2 py-1 text-right">{fmt(footerTotal.iamt)}</TableCell>
              <TableCell className="px-2 py-1 text-right">{fmt(footerTotal.camt)}</TableCell>
              <TableCell className="px-2 py-1 text-right">{fmt(footerTotal.samt)}</TableCell>
              <TableCell className="px-2 py-1 text-right">{fmt(footerTotal.cess)}</TableCell>
              <TableCell className="px-2 py-1 text-right">{fmt(taxTotal(footerTotal))}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </TallyReportLayout>
  );
}
