/**
 * ReportStub — a placeholder for reports that are planned but not yet implemented.
 * Shows the correct Tally-style header and breadcrumb, with a "Work in Progress" notice.
 */
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { Button } from '@/components/shadcn/button';
import { Construction } from 'lucide-react';

interface ReportStubProps {
  title: string;
  breadcrumbs?: Array<{ label: string; to: string }>;
  description?: string;
}

export function ReportStub({ title, description }: ReportStubProps) {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();

  const fyLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date ?? ''}` : '';

  return (
    <TallyReportLayout
      title={title}
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<span>{fyLabel}</span>}
      footerControls={
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          size="xs"
          disabled={false}
          className="h-auto p-0 ml-4 font-bold text-black hover:underline hover:bg-transparent"
        >
          Escape: Back
        </Button>
      }
    >
      <div className="flex flex-col items-center justify-center min-h-48 gap-3 text-black">
        <Construction className="w-8 h-8 text-black" strokeWidth={1.5} />
        <p className="text-sm font-medium text-black">{title}</p>
        <p className="text-xs text-center max-w-sm">
          {description ??
            'This report is coming soon. Data computation for this report will be available in a future release.'}
        </p>
      </div>
    </TallyReportLayout>
  );
}
