import { useState, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { TallyReportLayout } from "@/components/tally-ui/TallyReportLayout";
import { TableRow, TableCell } from "@/components/shadcn/table";
import { DataTableCard } from "@/components/blocks/DataTableCard";
import { EmptyState } from "@/components/blocks/EmptyState";

export default function TrackGSTReturnActivities() {
  const { selectedCompany } = useCompany();
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
      <div className="w-full font-sans text-xs">
        <DataTableCard
          columns={[
            { header: "Particulars" },
            { header: "Corrections Needed", className: "text-center w-24" },
            { header: "Pending for Upload", className: "text-center w-24" },
            { header: "Exceptions In Reconciliation", className: "text-center w-24" },
            { header: "Pending to Be Filed", className: "text-center w-24" },
          ]}
          maxHeight="100%"
        >
          {loading ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="p-0">
                <EmptyState message="Loading..." />
              </TableCell>
            </TableRow>
          ) : registrations.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="p-0">
                <EmptyState message="No GST Registrations found." />
              </TableCell>
            </TableRow>
          ) : (
            registrations.map((reg) => (
              <Fragment key={reg.gst_id}>
                {/* Registration Row */}
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="bg-[#ffeb9c] font-bold px-2 py-1 text-black">
                    {reg.state_id ? `${reg.state_id} Registration` : (reg.gst_username || reg.gstin || "Registration")}
                  </TableCell>
                </TableRow>

                {/* Period Row */}
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="px-4 py-1 font-bold text-black">
                    Apr-26
                  </TableCell>
                </TableRow>

                {/* Returns */}
                <TableRow
                  className="hover:bg-[#e6f2ff] cursor-pointer"
                  onClick={() => navigate("/master/statutory/gstr1", { state: { registration: reg } })}
                >
                  <TableCell className="px-8 py-0.5">GSTR-1</TableCell>
                  <TableCell className="w-24 text-center py-0.5">No</TableCell>
                  <TableCell className="w-24 text-center py-0.5">No</TableCell>
                  <TableCell className="w-24 text-center py-0.5">No</TableCell>
                  <TableCell className="w-24 text-center py-0.5">Yes</TableCell>
                </TableRow>
                <TableRow className="hover:bg-[#e6f2ff] cursor-pointer text-gray-600">
                  <TableCell className="px-8 py-0.5">GSTR-2A</TableCell>
                  <TableCell className="w-24 text-center py-0.5">No</TableCell>
                  <TableCell className="w-24 text-center py-0.5"></TableCell>
                  <TableCell className="w-24 text-center py-0.5">No</TableCell>
                  <TableCell className="w-24 text-center py-0.5"></TableCell>
                </TableRow>
                <TableRow className="hover:bg-[#e6f2ff] cursor-pointer text-gray-600">
                  <TableCell className="px-8 py-0.5">GSTR-2B</TableCell>
                  <TableCell className="w-24 text-center py-0.5">No</TableCell>
                  <TableCell className="w-24 text-center py-0.5"></TableCell>
                  <TableCell className="w-24 text-center py-0.5">No</TableCell>
                  <TableCell className="w-24 text-center py-0.5"></TableCell>
                </TableRow>
                <TableRow
                  className="hover:bg-[#e6f2ff] cursor-pointer"
                  onClick={() => navigate("/master/statutory/gstr3b", { state: { registration: reg } })}
                >
                  <TableCell className="px-8 py-0.5">GSTR-3B</TableCell>
                  <TableCell className="w-24 text-center py-0.5">No</TableCell>
                  <TableCell className="w-24 text-center py-0.5"></TableCell>
                  <TableCell className="w-24 text-center py-0.5">No</TableCell>
                  <TableCell className="w-24 text-center py-0.5">Yes</TableCell>
                </TableRow>
              </Fragment>
            ))
          )}
        </DataTableCard>
      </div>
    </TallyReportLayout>
  );
}
