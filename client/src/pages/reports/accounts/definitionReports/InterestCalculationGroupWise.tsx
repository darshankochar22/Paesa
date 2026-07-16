import { ReportRunner } from '../../ReportRunner';

/** Dedicated route component for the "interest-calculation-group-wise" report — renders its bespoke
 *  layout (via ReportRunner's report engine) instead of the generic catch-all. */
export default function InterestCalculationGroupWise() {
  return <ReportRunner reportType="interest-calculation-group-wise" />;
}
