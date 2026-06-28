import type { ReportColumn } from "@/components/reports/ReportTable";

export interface ReportConfig {
  title: string;
  apiMethod?: string;
  reportId?: string;
  columns: ReportColumn[];
}
