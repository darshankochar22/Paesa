import Link from "next/link";

const SERIF = { fontFamily: "var(--font-lora), Georgia, serif", fontStyle: "italic" as const, fontWeight: 400 };

// ── Mini product mockups ────────────────────────────────────────────────────

function PnLMockup() {
  const rows = [
    { label: "Gross Sales",         val: "₹24,85,000", bold: false, indent: false },
    { label: "Less: Returns",       val: "(₹1,20,000)", bold: false, indent: true  },
    { label: "Net Sales",           val: "₹23,65,000", bold: true,  indent: false },
    { label: "Cost of Goods Sold",  val: "₹14,20,000", bold: false, indent: false },
    { label: "Gross Profit",        val: "₹9,45,000",  bold: true,  indent: false },
    { label: "Operating Expenses",  val: "₹2,92,000",  bold: false, indent: false },
    { label: "Net Profit",          val: "₹6,53,000",  bold: true,  indent: false },
  ];
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white overflow-hidden">
      <div className="border-b border-zinc-50 px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
        Profit & Loss — Jun 2026
      </div>
      {rows.map((r, i) => (
        <div key={i} className={`flex justify-between px-5 py-2.5 text-sm border-b border-zinc-50 last:border-0 ${r.bold ? "font-semibold text-zinc-950 bg-zinc-50/60" : "text-zinc-500"} ${r.indent ? "pl-9" : ""}`}>
          <span>{r.label}</span>
          <span className="tabular-nums">{r.val}</span>
        </div>
      ))}
    </div>
  );
}

function GstMockup() {
  const rows = [
    { label: "Outward Taxable Supplies", val: "₹23,65,000", total: false },
    { label: "GST Collected (Output)",   val: "₹4,25,700",  total: false },
    { label: "ITC Available (Input)",    val: "₹2,10,400",  total: false },
    { label: "Net Tax Payable",          val: "₹2,15,300",  total: true  },
  ];
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white overflow-hidden">
      <div className="border-b border-zinc-50 px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
        GSTR-3B Summary — Jun 2026
      </div>
      {rows.map((r, i) => (
        <div key={i} className={`flex justify-between px-5 py-3 text-sm border-b border-zinc-50 last:border-0 ${r.total ? "font-semibold text-zinc-950 bg-zinc-50/60" : "text-zinc-500"}`}>
          <span>{r.label}</span>
          <span className="tabular-nums font-medium text-zinc-800">{r.val}</span>
        </div>
      ))}
      <div className="px-5 py-3">
        <div className="h-9 rounded-lg bg-[#0d0d0d] flex items-center justify-center text-white text-xs font-medium tracking-wide">
          File on GSTN portal →
        </div>
      </div>
    </div>
  );
}

function InventoryMockup() {
  const items = [
    { name: "Paracetamol 500mg",  qty: "4,200 strips", val: "₹84,000" },
    { name: "Amoxicillin 250mg",  qty: "1,800 caps",   val: "₹54,000" },
    { name: "Vitamin C 1000mg",   qty: "3,600 tabs",   val: "₹72,000" },
    { name: "Ibuprofen 400mg",    qty: "2,100 tabs",   val: "₹42,000" },
  ];
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white overflow-hidden">
      <div className="border-b border-zinc-50 px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
        Stock Summary — All Godowns
      </div>
      {items.map((r, i) => (
        <div key={i} className="flex items-center px-5 py-2.5 border-b border-zinc-50 last:border-0 text-sm">
          <span className="flex-1 text-zinc-700">{r.name}</span>
          <span className="w-28 text-xs text-zinc-400 text-right">{r.qty}</span>
          <span className="w-24 font-medium text-zinc-950 text-right tabular-nums">{r.val}</span>
        </div>
      ))}
    </div>
  );
}

function PayrollMockup() {
  const rows = [
    { label: "Basic Pay",          val: "₹35,000",   type: "earn"  },
    { label: "HRA",                val: "₹14,000",   type: "earn"  },
    { label: "Special Allowance",  val: "₹6,000",    type: "earn"  },
    { label: "PF Deduction",       val: "(₹4,200)",  type: "ded"   },
    { label: "Professional Tax",   val: "(₹200)",    type: "ded"   },
    { label: "Net Take-Home",      val: "₹50,600",   type: "total" },
  ];
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white overflow-hidden">
      <div className="border-b border-zinc-50 px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
        Pay Slip — Rahul Sharma · Jun 2026
      </div>
      {rows.map((r, i) => (
        <div key={i} className={`flex justify-between px-5 py-2 text-sm border-b border-zinc-50 last:border-0 ${r.type === "total" ? "font-semibold text-zinc-950 bg-zinc-50/60" : r.type === "ded" ? "text-zinc-400" : "text-zinc-500"}`}>
          <span>{r.label}</span>
          <span className="tabular-nums">{r.val}</span>
        </div>
      ))}
    </div>
  );
}

function ReportsMockup() {
  const reports = [
    "Balance Sheet", "Profit & Loss", "Trial Balance", "Day Book",
    "Cash Flow", "Fund Flow", "Stock Summary", "Stock Ageing",
    "Outstanding Receivables", "Outstanding Payables", "Ledger", "Journal Register",
  ];
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white overflow-hidden">
      <div className="border-b border-zinc-50 px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
        100+ Reports — all drill-down ready
      </div>
      <div className="grid grid-cols-2">
        {reports.map((r, i) => (
          <div key={r} className={`px-5 py-3 text-sm text-zinc-600 flex items-center gap-2 ${i % 2 === 0 ? "border-r border-zinc-50" : ""} border-b border-zinc-50`}>
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />{r}
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiCompanyMockup() {
  const companies = [
    { name: "Kapoor Mills Pvt. Ltd.",  active: true  },
    { name: "Kapoor Exports LLP",      active: false },
    { name: "KM Trading Co.",          active: false },
    { name: "Mehta & Associates",      active: false },
  ];
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white overflow-hidden">
      <div className="border-b border-zinc-50 px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
        My Companies
      </div>
      {companies.map((c) => (
        <div key={c.name} className={`flex items-center gap-3 px-5 py-3.5 border-b border-zinc-50 last:border-0 ${c.active ? "bg-[#0d0d0d]" : "hover:bg-zinc-50"}`}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${c.active ? "bg-white text-zinc-950" : "bg-zinc-100 text-zinc-500"}`}>
            {c.name[0]}
          </div>
          <span className={`text-sm font-medium ${c.active ? "text-white" : "text-zinc-600"}`}>{c.name}</span>
          {c.active && <span className="ml-auto text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">Active</span>}
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    id: "accounting",
    label: "Accounting",
    headline: "Books that stay balanced — always.",
    body: "Paisa is built on double-entry bookkeeping from the ground up. Every transaction must balance. Every ledger is real-time. And every report you pull reflects the exact state of your books at that moment — no month-end reconciliation, no manual journal adjustments to fix errors.",
    body2: "Designed to CA audit standards. Supports cost centres, profit centres, opening balance import from Tally or Excel, and every voucher type your business will ever need.",
    points: [
      "Multi-ledger chart of accounts",
      "Journal, payment, receipt, and contra vouchers",
      "Real-time trial balance and balance sheet",
      "Cost centres and profit centres",
      "Inter-company transactions",
      "Opening balance import from Tally or Excel",
    ],
    mockup: <PnLMockup />,
  },
  {
    id: "gst",
    label: "GST & Compliance",
    headline: "File GST in 20 minutes, not 3 days.",
    body: "Every sale and purchase entry in Paisa auto-applies the correct GST rate based on item, party, and transaction type. There's no separate GST module — it's built into every voucher. When it's time to file, your GSTR-1 and GSTR-3B are already computed.",
    body2: "Reconcile with GSTN to spot mismatches before the deadline. Flag unclaimed ITC. Generate e-way bills and e-invoices. TDS and TCS are handled the same way — automatic, accurate, and always current with the latest government rules.",
    points: [
      "Auto GST on every sale and purchase",
      "GSTR-1, GSTR-3B, GSTR-2A generation",
      "GSTN reconciliation and mismatch alerts",
      "HSN / SAC code management",
      "E-way bill and e-invoice generation",
      "TDS and TCS compliance",
    ],
    mockup: <GstMockup />,
  },
  {
    id: "inventory",
    label: "Inventory",
    headline: "Know what you have. Know where it is.",
    body: "Inventory in Paisa is not a separate system — it updates the moment you raise a purchase order, record a receipt, or process a sale return. Stock value in your balance sheet is always current because it's the same data, not a sync.",
    body2: "Manage multiple godowns, batch tracking, serial numbers, and expiry dates. Run movement analysis to understand which items are moving and which are ageing. Set reorder levels and get notified before you run out.",
    points: [
      "Multi-location and multi-godown support",
      "Batch and serial number tracking",
      "Expiry date management",
      "Stock ageing analysis",
      "Reorder level alerts",
      "Movement analysis with voucher drill-down",
    ],
    mockup: <InventoryMockup />,
  },
  {
    id: "payroll",
    label: "Payroll",
    headline: "Configure once. Run every month.",
    body: "Define an employee's salary structure — basic, HRA, allowances, and deductions — and Paisa calculates everything automatically when you run payroll. PF, ESI, and professional tax are applied by the book, with rates that update when government notifications change.",
    body2: "Every payroll run generates a payroll voucher that posts directly to your accounts. Pay slips are ready to print immediately. Annual CTC statements and Form 16 data are built from the same numbers.",
    points: [
      "Configurable pay heads and salary structures",
      "PF, ESI, and professional tax automation",
      "Payroll voucher direct-post to accounts",
      "Employee pay slip printing",
      "Leave and attendance integration",
      "Annual CTC and take-home statements",
    ],
    mockup: <PayrollMockup />,
  },
  {
    id: "reports",
    label: "Reports",
    headline: "Every number links back to its source.",
    body: "Paisa ships with over 100 pre-built reports. Balance sheet, P&L, trial balance, cash flow, stock summary, outstanding receivables and payables, day book, journal register — all available instantly for any date range, without exports or manual compilation.",
    body2: "Every figure in every report is a link. Click a number and you see the vouchers behind it. Click a voucher and you see the full transaction. This is how accounting software should have always worked.",
    points: [
      "P&L and balance sheet",
      "Cash flow and fund flow statements",
      "Day book and journal register",
      "Stock summary and category summary",
      "Outstanding receivables and payables",
      "Custom date range on any report",
    ],
    mockup: <ReportsMockup />,
  },
  {
    id: "multicompany",
    label: "Multi-Company",
    headline: "One login. Many entities. Zero confusion.",
    body: "Manage unlimited companies from a single Paisa account. Each company is completely isolated — one company's data never appears in another's reports, even when accessed by the same user. Switching contexts is instant.",
    body2: "Ideal for CA firms managing client books, business groups with subsidiaries, or any organisation with multiple GST registrations or branches. Role-based access control lets you grant users access to specific companies and specific features within each.",
    points: [
      "Unlimited company creation",
      "Full data isolation between entities",
      "Instant context switching",
      "Role-based access per company",
      "Consolidated group reports",
      "Shared user and permission management",
    ],
    mockup: <MultiCompanyMockup />,
  },
];

const PLATFORM = [
  {
    heading: "Real-time sync",
    body: "All entries reflect immediately across every user, every report, and every dashboard. No refresh, no delay.",
  },
  {
    heading: "Tally & Excel import",
    body: "Bring your historical data in from Tally XML exports or structured Excel sheets. Most businesses are live with clean books in under an hour.",
  },
  {
    heading: "Every voucher type",
    body: "Sales, purchase, payment, receipt, journal, contra, debit note, credit note — every transaction type your business will ever raise.",
  },
  {
    heading: "Document printing",
    body: "Print invoices, pay slips, vouchers, and any report to PDF. Custom letterhead support included.",
  },
  {
    heading: "Role-based access",
    body: "Assign users to specific companies, modules, and functions. An inventory clerk doesn't need access to payroll.",
  },
  {
    heading: "Data security",
    body: "Encrypted at rest and in transit. Hosted on AWS Mumbai for India data residency. Daily automated backups with 30-day retention.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="pt-16">

      {/* Hero */}
      <section className="py-28 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-6">Features</p>
          <h1 className="text-5xl md:text-6xl font-bold text-zinc-950 tracking-tight leading-[1.05] mb-6">
            The complete finance stack<br />
            <span style={SERIF} className="text-zinc-400 text-5xl md:text-6xl">for Indian business.</span>
          </h1>
          <p className="text-xl text-zinc-500 leading-relaxed max-w-2xl mb-10">
            Paisa is not a collection of modules bolted together. Every feature shares the same data, the same ledger, and the same real-time engine — so every number is always consistent.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center h-11 px-6 rounded-xl bg-[#0d0d0d] text-white text-sm font-semibold hover:bg-[#1a1a1a] transition-colors"
          >
            Start free — no credit card
          </Link>
        </div>
      </section>

      {/* Feature overview — text grid, no icons */}
      <section className="border-t border-zinc-100 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-y divide-zinc-100">
            {FEATURES.map((f) => (
              <a key={f.id} href={`#${f.id}`} className="px-8 py-8 group hover:bg-zinc-50 transition-colors">
                <p className="text-sm font-semibold text-zinc-950 mb-1 group-hover:underline underline-offset-4">{f.label}</p>
                <p className="text-sm text-zinc-400 leading-snug">{f.headline.replace(/—.*/, "").trim()}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Deep-dive sections */}
      {FEATURES.map((f, i) => (
        <section key={f.id} id={f.id} className={`py-28 ${i % 2 === 0 ? "bg-white" : "bg-zinc-50/50"} border-t border-zinc-100`}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-16 items-start">
              {/* Text */}
              <div className={i % 2 === 1 ? "md:order-2" : ""}>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-5">{f.label}</p>
                <h2 className="text-3xl md:text-4xl font-bold text-zinc-950 tracking-tight leading-snug mb-6">
                  {f.headline}
                </h2>
                <p className="text-zinc-500 leading-relaxed mb-4">{f.body}</p>
                <p className="text-zinc-500 leading-relaxed mb-8">{f.body2}</p>
                <ul className="space-y-2.5">
                  {f.points.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-sm text-zinc-700">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Mockup */}
              <div className={i % 2 === 1 ? "md:order-1" : ""}>{f.mockup}</div>
            </div>
          </div>
        </section>
      ))}

      {/* Platform capabilities — text only, no icons */}
      <section className="py-28 bg-white border-t border-zinc-100">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">Platform</p>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-950 tracking-tight mb-16">
            Everything else you&apos;d expect —{" "}
            <span style={SERIF} className="text-zinc-400">and then some.</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
            {PLATFORM.map((p) => (
              <div key={p.heading}>
                <p className="font-semibold text-zinc-950 mb-2">{p.heading}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 bg-[#0d0d0d]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-4">
            Try every feature,{" "}
            <span style={{ ...SERIF, color: "#71717a" }}>free for 30 days.</span>
          </h2>
          <p className="text-zinc-400 text-lg mb-10">No credit card. No setup fee. Full access from day one.</p>
          <Link
            href="/pricing"
            className="inline-flex items-center h-11 px-8 rounded-xl bg-white text-zinc-950 text-sm font-semibold hover:bg-zinc-100 transition-colors"
          >
            Get started free
          </Link>
        </div>
      </section>

    </div>
  );
}
