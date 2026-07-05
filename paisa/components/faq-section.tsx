"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const FAQS = [
  {
    q: "Is there really no credit card required for the trial?",
    a: "Correct. Sign up, add your company details, and use every feature for 30 days — no card, no commitment. You'll only be asked for payment if you decide to continue.",
  },
  {
    q: "Can I import my data from Tally or Excel?",
    a: "Yes. Paisa has a direct import tool for Tally XML exports and structured Excel sheets. Most businesses are live with clean historical data in under an hour.",
  },
  {
    q: "Does Paisa handle multi-company books?",
    a: "Absolutely. You can manage unlimited companies from a single login. Each company's data is fully isolated — one company's entries never appear in another's reports.",
  },
  {
    q: "Is GST filing built in or a separate add-on?",
    a: "It's fully built in — not a separate module or add-on. Every transaction auto-applies the correct GST rate. GSTR-1 and GSTR-3B are generated directly from your voucher entries.",
  },
  {
    q: "Where is my data stored? Is it secure?",
    a: "All data is encrypted at rest and in transit. We're hosted on AWS Mumbai (ap-south-1) for India data residency. Daily automated backups with 30-day retention are included on every plan.",
  },
  {
    q: "Can I switch plans later?",
    a: "Anytime. Upgrade or downgrade from your account settings. Billing adjusts pro-rata immediately — no waiting for the next cycle.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-24 bg-white border-t border-zinc-100">
      <div className="max-w-3xl mx-auto px-6">
        <div className="mb-12">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-950 tracking-tight">
            Common questions
          </h2>
        </div>
        <div className="divide-y divide-zinc-100">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <button
                className="w-full flex items-center justify-between py-5 text-left gap-6 group"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-medium text-zinc-950 group-hover:text-zinc-600 transition-colors text-base">
                  {faq.q}
                </span>
                <span className="shrink-0 text-zinc-400 group-hover:text-zinc-600 transition-colors">
                  {open === i ? <Minus size={16} /> : <Plus size={16} />}
                </span>
              </button>
              {open === i && (
                <p className="text-zinc-500 text-sm leading-relaxed pb-5">{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
