import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { Button } from '@/components/shadcn/button';
import { TableRow, TableCell } from '@/components/shadcn/table';
import { DataTableCard } from '@/components/blocks/DataTableCard';
import { EmptyState } from '@/components/blocks/EmptyState';

interface ReturnActivity {
  name: string;
  corrections: number | null;
  pending_upload: number | null;
  recon_exceptions: number | null;
  pending_file: number | null;
}

interface MonthActivity {
  period: string; // MMYYYY
  label: string; // e.g. "Apr-26"
  returns: ReturnActivity[];
}

interface RegistrationActivity {
  gst_id: number;
  state_id: string | null;
  gstin: string | null;
  name: string;
  months: MonthActivity[];
}

// null → blank (not applicable); a positive count → "Yes"; 0 → "No".
const ynCell = (n: number | null) => (n === null || n === undefined ? '' : n > 0 ? 'Yes' : 'No');

// Where each return type drills to. GSTR-1/3B open their return screen scoped to
// the clicked registration + period; 2A/2B open their reconciliation screens.
const RETURN_ROUTES: Record<string, string> = {
  'GSTR-1': '/master/statutory/gstr1',
  'GSTR-2A': '/master/statutory/gstr2a/reconciliation',
  'GSTR-2B': '/master/statutory/gstr2b/reconciliation',
  'GSTR-3B': '/master/statutory/gstr3b',
};

export default function TrackGSTReturnActivities() {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<RegistrationActivity[]>([]);
  const [periodLabel, setPeriodLabel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  // F5 toggles Tally's two groupings: months → returns (default) vs returns → months.
  const [returnWise, setReturnWise] = useState(false);

  useEffect(() => {
    async function load() {
      if (!selectedCompany?.company_id || !activeFY?.fy_id) return;
      try {
        setLoading(true);
        const res = await window.api.gst.getReturnActivities({
          company_id: selectedCompany.company_id,
          fy_id: activeFY.fy_id,
        });
        if (res.success && res.activities) {
          setRegistrations(res.activities.registrations || []);
          setPeriodLabel(res.activities.period_label || '');
        } else {
          setRegistrations([]);
        }
      } catch (e) {
        console.error('Failed to fetch GST return activities', e);
        setRegistrations([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedCompany, activeFY]);

  // Single-registration mode shows the GSTIN in the header (like Tally) and skips
  // the per-registration heading rows inside the grid.
  const singleReg = registrations.length === 1 ? registrations[0] : null;
  const registrationLabel = singleReg ? singleReg.gstin || singleReg.name : 'All Registrations';

  const navigateTo = (reg: RegistrationActivity, month: MonthActivity, ret: ReturnActivity) => {
    const route = RETURN_ROUTES[ret.name];
    if (!route) return;
    navigate(route, {
      state: { registration: reg, month: month.period.slice(0, 2), year: month.period.slice(2) },
    });
  };

  const activityCells = (ret: ReturnActivity) => (
    <>
      <TableCell className="w-24 text-center py-0.5">{ynCell(ret.corrections)}</TableCell>
      <TableCell className="w-24 text-center py-0.5">{ynCell(ret.pending_upload)}</TableCell>
      <TableCell className="w-24 text-center py-0.5">{ynCell(ret.recon_exceptions)}</TableCell>
      <TableCell className="w-24 text-center py-0.5">{ynCell(ret.pending_file)}</TableCell>
    </>
  );

  // Default view: month heading → one row per return type.
  const renderMonthWise = (reg: RegistrationActivity) =>
    reg.months.map((month) => (
      <Fragment key={month.period}>
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={5} className="px-4 py-0.5 font-bold text-black">
            {month.label}
          </TableCell>
        </TableRow>
        {month.returns.map((ret) => (
          <TableRow
            key={`${reg.gst_id}-${month.period}-${ret.name}`}
            className={`hover:bg-[#e6f2ff] cursor-pointer${ret.name.startsWith('GSTR-2') ? ' text-gray-600' : ''}`}
            onClick={() => navigateTo(reg, month, ret)}
          >
            <TableCell className="px-8 py-0.5">{ret.name}</TableCell>
            {activityCells(ret)}
          </TableRow>
        ))}
      </Fragment>
    ));

  // F5 Return-wise view: return-type heading → one row per month.
  const renderReturnWise = (reg: RegistrationActivity) => {
    const returnNames = Array.from(
      new Set(reg.months.flatMap((m) => m.returns.map((r) => r.name))),
    );
    return returnNames.map((name) => (
      <Fragment key={name}>
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={5} className="px-4 py-0.5 font-bold text-black">
            {name}
          </TableCell>
        </TableRow>
        {reg.months.map((month) => {
          const ret = month.returns.find((r) => r.name === name);
          if (!ret) return null;
          return (
            <TableRow
              key={`${reg.gst_id}-${name}-${month.period}`}
              className="hover:bg-[#e6f2ff] cursor-pointer"
              onClick={() => navigateTo(reg, month, ret)}
            >
              <TableCell className="px-8 py-0.5">{month.label}</TableCell>
              {activityCells(ret)}
            </TableRow>
          );
        })}
      </Fragment>
    ));
  };

  return (
    <TallyReportLayout
      title="Track GST Return Activities"
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <>
          <div>
            GST Registration : <span className="font-bold">{registrationLabel}</span>
          </div>
          <div>
            Reports to Display : <span className="font-bold">All Returns</span>
          </div>
        </>
      }
      rightSubtitle={
        <div>
          {periodLabel || (activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : '')}
        </div>
      }
      footerControls={
        <div className="flex items-center gap-4 ml-4">
          <Button
            onClick={() => setReturnWise(!returnWise)}
            variant="ghost"
            size="xs"
            className="h-auto p-0 font-bold text-black-900 hover:underline hover:bg-transparent"
          >
            {returnWise ? 'F5: Month-wise' : 'F5: Return-wise'}
          </Button>
        </div>
      }
    >
      <div className="w-full font-sans text-xs">
        <DataTableCard
          columns={[
            { header: 'Particulars' },
            { header: 'Corrections Needed', className: 'text-center w-24' },
            { header: 'Pending for Upload', className: 'text-center w-24' },
            { header: 'Exceptions In Reconciliation', className: 'text-center w-24' },
            { header: 'Pending to Be Filed', className: 'text-center w-24' },
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
                {/* Registration heading — only when tracking more than one GSTIN */}
                {!singleReg && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="bg-[#ffeb9c] font-bold px-2 py-1 text-black">
                      {reg.name}
                    </TableCell>
                  </TableRow>
                )}
                {returnWise ? renderReturnWise(reg) : renderMonthWise(reg)}
              </Fragment>
            ))
          )}
        </DataTableCard>
      </div>
    </TallyReportLayout>
  );
}
