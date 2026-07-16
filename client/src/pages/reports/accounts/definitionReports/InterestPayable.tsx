import { ReportRunner } from '../../ReportRunner';

/** Dedicated route component for the "interest-payable" report — renders its bespoke
 *  layout (via ReportRunner's report engine) instead of the generic catch-all. */
export default function InterestPayable() {
  return <ReportRunner reportType="interest-payable" />;
}
