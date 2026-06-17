import { useState, useEffect } from "react";
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

function fmt(n: number) {
  if (!n) return "-";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtAmt(n: number) {
  return n ? n.toFixed(2) : "-";
}

interface TaxAmt {
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  cess: number;
}

const ZERO: TaxAmt = { txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0 };

interface SectionHeaderProps {
  label: string;
  bg?: string;
  onClick: () => void;
}

const SectionHeader = ({ label, bg = "bg-[#ffeb9c]", onClick }: SectionHeaderProps) => (
  <TableRow
    className={cn("cursor-pointer hover:brightness-95 select-none", bg)}
    onClick={onClick}
  >
    <TableCell colSpan={6} className="font-bold text-xs text-black px-2 py-1">
      {label}
    </TableCell>
  </TableRow>
);

interface DataRowProps {
  label: string;
  row: TaxAmt;
  dim?: boolean;
  bold?: boolean;
  highlighted?: boolean;
}

const DataRow = ({
  label,
  row,
  dim = false,
  bold = false,
  highlighted = false,
}: DataRowProps) => (
  <TableRow
    className={cn(
      "hover:bg-[#e6f2ff] text-xs",
      dim && "text-zinc-400",
      highlighted && "bg-[#fff8dc]"
    )}
  >
    <TableCell className={cn("px-4 py-0.5 w-64", bold && "font-semibold")}>{label}</TableCell>
    <TableCell className="text-right py-0.5 w-28">{fmt(row.txval)}</TableCell>
    <TableCell className="text-right py-0.5 w-24">{fmt(row.iamt)}</TableCell>
    <TableCell className="text-right py-0.5 w-24">{fmt(row.camt)}</TableCell>
    <TableCell className="text-right py-0.5 w-24">{fmt(row.samt)}</TableCell>
    <TableCell className="text-right py-0.5 w-24">{fmt(row.cess)}</TableCell>
  </TableRow>
);

interface TaxRowProps {
  label: string;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  bold?: boolean;
  highlighted?: boolean;
}

const TaxRow = ({
  label,
  igst,
  cgst,
  sgst,
  cess,
  bold = false,
  highlighted = false,
}: TaxRowProps) => (
  <TableRow
    className={cn(
      "hover:bg-[#e6f2ff] text-xs",
      highlighted && "bg-[#fff8dc]"
    )}
  >
    <TableCell className={cn("px-4 py-0.5 w-64", bold && "font-semibold")}>{label}</TableCell>
    <TableCell className="text-right py-0.5 w-28">-</TableCell>
    <TableCell className="text-right py-0.5 w-24">{fmtAmt(igst)}</TableCell>
    <TableCell className="text-right py-0.5 w-24">{fmtAmt(cgst)}</TableCell>
    <TableCell className="text-right py-0.5 w-24">{fmtAmt(sgst)}</TableCell>
    <TableCell className="text-right py-0.5 w-24">{fmtAmt(cess)}</TableCell>
  </TableRow>
);

export default function AnnualComputation() {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId      = activeFY?.fy_id;

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [data, setData]         = useState<any>(null);
  const [activeSection, setActiveSection] = useState<number | null>(null);

  const loadData = async () => {
    if (!companyId || !fyId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await window.api.gst.getAnnualComputation({ company_id: companyId, fy_id: fyId });
      if (result.success) {
        setData(result.payload);
      } else {
        setError(result.error || "Failed to load data");
      }
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId, fyId]);

  // ── Outward supplies ──────────────────────────────────────────────────────
  const outTaxable: TaxAmt  = data?.outward_supplies?.taxable  ?? ZERO;
  const outZero: TaxAmt     = data?.outward_supplies?.zero      ?? ZERO;
  const outNilExmp: TaxAmt  = data?.outward_supplies?.nil_exmp  ?? ZERO;
  const outNonGst: TaxAmt   = data?.outward_supplies?.nongst    ?? ZERO;
  const inRcm: TaxAmt       = data?.outward_supplies?.rcm       ?? ZERO;

  const outTotal: TaxAmt = {
    txval: outTaxable.txval + outZero.txval + outNilExmp.txval + outNonGst.txval + inRcm.txval,
    iamt:  outTaxable.iamt  + outZero.iamt  + inRcm.iamt,
    camt:  outTaxable.camt  + inRcm.camt,
    samt:  outTaxable.samt  + inRcm.samt,
    cess:  outTaxable.cess  + outZero.cess  + inRcm.cess,
  };

  // ── ITC ───────────────────────────────────────────────────────────────────
  const itcImpGoods: TaxAmt    = data?.itc?.import_goods    ?? ZERO;
  const itcImpSvc: TaxAmt      = data?.itc?.import_services ?? ZERO;
  const itcRcm: TaxAmt         = data?.itc?.rcm             ?? ZERO;
  const itcOther: TaxAmt       = data?.itc?.other           ?? ZERO;
  const itcReversed: TaxAmt    = data?.itc?.reversed        ?? ZERO;
  const itcTotalAvailed: TaxAmt = data?.itc?.total_availed  ?? ZERO;

  // ── Tax ───────────────────────────────────────────────────────────────────
  const taxPayable = data?.tax_payable ?? { igst: 0, cgst: 0, sgst: 0, cess: 0 };
  const netTax     = data?.net_tax     ?? { igst: 0, cgst: 0, sgst: 0, cess: 0 };

  // ── Monthly summary ───────────────────────────────────────────────────────
  const monthly: any[]   = data?.monthly_summary ?? [];
  const annualTotal: any = data?.annual_total    ?? {};

  const fyLabel = data?.fy_label ?? (activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : "");



  return (
    <TallyReportLayout
      title="Annual Computation"
      companyName={selectedCompany?.name || "Company"}
      leftSubtitle={
        <>
          <div>
            GST Registration :{" "}
            <span className="font-bold">{data?.gstin || "All Registrations"}</span>
          </div>
          <div>
            Financial Year :{" "}
            <span className="font-bold">{fyLabel}</span>
          </div>
        </>
      }
      rightSubtitle={
        <div className="flex flex-col items-end gap-1">
          <Button
            size="xs"
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="text-[10px] h-5 px-2"
          >
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      }
    >
      <div className="w-full font-sans text-xs">
        {error && (
          <div className="text-red-600 text-xs px-4 py-2">{error}</div>
        )}

        {loading ? (
          <EmptyState message="Computing annual GST data…" />
        ) : !data ? (
          <EmptyState message="No GST data found for this financial year." />
        ) : (
          <>
            {/* ── PART I: Outward Supplies ─────────────────────────────── */}
            <Table className="w-full border border-zinc-200">
              <TableHeader>
                <TableRow className="bg-[#dce6f1] text-xs">
                  <TableHead className="px-2 py-1 w-64 text-black font-bold">Particulars</TableHead>
                  <TableHead className="text-right py-1 w-28 text-black font-bold">Taxable Value (₹)</TableHead>
                  <TableHead className="text-right py-1 w-24 text-black font-bold">IGST (₹)</TableHead>
                  <TableHead className="text-right py-1 w-24 text-black font-bold">CGST (₹)</TableHead>
                  <TableHead className="text-right py-1 w-24 text-black font-bold">SGST/UTGST (₹)</TableHead>
                  <TableHead className="text-right py-1 w-24 text-black font-bold">Cess (₹)</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* Section 1 */}
                <SectionHeader label="1. Details of Outward Supplies" onClick={() => setActiveSection(activeSection === 1 ? null : 1)} />
                {activeSection !== 1 ? null : (
                  <>
                    <DataRow label="(a) Taxable supplies"                  row={outTaxable}  />
                    <DataRow label="(b) Zero-rated supplies (exports)"      row={outZero}     />
                    <DataRow label="(c) Nil-rated / Exempt supplies"        row={outNilExmp}  />
                    <DataRow label="(d) Non-GST supplies"                   row={outNonGst}   />
                    <DataRow label="(e) Inward supplies under RCM"          row={inRcm}       />
                  </>
                )}
                <DataRow label="Total Outward Supplies" row={outTotal} bold highlighted />

                {/* Section 2 – ITC */}
                <SectionHeader label="2. Eligible Input Tax Credit (ITC)" bg="bg-[#e2efda]" onClick={() => setActiveSection(activeSection === 2 ? null : 2)} />
                {activeSection !== 2 ? null : (
                  <>
                    <DataRow label="(A)(1) Import of Goods"                 row={itcImpGoods}    />
                    <DataRow label="(A)(2) Import of Services"              row={itcImpSvc}      />
                    <DataRow label="(A)(3) Inward supplies under RCM"       row={itcRcm}         />
                    <DataRow label="(A)(4) All other ITC"                   row={itcOther}       />
                    <DataRow label="(B) ITC Reversed"                       row={itcReversed}    />
                  </>
                )}
                <DataRow label="Net ITC Available" row={itcTotalAvailed} bold highlighted />

                {/* Section 3 – Tax Payable */}
                <SectionHeader label="3. Tax Payable / Net Tax Liability" bg="bg-[#fce4d6]" onClick={() => setActiveSection(activeSection === 3 ? null : 3)} />
                <TaxRow
                  label="Tax on outward supplies"
                  igst={taxPayable.igst}
                  cgst={taxPayable.cgst}
                  sgst={taxPayable.sgst}
                  cess={taxPayable.cess}
                />
                <TaxRow
                  label="ITC Utilised"
                  igst={-(itcTotalAvailed.iamt)}
                  cgst={-(itcTotalAvailed.camt)}
                  sgst={-(itcTotalAvailed.samt)}
                  cess={-(itcTotalAvailed.cess)}
                />
                <TaxRow
                  label="Net Tax Payable"
                  igst={netTax.igst}
                  cgst={netTax.cgst}
                  sgst={netTax.sgst}
                  cess={netTax.cess}
                  bold
                  highlighted
                />
              </TableBody>
            </Table>

            {/* ── PART II: Monthly Breakdown ───────────────────────────── */}
            <div className="mt-4">
              <div className="bg-[#dce6f1] px-2 py-1 text-xs font-bold text-black border border-zinc-200">
                Monthly Summary – {fyLabel}
              </div>
              <Table className="w-full border border-zinc-200">
                <TableHeader>
                  <TableRow className="bg-[#f2f2f2] text-xs">
                    <TableHead className="px-2 py-1 w-24 text-black font-bold">Month</TableHead>
                    <TableHead className="text-right py-1 text-black font-bold">Taxable Value (₹)</TableHead>
                    <TableHead className="text-right py-1 text-black font-bold">Tax on Outward (₹)</TableHead>
                    <TableHead className="text-right py-1 text-black font-bold">ITC Availed (₹)</TableHead>
                    <TableHead className="text-right py-1 text-black font-bold">Net Tax (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthly.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-zinc-400">
                        No vouchers found for this financial year.
                      </TableCell>
                    </TableRow>
                  ) : (
                    monthly.map((row: any) => (
                      <TableRow key={row.month} className="hover:bg-[#e6f2ff] text-xs">
                        <TableCell className="px-2 py-0.5 font-medium">{row.month}</TableCell>
                        <TableCell className="text-right py-0.5">{fmt(row.taxable_val)}</TableCell>
                        <TableCell className="text-right py-0.5">{fmt(row.outward_tax)}</TableCell>
                        <TableCell className="text-right py-0.5">{fmt(row.itc_availed)}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right py-0.5 font-semibold",
                            row.net_tax > 0 ? "text-red-600" : "text-green-600"
                          )}
                        >
                          {fmt(row.net_tax)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                {monthly.length > 0 && (
                  <TableFooter>
                    <TableRow className="bg-[#fff8dc] text-xs font-bold">
                      <TableCell className="px-2 py-1">Annual Total</TableCell>
                      <TableCell className="text-right py-1">{fmt(annualTotal.taxable_val)}</TableCell>
                      <TableCell className="text-right py-1">{fmt(annualTotal.outward_tax)}</TableCell>
                      <TableCell className="text-right py-1">{fmt(annualTotal.itc_availed)}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right py-1",
                          annualTotal.net_tax > 0 ? "text-red-600" : "text-green-600"
                        )}
                      >
                        {fmt(annualTotal.net_tax)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </>
        )}
      </div>
    </TallyReportLayout>
  );
}
