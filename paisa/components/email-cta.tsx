"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

export function EmailCTA() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSent(true);
  }

  if (sent) {
    return (
      <div className="inline-flex items-center gap-2 bg-[#0d0d0d] text-white rounded-xl px-6 py-3 text-sm font-medium">
        ✓ You&apos;re on the list — we&apos;ll be in touch soon
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto w-full"
    >
      <input
        type="email"
        placeholder="Enter your work email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="flex-1 h-12 px-4 rounded-xl border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:border-transparent transition-all"
      />
      <button
        type="submit"
        className="h-12 px-6 rounded-xl bg-[#0d0d0d] text-white text-sm font-semibold hover:bg-[#1a1a1a] transition-colors flex items-center gap-2 justify-center shrink-0"
      >
        Get started free <ArrowRight size={15} />
      </button>
    </form>
  );
}
