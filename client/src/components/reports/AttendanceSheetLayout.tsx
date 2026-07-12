import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import PageTitleBar from '@/components/ui/PageTitleBar';

interface AttendanceRow {
  id: number;
  particulars: string;
  present: number;
  absent: number;
  leave: number;
  total_days: number;
}

export default function AttendanceSheetLayout() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : '';

  const [rows, setRows] = React.useState<AttendanceRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedIdx, setFocusedIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId || !fyId) return;
    setLoading(true);
    setError(null);
    (window as any).api.report
      .attendanceSheet(companyId, fyId)
      .then((res: any) => {
        if (res.success) {
          setRows(res.rows || []);
          setFocusedIdx(0);
        } else setError(res.error || 'Failed to load Attendance Sheet');
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [companyId, fyId]);

  React.useEffect(() => {
    if (!rows.length) return;
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIdx((p) => Math.min(rows.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIdx((p) => Math.max(0, p - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rows]);

  if (loading)
    return (
      <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
        <PageTitleBar title="Attendance Sheet" subtitle={selectedCompany?.name} />
        <div className="flex-1 flex items-center justify-center text-black text-xs">
          Loading Attendance Sheet...
        </div>
      </div>
    );
  if (error)
    return (
      <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
        <PageTitleBar title="Attendance Sheet" subtitle={selectedCompany?.name} />
        <div className="flex-1 flex items-center justify-center text-black text-xs px-8 text-center">
          {error}
        </div>
      </div>
    );

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      <PageTitleBar
        title="Attendance Sheet"
        subtitle={selectedCompany?.name}
        actions={
          <button onClick={() => navigate(-1)} className="text-black hover:text-white text-[10px]">
            Esc: Back
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10">
            <tr>
              <th colSpan={4} className="px-3 py-0.5 text-left font-normal italic text-black">
                For all employees
              </th>
              <th className="px-3 py-0.5 text-right font-normal text-black">{periodLabel}</th>
            </tr>
            <tr className="border-t border-gray-200 text-black">
              <th className="px-3 py-1.5 text-left font-bold">Particulars</th>
              <th className="px-3 py-1.5 text-right font-bold w-24">Present</th>
              <th className="px-3 py-1.5 text-right font-bold w-24">Absent</th>
              <th className="px-3 py-1.5 text-right font-bold w-24">Leave</th>
              <th className="px-3 py-1.5 text-right font-bold w-28">Total Days</th>
            </tr>
          </thead>
          <tbody>
            {/* Cost Category group header — matches Tally's grouping */}
            <tr className="bg-black/[0.06] border-b border-gray-200">
              <td
                colSpan={5}
                className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-black"
              >
                Primary Cost Category
              </td>
            </tr>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-black italic">
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const focused = idx === focusedIdx;
                return (
                  <tr
                    key={row.id}
                    onClick={() => setFocusedIdx(idx)}
                    className={`border-b border-gray-200 cursor-pointer transition-colors ${focused ? 'bg-black/[0.06] text-black font-bold' : 'hover:bg-black/[0.03] text-black'}`}
                  >
                    <td className="px-3 py-1.5 pl-6">{row.particulars}</td>
                    <td className="px-3 py-1.5 text-right">{row.present}</td>
                    <td className="px-3 py-1.5 text-right">{row.absent}</td>
                    <td className="px-3 py-1.5 text-right">{row.leave}</td>
                    <td className="px-3 py-1.5 text-right">{row.total_days}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
