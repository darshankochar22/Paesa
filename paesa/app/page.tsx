import Link from "next/link";
import { EmailCTA } from "@/components/email-cta";
import { TweetWall } from "@/components/tweet-wall";
import { FeatureTabs } from "@/components/feature-tabs";
import { IndiaGlobe } from "@/components/india-globe";
import { FaqSection } from "@/components/faq-section";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const logos = ["Sharma & Co.", "Mehta Exports", "TechBridge India", "Kapoor Mills", "Patel Pharma", "Jain Brothers"];

export default function HomePage() {
  return (
    <div className="pt-16 overflow-x-hidden">

      {/* ── Hero ── */}
      <section className="bg-white pt-20 pb-0 text-center">
        <div className="max-w-4xl mx-auto px-6">

          <h1 className="text-[clamp(2.8rem,7vw,5.5rem)] font-bold tracking-tight text-zinc-950 leading-[1.05] mb-0">
            The finances platform
          </h1>
          <h1
            className="text-[clamp(2.8rem,7vw,5.5rem)] tracking-tight text-zinc-400 leading-[1.1] mb-8"
            style={{ fontFamily: "var(--font-lora), Georgia, serif", fontStyle: "italic", fontWeight: 400 }}
          >
            built for India.
          </h1>

          <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed mb-10">
            Accounting, GST, inventory, and payroll — unified in one fast platform.
            Set up in minutes. Trusted by 1,200+ businesses.
          </p>

          <EmailCTA />

          <p className="mt-4 text-sm text-zinc-400">
            No credit card required &nbsp;·&nbsp; Free 30-day trial &nbsp;·&nbsp; Cancel anytime
          </p>
        </div>

        {/* Globe */}
        <div className="mt-6 w-full">
          <IndiaGlobe />
        </div>
      </section>

      {/* ── Logo strip ── */}
      <section className="py-16 bg-white border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-sm text-zinc-400 mb-8 uppercase tracking-[0.15em] font-medium">
            Trusted by businesses across India
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-5">
            {logos.map((name) => (
              <span key={name} className="text-zinc-300 font-semibold text-sm tracking-wide hover:text-zinc-500 transition-colors cursor-default">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Spotlight 1: Accounting (Airtable-style left/right) ── */}
      <section className="py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-20 items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4 block">Accounting</span>
            <h2 className="text-4xl md:text-5xl font-bold text-zinc-950 tracking-tight leading-tight mb-6">
              Books that balance
              <span className="block" style={{ fontFamily: "var(--font-lora), serif", fontStyle: "italic", fontWeight: 400, color: "#71717a" }}>
                themselves.
              </span>
            </h2>
            <p className="text-zinc-500 text-lg leading-relaxed mb-8">
              Full double-entry bookkeeping with real-time P&L, ledger management, and every voucher type you need — built to CA audit standards from day one.
            </p>
            <ul className="space-y-3 mb-8">
              {["Multi-ledger chart of accounts", "Payment, receipt, journal & contra vouchers", "Real-time trial balance & balance sheet", "Cost centres and profit centres"].map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-zinc-700">
                  <CheckCircle2 size={15} className="text-zinc-900 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/features" className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-950 hover:gap-3 transition-all">
              Explore accounting features <ArrowRight size={15} />
            </Link>
          </div>
          <div className="rounded-2xl bg-zinc-50 border border-zinc-100 p-8 space-y-3">
            {/* Mini P&L mockup */}
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">Profit & Loss — June 2026</div>
            {[
              { label: "Gross Sales", amount: "₹24,85,000", indent: false, bold: false },
              { label: "Less: Returns", amount: "(₹1,20,000)", indent: true, bold: false },
              { label: "Net Sales", amount: "₹23,65,000", indent: false, bold: true },
              { label: "Cost of Goods Sold", amount: "₹14,20,000", indent: false, bold: false },
              { label: "Gross Profit", amount: "₹9,45,000", indent: false, bold: true },
              { label: "Operating Expenses", amount: "₹2,92,000", indent: false, bold: false },
              { label: "Net Profit", amount: "₹6,53,000", indent: false, bold: true },
            ].map((row, i) => (
              <div key={i} className={`flex justify-between py-2 ${row.bold ? "border-t border-zinc-200 font-semibold text-zinc-950" : "text-zinc-500"} text-sm ${row.indent ? "pl-4" : ""} ${i > 0 && !row.bold ? "border-t border-zinc-50" : ""}`}>
                <span>{row.label}</span>
                <span className={row.bold ? "text-zinc-950" : ""}>{row.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Spotlight 2: GST ── */}
      <section className="py-28 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-20 items-center">
          <div className="order-2 md:order-1 rounded-2xl bg-white border border-zinc-100 p-8 space-y-4">
            {/* GST mockup */}
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">GSTR-3B Summary — June 2026</div>
            {[
              { label: "Total Outward Taxable Supplies", amt: "₹23,65,000", gst: "₹4,25,700" },
              { label: "Total ITC Available", amt: "", gst: "₹2,10,400" },
              { label: "Net GST Payable", amt: "", gst: "₹2,15,300" },
            ].map((r, i) => (
              <div key={i} className="flex justify-between items-start py-3 border-b border-zinc-50 last:border-b-0 last:font-semibold last:text-zinc-950">
                <span className="text-sm text-zinc-600 max-w-xs">{r.label}</span>
                <span className="text-sm font-medium text-zinc-900 tabular-nums">{r.gst}</span>
              </div>
            ))}
            <div className="pt-3">
              <div className="w-full h-9 bg-[#0d0d0d] rounded-lg flex items-center justify-center text-white text-sm font-medium">
                File on GSTN portal →
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4 block">GST & Compliance</span>
            <h2 className="text-4xl md:text-5xl font-bold text-zinc-950 tracking-tight leading-tight mb-6">
              GST filing in
              <span className="block" style={{ fontFamily: "var(--font-lora), serif", fontStyle: "italic", fontWeight: 400, color: "#71717a" }}>
                20 minutes.
              </span>
            </h2>
            <p className="text-zinc-500 text-lg leading-relaxed mb-8">
              Every transaction auto-tagged with the right GST rate. GSTR-1 and GSTR-3B generated from your books. Reconcile with GSTN and spot mismatches before you file.
            </p>
            <ul className="space-y-3 mb-8">
              {["Auto GST on every sale & purchase", "GSTR-1, GSTR-3B, GSTR-2A generation", "GSTN reconciliation & mismatch alerts", "E-way bill and e-invoice ready"].map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-zinc-700">
                  <CheckCircle2 size={15} className="text-zinc-900 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/features" className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-950 hover:gap-3 transition-all">
              Explore GST features <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Feature tabs ── */}
      <FeatureTabs />

      {/* ── Tweet wall ── */}
      <TweetWall />

      {/* ── Pricing preview ── */}
      <section className="py-28 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 block mb-3">Pricing</span>
            <h2 className="text-4xl md:text-5xl font-bold text-zinc-950 tracking-tight mb-4">
              Simple pricing,
              <span className="ml-3" style={{ fontFamily: "var(--font-lora), serif", fontStyle: "italic", fontWeight: 400, color: "#71717a" }}>
                no surprises.
              </span>
            </h2>
            <p className="text-lg text-zinc-500">Start free. Upgrade when you&apos;re ready.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Starter", price: "₹999", per: "/mo", desc: "For freelancers & solo businesses", features: ["1 company · 2 users", "Full accounting", "GST filing", "Email support"], cta: "Start free", dark: false },
              { name: "Growth", price: "₹2,499", per: "/mo", desc: "For growing SMBs", features: ["5 companies · 10 users", "Inventory & payroll", "Priority support", "Custom reports"], cta: "Start free", dark: true },
              { name: "Enterprise", price: "Custom", per: "", desc: "For CA firms & large teams", features: ["Unlimited everything", "API access", "Dedicated manager", "SLA guarantee"], cta: "Talk to us", dark: false },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-2xl p-8 flex flex-col border ${plan.dark ? "bg-[#0d0d0d] border-[#0d0d0d]" : "bg-white border-zinc-150"}`} style={{ borderColor: plan.dark ? undefined : "#e4e4e7" }}>
                <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${plan.dark ? "text-zinc-400" : "text-zinc-500"}`}>{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`text-4xl font-bold ${plan.dark ? "text-white" : "text-zinc-950"}`}>{plan.price}</span>
                  {plan.per && <span className={`text-sm ${plan.dark ? "text-zinc-400" : "text-zinc-400"}`}>{plan.per}</span>}
                </div>
                <p className={`text-xs mb-7 ${plan.dark ? "text-zinc-400" : "text-zinc-500"}`}>{plan.desc}</p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className={`text-sm flex items-center gap-2.5 ${plan.dark ? "text-zinc-300" : "text-zinc-700"}`}>
                      <CheckCircle2 size={14} className={plan.dark ? "text-zinc-400 shrink-0" : "text-zinc-600 shrink-0"} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/pricing" className={`w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center transition-colors ${plan.dark ? "bg-white text-zinc-950 hover:bg-zinc-100" : "bg-[#0d0d0d] text-white hover:bg-[#1a1a1a]"}`}>
                  {plan.cta} <ArrowRight size={13} className="ml-1.5" />
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-zinc-400 mt-6">
            All plans include a 30-day free trial.{" "}
            <Link href="/pricing" className="text-zinc-700 underline underline-offset-4 hover:text-zinc-950">
              See full comparison →
            </Link>
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <FaqSection />

      {/* ── Final CTA (Anthropic-style) ── */}
      <section className="py-32 bg-white border-t border-zinc-100">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-zinc-950 tracking-tight leading-tight mb-4">
            Your business deserves
            <span className="block" style={{ fontFamily: "var(--font-lora), serif", fontStyle: "italic", fontWeight: 400, color: "#71717a" }}>
              better software.
            </span>
          </h2>
          <p className="text-lg text-zinc-500 mb-10 max-w-xl mx-auto">
            Start today. Set up in minutes. No accountant needed to get going.
          </p>
          <EmailCTA />
        </div>
      </section>

    </div>
  );
}
