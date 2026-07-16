import { ReportRunner } from '../../ReportRunner';

/** Dedicated route component for the "outstandings-group" report — renders its bespoke
 *  layout (via ReportRunner's report engine) instead of the generic catch-all. */
export default function GroupOutstandingsReport() {
  return <ReportRunner reportType="outstandings-group" />;
}
