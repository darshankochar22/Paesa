/**
 * CategoryMenuPage — a reusable category landing page that lists
 * all reports belonging to a given category slug.  Used as the
 * element for each of the 15 top-level report category routes.
 */
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { Button } from "@/components/shadcn/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shadcn/card";
import { REPORT_CATEGORIES } from "./reportDefinitions";

interface CategoryMenuPageProps {
  title: string;
  categorySlug: string;
  description?: string;
}

// Map route slugs to REPORT_CATEGORIES keys
const SLUG_TO_CATEGORY: Record<string, string> = {
  "gateway": "Gateway, Navigation & Global Report Shells",
  "financial-statements": "Core Financial Statements",
  "account-books": "Account Books & Voucher Registers",
  "receivables-payables": "Receivables, Payables & Bill-wise Reports",
  "cash-bank-finance": "Cash, Bank, Finance & Banking",
  "sales-purchase-party": "Sales, Purchase & Party Analysis",
  "inventory-stock": "Inventory, Stock & Godown Reports",
  "manufacturing-costing": "Manufacturing, Job Work & Costing",
  "gst": "GST Reports",
  "e-invoice-eway-bill": "e-Invoice, e-Way Bill & Exchange",
  "tds": "TDS Reports",
  "tcs": "TCS Reports",
  "payroll-hr": "Payroll & HR Reports",
  "legacy-statutory": "VAT, Excise, Service Tax, MSME & Legacy Statutory",
  "audit-security": "Audit, Edit Log, Security & Admin",
};

export default function CategoryMenuPage({
  title,
  categorySlug,
  description,
}: CategoryMenuPageProps) {
  const navigate = useNavigate();
  const { activeFY } = useCompany();

  const categoryName = SLUG_TO_CATEGORY[categorySlug] || categorySlug;
  const reports = REPORT_CATEGORIES[categoryName] || [];

  const fyLabel = activeFY
    ? `${activeFY.start_date} to ${activeFY.end_date ?? ""}`
    : "";

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#e8eaf6] to-[#c5cae9]">
      {/* Tally Prime Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-[#1a237e] to-[#283593] text-white border-b-2 border-[#0d47a1] shadow-md">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base tracking-wide">{title}</span>
        </div>
        <div className="text-[10px] text-yellow-200 font-medium">
          {fyLabel}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-4 py-1.5 bg-[#f5f5f5] border-b border-zinc-300 text-[10px]">
        <Link to="/" className="text-[#1a237e] hover:underline font-medium">
          Gateway of Tally
        </Link>
        <span className="text-zinc-400 mx-1">›</span>
        <Link to="/reports/display-more" className="text-[#1a237e] hover:underline font-medium">
          Display More Reports
        </Link>
        <span className="text-zinc-400 mx-1">›</span>
        <span className="text-zinc-700 font-bold">{title}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <Card className="max-w-3xl mx-auto shadow-xl border-2 border-[#7986cb]">
          <CardHeader className="bg-gradient-to-r from-[#3949ab] to-[#5c6bc0] text-white pb-3">
            <CardTitle className="text-lg font-bold tracking-wide">{title}</CardTitle>
            {description && (
              <p className="text-[10px] text-blue-100 mt-1">{description}</p>
            )}
          </CardHeader>

          <CardContent className="p-4 bg-white">
            {reports.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 italic">
                No reports available in this category.
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#1a237e] mb-2 pb-1 border-b-2 border-[#7986cb]">
                  Select a Report
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-[600px] overflow-y-auto pr-2">
                  {reports.map((report, idx) => (
                    <Button
                      key={report.slug}
                      asChild
                      variant="ghost"
                      size="sm"
                      className="justify-start text-[10px] font-medium px-3 h-8 text-zinc-800 hover:bg-[#e3f2fd] hover:text-[#0d47a1] border border-zinc-200 hover:border-[#1976d2] transition-all"
                    >
                      <Link to={`/reports/${categorySlug}/${report.slug}`}>
                        <span className="text-[#1976d2] font-bold mr-2">{idx + 1}.</span>
                        {report.title}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>

          <div className="p-3 bg-[#f5f5f5] border-t-2 border-[#7986cb]">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              size="sm"
              className="w-full font-bold text-[#1a237e] border-2 border-[#7986cb] hover:bg-[#e8eaf6]"
            >
              <kbd className="bg-[#ffeb3b] text-[#1a237e] px-2 py-0.5 rounded font-black text-[9px] mr-2">Esc</kbd>
              Quit / Go Back
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
