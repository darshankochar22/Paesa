import { Link, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shadcn/card";
import { Button } from "@/components/shadcn/button";
import { Separator } from "@/components/shadcn/separator";


const BASE = "/reports/accounts";  

const SLUG_OVERRIDES: Record<string, string> = {
  "Ledger Vouchers": "ledger",
  "Ledger Monthly Summary": "ledger-summary", 
  "Group Summary": "group-summary",
  "Cash Book": "cash-book",
  "Bank Book": "bank-book",
  "Sales Register": "sales-register",
  "Purchase Register": "purchase-register",
  "Journal Register": "journal-register",
  "Debit Note Register": "debit-note-register",
  "Credit Note Register": "credit-note-register",
  "Cash/Bank Summary": "cash-bank",
};

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const items = (labels: string[]) =>
  labels.map((label) => ({
    label,
    route: `${BASE}/${SLUG_OVERRIDES[label] ?? slug(label)}`,
  }));


export default function AccountBooksMenu() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "DAY BOOK",
      items: items([
        "Day Book",
        "Day Book - Sales View",
        "Day Book - Purchase View",
        "Day Book - Receipt View",
        "Day Book - Payment View",
        "Day Book - Contra View",
        "Day Book - Journal View",
        "Day Book - Debit Note View",
        "Day Book - Credit Note View",
        "Day Book with Gross Profit",
      ]),
    },
    {
      title: "LEDGER",
      items: items([
        "Ledger Vouchers",
        "Ledger Monthly Summary",
        "Ledger Statement",
        "Group Summary",
        "Group Vouchers",
      ]),
    },
    {
      title: "CASH & BANK",
      items: items([
        "Cash/Bank Summary",
        "Cash Book",
        "Bank Book",
      ]),
    },
    {
      title: "REGISTERS",
      items: items([
        "Sales Register",
        "Purchase Register",
        "Journal Register",
        "Payment Register",
        "Receipt Register",
        "Contra Register",
        "Debit Note Register",
        "Credit Note Register",
        "Memorandum Register",
        "Optional Voucher Register",
        "Cancelled Voucher Register",
        "Reversing Journal Register",
      ]),
    },
    {
      title: "SPECIALISED REGISTERS",
      items: items([
        "Payroll Voucher Register",
        "Stock Journal Register",
        "Manufacturing Journal Register",
        "Physical Stock Register",
        "Sales Order Register",
        "Purchase Order Register",
        "Delivery Note Register",
        "Receipt Note Register",
        "Rejection In Register",
        "Rejection Out Register",
      ]),
    },
    {
      title: "VOUCHER MANAGEMENT",
      items: items([
        "Voucher Numbering Report",
        "Voucher Audit Trail",
        "Voucher Alteration History",
        "Deleted Voucher Log",
        "Voucher Type Summary",
      ]),
    },
  ];

  return (
    <Card size="sm" className="w-96 mx-auto mt-10 text-xs">
      <CardHeader className="gap-1 pb-1">
        <div className="text-[11px] italic text-zinc-500 flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-zinc-900">Gateway of Tally</Link>
          <span>&gt;</span>
          <Link to="/reports/display-more" className="hover:underline hover:text-zinc-900">Display More Reports</Link>
        </div>
        <CardTitle className="text-base font-semibold">Account Books & Voucher Registers</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {sections.map((section, si) => (
          <div key={si} className="flex flex-col gap-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">
              {section.title}
            </div>
            <div className="flex flex-col pl-3 gap-0.5">
              {section.items.map((item) => (
                <Button
                  key={item.label}
                  asChild
                  variant="ghost"
                  size="xs"
                  className="justify-start text-[11px] font-normal px-2 h-7 text-zinc-700"
                >
                  <Link to={item.route}>{item.label}</Link>
                </Button>
              ))}
            </div>
          </div>
        ))}

        <Separator className="my-1" />
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          size="xs"
          className="justify-start text-[11px] font-semibold px-2 h-7 text-zinc-900"
        >
          Quit
        </Button>
      </CardContent>
    </Card>
  );
}
