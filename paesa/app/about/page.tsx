import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-4">About Paesa</p>
          <h1 className="text-5xl md:text-6xl font-bold text-zinc-950 tracking-tight leading-tight mb-6">
            We're building the financial OS<br />for Indian business
          </h1>
          <p className="text-lg text-zinc-600 leading-relaxed">
            Paesa started with one frustration: the best-known accounting software for Indian businesses was built in the 90s and it shows. We're fixing that — one workflow at a time.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { stat: "1,200+", label: "Businesses on Paesa" },
              { stat: "₹4,200 Cr+", label: "Transactions processed" },
              { stat: "98.9%", label: "Uptime, last 12 months" },
              { stat: "< 4 hrs", label: "Avg. onboarding time" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-zinc-100 p-6">
                <p className="text-3xl font-bold text-zinc-950 mb-1">{s.stat}</p>
                <p className="text-sm text-zinc-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#0d0d0d] text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-white mb-3">Want to join us?</h2>
          <p className="text-zinc-400 mb-8">We're hiring engineers, designers, and finance domain experts. Remote-first, India-based.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="rounded-xl bg-white text-zinc-950 hover:bg-zinc-100 h-12 px-8 font-medium">
              <Link href="#">See open roles <ArrowRight size={16} className="ml-2" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl border-zinc-700 text-zinc-300 hover:bg-[#1a1a1a] h-12 px-8 font-medium">
              <Link href="/pricing">Try Paesa</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
