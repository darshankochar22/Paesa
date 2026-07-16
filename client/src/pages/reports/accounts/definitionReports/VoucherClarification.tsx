import { ReportRunner } from '../../ReportRunner';

/** Dedicated route component for the "voucher-clarification" report — renders its bespoke
 *  layout (via ReportRunner's report engine) instead of the generic catch-all. */
export default function VoucherClarification() {
  return <ReportRunner reportType="voucher-clarification" />;
}
