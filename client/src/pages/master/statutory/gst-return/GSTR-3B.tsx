import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { TallyReportLayout } from "@/components/tally-ui/TallyReportLayout";
import { Button } from "@/components/shadcn/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/shadcn/table";
import { EmptyState } from "@/components/blocks/EmptyState";
import { cn } from "@/lib/utils";

interface TaxAmount {
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  cess: number;
}

const ZERO: TaxAmount = { txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0 };

function fmt(n: number) {
  return n ? n.toFixed(2) : "";
}

function taxTotal(t: TaxAmount) {
  return t.iamt + t.camt + t.samt + t.cess;
}

export default function GSTR3BView() {
  const { selectedCompany, activeFY } = useCompany();
  const location = useLocation();

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const today = new Date();
  const [selectedMonth] = useState(String(today.getMonth() + 1).padStart(2, "0"));
  const [selectedYear] = useState(String(today.getFullYear()));
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gstr3bData, setGstr3bData] = useState<any>(null);
  const [fetchedRegistration, setFetchedRegistration] = useState<any>(null);

  const activeRegistration = location.state?.registration || fetchedRegistration;
  const registrationName = activeRegistration?.state_id
    ? `${activeRegistration.state_id} Registration`
    : "All Registrations";

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
        console.error("Failed to fetch registrations", err);
      }
    }

    try {
      setLoading(true);
      setError(null);
      let result;
      if (forceGenerate) {
        result = await window.api.gst.generateGSTR3B({
          company_id: companyId,
          fy_id: fyId,
          return_period: returnPeriod,
        });
      } else {
        result = await window.api.gst.getGSTR3B({
          company_id: companyId,
          fy_id: fyId,
          return_period: returnPeriod,
        });
      }

      if (result.success) {
        setGstr3bData(result.payload);
      } else {
        setError(result.error || "Failed to load GSTR-3B data.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, [companyId, fyId, selectedMonth, selectedYear]);

  // ── Section data derived from payload ──────────────────────────────────────

  // 3.1 Tax on Outward and Reverse Charge Inward Supplies
  const s31_osup_det: TaxAmount   = gstr3bData?.sup_details?.osup_det   ?? ZERO; // (a) outward taxable
  const s31_osup_zero: TaxAmount  = gstr3bData?.sup_details?.osup_zero  ?? ZERO; // (b) outward zero-rated
  const s31_osup_nil_exmp: TaxAmount = gstr3bData?.sup_details?.osup_nil_exmp ?? ZERO; // (c) other outward
  const s31_isup_rev: TaxAmount   = gstr3bData?.sup_details?.isup_rev   ?? ZERO; // (d) inward reverse charge
  const s31_osup_nongst: TaxAmount = gstr3bData?.sup_details?.osup_nongst ?? ZERO; // (e) non-GST

  // 3.2 Interstate Supplies
  const s32_unreg: TaxAmount      = gstr3bData?.inter_sup?.unreg_details?.[0] ?? ZERO;
  const s32_comp: TaxAmount       = gstr3bData?.inter_sup?.comp_details?.[0]  ?? ZERO;
  const s32_uin: TaxAmount        = gstr3bData?.inter_sup?.uin_details?.[0]   ?? ZERO;

  // 4 ITC
  const s4A_itc_avl_impg: TaxAmount  = gstr3bData?.itc_elg?.itc_avl?.[0] ?? ZERO; // import of goods
  const s4A_itc_avl_imps: TaxAmount  = gstr3bData?.itc_elg?.itc_avl?.[1] ?? ZERO; // import of services
  const s4A_itc_avl_isrc: TaxAmount  = gstr3bData?.itc_elg?.itc_avl?.[2] ?? ZERO; // inward supplies ISD
  const s4A_itc_avl_ohh: TaxAmount   = gstr3bData?.itc_elg?.itc_avl?.[3] ?? ZERO; // all other ITC
  const s4B_itc_rev: TaxAmount        = gstr3bData?.itc_elg?.itc_rev?.[0] ?? ZERO;
  const s4D1_itc_reclaim: TaxAmount   = gstr3bData?.itc_elg?.itc_inelg?.[0] ?? ZERO;
  const s4D2_itc_inelg: TaxAmount     = gstr3bData?.itc_elg?.itc_inelg?.[1] ?? ZERO;

  // Net ITC (A - B)
  const s4C: TaxAmount = {
    txval: 0,
    iamt: (s4A_itc_avl_impg.iamt + s4A_itc_avl_imps.iamt + s4A_itc_avl_isrc.iamt + s4A_itc_avl_ohh.iamt) - s4B_itc_rev.iamt,
    camt: (s4A_itc_avl_impg.camt + s4A_itc_avl_imps.camt + s4A_itc_avl_isrc.camt + s4A_itc_avl_ohh.camt) - s4B_itc_rev.camt,
    samt: (s4A_itc_avl_impg.samt + s4A_itc_avl_imps.samt + s4A_itc_avl_isrc.samt + s4A_itc_avl_ohh.samt) - s4B_itc_rev.samt,
    cess: (s4A_itc_avl_impg.cess + s4A_itc_avl_imps.cess + s4A_itc_avl_isrc.cess + s4A_itc_avl_ohh.cess) - s4B_itc_rev.cess,
  };

  // 5 Exempt / Nil / Non-GST
  const s5_nil: TaxAmount   = gstr3bData?.inward_sup?.isup_details?.[0] ?? ZERO;
  const s5_nongst: TaxAmount = gstr3bData?.inward_sup?.isup_details?.[1] ?? ZERO;

  // 6.1 Interest / Late fee
  const s61_intr: TaxAmount = gstr3bData?.intr_ltfee?.intr_details ?? ZERO;

  // Total vouchers from top summary
  const totalVouchers: number = gstr3bData?.total_vouchers ?? 0;

  // ── Row definitions ─────────────────────────────────────────────────────────

  type RowDef =
    | { type: "section"; label: string }
    | { type: "subsection"; label: string }
    | { type: "data"; label: string; data: TaxAmount; indent?: number; bold?: boolean }
    | { type: "blank" };

  const rows: RowDef[] = [
    // ── 3.1 ──
    { type: "section", label: "3.1 Tax on Outward and Reverse Charge Inward Supplies" },
    { type: "data",    label: "(a) Outward taxable supplies (other than zero rated, nil and exempted)", data: s31_osup_det,      indent: 1 },
    { type: "data",    label: "(b) Outward taxable supplies (zero rated)",                              data: s31_osup_zero,     indent: 1 },
    { type: "data",    label: "(c) Other outward supplies (Nil rated, exempted)",                       data: s31_osup_nil_exmp, indent: 1 },
    { type: "data",    label: "(d) Inward supplies (liable to reverse charge)",                         data: s31_isup_rev,      indent: 1 },
    { type: "data",    label: "(e) Non-GST outward supplies",                                           data: s31_osup_nongst,   indent: 1 },
    // ── 3.2 ──
    { type: "section", label: "3.2 Interstate Supplies" },
    { type: "data",    label: "Supplies made to Unregistered Persons",                                  data: s32_unreg, indent: 1 },
    { type: "data",    label: "Supplies made to Composition Taxable Persons",                           data: s32_comp,  indent: 1 },
    { type: "data",    label: "Supplies made to UIN holders",                                           data: s32_uin,   indent: 1 },
    // ── 4 ──
    { type: "section", label: "4 Eligible for Input Tax Credit" },
    { type: "subsection", label: "A. Input Tax Credit Available (either in part or in full)" },
    { type: "data",    label: "(1) Import of Goods",                                                    data: s4A_itc_avl_impg, indent: 2 },
    { type: "data",    label: "(2) Import of Services",                                                 data: s4A_itc_avl_imps, indent: 2 },
    { type: "data",    label: "(3) Inward supplies liable to reverse charge (other than 1 & 2 above)",  data: s4A_itc_avl_isrc, indent: 2 },
    { type: "data",    label: "(4) Inward supplies from ISD",                                           data: s4A_itc_avl_isrc, indent: 2 },
    { type: "data",    label: "(5) All other ITC",                                                      data: s4A_itc_avl_ohh,  indent: 2 },
    { type: "subsection", label: "B. Input Tax Credit Reversed" },
    { type: "data",    label: "(1) As per rules 38, 42 & 43 of CGST Rules and section 17(5)",           data: s4B_itc_rev, indent: 2 },
    { type: "data",    label: "(2) Others",                                                              data: ZERO,        indent: 2 },
    { type: "subsection", label: "C. Net Input Tax Credit Available (A) - (B)" },
    { type: "data",    label: "",                                                                         data: s4C,         indent: 2 },
    { type: "subsection", label: "D. Other Details" },
    { type: "data",    label: "1. ITC reclaimed which was reversed under Table 4(B)(2) in earlier tax period", data: s4D1_itc_reclaim, indent: 2 },
    { type: "data",    label: "2. Ineligible ITC under section 16(4) and ITC restricted due to PoS rules",    data: s4D2_itc_inelg,  indent: 2 },
    // ── 5 ──
    { type: "section", label: "5 Exempt, Nil Rated, and Non-GST Inward Supplies" },
    { type: "data",    label: "(a) From a supplier under composition scheme, Exempt and Nil rated supply", data: s5_nil,    indent: 1 },
    { type: "data",    label: "(b) Non-GST supply",                                                        data: s5_nongst, indent: 1 },
    // ── 6.1 ──
    { type: "section", label: "6.1 Interest, Late Fee, Penalty and Others" },
    { type: "data",    label: "Interest",  data: s61_intr, indent: 1 },
    { type: "data",    label: "Late Fee",  data: ZERO,     indent: 1 },
  ];

  return (
    <TallyReportLayout
      title="GSTR-3B"
      companyName={selectedCompany?.name || "Company"}
      leftSubtitle={
        <>
          <div className="flex gap-4">
            <span className="w-32">GST Registration</span>
            <span className="font-bold">: {registrationName}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-32">Status</span>
            <span className="font-bold">: Not Filed</span>
          </div>
        </>
      }
      rightSubtitle={
        <>
          <div>1-Apr-26 to 30-Apr-26</div>
          <div className="font-normal text-black-700">Last online GST activity: No Activity Found</div>
        </>
      }
      footerControls={
        <Button
          onClick={() => loadData(true)}
          variant="ghost"
          size="xs"
          className="h-auto p-0 ml-4 font-bold text-black-900 hover:underline hover:bg-transparent"
        >
          F5: Refresh
        </Button>
      }
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Computing and compiling GSTR-3B payload..." className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {/* Top Summary */}
        <div className="flex flex-col border-b border-gray-300">
          <div className="flex font-bold px-2 py-1 border-b border-gray-200">
            <div className="flex-1">P a r t i c u l a r s</div>
            <div className="w-32 text-right">Voucher Count</div>
          </div>
          <div className="flex px-2 py-0.5 font-bold bg-[#ffcc00]">
            <div className="flex-1">Total Vouchers</div>
            <div className="w-32 text-right">{totalVouchers || ""}</div>
          </div>
          <div className="flex px-4 py-0.5">
            <div className="flex-1">Included in Return</div>
            <div className="w-32 text-right">{totalVouchers || ""}</div>
          </div>
          <div className="flex px-4 py-0.5 text-gray-600">
            <div className="flex-1">Not Relevant for This Return</div>
            <div className="w-32 text-right"></div>
          </div>
          <div className="flex px-4 py-0.5 text-[#ff8c00] font-bold pb-2">
            <div className="flex-1">Uncertain Transactions (Corrections needed)</div>
            <div className="w-32 text-right"></div>
          </div>
        </div>

        {/* Main Table */}
        <Table className="text-xs table-fixed">
          <TableHeader>
            <TableRow className="border-b border-gray-300 hover:bg-transparent">
              <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black">P a r t i c u l a r s</TableHead>
              <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">Taxable<br />Amount</TableHead>
              <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">IGST</TableHead>
              <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">CGST</TableHead>
              <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">SGST/<br />UTGST</TableHead>
              <TableHead className="h-auto w-20 px-2 py-1 text-right align-bottom font-bold text-black">Cess</TableHead>
              <TableHead className="h-auto w-24 px-2 py-1 text-right align-bottom font-bold text-black">Tax<br />Amount</TableHead>
            </TableRow>
            <TableRow className="hover:bg-transparent border-0">
              <TableCell colSpan={7} className="px-2 py-1 font-bold">Return View</TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((row, idx) => {
              if (row.type === "blank") {
                return <TableRow key={idx} className="border-0 h-2"><TableCell colSpan={7} /></TableRow>;
              }

              if (row.type === "section") {
                return (
                  <TableRow key={idx} className="border-0 hover:bg-transparent">
                    <TableCell colSpan={7} className="px-2 py-0.5 font-bold text-black">
                      {row.label}
                    </TableCell>
                  </TableRow>
                );
              }

              if (row.type === "subsection") {
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
              const indentPl = row.indent === 2 ? "pl-10" : "pl-6";
              const hasData = taxTotal(row.data) !== 0 || row.data.txval !== 0;

              return (
                <TableRow
                  key={idx}
                  onClick={() => setSelectedRow(idx)}
                  className={cn(
                    "border-0 cursor-pointer hover:bg-[#e6f2ff]",
                    isSelected
                      ? "bg-[#ffcc00] text-black font-bold hover:bg-[#ffcc00]"
                      : hasData
                        ? "text-black"
                        : "text-gray-500"
                  )}
                >
                  <TableCell className={cn("px-2 py-0.5", indentPl)}>{row.label}</TableCell>
                  <TableCell className="px-2 py-0.5 text-right">{fmt(row.data.txval)}</TableCell>
                  <TableCell className="px-2 py-0.5 text-right">{fmt(row.data.iamt)}</TableCell>
                  <TableCell className="px-2 py-0.5 text-right">{fmt(row.data.camt)}</TableCell>
                  <TableCell className="px-2 py-0.5 text-right">{fmt(row.data.samt)}</TableCell>
                  <TableCell className="px-2 py-0.5 text-right">{fmt(row.data.cess)}</TableCell>
                  <TableCell className="px-2 py-0.5 text-right">{fmt(taxTotal(row.data))}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>

          <TableFooter className="bg-transparent">
            <TableRow className="border-t border-gray-300 hover:bg-transparent font-bold">
              <TableCell className="px-2 py-1">Total</TableCell>
              <TableCell className="px-2 py-1 text-right"></TableCell>
              <TableCell className="px-2 py-1 text-right"></TableCell>
              <TableCell className="px-2 py-1 text-right"></TableCell>
              <TableCell className="px-2 py-1 text-right"></TableCell>
              <TableCell className="px-2 py-1 text-right"></TableCell>
              <TableCell className="px-2 py-1 text-right"></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </TallyReportLayout>
  );
}