import { ReportRunner } from '../../ReportRunner';

/** Dedicated route component for the "cost-centre-ledger" report — renders its bespoke
 *  layout (via ReportRunner's report engine) instead of the generic catch-all. */
export default function CostCentreLedgerReport() {
  return <ReportRunner reportType="cost-centre-ledger" />;
}
