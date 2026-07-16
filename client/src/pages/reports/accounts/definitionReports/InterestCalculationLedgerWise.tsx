import { ReportRunner } from '../../ReportRunner';

/** Dedicated route component for the "interest-calculation-ledger-wise" report — renders its bespoke
 *  layout (via ReportRunner's report engine) instead of the generic catch-all. */
export default function InterestCalculationLedgerWise() {
  return <ReportRunner reportType="interest-calculation-ledger-wise" />;
}
