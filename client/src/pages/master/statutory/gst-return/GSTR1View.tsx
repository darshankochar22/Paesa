import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const YEARS = ["2024", "2025", "2026", "2027", "2028"];

type TabType = "b2b" | "b2c" | "cdnr" | "hsn" | "errors";

export default function GSTR1View() {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  // Initialize return period to current month/year
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(today.getMonth() + 1).padStart(2, "0"));
  const [selectedYear, setSelectedYear] = useState(String(today.getFullYear()));
  const [activeTab, setActiveTab] = useState<TabType>("b2b");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gstr1Data, setGstr1Data] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);

  const returnPeriod = `${selectedMonth}${selectedYear}`;

  const loadData = async (forceGenerate = false) => {
    if (!companyId || !fyId) return;

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
        setValidationErrors(result.errors || []);
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

  // Keyboard shortcut listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/master/coa");
      }
      if (e.key === "F5") {
        e.preventDefault();
        loadData(true);
      }
      if (e.ctrlKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        handleExportJSON();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, companyId, fyId, returnPeriod, gstr1Data]);

  const handleExportJSON = () => {
    if (!gstr1Data) return;
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gstr1Data, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `GSTR1_${selectedCompany?.name || "Company"}_${returnPeriod}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      setError("Failed to export JSON payload: " + err.message);
    }
  };

  // Summaries calculation
  const b2bInvoices = useMemo(() => {
    if (!gstr1Data || !gstr1Data.b2b) return [];
    const list: any[] = [];
    gstr1Data.b2b.forEach((party: any) => {
      party.inv.forEach((inv: any) => {
        // Flatten invoice lines
        inv.itms.forEach((itm: any) => {
          list.push({
            ctin: party.ctin,
            inum: inv.inum,
            idt: inv.idt,
            val: inv.val,
            pos: inv.pos,
            txval: itm.itm_det.txval,
            rt: itm.itm_det.rt,
            iamt: itm.itm_det.iamt,
            camt: itm.itm_det.camt,
            samt: itm.itm_det.samt,
          });
        });
      });
    });
    return list;
  }, [gstr1Data]);

  const b2cInvoices = useMemo(() => {
    if (!gstr1Data) return [];
    const list: any[] = [];
    
    // Add B2CS (Small)
    if (gstr1Data.b2cs) {
      gstr1Data.b2cs.forEach((item: any) => {
        list.push({
          type: "B2C Small",
          pos: item.pos,
          sply_ty: item.sply_ty,
          rt: item.rt,
          txval: item.txval,
          iamt: item.iamt,
          camt: item.camt,
          samt: item.samt,
          val: item.txval + item.iamt + item.camt + item.samt
        });
      });
    }

    // Add B2CL (Large)
    if (gstr1Data.b2cl) {
      gstr1Data.b2cl.forEach((stateGroup: any) => {
        stateGroup.inv.forEach((inv: any) => {
          inv.itms.forEach((itm: any) => {
            list.push({
              type: "B2C Large",
              pos: stateGroup.pos,
              sply_ty: "INTER",
              rt: itm.itm_det.rt,
              txval: itm.itm_det.txval,
              iamt: itm.itm_det.iamt,
              camt: itm.itm_det.camt,
              samt: itm.itm_det.samt,
              val: inv.val
            });
          });
        });
      });
    }

    return list;
  }, [gstr1Data]);

  const cdnrInvoices = useMemo(() => {
    if (!gstr1Data || !gstr1Data.cdnr) return [];
    const list: any[] = [];
    gstr1Data.cdnr.forEach((party: any) => {
      party.nt.forEach((note: any) => {
        note.itms.forEach((itm: any) => {
          list.push({
            ctin: party.ctin,
            ntty: note.ntty === "C" ? "Credit Note" : "Debit Note",
            nt_num: note.nt_num,
            nt_dt: note.nt_dt,
            val: note.val,
            inum: note.inum,
            idt: note.idt,
            txval: itm.itm_det.txval,
            rt: itm.itm_det.rt,
            iamt: itm.itm_det.iamt,
            camt: itm.itm_det.camt,
            samt: itm.itm_det.samt,
          });
        });
      });
    });
    return list;
  }, [gstr1Data]);

  const hsnItems = useMemo(() => {
    if (!gstr1Data || !gstr1Data.hsn || !gstr1Data.hsn.data) return [];
    return gstr1Data.hsn.data;
  }, [gstr1Data]);

  const totalTaxable = useMemo(() => {
    let sum = 0;
    b2bInvoices.forEach(x => sum += x.txval);
    b2cInvoices.forEach(x => sum += x.txval);
    cdnrInvoices.forEach(x => sum += x.txval);
    return sum;
  }, [b2bInvoices, b2cInvoices, cdnrInvoices]);

  const totalGST = useMemo(() => {
    let sum = 0;
    b2bInvoices.forEach(x => sum += (x.iamt + x.camt + x.samt));
    b2cInvoices.forEach(x => sum += (x.iamt + x.camt + x.samt));
    cdnrInvoices.forEach(x => sum += (x.iamt + x.camt + x.samt));
    return sum;
  }, [b2bInvoices, b2cInvoices, cdnrInvoices]);

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 select-none text-zinc-800 animate-fade-in font-sans">
      {/* Title Bar */}
      <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-900 text-white flex items-center justify-between shadow-sm animate-slide-down">
        <div className="flex items-center gap-3">
          <Link to="/master/coa" className="text-xs text-zinc-400 hover:text-white font-medium">
            &larr; Quit
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-100">GSTR-1 Returns Dashboard</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-400">
          <span>Company ID: {companyId}</span>
          <span>FY ID: {fyId}</span>
        </div>
      </div>

      {/* Period Selection Controls */}
      <div className="bg-white border-b border-zinc-200 px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500 font-semibold">Return Period:</span>
            <select
              className="text-xs border border-zinc-300 rounded px-2.5 py-1 outline-none focus:border-zinc-800 bg-white font-medium cursor-pointer"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              className="text-xs border border-zinc-300 rounded px-2.5 py-1 outline-none focus:border-zinc-800 bg-white font-medium cursor-pointer"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadData(true)}
            className="text-[10px] text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-300 rounded px-3 py-1 font-bold tracking-wide uppercase transition-colors"
          >
            ⟳ Refresh (F5)
          </button>
        </div>

        {gstr1Data && (
          <div className="flex gap-4 text-xs font-mono text-zinc-600 bg-zinc-50 px-3 py-1.5 rounded border border-zinc-200">
            <div>
              <span className="font-semibold text-zinc-400">Taxable Amt:</span> ₹{totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div>
              <span className="font-semibold text-zinc-400">GST Amt:</span> ₹{totalGST.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="px-3 py-2 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center animate-slide-down">
          <span className="font-semibold">• {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 font-bold font-sans text-sm">&times;</button>
        </div>
      )}

      {/* Main Grid View */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white shadow-inner">
          
          {/* Tab Selection */}
          <div className="flex border-b border-zinc-200 bg-zinc-50 text-xs select-none">
            <button
              onClick={() => setActiveTab("b2b")}
              className={`px-4 py-2 font-bold tracking-wide uppercase border-r border-zinc-200 transition-colors ${
                activeTab === "b2b" ? "bg-white text-zinc-900 border-b-2 border-b-zinc-800" : "text-zinc-500 hover:bg-zinc-100/50"
              }`}
            >
              B2B Invoices ({b2bInvoices.length})
            </button>
            <button
              onClick={() => setActiveTab("b2c")}
              className={`px-4 py-2 font-bold tracking-wide uppercase border-r border-zinc-200 transition-colors ${
                activeTab === "b2c" ? "bg-white text-zinc-900 border-b-2 border-b-zinc-800" : "text-zinc-500 hover:bg-zinc-100/50"
              }`}
            >
              B2C Sales ({b2cInvoices.length})
            </button>
            <button
              onClick={() => setActiveTab("cdnr")}
              className={`px-4 py-2 font-bold tracking-wide uppercase border-r border-zinc-200 transition-colors ${
                activeTab === "cdnr" ? "bg-white text-zinc-900 border-b-2 border-b-zinc-800" : "text-zinc-500 hover:bg-zinc-100/50"
              }`}
            >
              Credit/Debit Notes ({cdnrInvoices.length})
            </button>
            <button
              onClick={() => setActiveTab("hsn")}
              className={`px-4 py-2 font-bold tracking-wide uppercase border-r border-zinc-200 transition-colors ${
                activeTab === "hsn" ? "bg-white text-zinc-900 border-b-2 border-b-zinc-800" : "text-zinc-500 hover:bg-zinc-100/50"
              }`}
            >
              HSN/SAC Summary ({hsnItems.length})
            </button>
            <button
              onClick={() => setActiveTab("errors")}
              className={`px-4 py-2 font-bold tracking-wide uppercase transition-colors flex items-center gap-1.5 ${
                activeTab === "errors" ? "bg-white text-zinc-900 border-b-2 border-b-zinc-800" : "text-zinc-500 hover:bg-zinc-100/50"
              }`}
            >
              Validation Warnings
              {validationErrors.length > 0 && (
                <span className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0.2 rounded-full font-sans font-black">
                  {validationErrors.length}
                </span>
              )}
            </button>
          </div>

          {/* Grid Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="p-12 text-center text-xs text-zinc-400 italic">Computing and compiling GSTR-1 payload...</div>
            ) : !gstr1Data ? (
              <div className="p-12 text-center text-xs text-zinc-400 italic">No return data loaded. Click Refresh.</div>
            ) : (
              <>
                {/* B2B Tab */}
                {activeTab === "b2b" && (
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-200 text-[10px] font-bold text-zinc-600 uppercase tracking-wider select-none">
                        <th className="px-3 py-2">GSTIN</th>
                        <th className="px-3 py-2">Invoice No</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2 text-right">Invoice Val</th>
                        <th className="px-3 py-2">POS</th>
                        <th className="px-3 py-2 text-right">Taxable Val</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                        <th className="px-3 py-2 text-right">CGST</th>
                        <th className="px-3 py-2 text-right">SGST</th>
                        <th className="px-3 py-2 text-right">IGST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b2bInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-3 py-8 text-center text-zinc-400 italic bg-white">No B2B invoices found in this period.</td>
                        </tr>
                      ) : (
                        b2bInvoices.map((inv, idx) => (
                          <tr key={idx} className={`border-b border-zinc-100 hover:bg-zinc-50/50 ${idx % 2 === 0 ? "bg-white" : "bg-zinc-50/20"}`}>
                            <td className="px-3 py-2 font-bold text-zinc-800">{inv.ctin}</td>
                            <td className="px-3 py-2">{inv.inum}</td>
                            <td className="px-3 py-2">{inv.idt}</td>
                            <td className="px-3 py-2 text-right">₹{inv.val.toFixed(2)}</td>
                            <td className="px-3 py-2 text-center uppercase">{inv.pos}</td>
                            <td className="px-3 py-2 text-right">₹{inv.txval.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">{inv.rt}%</td>
                            <td className="px-3 py-2 text-right text-zinc-500">₹{inv.camt.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-zinc-500">₹{inv.samt.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-zinc-500">₹{inv.iamt.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {/* B2C Tab */}
                {activeTab === "b2c" && (
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-200 text-[10px] font-bold text-zinc-600 uppercase tracking-wider select-none">
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">Place of Supply</th>
                        <th className="px-3 py-2">Supply Type</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                        <th className="px-3 py-2 text-right">Taxable Val</th>
                        <th className="px-3 py-2 text-right">CGST</th>
                        <th className="px-3 py-2 text-right">SGST</th>
                        <th className="px-3 py-2 text-right">IGST</th>
                        <th className="px-3 py-2 text-right">Total Val</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b2cInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-3 py-8 text-center text-zinc-400 italic bg-white">No B2C transactions found in this period.</td>
                        </tr>
                      ) : (
                        b2cInvoices.map((inv, idx) => (
                          <tr key={idx} className={`border-b border-zinc-100 hover:bg-zinc-50/50 ${idx % 2 === 0 ? "bg-white" : "bg-zinc-50/20"}`}>
                            <td className="px-3 py-2 font-bold text-zinc-800">{inv.type}</td>
                            <td className="px-3 py-2 uppercase">{inv.pos}</td>
                            <td className="px-3 py-2 uppercase">{inv.sply_ty}</td>
                            <td className="px-3 py-2 text-right">{inv.rt}%</td>
                            <td className="px-3 py-2 text-right font-medium">₹{inv.txval.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-zinc-500">₹{inv.camt.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-zinc-500">₹{inv.samt.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-zinc-500">₹{inv.iamt.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">₹{inv.val.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {/* Credit Debit Notes Tab */}
                {activeTab === "cdnr" && (
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-200 text-[10px] font-bold text-zinc-600 uppercase tracking-wider select-none">
                        <th className="px-3 py-2">GSTIN</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Note No</th>
                        <th className="px-3 py-2">Note Date</th>
                        <th className="px-3 py-2 text-right">Value</th>
                        <th className="px-3 py-2">Orig Invoice</th>
                        <th className="px-3 py-2">Orig Date</th>
                        <th className="px-3 py-2 text-right">Taxable Val</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                        <th className="px-3 py-2 text-right">CGST/SGST/IGST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cdnrInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-3 py-8 text-center text-zinc-400 italic bg-white">No registered Debit/Credit notes found.</td>
                        </tr>
                      ) : (
                        cdnrInvoices.map((inv, idx) => (
                          <tr key={idx} className={`border-b border-zinc-100 hover:bg-zinc-50/50 ${idx % 2 === 0 ? "bg-white" : "bg-zinc-50/20"}`}>
                            <td className="px-3 py-2 font-bold text-zinc-800">{inv.ctin}</td>
                            <td className="px-3 py-2 font-semibold">{inv.ntty}</td>
                            <td className="px-3 py-2">{inv.nt_num}</td>
                            <td className="px-3 py-2">{inv.nt_dt}</td>
                            <td className="px-3 py-2 text-right">₹{inv.val.toFixed(2)}</td>
                            <td className="px-3 py-2">{inv.inum}</td>
                            <td className="px-3 py-2">{inv.idt}</td>
                            <td className="px-3 py-2 text-right">₹{inv.txval.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">{inv.rt}%</td>
                            <td className="px-3 py-2 text-right text-zinc-500">
                              ₹{(inv.iamt || (inv.camt + inv.samt)).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {/* HSN Summary Tab */}
                {activeTab === "hsn" && (
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-200 text-[10px] font-bold text-zinc-600 uppercase tracking-wider select-none">
                        <th className="px-3 py-2">Sr</th>
                        <th className="px-3 py-2">HSN/SAC Code</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2 text-right">Total Qty</th>
                        <th className="px-3 py-2 text-right">Gross Val</th>
                        <th className="px-3 py-2 text-right">Taxable Val</th>
                        <th className="px-3 py-2 text-right">CGST</th>
                        <th className="px-3 py-2 text-right">SGST</th>
                        <th className="px-3 py-2 text-right">IGST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hsnItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-3 py-8 text-center text-zinc-400 italic bg-white">No HSN summaries found.</td>
                        </tr>
                      ) : (
                        hsnItems.map((itm, idx) => (
                          <tr key={idx} className={`border-b border-zinc-100 hover:bg-zinc-50/50 ${idx % 2 === 0 ? "bg-white" : "bg-zinc-50/20"}`}>
                            <td className="px-3 py-2 text-zinc-400">{itm.num}</td>
                            <td className="px-3 py-2 font-bold text-zinc-800">{itm.hsn_sc}</td>
                            <td className="px-3 py-2 font-sans truncate max-w-[200px]" title={itm.desc}>{itm.desc}</td>
                            <td className="px-3 py-2 text-right">{itm.qty}</td>
                            <td className="px-3 py-2 text-right">₹{itm.val.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">₹{itm.txval.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-zinc-500">₹{itm.camt.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-zinc-500">₹{itm.samt.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-zinc-500">₹{itm.iamt.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {/* Validation Warnings Tab */}
                {activeTab === "errors" && (
                  <div className="p-4 flex flex-col gap-2">
                    {validationErrors.length === 0 ? (
                      <div className="p-8 text-center text-xs text-emerald-600 bg-emerald-50 rounded border border-emerald-100 font-semibold">
                        ✓ All transactions passed statutory schema validations. No issues found.
                      </div>
                    ) : (
                      validationErrors.map((err, idx) => (
                        <div key={idx} className="p-3 bg-rose-50 border border-rose-100 rounded text-xs text-rose-800 flex items-start gap-3">
                          <span className="font-bold font-mono px-2 py-0.5 bg-rose-200/50 rounded shrink-0">
                            Voucher #{err.voucher_number || err.voucher_id}
                          </span>
                          <span className="font-medium flex-1 pt-0.5 leading-relaxed">{err.error}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="w-44 border-l border-zinc-200 flex flex-col bg-zinc-100 text-[10px] select-none shrink-0 font-sans shadow-sm">
          <button
            onClick={() => loadData(true)}
            className="px-3 py-2.5 text-left hover:bg-zinc-200 border-b border-zinc-200 font-bold uppercase text-zinc-600 tracking-wider transition-colors"
          >
            F5 Recalculate
          </button>
          <button
            onClick={handleExportJSON}
            disabled={!gstr1Data}
            className="px-3 py-2.5 text-left hover:bg-zinc-200 disabled:hover:bg-transparent disabled:opacity-40 border-b border-zinc-200 font-bold uppercase text-zinc-600 tracking-wider transition-colors"
          >
            Ctrl+E Export JSON
          </button>
          <div className="flex-1" />
          <button
            onClick={() => navigate("/master/coa")}
            className="px-3 py-2.5 text-left hover:bg-zinc-200 border-t border-zinc-300 font-bold uppercase text-zinc-500 tracking-wider transition-colors"
          >
            Esc Quit
          </button>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="border-t border-zinc-200 px-4 py-1.5 flex justify-between items-center bg-zinc-100 text-[10px] text-zinc-400 select-none">
        <span>GSTR-1 GSTN Aggregator Engine</span>
        <span>Startup ERP</span>
      </div>
    </div>
  );
}
