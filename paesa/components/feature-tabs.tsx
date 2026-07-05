"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

const FEATURES = [
  {
    id: "accounting",
    label: "Accounting",
    title: "Double-entry bookkeeping, built to CA standards.",
    desc: "Full ledger management, real-time P&L, balance sheet, and every voucher type — from day one.",
    points: ["Multi-ledger chart of accounts", "Journal & payment vouchers", "Real-time trial balance & balance sheet", "Cost centres and profit centres"],
    visual: (
      <div className="rounded-xl border border-zinc-100 bg-white overflow-hidden shadow-sm">
        <div className="border-b border-zinc-50 px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">Profit & Loss — Jun 2026</div>
        {[
          { label: "Gross Sales", val: "₹24,85,000", bold: false, indent: false },
          { label: "Less: Returns", val: "(₹1,20,000)", bold: false, indent: true },
          { label: "Net Sales", val: "₹23,65,000", bold: true, indent: false },
          { label: "Cost of Goods Sold", val: "₹14,20,000", bold: false, indent: false },
          { label: "Gross Profit", val: "₹9,45,000", bold: true, indent: false },
          { label: "Operating Expenses", val: "₹2,92,000", bold: false, indent: false },
          { label: "Net Profit", val: "₹6,53,000", bold: true, indent: false },
        ].map((r, i) => (
          <div key={i} className={`flex justify-between px-5 py-2.5 text-sm border-b border-zinc-50 last:border-0 ${r.bold ? "font-semibold text-zinc-950 bg-zinc-50/60" : "text-zinc-600"} ${r.indent ? "pl-9" : ""}`}>
            <span>{r.label}</span><span className="tabular-nums">{r.val}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "gst",
    label: "GST & Compliance",
    title: "File GSTR-1 and GSTR-3B in under 20 minutes.",
    desc: "Every transaction auto-tagged with the right GST rate. Reconcile with GSTN and spot mismatches before you file.",
    points: ["Auto GST on sales & purchases", "GSTR-1, GSTR-3B, GSTR-2A generation", "GSTN reconciliation & mismatch alerts", "E-way bill and e-invoice ready"],
    visual: (
      <div className="rounded-xl border border-zinc-100 bg-white overflow-hidden shadow-sm">
        <div className="border-b border-zinc-50 px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">GSTR-3B Summary</div>
        {[
          { label: "Outward Taxable Supplies", val: "₹23,65,000" },
          { label: "GST Collected (Output)", val: "₹4,25,700" },
          { label: "ITC Available (Input)", val: "₹2,10,400" },
          { label: "Net Tax Payable", val: "₹2,15,300" },
        ].map((r, i) => (
          <div key={i} className={`flex justify-between px-5 py-3 text-sm border-b border-zinc-50 last:border-0 ${i === 3 ? "font-semibold text-zinc-950 bg-zinc-50/60" : "text-zinc-600"}`}>
            <span>{r.label}</span><span className="tabular-nums font-medium">{r.val}</span>
          </div>
        ))}
        <div className="px-5 py-3">
          <div className="h-9 rounded-lg bg-[#0d0d0d] flex items-center justify-center text-white text-xs font-medium">File on GSTN portal →</div>
        </div>
      </div>
    ),
  },
  {
    id: "inventory",
    label: "Inventory",
    title: "Track every item across every godown. Batches, expiry, movement — all of it.",
    desc: "Real-time stock levels, batch tracking, and movement analysis drill-down to the source voucher.",
    points: ["Multi-location / multi-godown support", "Batch & serial number tracking", "Expiry date management", "Stock ageing & reorder alerts"],
    visual: (
      <div className="rounded-xl border border-zinc-100 bg-white overflow-hidden shadow-sm">
        <div className="border-b border-zinc-50 px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">Stock Summary</div>
        {[
          { item: "Paracetamol 500mg", qty: "4,200 strips", val: "₹84,000" },
          { item: "Amoxicillin 250mg", qty: "1,800 caps", val: "₹54,000" },
          { item: "Vitamin C 1000mg", qty: "3,600 tabs", val: "₹72,000" },
          { item: "Ibuprofen 400mg", qty: "2,100 tabs", val: "₹42,000" },
        ].map((r, i) => (
          <div key={i} className="flex items-center px-5 py-2.5 border-b border-zinc-50 last:border-0 text-sm">
            <span className="flex-1 text-zinc-700">{r.item}</span>
            <span className="w-28 text-zinc-400 text-xs text-right">{r.qty}</span>
            <span className="w-24 text-zinc-950 font-medium text-right tabular-nums">{r.val}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "payroll",
    label: "Payroll",
    title: "Define salary structure once. Paesa handles PF, ESI, TDS, and pay slips.",
    desc: "Configurable pay heads, statutory deductions, and pay slip printing — everything automated.",
    points: ["Configurable pay heads & salary structures", "PF, ESI, professional tax automation", "Monthly payroll voucher generation", "Employee pay slip printing"],
    visual: (
      <div className="rounded-xl border border-zinc-100 bg-white overflow-hidden shadow-sm">
        <div className="border-b border-zinc-50 px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">Pay Slip — Rahul Sharma · Jun 2026</div>
        {[
          { label: "Basic Pay", val: "₹35,000", type: "earn" },
          { label: "HRA", val: "₹14,000", type: "earn" },
          { label: "Special Allowance", val: "₹6,000", type: "earn" },
          { label: "PF Deduction", val: "(₹4,200)", type: "ded" },
          { label: "Professional Tax", val: "(₹200)", type: "ded" },
          { label: "Net Take-Home", val: "₹50,600", type: "total" },
        ].map((r, i) => (
          <div key={i} className={`flex justify-between px-5 py-2 text-sm border-b border-zinc-50 last:border-0 ${r.type === "total" ? "font-semibold text-zinc-950 bg-zinc-50/60" : r.type === "ded" ? "text-zinc-400" : "text-zinc-600"}`}>
            <span>{r.label}</span><span className="tabular-nums">{r.val}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "reports",
    label: "Reports",
    title: "100+ reports. Every number drills down to its source voucher.",
    desc: "Balance sheet, P&L, cash flow, stock summary, outstanding — all pre-built and ready instantly.",
    points: ["P&L & balance sheet", "Cash flow & fund flow statement", "Outstanding receivables & payables", "Stock summary, ageing & movement"],
    visual: (
      <div className="rounded-xl border border-zinc-100 bg-white overflow-hidden shadow-sm">
        <div className="border-b border-zinc-50 px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">Available Reports</div>
        <div className="grid grid-cols-2 gap-px bg-zinc-50">
          {["Balance Sheet", "Profit & Loss", "Trial Balance", "Day Book", "Cash Flow", "Stock Summary", "Ledger", "Outstanding"].map(r => (
            <div key={r} className="bg-white px-4 py-3 text-xs text-zinc-600 hover:bg-zinc-50 cursor-pointer flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />{r}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "multicompany",
    label: "Multi-Company",
    title: "One login. Many entities. Instant context switching.",
    desc: "Manage client books, subsidiaries, or branches from one account — with full data isolation and role-based access.",
    points: ["Unlimited companies", "Full data isolation", "Instant context switching", "Role-based access per company"],
    visual: (
      <div className="rounded-xl border border-zinc-100 bg-white overflow-hidden shadow-sm">
        <div className="border-b border-zinc-50 px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">My Companies</div>
        {["Kapoor Mills Pvt. Ltd.", "Kapoor Exports LLP", "KM Trading Co.", "Mehta & Associates"].map((c, i) => (
          <div key={c} className={`flex items-center gap-3 px-5 py-3 border-b border-zinc-50 last:border-0 cursor-pointer ${i === 0 ? "bg-[#0d0d0d]" : "hover:bg-zinc-50"}`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${i === 0 ? "bg-white text-zinc-950" : "bg-zinc-100 text-zinc-500"}`}>
              {c[0]}
            </div>
            <span className={`text-sm font-medium ${i === 0 ? "text-white" : "text-zinc-700"}`}>{c}</span>
            {i === 0 && <span className="ml-auto text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">Active</span>}
          </div>
        ))}
      </div>
    ),
  },
];

export function FeatureTabs() {
  const [active, setActive] = useState("accounting");
  const current = FEATURES.find(f => f.id === active)!;

  return (
    <section className="py-28 bg-white border-t border-zinc-100">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Platform</p>
          <h2 className="text-4xl md:text-5xl font-bold text-zinc-950 tracking-tight">
            Every workflow,{" "}
            <span style={{ fontFamily: "var(--font-lora), serif", fontStyle: "italic", fontWeight: 400, color: "#a1a1aa" }}>
              one platform.
            </span>
          </h2>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-1 justify-center mb-12 p-1 bg-zinc-100 rounded-2xl w-fit mx-auto">
          {FEATURES.map(f => (
            <button
              key={f.id}
              onClick={() => setActive(f.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active === f.id
                  ? "bg-[#0d0d0d] text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-zinc-950 tracking-tight leading-snug mb-4">
              {current.title}
            </h3>
            <p className="text-zinc-500 leading-relaxed mb-7">{current.desc}</p>
            <ul className="space-y-3">
              {current.points.map(p => (
                <li key={p} className="flex items-center gap-3 text-sm text-zinc-700">
                  <CheckCircle2 size={15} className="text-zinc-950 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div>{current.visual}</div>
        </div>
      </div>
    </section>
  );
}
