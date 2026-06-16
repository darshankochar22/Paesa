import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { TallyReportLayout } from "@/components/tally-ui/TallyReportLayout";

export default function GSTR1View() {
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
  const [gstr1Data, setGstr1Data] = useState<any>(null);
  const [fetchedRegistration, setFetchedRegistration] = useState<any>(null);

  const activeRegistration = location.state?.registration || fetchedRegistration;
  const registrationName = activeRegistration?.state_id ? `${activeRegistration.state_id} Registration` : " All Registrations";

  const returnPeriod = `${selectedMonth}${selectedYear}`;

  const loadData = async (forceGenerate = false) => {
    if (!companyId || !fyId) return;

    // Fetch registration if not passed
    if (!location.state?.registration && !fetchedRegistration) {
      try {
        const regRes = await window.api.gstRegistration.getAll(companyId);
        if (regRes.success && regRes.gstRegistrations && regRes.gstRegistrations.length > 0) {
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
        result = await window.api.gst.generateGSTR1({
          company_id: companyId,
          fy_id: fyId,
          return_period: returnPeriod,
        });
      } else {
        result = await window.api.gst.getGSTR1({
          company_id: companyId,
          fy_id: fyId,
          return_period: returnPeriod,
        });
      }

      if (result.success) {
        setGstr1Data(result.payload);
      } else {
        setError(result.error || "Failed to load GSTR-1 data.");
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

  // Summaries calculation
  const b2bData = useMemo(() => {
    if (!gstr1Data || !gstr1Data.b2b) return { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, val: 0 };
    let count = 0, txval = 0, iamt = 0, camt = 0, samt = 0, val = 0;
    gstr1Data.b2b.forEach((party: any) => {
      party.inv.forEach((inv: any) => {
        count++;
        val += inv.val;
        inv.itms.forEach((itm: any) => {
          txval += itm.itm_det.txval;
          iamt += itm.itm_det.iamt || 0;
          camt += itm.itm_det.camt || 0;
          samt += itm.itm_det.samt || 0;
        });
      });
    });
    return { count, txval, iamt, camt, samt, val };
  }, [gstr1Data]);

  const b2clData = useMemo(() => {
    if (!gstr1Data || !gstr1Data.b2cl) return { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, val: 0 };
    let count = 0, txval = 0, iamt = 0, camt = 0, samt = 0, val = 0;
    gstr1Data.b2cl.forEach((stateGroup: any) => {
      stateGroup.inv.forEach((inv: any) => {
        count++;
        val += inv.val;
        inv.itms.forEach((itm: any) => {
          txval += itm.itm_det.txval;
          iamt += itm.itm_det.iamt || 0;
          camt += itm.itm_det.camt || 0;
          samt += itm.itm_det.samt || 0;
        });
      });
    });
    return { count, txval, iamt, camt, samt, val };
  }, [gstr1Data]);

  const b2csData = useMemo(() => {
    if (!gstr1Data || !gstr1Data.b2cs) return { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, val: 0 };
    let count = 0, txval = 0, iamt = 0, camt = 0, samt = 0, val = 0;
    gstr1Data.b2cs.forEach((item: any) => {
      count++;
      txval += item.txval;
      iamt += item.iamt || 0;
      camt += item.camt || 0;
      samt += item.samt || 0;
      val += item.txval + (item.iamt || 0) + (item.camt || 0) + (item.samt || 0);
    });
    return { count, txval, iamt, camt, samt, val };
  }, [gstr1Data]);

  const cdnrData = useMemo(() => {
    if (!gstr1Data || !gstr1Data.cdnr) return { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, val: 0 };
    let count = 0, txval = 0, iamt = 0, camt = 0, samt = 0, val = 0;
    gstr1Data.cdnr.forEach((party: any) => {
      party.nt.forEach((note: any) => {
        count++;
        val += note.val;
        note.itms.forEach((itm: any) => {
          txval += itm.itm_det.txval;
          iamt += itm.itm_det.iamt || 0;
          camt += itm.itm_det.camt || 0;
          samt += itm.itm_det.samt || 0;
        });
      });
    });
    return { count, txval, iamt, camt, samt, val };
  }, [gstr1Data]);

  const rows = [
    { label: "B2B Invoices - 4A, 4B, 4C, 6B, 6C", data: b2bData, bold: true },
    { label: "B2C (Large) Invoices - 5A, 5B", data: b2clData },
    { label: "Exports Invoices - 6A", data: { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, val: 0 } },
    { label: "Credit or Debit Notes (Registered) - 9B", data: cdnrData },
    { label: "Credit or Debit Notes (Unregistered) - 9B", data: { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, val: 0 } },
    { label: "Amended B2B Invoices - 9A", data: { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, val: 0 } },
    { label: "Amended B2C (Large) Invoices - 9A", data: { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, val: 0 } },
    { label: "Amended Exports Invoices - 9A", data: { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, val: 0 } },
    { label: "Amended Credit or Debit Notes (Registered) - 9C", data: { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, val: 0 } },
    { label: "Amended Credit or Debit Notes (Unregistered) - 9C", data: { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, val: 0 } },
    { label: "B2C (Small) Invoices - 7", data: b2csData },
    { label: "Nil Rated Invoices - 8A, 8B, 8C, 8D", data: { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, val: 0 } },
    { label: "Amendment B2C (Small) Invoices - 10", data: { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, val: 0 } },
    { label: "Tax Liability (Advances Received) - 11A(1), 11A(2)", data: { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, val: 0 } },
    { label: "Adjustment of Advances - 11B(1), 11B(2)", data: { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, val: 0 } },
    { label: "Amended Tax Liability (Advances Received) - 11A", data: { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, val: 0 } },
    { label: "Amendment of Adjusted Advances - 11B", data: { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, val: 0 } },
    { label: "HSN Summary - 12 (B2B - B2C Supplies)", data: { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, val: 0 } },
    { label: "Document Summary - 13", data: { count: 0, txval: 0, iamt: 0, camt: 0, samt: 0, val: 0 } },
  ];

  const totalVouchers = b2bData.count + b2clData.count + b2csData.count + cdnrData.count;

  return (
    <TallyReportLayout
      title="GSTR-1"
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
          <div className="flex gap-4">
            <span className="w-32">ARN</span>
            <span className="font-bold">:</span>
          </div>
          <div className="flex gap-4">
            <span className="w-32">ARN Date</span>
            <span className="font-bold">:</span>
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
        <button onClick={() => loadData(true)} className="hover:underline text-black-900 font-bold ml-4">
          F5: Refresh
        </button>
      }
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <div className="p-2 text-center text-black-800 italic">Computing and compiling GSTR-1 payload...</div>}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {/* Top Summary Table */}
        <div className="flex flex-col border-b border-gray-300">
          <div className="flex font-bold px-2 py-1 border-b border-gray-200">
            <div className="flex-1">P a r t i c u l a r s</div>
            <div className="w-32 text-right">Voucher Count</div>
          </div>
          <div className="flex px-2 py-0.5 font-bold">
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

        {/* Particulars Header */}
        <div className="flex border-b border-gray-300 font-bold px-2 py-1 bg-white">
          <div className="flex-1">P a r t i c u l a r s</div>
          <div className="w-20 text-center">Vch Count<br />(Summary)</div>
          <div className="w-24 text-right">Taxable<br />Amount</div>
          <div className="w-24 text-right">IGST</div>
          <div className="w-24 text-right">CGST</div>
          <div className="w-24 text-right">SGST/<br />UTGST</div>
          <div className="w-20 text-right">Cess</div>
          <div className="w-24 text-right">Tax<br />Amount</div>
          <div className="w-24 text-right">Invoice<br />Amount</div>
        </div>

        <div className="flex px-2 py-1 font-bold">
          <div className="flex-1">Return View</div>
        </div>

        {/* Particulars Data Rows */}
        <div className="flex flex-col">
          {rows.map((row, idx) => {
            const isSelected = selectedRow === idx;
            return (
              <div
                key={idx}
                onClick={() => setSelectedRow(idx)}
                className={`flex px-2 py-0.5 hover:bg-[#e6f2ff] cursor-pointer ${isSelected ? 'bg-[#ffcc00] text-black font-bold' : ''} ${row.data.count === 0 && !isSelected ? 'text-gray-600' : 'text-black'}`}
              >
                <div className="flex-1 pl-2">{row.label}</div>
                <div className="w-20 text-center">{row.data.count || ""}</div>
                <div className="w-24 text-right">{row.data.txval ? row.data.txval.toFixed(2) : ""}</div>
                <div className="w-24 text-right">{row.data.iamt ? row.data.iamt.toFixed(2) : ""}</div>
                <div className="w-24 text-right">{row.data.camt ? row.data.camt.toFixed(2) : ""}</div>
                <div className="w-24 text-right">{row.data.samt ? row.data.samt.toFixed(2) : ""}</div>
                <div className="w-20 text-right"></div>
                <div className="w-24 text-right">{(row.data.iamt + row.data.camt + row.data.samt) ? (row.data.iamt + row.data.camt + row.data.samt).toFixed(2) : ""}</div>
                <div className="w-24 text-right">{row.data.val ? row.data.val.toFixed(2) : ""}</div>
              </div>
            );
          })}
        </div>

        {/* Total Row */}
        <div className="flex border-t border-gray-300 font-bold px-2 py-1 mt-4">
          <div className="flex-1 text-center pr-4">Total</div>
          <div className="w-20 text-center"></div>
          <div className="w-24 text-right"></div>
          <div className="w-24 text-right"></div>
          <div className="w-24 text-right"></div>
          <div className="w-24 text-right"></div>
          <div className="w-20 text-right"></div>
          <div className="w-24 text-right"></div>
          <div className="w-24 text-right"></div>
        </div>

      </div>
    </TallyReportLayout>
  );
}
