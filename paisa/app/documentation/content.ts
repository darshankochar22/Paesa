export type DocFlow = {
  label?: string;
  steps: string[];
};

export type DocShortcut = { key: string; action: string };

export type DocSection = {
  id: string;
  group: string;
  title: string;
  summary: string;
  path?: string;
  flows: DocFlow[];
  shortcuts?: DocShortcut[];
  notes?: string[];
  screenshot: string;
};

export const GROUP_ORDER = [
  "Start Here",
  "Masters",
  "Day-to-Day",
  "Reports",
  "Compliance",
  "Automation",
  "Reference",
] as const;

export const SECTIONS: DocSection[] = [
  {
    id: "getting-started",
    group: "Start Here",
    title: "Getting Started",
    summary: "Create your company, then turn on only the statutory features you actually need.",
    path: "Navbar → Company → Create",
    flows: [
      {
        steps: [
          "Open the Company menu on the navbar and choose Create.",
          "Type the Company Name — this is the only required field on the whole form. Everything else can be filled in later from Company → Alter.",
          "Fill in Mailing Name and Address if you want them to appear on printed vouchers, followed by State, Country, and Pincode.",
          "Set contact details — Telephone, Mobile (pre-filled with \"+91 -\"), Fax, E-mail, and Website.",
          "Confirm the Base Currency symbol (₹ by default) and its Formal name (INR) — change these only if you're not billing in rupees.",
          "On the right, under F2: Period, check Financial year beginning from and Books beginning from — both default to 1 April of the current year. Change them if you're starting the company mid-year.",
          "Click Accept to create the company, or Cancel to discard the form.",
        ],
      },
      {
        label: "After the company exists",
        steps: [
          "Turn on the statutory features you need — GST, TDS, TCS, Payroll — from Company Features. This gates which extra fields later appear on Ledgers and Stock Items, so switch on only what you'll actually use.",
          "To bring in existing books, use Import from the navbar with a Tally XML export or a structured Excel sheet, instead of re-entering everything by hand.",
          "You can create more companies at any time and switch between them — see Multi-Company & Security below.",
        ],
      },
    ],
    notes: [
      "Company Name is the only mandatory field on the create form — you're never blocked from finishing setup later.",
    ],
    screenshot: "Screenshot: Company Creation screen — full form with F2: Period panel on the right",
  },
  {
    id: "masters-accounting",
    group: "Masters",
    title: "Accounting Masters",
    summary: "The chart of accounts and the building blocks every voucher posts against.",
    path: "Gateway → Masters → Create",
    flows: [
      {
        label: "Create a Ledger",
        steps: [
          "From Masters → Create, choose Ledger.",
          "Type the Name, then press Enter to move to Under and pick the parent Group — this single choice decides the ledger's nature (Asset, Liability, Income, or Expense) and which extra fields show up next. Press Alt+G at any time to reopen the group picker.",
          "If the parent group is a Duties & Taxes type, Type of Duty/Tax and Percentage fields appear. If it's a Sundry Debtor or Creditor group, Bill-wise Details and interest-calculation options appear instead.",
          "Under Statutory Details, set GST applicability, HSN/SAC, and GST Rate — or leave each one on \"As per Company/Group\" to inherit the default instead of repeating it on every ledger.",
          "If the ledger already carries a balance, enter it under Opening Balance and mark it Dr or Cr.",
          "Press Alt+A (or click Create) to save. Esc quits without saving; Alt+C jumps straight to Alter if you're fixing an existing ledger instead of creating a new one.",
        ],
      },
      {
        label: "Create a Group",
        steps: [
          "From Masters → Create, choose Group.",
          "Type the Name and pick Under — it defaults to Capital Account. Only if you're creating a new top-level (Primary) group do you also set its Nature of Group: Assets, Liabilities, Income, or Expenses.",
          "Turn on \"Used for calculation (for example: taxes, discounts)\" if this group should apply automatically on sales invoice entries, such as a rounding or freight group.",
          "Set \"Method to allocate when used in purchase invoice\" if the group needs quantity- or value-based apportioning.",
          "Press Create to save.",
        ],
      },
    ],
    shortcuts: [
      { key: "Alt+G", action: "Open the group picker" },
      { key: "Alt+A", action: "Accept and save" },
      { key: "Alt+C", action: "Jump to Alter" },
      { key: "Esc", action: "Quit without saving" },
    ],
    screenshot: "Screenshot: Ledger Creation — Name/Under fields plus Statutory Details section expanded",
  },
  {
    id: "masters-inventory",
    group: "Masters",
    title: "Inventory Masters",
    summary: "Everything that describes what you stock and where it lives.",
    path: "Gateway → Masters → Create",
    flows: [
      {
        label: "Create a Stock Item",
        steps: [
          "From Masters → Create, choose Stock Item.",
          "Type the Name, set Under (its Stock Group), and press Alt+U to set Units — units support compound forms, like a box of 12 pieces.",
          "Turn on \"Maintain in batches\" if you need batch tracking — this reveals \"Track date of manufacturing\" and \"Use expiry dates\" underneath it.",
          "Turn on \"Set components (BOM)\" if the item is manufactured from other items, and \"Enable cost tracking\" for job-work or landed-cost items.",
          "Under GST details, set Taxability Type, HSN/SAC, and GST Rate — or leave them to inherit from the Company or Group, same as on a Ledger.",
          "If there's existing stock, enter the Opening Balance Quantity and Rate; Value is calculated for you. If the item tracks batches or godowns, an Allocate button appears so you can split that opening quantity across them before saving.",
          "Press Alt+A to save.",
        ],
      },
      {
        label: "Create a Godown",
        steps: [
          "From Masters → Create, choose Godown.",
          "Type the Name, and set Under to a parent godown if this is a sub-location (defaults to Primary).",
          "Set Excise Tax unit if it applies, otherwise leave it as \"Not Applicable\".",
          "Press Create to save.",
        ],
      },
    ],
    shortcuts: [
      { key: "Alt+G", action: "Open the group picker" },
      { key: "Alt+U", action: "Open the unit picker" },
      { key: "Alt+A", action: "Accept and save" },
      { key: "Alt+C", action: "Jump to Alter" },
      { key: "Esc", action: "Quit without saving" },
    ],
    screenshot: "Screenshot: Stock Item Creation — batch/expiry toggles and Opening Balance row",
  },
  {
    id: "cost-centres-budgets",
    group: "Masters",
    title: "Cost Centres, Budgets & Scenarios",
    summary: "Track cost by department or project, plan against a budget, and model \"what-if\" reporting that never touches the real books.",
    path: "Gateway → Masters → Create",
    flows: [
      {
        label: "Cost Centre & Cost Category",
        steps: [
          "Create a Cost Centre to track income and expense by department, project, or branch — type the Name and set Under if it's a sub-centre of an existing one.",
          "Create a Cost Category first if you need two independent tracking dimensions on the same voucher at once (say, both \"Department\" and \"Project\") — a category lets you turn Allocate Revenue Items and Allocate Non-Revenue Items on or off separately.",
        ],
      },
      {
        label: "Budget",
        steps: [
          "Create a Budget: name it, set Under if it extends another budget, then set its Period — a From and To date.",
          "Click into Groups, Ledgers, or Cost Centres on that period row to open the allocation editor, and set a Type of Budget — On Closing Balance or On Nett Transactions — plus an Amount for each account you want to track.",
          "Once vouchers start posting against those accounts, Budget vs Actual is available as its own report.",
        ],
      },
      {
        label: "Scenario",
        steps: [
          "Create a Scenario to see \"what-if\" reporting without touching real books — name it, and decide whether it should Include actuals alongside its own entries.",
          "Build Include and Exclude lists of voucher types — for example, include Optional or Provisional vouchers in one scenario and exclude them in another — to control exactly what each scenario's reports reflect.",
        ],
      },
    ],
    notes: [
      "Budget and Scenario screens accept with Ctrl+A specifically, rather than the Alt+A used on most other masters.",
    ],
    screenshot: "Screenshot: Budget allocation editor — Groups / Ledgers / Cost Centres",
  },
  {
    id: "statutory-masters",
    group: "Masters",
    title: "Statutory Masters",
    summary: "The GST, TDS, and TCS building blocks that ledgers, stock items, and vouchers all read from.",
    path: "Gateway → Masters → Create → Statutory",
    flows: [
      {
        label: "GST Registration",
        steps: [
          "Create a GST Registration for the company: set Registration Status, State, Address Type, and Registration Type — Regular or Composition.",
          "Enter the GSTIN — if the format looks off, the app asks you to confirm before accepting it anyway rather than blocking you outright.",
          "Set Periodicity of GSTR-1 (Monthly, Quarterly, Annual) if you're Regular, or a Composition Tax Rate if you're on Composition.",
          "Turn on E-Invoice Application and E-Way Bill Applicable if either applies, with their applicable-from dates — this is what unlocks the e-Invoice and e-Way Bill actions on vouchers covered under GST Filing & e-Invoicing.",
        ],
      },
      {
        label: "GST Classification",
        steps: [
          "Create a GST Classification when you want one reusable tax profile you can apply across many ledgers or stock items, instead of setting HSN/SAC and rate on each one individually.",
          "Set GST Rate Details to Specify Details Here for a flat rate, or Specify Slab-Based Rates to define rate bands by quantity or value.",
        ],
      },
      {
        label: "TDS Nature of Payment & TCS Nature of Goods",
        steps: [
          "Create a TDS Nature of Payment for each deduction section you use (for example, 194A) — set its Section, rates for individual and other deductees with and without PAN, and a Threshold Limit if one applies.",
          "TCS Nature of Goods follows the same pattern on the collection side.",
          "Mark either Is Zero Rated if it shouldn't attract tax at all — this option only appears once all of its rate fields are at zero.",
        ],
      },
      {
        label: "Credit Limits",
        steps: [
          "Open Credit Limits and pick a Group of parties.",
          "Set a Credit Limit and Credit Period, in days, per ledger in that group, and turn on Check for Credit Days if vouchers past that period should be flagged.",
        ],
      },
    ],
    screenshot: "Screenshot: GST Registration form with E-Invoice / E-Way Bill sections expanded",
  },
  {
    id: "currency-pricing",
    group: "Masters",
    title: "Currency, Pricing & Voucher Numbering",
    summary: "Multi-currency, quantity-break pricing, and per-voucher-type numbering rules.",
    path: "Gateway → Masters → Create",
    flows: [
      {
        label: "Currency",
        steps: [
          "Create a Currency: set its Symbol, Formal name, and ISO Currency Code (max 3 letters).",
          "Set Number of decimal places (2 by default), and — if you print amounts in words — a Word representing amount after decimal (like \"Paise\") and how many of those decimal places get spelled out.",
        ],
      },
      {
        label: "Price Levels & Price Lists",
        steps: [
          "Create Price Levels first — a simple named list, like Wholesale, Retail, Distributor — one per pricing tier you offer.",
          "Then create a Price List by Stock Group (or by Stock Category): pick the Stock Group, the Price Level it applies to, and an Applicable From date.",
          "Fill the rate table — Item, Qty From, Qty Less Than, Rate, Disc % — to set quantity-break pricing per item. The screen shows each item's previous rate alongside for comparison.",
        ],
      },
      {
        label: "Voucher Type numbering",
        steps: [
          "Open Voucher Type to customise a specific type's behaviour instead of relying on the defaults — pick a Method of Voucher Numbering: Automatic, Manual, Multi-user Auto, or None.",
          "Turn on Set/Alter additional numbering details to set a Starting Number, Width, Prefix/Suffix rules, or a Restart Numbering schedule — for example, restart at 1 every financial year.",
          "Voucher Classes can be added here too, for when a class needs to be marked Use for GST Details.",
        ],
      },
    ],
    screenshot: "Screenshot: Price List by Stock Group — quantity-break rate table",
  },
  {
    id: "vouchers",
    group: "Day-to-Day",
    title: "Vouchers",
    summary: "Every transaction — sales, purchases, payments, stock movement — starts as a voucher.",
    path: "Gateway → Transactions → Vouchers",
    flows: [
      {
        label: "Record a Sales voucher",
        steps: [
          "Open Vouchers and press F8 for Sales (F4 Contra, F5 Payment, F6 Receipt, F7 Journal, and F9 Purchase switch to those types the same way; F10 opens everything else — Credit Note, Debit Note, Stock Journal, Physical Stock, and the order types).",
          "Select the Party A/c name from the searchable ledger list — it shows the party's current balance next to its name. Choosing a party opens the Dispatch Details popup automatically.",
          "Pick the Sales ledger, then fill the item table: Name of Item, Quantity, Rate per unit. Amount is calculated for you as you go — add as many rows as the invoice needs.",
          "Press A to Accept and save, or Q to quit without saving.",
        ],
      },
      {
        label: "Bill-wise allocation",
        steps: [
          "If the party ledger is a Sundry Debtor or Creditor, accepting the voucher opens a Bill-wise Allocation popup instead of saving immediately.",
          "Choose New Ref to raise this as a fresh invoice — set a Credit Period and its Due Date is calculated for you — or Agst Ref to settle it against an existing bill from the Pending Bills list shown in the popup.",
          "The allocated amounts must add up to the voucher total before you can Accept.",
        ],
      },
      {
        label: "Payment, Receipt, Journal, Contra",
        steps: [
          "These four default to single-entry mode — one Account plus a Particulars table of ledger/amount rows.",
          "Press H to switch to full double-entry mode instead, with separate Dr and Cr columns. Both sides must balance before the voucher can be saved.",
        ],
      },
      {
        label: "Review or edit a past voucher",
        steps: [
          "Open Day Book. Narrow it down with Voucher Type (F4 opens a type picker), a single date (F2), or a date range (Alt+F2).",
          "Press Enter on any row to open that voucher.",
          "Any voucher can be reopened and changed — the full entry loads back exactly as it was passed, and totals and tax recalculate automatically when you save.",
        ],
      },
    ],
    shortcuts: [
      { key: "F2", action: "Change voucher date" },
      { key: "F3", action: "Company / tax registration" },
      { key: "F4 – F9", action: "Contra, Payment, Receipt, Journal, Sales, Purchase" },
      { key: "F10", action: "Other voucher types" },
      { key: "H", action: "Toggle single / double entry" },
      { key: "T", action: "Toggle post-dated" },
      { key: "A", action: "Accept and save" },
      { key: "Q", action: "Quit" },
    ],
    screenshot: "Screenshot: Sales voucher entry — item table plus Bill-wise Allocation popup",
  },
  {
    id: "manufacturing-jobwork",
    group: "Day-to-Day",
    title: "Manufacturing & Job Work",
    summary: "Convert raw materials into finished goods, and track items sent out for or received from job work.",
    path: "Gateway → Transactions → Vouchers → F10 → Stock Journal / Manufacturing Journal / Job Work Orders",
    flows: [
      {
        steps: [
          "Open a Stock Journal or Manufacturing Journal voucher — both use the same split-screen layout: Source Items on the left, Destination Items on the right.",
          "On the Source side, enter what's being consumed: Name of Item, Godown, and Quantity. Rate pre-fills from the item's last purchase price, and Amount is calculated for you.",
          "On the Destination side, enter what's being produced the same way. Pressing Enter on the last row of either side adds a new one automatically.",
          "Job Work In Order and Job Work Out Order use the standard order-voucher layout, but with two differences: there's no Godown column, since job work doesn't track a specific storage location, and an Order No. field appears next to the party. Selecting a party opens an item-allocation popup to set exactly what's being sent or received under that order.",
        ],
      },
    ],
    screenshot: "Screenshot: Stock Journal — Source Items / Destination Items split layout",
  },
  {
    id: "physical-stock",
    group: "Day-to-Day",
    title: "Physical Stock Verification",
    summary: "Record what you actually counted, and compare it against the books.",
    path: "Gateway → Transactions → Vouchers → F10 → Physical Stock",
    flows: [
      {
        steps: [
          "Open Physical Stock Verification and start typing the item you just counted — it autocompletes from your stock items.",
          "Set the Godown. If the item tracks batches, pick a Batch/Lot from the Active Batches popup, or click New Number to log one that isn't in the system yet — its expiry date fills in automatically.",
          "Enter the Quantity you actually counted. Amount is a read-only figure calculated from the item's valuation, not something you type.",
          "Pressing Enter after Quantity adds another godown row for the same item, matching how stock is usually split across locations when you count it.",
        ],
      },
    ],
    notes: [
      "This voucher only records what you counted — it doesn't post the variance against book stock automatically. If counted and book quantities differ, pass a separate adjustment (a Stock Journal or Journal voucher) to bring the books in line.",
    ],
    screenshot: "Screenshot: Physical Stock Verification — item / godown / batch / quantity rows",
  },
  {
    id: "banking",
    group: "Day-to-Day",
    title: "Banking & Reconciliation",
    summary: "Match your bank ledger against the actual bank statement, entry by entry.",
    path: "Navbar → Exchange → Banking, or Gateway → Utilities → Banking",
    flows: [
      {
        steps: [
          "Open Banking and choose Banking Activities to reconcile a bank ledger against its statement.",
          "Pick the bank ledger from the dropdown — it only lists ledgers under a Bank group — and click Refresh to load its entries.",
          "Each row shows Date, Voucher No., Amount, Balance, and Status. Click Reconcile on an entry, then enter its Bank reference (cheque / UTR / NEFT no.) and Bank date to mark it matched.",
          "Click Unreconcile on any entry to undo a match made by mistake.",
        ],
      },
    ],
    screenshot: "Screenshot: Banking Activities — bank ledger reconciliation table",
  },
  {
    id: "financial-statements",
    group: "Reports",
    title: "Financial Statements",
    summary: "The core statements every business needs, computed live from your vouchers — not a month-end batch job.",
    path: "Gateway → Reports, or Display More Reports → Accounting",
    flows: [
      {
        steps: [
          "Balance Sheet, Profit & Loss A/c, and Ratio Analysis sit directly on the Gateway under REPORTS — one click, no menu digging.",
          "For Trial Balance, Cash Flow, and Funds Flow, use Display More Reports → Accounting → Account Books or Statements of Accounts.",
          "Every statement opens already scoped to the current period — change the range from the date controls in the report's own header rather than a separate settings screen.",
          "Click any figure on the page to drill into the vouchers behind it, the same drill-down pattern used throughout the report suite (see Inventory & Stock Reports for the fullest example of this chain).",
        ],
      },
      {
        label: "Ratio Analysis & Statistics",
        steps: [
          "Ratio Analysis lays out liquidity, profitability, solvency, and efficiency ratios as a straight read — there's no drill-down, it's a snapshot for the period.",
          "Statistics is the opposite: a live count of every Group, Ledger, Stock Item, and voucher type. Clicking any of those numbers drills straight into the underlying list — accounts open the Chart of Accounts, voucher types open that type's register.",
        ],
      },
    ],
    screenshot: "Screenshot: Balance Sheet with a figure mid-drill-down",
  },
  {
    id: "inventory-reports",
    group: "Reports",
    title: "Inventory & Stock Reports",
    summary: "See what you have, where it is, and how fast it's moving — three keystrokes from a summary number to the voucher behind it.",
    path: "Display More Reports → Inventory → Inventory Books → Stock Item",
    flows: [
      {
        steps: [
          "Open Stock Item. A selection popup appears — type to search by Name of Item, or use the ↑ / ↓ arrows, then press Enter. If the item doesn't exist yet, click Create right there.",
          "You land on the Stock Item Monthly Summary — one row per month, with Opening Balance, Inwards Qty/Value, Outwards Qty/Value, and Closing Qty/Value, plus a bar chart above the table.",
          "Press Ctrl+H to change the granularity — Daily, Weekly, Fortnightly, 4-Week, Monthly, Quarterly, or Half-Yearly. Press F7 to show or hide profit on the same screen.",
          "Press Enter on any row to drill into Stock Item Vouchers for that period — the individual transactions behind that number, with Date, Voucher Type, Voucher Number, and the same Qty/Value columns.",
          "Press Enter again on a voucher row to open the actual voucher.",
          "Esc or Backspace steps back exactly one level at a time — Vouchers → Summary → the item-search popup — there's no breadcrumb to click, just back-out-as-you-came.",
          "Press F4 from anywhere in this chain to jump straight back to item search and look up something else; Ctrl+S saves your current granularity and filters as a view for next time.",
        ],
      },
      {
        label: "Also built on this same pattern",
        steps: [
          "Movement Analysis, Stock Ageing, Reorder Status, Batch reports, and Cost Analysis all use the identical summary → vouchers → voucher drill chain — only the columns on the summary screen change per report.",
          "Stock Summary and Godown Summary are valued by FIFO or Weighted Average, set per stock item.",
        ],
      },
    ],
    shortcuts: [
      { key: "F4", action: "Back to item search" },
      { key: "F7", action: "Show / hide profit" },
      { key: "Ctrl+H", action: "Change granularity" },
      { key: "B", action: "Basis of values" },
      { key: "Ctrl+S", action: "Save current view" },
      { key: "Enter", action: "Drill in / open voucher" },
      { key: "Esc / Backspace", action: "Back one level" },
    ],
    screenshot: "Screenshot: Stock Item Monthly Summary with the bar chart and Change View panel",
  },
  {
    id: "outstandings",
    group: "Reports",
    title: "Outstandings & Bills",
    summary: "Who owes you, who you owe, and for how long — with nothing to configure per transaction.",
    path: "Display More Reports → Accounting → Statements of Accounts → Outstandings",
    flows: [
      {
        steps: [
          "Bills Receivable and Bills Payable list every pending bill with an ageing bucket — 0–30, 31–60, 61–90, and 90+ days.",
          "Ledger-wise and Group-wise Outstandings roll the same bills up by party or account. Press Enter on any row to drill down to the individual bill, and again to reach the voucher that raised it.",
          "Order Outstanding tracks pending sales and purchase orders using the same drill pattern.",
          "None of this needs setup — the moment a voucher posts to a Sundry Debtor or Creditor ledger, its bill reference is tracked automatically through the Bill-wise Allocation popup covered under Vouchers.",
        ],
      },
    ],
    screenshot: "Screenshot: Bills Receivable with ageing buckets",
  },
  {
    id: "sales-purchase-reports",
    group: "Reports",
    title: "Sales, Purchase & Party Reports",
    summary: "The same transactions, cut by party, item, GST rate, state, or salesperson — whichever grouping answers your question.",
    path: "Display More Reports → Sales, Purchase & Party Analysis",
    flows: [
      {
        steps: [
          "Sales Register and Purchase Register come in several cuts — Detailed, Monthly, Party-wise, Item-wise, GST-wise, State-wise, and more — pick whichever grouping answers your question instead of building a custom filter.",
          "Party Analysis rolls the same data up by customer or supplier: Customer/Supplier Summary, Profitability, Top and Dormant parties, and Credit Analysis.",
          "Order Management reports — Order to Invoice, Pending/Cancelled/Preclosed Orders — track fulfilment once you're using Sales or Purchase Orders.",
          "Sales Return and Purchase Return registers, plus Discount and Freight analysis, cover the adjustment side of the same transactions.",
        ],
      },
    ],
    screenshot: "Screenshot: Sales Register — Party-wise variant",
  },
  {
    id: "cash-bank-reports",
    group: "Reports",
    title: "Cash & Bank Reports",
    summary: "Every cash and bank movement for the period, scoped to one ledger at a time.",
    path: "Display More Reports → Cash, Bank, Finance & Banking",
    flows: [
      {
        steps: [
          "Cash Book and Bank Book, plus their Summary variants, list every cash or bank movement for the period — the same Date / Party / Amount / Balance shape as a Day Book, just scoped to one ledger.",
          "Cheque Register and Post-dated Cheque reports track cheques issued and received.",
          "UPI and NEFT/RTGS reports split digital payments out from the general Bank Book.",
          "To actually reconcile a bank account against its statement rather than just read the book, use Banking → Banking Activities — see Banking & Reconciliation.",
        ],
      },
    ],
    screenshot: "Screenshot: Bank Book — Detailed variant",
  },
  {
    id: "gst-compliance",
    group: "Compliance",
    title: "GST Filing & e-Invoicing",
    summary: "GST isn't a separate module — it's computed on every voucher, and filing happens from one workspace.",
    path: "Compliance workspace — e-Invoice, e-Way Bill, and GST Filing tabs",
    flows: [
      {
        label: "e-Invoice and e-Way Bill",
        steps: [
          "These are generated per voucher, not from the Compliance workspace directly. Open a Sales voucher and use its I: e-Invoice action to raise an IRN, or E: e-Way Bill to raise one — the latter asks for Distance, Mode, and Vehicle No. first.",
          "The Compliance workspace's e-Invoice and e-Way Bill tabs then list everything you've generated — Invoice No., Date, IRN/EWB No., Status — with a Refresh button to pull the latest state from the portal.",
        ],
      },
      {
        label: "Filing a GST return",
        steps: [
          "Switch to the GST Filing tab. Choose the Return — GSTR-1 or GSTR-3B — and enter the Period as MMYYYY, for example 062026.",
          "Click Prepare to compute the return locally from your vouchers. Nothing leaves the app at this step.",
          "Click Save to portal to upload it to the GSP — this step is reversible, so it's safe to re-check before filing.",
          "Click File only when you're ready to commit. You'll be asked to confirm, then to enter an OTP — this step is irreversible.",
          "GSTR-2A / 2B reconciliation runs from the same workspace, matching what you've filed against what's on the GST portal so mismatches surface before the deadline instead of after.",
        ],
      },
    ],
    notes: [
      "Filing needs the company's GST Registration master (Masters → Create → GST Registration) and portal credentials set up once — the workspace shows a banner if either is missing.",
    ],
    screenshot: "Screenshot: GST Filing tab — Prepare / Save to portal / File controls",
  },
  {
    id: "gst-reports",
    group: "Compliance",
    title: "GST Reports",
    summary: "See exactly what a return will contain before you file it, and catch data problems that would get it rejected.",
    path: "Display More Reports → GST Reports",
    flows: [
      {
        steps: [
          "GST Reports is a large menu of viewing and analysis screens, separate from the Prepare / Save to portal / File workflow covered under GST Filing & e-Invoicing — use it to inspect a return before you commit to filing it.",
          "GSTR-1 and GSTR-3B each break down into a dozen-plus views — B2B, B2C Large/Small, Credit/Debit Notes, HSN Summary, and more — matching the sections of the actual return.",
          "GSTR-2A / 2B Reconciliation shows books-vs-portal comparisons, and GST Challan Reconciliation checks payments against challans, so mismatches are visible before filing rather than after.",
          "Exceptions — Missing HSN/SAC, Missing GSTIN, GSTIN Validation, Place of Supply — flag exactly the kind of data problems that would otherwise cause a return to bounce.",
        ],
      },
    ],
    screenshot: "Screenshot: GSTR-1 HSN Summary view",
  },
  {
    id: "tds-tcs",
    group: "Compliance",
    title: "TDS & TCS",
    summary: "The statutory forms, generated straight from your deduction and collection entries.",
    path: "Display More Reports → TDS Reports / TCS Reports",
    flows: [
      {
        steps: [
          "TDS Reports and TCS Reports generate the statutory forms — 26Q, 27Q, and 24Q for TDS, 27EQ for TCS — from your deduction and collection entries.",
          "Outstandings break down by Ledger, Nature of Payment/Goods, or Party, so what's due is visible before the challan deadline.",
          "Challan Reconciliation checks what you've paid against what's been deposited, and the Exceptions views — Ledgers Without PAN, Section Number mismatches — catch the same kind of data problems GST Reports flags on the GST side.",
        ],
      },
    ],
    screenshot: "Screenshot: TDS Form 26Q generation view",
  },
  {
    id: "payroll",
    group: "Compliance",
    title: "Payroll & HR",
    summary: "Configure a salary structure once; every payroll run after that posts straight to the accounts.",
    path: "Gateway → Masters → Create → Employee, then Reports → Payroll & HR",
    flows: [
      {
        label: "Set up an employee",
        steps: [
          "Create an Employee — Name is the only required field. Fill in Employee Code, Designation, Date of Joining, and Employee Group alongside it.",
          "Turn on \"Provide Bank Details\" if salary is paid by transfer — it reveals Account Number, Bank Name, Branch, and IFSC Code.",
          "Fill in Statutory Details as applicable — PAN, Aadhaar, UAN, PF Account, ESI Number.",
          "Turn on \"Define Salary Details\" to open the salary editor right there, or set it up afterwards from Salary Structure instead.",
        ],
      },
      {
        label: "Build the salary structure",
        steps: [
          "Open Salary Structure, pick the Employee, and set Effective From.",
          "Fill the Pay Heads table — Basic, HRA, PF deduction, and so on — with a Calculation Type and Rate for each. Click Load example to start from a template instead of building it blank.",
          "Click Validate to check the entry, then Create entry to save it. PF, ESI, and Professional Tax are computed automatically from these figures on every payroll run.",
        ],
      },
      {
        label: "Run payroll and print a pay slip",
        steps: [
          "Once a salary structure exists, running payroll for the period posts a Payroll voucher directly to the accounts — no separate reconciliation step.",
          "Pay Slip lives under Reports → Payroll & HR, not as a voucher — open it for one employee's detailed earnings and deductions, or use Multi Pay Slip to print a whole group at once.",
        ],
      },
    ],
    screenshot: "Screenshot: Salary Structure — Pay Heads table with Load example",
  },
  {
    id: "whatsapp",
    group: "Automation",
    title: "WhatsApp CRM",
    summary: "Share invoices and talk to customers on WhatsApp, without leaving the voucher screen.",
    path: "Voucher View → Send on WhatsApp",
    flows: [
      {
        steps: [
          "Open any voucher — typically a Sales invoice — in Voucher View, and use the Send on WhatsApp action.",
          "Recipient number auto-fills from the party ledger's phone number if one's on file; edit it if you're sending elsewhere.",
          "Leave \"Attach invoice PDF\" checked to deliver the voucher as a formatted PDF alongside the message text.",
          "Click Send — the invoice goes out over the WhatsApp Business API.",
          "Replies land in the shared Inbox tab of the WhatsApp workspace, alongside Compose, Campaigns, Templates, and Message Log for anything beyond one-off invoice sends.",
        ],
      },
    ],
    screenshot: "Screenshot: Send on WhatsApp modal with invoice preview",
  },
  {
    id: "ai-copilot",
    group: "Automation",
    title: "AI Copilot & Automation",
    summary: "An AI layer over the same report engine and voucher pipeline everything else uses — nothing bypasses the books.",
    path: "Gateway → Utilities → AI Copilot",
    flows: [
      {
        label: "Chat",
        steps: [
          "Open Copilot and stay on the Chat tab. The first time, add an Anthropic (Claude) or OpenAI-compatible API key under AI Model and click Save & verify.",
          "Ask a question in plain language — \"What is my cash balance?\" or \"Show the trial balance\" — directly in the composer.",
          "If the assistant proposes an action rather than just answering, it shows up in an amber box under its reply with an Approve button. Nothing is created until you click it.",
        ],
      },
      {
        label: "Assisted Entry",
        steps: [
          "Switch to the Assisted Entry tab — this doesn't need a chat model connected at all.",
          "Click Load example to start from a template for the voucher type you want, then edit the JSON entry by hand.",
          "Click Validate — it checks the entry against the same rules a manual voucher follows (ledger names, GST, double-entry balance) and tells you exactly what's wrong if it doesn't pass.",
          "Once it validates, click Create entry. It goes through the identical voucher pipeline as anything typed in by hand, so an AI-assembled entry is exactly as safe as a manual one.",
        ],
      },
    ],
    notes: [
      "A Model Context Protocol (MCP) server also exposes company data to external AI agents and tools, under the same access rules as the app itself — see the Roadmap for where this is headed.",
    ],
    screenshot: "Screenshot: Assisted Entry — JSON editor with Validate / Create entry",
  },
  {
    id: "multi-company",
    group: "Reference",
    title: "Multi-Company & Security",
    summary: "One login, many businesses, full separation between them.",
    path: "Navbar → Company",
    flows: [
      {
        steps: [
          "Open the Company menu and choose Change to see every company on this account and switch to one.",
          "Choose Create to start a new company (see Getting Started), or Alter to edit the current one's details.",
          "Choose Select to clear the current company so you're prompted to choose again — useful when handing the machine to someone else.",
          "Switching companies reloads its financial years automatically, and every open screen — reports, vouchers, masters — re-scopes to the newly selected company. Nothing from one company is ever visible while another is active.",
        ],
      },
    ],
    notes: [
      "Role-based access is assignable per company and per module. Audit Trail and Edit Log record every change in an immutable hash chain, and backups run daily.",
    ],
    screenshot: "Screenshot: Company change screen listing multiple companies",
  },
  {
    id: "audit-exceptions",
    group: "Reference",
    title: "Audit Trail, Edit Log & Exceptions",
    summary: "Every change is recorded, and the things that need attention surface on their own instead of waiting to be noticed.",
    path: "Display More Reports → Audit, Edit Log & Security",
    flows: [
      {
        steps: [
          "Edit Log and Tally Audit Listing record who changed what and when — every voucher and master edit is captured, backed by an immutable hash chain so the log itself can't be quietly altered.",
          "Voucher Audit and Ledger Audit narrow the same log to one transaction type or account; Deleted and Altered reports isolate just those two kinds of change.",
          "Negative Stock and the Overdue Receivables/Payables exception views (see also Outstandings & Bills) surface data that needs attention without anyone having to notice it buried in a full report.",
          "User Activity and Security reports track logins and access — useful once more than one person is working in the same company.",
        ],
      },
    ],
    screenshot: "Screenshot: Edit Log — voucher alteration history",
  },
  {
    id: "navigation",
    group: "Reference",
    title: "Navigation & Shortcuts",
    summary: "The Gateway is home; everything else is a keystroke away from it.",
    flows: [
      {
        steps: [
          "The Gateway is the home screen. MASTERS, TRANSACTIONS, UTILITIES, and REPORTS sit right on it; click Display More Reports to expand into five deeper categories — Accounting, Inventory, Statutory, Payroll, and Exception.",
          "Every report, voucher, and master opens as a full-screen panel, not a small popup, so the whole window is working space.",
          "Function keys switch context without touching the mouse — F2 for date, F4 through F9 for voucher types, F7 for profit toggles on reports. Each screen's own shortcut list is always visible on its right edge.",
          "Esc steps back exactly one level at a time — out of a popup, up a drill-down level, or back toward the Gateway — never straight home in one jump.",
          "Export works the same way everywhere: P or the Export menu turns the current voucher into a PDF; Alt+E exports the current report to CSV.",
        ],
      },
    ],
    shortcuts: [
      { key: "Esc", action: "Back one level" },
      { key: "Alt+E", action: "Export current report to CSV" },
      { key: "P", action: "Export current voucher to PDF" },
    ],
    screenshot: "Screenshot: Gateway home screen with Display More Reports expanded",
  },
];

export type RoadmapItem = { title: string; body: string };

export const ROADMAP_NEAR_TERM: RoadmapItem[] = [
  {
    title: "Sales & Purchase order processing",
    body: "Full order lines, numbering, and due dates, with fulfilment tracking back to the invoice.",
  },
  {
    title: "Voucher Classes",
    body: "Automatic ledger allocation and rounding rules per voucher type.",
  },
  {
    title: "Bill of Materials & manufacturing",
    body: "Component consumption computed automatically from a BOM when a production voucher is passed.",
  },
  {
    title: "Interest calculation",
    body: "Simple and compound interest on overdue bills, with a dedicated interest report.",
  },
  {
    title: "Reversing journals & scenarios",
    body: "Provisional entries that apply only inside a chosen scenario, never touching the real books.",
  },
  {
    title: "User-defined voucher numbering",
    body: "Configurable numbering series per voucher type, instead of a fixed default.",
  },
  {
    title: "Backup, restore & data migration",
    body: "The Data menu already has the right entries — Backup, Restore, Split, Migrate, Repair — wiring them to working screens is next.",
  },
  {
    title: "Company security & Tally Vault",
    body: "Password-protecting a company and setting per-user access levels is on the menu today; the screens and enforcement behind it aren't built yet.",
  },
];

export const ROADMAP_AI_AGENTS: RoadmapItem[] = [
  {
    title: "Autonomous reconciliation agent",
    body: "Matches bank statements to the bank book on its own and surfaces only the exceptions that need a human decision.",
  },
  {
    title: "Anomaly detection agent",
    body: "Watches new vouchers continuously — duplicate bills, round-number journals, off-hours edits — and flags them as they happen, not just when a report is run.",
  },
  {
    title: "Close-the-books agent",
    body: "Runs the month-end checklist — accruals, depreciation, GST reconciliation — and hands back a short list of exceptions instead of a blank checklist.",
  },
  {
    title: "Natural-language reporting, fully autonomous",
    body: "Today's Copilot chat answers questions across the report engine. The next step is letting it compose new views on its own — no report has to exist ahead of time.",
  },
  {
    title: "Third-party agents over MCP",
    body: "The MCP server already lets any MCP-aware agent read company data. Next: a permission model so external agents — Claude, ChatGPT, or an internal tool — can act, not just read, within scopes you explicitly grant.",
  },
  {
    title: "Approval-gated agent actions",
    body: "Every agent-initiated voucher will keep going through the same validation and double-entry path Assisted Entry uses today — read access can be automatic, write access stays opt-in and reviewable.",
  },
];
