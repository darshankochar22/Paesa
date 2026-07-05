"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Minus, ArrowRight, Plus } from "lucide-react";

const plans = [
  {
    name: "Starter",
    monthly: 999,
    annual: 799,
    desc: "For freelancers, sole proprietors, and early-stage businesses.",
    features: {
      companies: "1",
      users: "2",
      storage: "5 GB",
      accounting: true,
      gst: true,
      inventory: false,
      payroll: false,
      multiCompany: false,
      reports: "Standard (40+)",
      support: "Email",
      api: false,
      dedicated: false,
    },
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Growth",
    monthly: 2499,
    annual: 1999,
    desc: "For growing SMBs that need inventory, payroll, and more users.",
    features: {
      companies: "5",
      users: "10",
      storage: "25 GB",
      accounting: true,
      gst: true,
      inventory: true,
      payroll: true,
      multiCompany: true,
      reports: "Full (100+)",
      support: "Priority email & chat",
      api: false,
      dedicated: false,
    },
    cta: "Start free",
    highlight: true,
  },
  {
    name: "Enterprise",
    monthly: null,
    annual: null,
    desc: "For CA firms, groups, and large teams with complex requirements.",
    features: {
      companies: "Unlimited",
      users: "Unlimited",
      storage: "Custom",
      accounting: true,
      gst: true,
      inventory: true,
      payroll: true,
      multiCompany: true,
      reports: "Full + custom",
      support: "Dedicated account manager",
      api: true,
      dedicated: true,
    },
    cta: "Talk to us",
    highlight: false,
  },
];

const tableRows: { label: string; key: keyof typeof plans[0]["features"] }[] = [
  { label: "Companies", key: "companies" },
  { label: "Users", key: "users" },
  { label: "Storage", key: "storage" },
  { label: "Accounting & ledgers", key: "accounting" },
  { label: "GST filing & returns", key: "gst" },
  { label: "Inventory management", key: "inventory" },
  { label: "Payroll", key: "payroll" },
  { label: "Multi-company", key: "multiCompany" },
  { label: "Reports", key: "reports" },
  { label: "Support", key: "support" },
  { label: "API access", key: "api" },
  { label: "Dedicated manager", key: "dedicated" },
];

const faqs = [
  {
    q: "Is there really no credit card required for the trial?",
    a: "Correct. Sign up, add your company details, and use every feature for 30 days — no card, no commitment.",
  },
  {
    q: "Can I import my data from Tally or Excel?",
    a: "Yes. Paisa has a direct import tool for Tally XML exports and structured Excel sheets. Most businesses are up and running with historical data in under an hour.",
  },
  {
    q: "What happens after the 30-day trial?",
    a: "You'll be asked to pick a plan. If you don't, your account enters read-only mode — your data is safe, you just can't add new entries until you subscribe.",
  },
  {
    q: "Do you offer discounts for CA firms managing multiple clients?",
    a: "Yes, we have a CA Partner Program. Talk to us on the Enterprise plan — we'll set up a volume arrangement that works for your firm.",
  },
  {
    q: "Is my data secure?",
    a: "All data is encrypted at rest and in transit. We're hosted on AWS India (Mumbai region) for data residency. We do daily automated backups with 30-day retention.",
  },
  {
    q: "Can I switch plans later?",
    a: "Anytime. Upgrade or downgrade from your account settings. Billing adjusts pro-rata immediately.",
  },
];

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <CheckCircle2 size={17} className="text-zinc-800 mx-auto" />
    ) : (
      <Minus size={16} className="text-zinc-300 mx-auto" />
    );
  }
  return <span className="text-sm text-zinc-700">{value}</span>;
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="pt-16">
      {/* Header */}
      <section className="py-24 bg-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-4">Pricing</p>
          <h1 className="text-5xl md:text-6xl font-bold text-zinc-950 tracking-tight mb-5">
            Simple, honest pricing
          </h1>
          <p className="text-lg text-zinc-600">
            No per-user traps. No hidden modules. Pick a plan and get everything in it.
          </p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                !annual ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                annual ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"
              }`}
            >
              Annual
              <span className="text-[11px] bg-zinc-900 text-white px-2 py-0.5 rounded-full font-semibold">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="pb-16 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`p-7 rounded-2xl border flex flex-col ${
                  plan.highlight
                    ? "bg-[#0d0d0d] border-[#0d0d0d]"
                    : "bg-white border-zinc-150"
                }`}
                style={{ borderColor: plan.highlight ? undefined : "#e4e4e7" }}
              >
                <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${plan.highlight ? "text-zinc-400" : "text-zinc-500"}`}>
                  {plan.name}
                </p>

                <div className="mb-1">
                  {plan.monthly ? (
                    <span className={`text-4xl font-bold ${plan.highlight ? "text-white" : "text-zinc-950"}`}>
                      ₹{annual ? plan.annual?.toLocaleString("en-IN") : plan.monthly.toLocaleString("en-IN")}
                    </span>
                  ) : (
                    <span className={`text-4xl font-bold ${plan.highlight ? "text-white" : "text-zinc-950"}`}>
                      Custom
                    </span>
                  )}
                  {plan.monthly && (
                    <span className={`text-sm ml-1 ${plan.highlight ? "text-zinc-400" : "text-zinc-500"}`}>/mo</span>
                  )}
                </div>

                <p className={`text-xs mb-7 leading-relaxed ${plan.highlight ? "text-zinc-400" : "text-zinc-500"}`}>
                  {plan.desc}
                </p>

                <div className="flex flex-col gap-2.5 mb-8 flex-1">
                  {[
                    `${plan.features.companies} ${parseInt(plan.features.companies as string) === 1 ? "company" : "companies"}`,
                    `${plan.features.users} ${plan.features.users === "Unlimited" ? "users" : "users"}`,
                    plan.features.accounting && "Full accounting",
                    plan.features.gst && "GST filing",
                    plan.features.inventory && "Inventory",
                    plan.features.payroll && "Payroll",
                    `${plan.features.reports} reports`,
                    plan.features.support,
                    plan.features.api && "API access",
                    plan.features.dedicated && "Dedicated manager",
                  ]
                    .filter(Boolean)
                    .map((f) => (
                      <div key={String(f)} className="flex items-center gap-2.5">
                        <CheckCircle2 size={14} className={plan.highlight ? "text-zinc-300 shrink-0" : "text-zinc-700 shrink-0"} />
                        <span className={`text-sm ${plan.highlight ? "text-zinc-200" : "text-zinc-700"}`}>{String(f)}</span>
                      </div>
                    ))}
                </div>

                <Button
                  asChild
                  className={`w-full h-10 rounded-xl text-sm font-medium ${
                    plan.highlight
                      ? "bg-white text-zinc-950 hover:bg-zinc-100"
                      : "bg-[#0d0d0d] text-white hover:bg-[#1a1a1a]"
                  }`}
                >
                  <Link href="#">{plan.cta} <ArrowRight size={14} className="ml-1.5" /></Link>
                </Button>
              </div>
            ))}
          </div>
          <p className="text-center mt-5 text-sm text-zinc-500">All plans include 30-day free trial · No credit card required</p>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-20 bg-zinc-50">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-zinc-950 mb-10 text-center">Full comparison</h2>
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left px-6 py-4 text-zinc-500 font-medium w-2/5">Feature</th>
                  {plans.map((p) => (
                    <th
                      key={p.name}
                      className={`px-6 py-4 font-semibold text-center ${
                        p.highlight ? "text-zinc-950 bg-zinc-50" : "text-zinc-700"
                      }`}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr key={row.label} className={`border-b border-zinc-50 ${i % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}`}>
                    <td className="px-6 py-3.5 text-zinc-700">{row.label}</td>
                    {plans.map((p) => (
                      <td key={p.name} className="px-6 py-3.5 text-center">
                        <FeatureCell value={p.features[row.key] as boolean | string} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-zinc-950 mb-12 text-center">Frequently asked questions</h2>
          <div className="flex flex-col divide-y divide-zinc-100">
            {faqs.map((faq, i) => (
              <div key={faq.q}>
                <button
                  className="w-full flex items-center justify-between py-5 text-left gap-4 group"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-zinc-950 group-hover:text-zinc-700 transition-colors">{faq.q}</span>
                  <span className="shrink-0 text-zinc-400 group-hover:text-zinc-600 transition-colors">
                    {openFaq === i ? <Minus size={16} /> : <Plus size={16} />}
                  </span>
                </button>
                {openFaq === i && (
                  <p className="text-zinc-600 text-sm leading-relaxed pb-5">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
