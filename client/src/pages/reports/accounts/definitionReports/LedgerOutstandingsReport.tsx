import { ReportRunner } from '../../ReportRunner';

/** Dedicated route component for the "outstandings-ledger" report — renders its bespoke
 *  layout (via ReportRunner's report engine) instead of the generic catch-all. */
export default function LedgerOutstandingsReport() {
  return <ReportRunner reportType="outstandings-ledger" />;
}
