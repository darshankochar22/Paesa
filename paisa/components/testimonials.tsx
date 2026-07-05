"use client";

import { useRef, MouseEvent } from "react";

const REVIEWS = [
  {
    quote: "Switched from Tally six months ago. GST filing went from a 3-day nightmare to 20 minutes. Can't go back.",
    name: "Rahul Sharma",
    role: "CA & Partner",
    company: "Sharma & Associates",
    initials: "RS",
  },
  {
    quote: "The drill-down from P&L all the way to the source voucher is something I've never seen in Indian software before.",
    name: "Priya Mehta",
    role: "CFO",
    company: "Mehta Exports Pvt. Ltd.",
    initials: "PM",
  },
  {
    quote: "Set up 3 companies in under 4 hours. Our books have never been this clean heading into a financial year.",
    name: "Amar Kapoor",
    role: "Founder",
    company: "Kapoor Mills",
    initials: "AK",
  },
  {
    quote: "Inventory reconciles with accounts the moment I raise a purchase order. Zero manual work.",
    name: "Neha Singh",
    role: "Operations Head",
    company: "Singh Distributors",
    initials: "NS",
  },
  {
    quote: "Manage 11 client companies from a single login. The data isolation is perfect and switching is instant.",
    name: "Vikram Joshi",
    role: "CA",
    company: "Joshi Tax Consultants",
    initials: "VJ",
  },
  {
    quote: "Real-time P&L I can actually trust. My team stopped asking me for spreadsheet updates entirely.",
    name: "Ananya Reddy",
    role: "CFO",
    company: "TechBridge India",
    initials: "AR",
  },
  {
    quote: "Payroll used to take two people and a full day. Now one person runs it in the morning before lunch.",
    name: "Rajesh Kumar",
    role: "HR Manager",
    company: "Patel Pharma",
    initials: "RK",
  },
  {
    quote: "Outstanding receivables report caught ₹18 lakh sitting uncollected. Paid for itself on day one.",
    name: "Sunita Patel",
    role: "Senior Accountant",
    company: "Patel Group",
    initials: "SP",
  },
];

const ROW1 = REVIEWS.slice(0, 4);
const ROW2 = REVIEWS.slice(4, 8);

function StarRow() {
  return (
    <div className="flex gap-0.5 mb-4">
      {[...Array(5)].map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#09090b">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function Card({ review }: { review: typeof REVIEWS[0] }) {
  const cardRef = useRef<HTMLDivElement>(null);

  function onMouseMove(e: MouseEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotY = ((x - cx) / cx) * 8;
    const rotX = -((y - cy) / cy) * 6;
    el.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.03)`;
  }

  function onMouseLeave() {
    if (cardRef.current) {
      cardRef.current.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)";
    }
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="shrink-0 w-80 bg-white rounded-2xl border border-zinc-100 p-6 cursor-default select-none"
      style={{
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        willChange: "transform",
      }}
    >
      <StarRow />
      <p className="text-sm text-zinc-700 leading-relaxed mb-5">
        &ldquo;{review.quote}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#0d0d0d] flex items-center justify-center shrink-0">
          <span className="text-white text-[11px] font-bold">{review.initials}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-950 leading-tight">{review.name}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{review.role} · {review.company}</p>
        </div>
      </div>
    </div>
  );
}

function MarqueeRow({ reviews, direction }: { reviews: typeof REVIEWS; direction: "left" | "right" }) {
  // Duplicate for seamless loop
  const doubled = [...reviews, ...reviews];
  return (
    <div className="overflow-hidden marquee-track">
      <div className={`flex gap-5 w-max ${direction === "left" ? "animate-marquee-left" : "animate-marquee-right"}`}>
        {doubled.map((r, i) => (
          <Card key={i} review={r} />
        ))}
      </div>
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="py-28 bg-zinc-50 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 mb-14 text-center">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
          What our customers say
        </p>
        <h2 className="text-4xl md:text-5xl font-bold text-zinc-950 tracking-tight">
          Loved by accountants
          <span
            className="ml-3"
            style={{ fontFamily: "var(--font-lora), serif", fontStyle: "italic", fontWeight: 400, color: "#a1a1aa" }}
          >
            & founders.
          </span>
        </h2>
      </div>

      <div className="flex flex-col gap-5">
        <MarqueeRow reviews={ROW1} direction="left" />
        <MarqueeRow reviews={ROW2} direction="right" />
      </div>
    </section>
  );
}
