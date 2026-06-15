import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { TallyReportLayout } from "@/components/tally-ui/TallyReportLayout";

export default function TrackGSTReturnActivities() {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadRegistrations() {
      if (!selectedCompany?.company_id) return;
      try {
        setLoading(true);
        const res = await window.api.gstRegistration.getAll(selectedCompany.company_id);
        if (res.success && res.gstRegistrations && res.gstRegistrations.length > 0) {
          setRegistrations(res.gstRegistrations);
        } else {
          setRegistrations([]);
        }
      } catch (e) {
        console.error("Failed to fetch registrations", e);
      } finally {
        setLoading(false);
      }
    }
    loadRegistrations();
  }, [selectedCompany]);

  return (
    <TallyReportLayout
      title="Track GST Return Activities"
      companyName={selectedCompany?.name || "Company"}
      leftSubtitle={
        <>
          <div>GST Registration : <span className="font-bold">All Registrations</span></div>
          <div>Reports to Display : <span className="font-bold">All Returns</span></div>
        </>
      }
      rightSubtitle={
        <div>1-Apr-26 to 30-Apr-26</div>
      }
    >
      <div className="w-full flex flex-col font-sans text-xs">
        {/* Header Row */}
        <div className="flex border-b border-gray-300 font-bold bg-[#fcfcfc] text-center text-[#000080]">
          <div className="flex-1 text-left px-2 py-1">Particulars</div>
          <div className="w-24 px-2 py-1 flex items-center justify-center">Corrections Needed</div>
          <div className="w-24 px-2 py-1 flex items-center justify-center">Pending for Upload</div>
          <div className="w-24 px-2 py-1 flex items-center justify-center">Exceptions In Reconciliation</div>
          <div className="w-24 px-2 py-1 flex items-center justify-center">Pending to Be Filed</div>
        </div>

        {/* Data Rows */}
        {loading ? (
          <div className="p-4 text-center text-gray-500 italic">Loading...</div>
        ) : registrations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 italic">No GST Registrations found.</div>
        ) : (
          registrations.map((reg) => (
            <div key={reg.gst_id} className="flex flex-col border-b border-gray-200">
              {/* Registration Row */}
              <div className="flex bg-[#ffeb9c] font-bold px-2 py-1 text-black">
                {reg.state_id ? `${reg.state_id} Registration` : (reg.gst_username || reg.gstin || "Registration")}
              </div>
              
              {/* Period Row */}
              <div className="flex px-4 py-1 font-bold text-black">
                Apr-26
              </div>

              {/* Returns */}
              <div className="flex hover:bg-[#e6f2ff] cursor-pointer" onClick={() => navigate("/master/statutory/gstr1", { state: { registration: reg } })}>
                <div className="flex-1 px-8 py-0.5">GSTR-1</div>
                <div className="w-24 text-center py-0.5">No</div>
                <div className="w-24 text-center py-0.5">No</div>
                <div className="w-24 text-center py-0.5">No</div>
                <div className="w-24 text-center py-0.5">Yes</div>
              </div>
              <div className="flex hover:bg-[#e6f2ff] cursor-pointer text-gray-600">
                <div className="flex-1 px-8 py-0.5">GSTR-2A</div>
                <div className="w-24 text-center py-0.5">No</div>
                <div className="w-24 text-center py-0.5"></div>
                <div className="w-24 text-center py-0.5">No</div>
                <div className="w-24 text-center py-0.5"></div>
              </div>
              <div className="flex hover:bg-[#e6f2ff] cursor-pointer text-gray-600">
                <div className="flex-1 px-8 py-0.5">GSTR-2B</div>
                <div className="w-24 text-center py-0.5">No</div>
                <div className="w-24 text-center py-0.5"></div>
                <div className="w-24 text-center py-0.5">No</div>
                <div className="w-24 text-center py-0.5"></div>
              </div>
              <div className="flex hover:bg-[#e6f2ff] cursor-pointer text-gray-600">
                <div className="flex-1 px-8 py-0.5">GSTR-3B</div>
                <div className="w-24 text-center py-0.5">No</div>
                <div className="w-24 text-center py-0.5"></div>
                <div className="w-24 text-center py-0.5">No</div>
                <div className="w-24 text-center py-0.5">Yes</div>
              </div>
            </div>
          ))
        )}
      </div>
    </TallyReportLayout>
  );
}
