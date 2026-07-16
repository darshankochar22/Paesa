import { ReportRunner } from '../../ReportRunner';

/** Dedicated route component for the "cost-centre-break-up" report — renders its bespoke
 *  layout (via ReportRunner's report engine) instead of the generic catch-all. */
export default function CostCentreBreakUp() {
  return <ReportRunner reportType="cost-centre-break-up" />;
}
