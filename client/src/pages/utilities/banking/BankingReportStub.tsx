import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';

// Placeholder for Banking reports not yet implemented (Cheque Register,
// Post-dated Summary, Deposit Slip, Payment Advice, Bank Reconciliation).
// Keeps the Banking menu fully navigable; each gets its own screen later.
export default function BankingReportStub({ title }: { title: string }) {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  return (
    <TallyReportLayout
      title={title}
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={<div className="font-bold">{title}</div>}
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
      onQuit={() => navigate('/utilities/banking')}
    >
      <div className="flex-1 flex items-center justify-center text-[11px] text-gray-500">
        {title} — coming soon.
      </div>
    </TallyReportLayout>
  );
}
