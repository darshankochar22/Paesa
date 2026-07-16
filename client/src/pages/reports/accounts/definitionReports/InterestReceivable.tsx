import { ReportRunner } from '../../ReportRunner';

/** Dedicated route component for the "interest-receivable" report — renders its bespoke
 *  layout (via ReportRunner's report engine) instead of the generic catch-all. */
export default function InterestReceivable() {
  return <ReportRunner reportType="interest-receivable" />;
}
