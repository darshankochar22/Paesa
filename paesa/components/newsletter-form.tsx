"use client";

export function NewsletterForm() {
  return (
    <form className="flex gap-2 shrink-0" onSubmit={e => e.preventDefault()}>
      <input
        type="email"
        placeholder="Enter your email"
        className="bg-white/[0.07] border border-white/10 text-white placeholder:text-white/30 text-sm px-4 py-2.5 rounded-xl outline-none focus:border-white/25 transition-colors w-64"
      />
      <button type="submit" className="bg-white text-zinc-950 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-zinc-100 transition-colors shrink-0">
        Subscribe
      </button>
    </form>
  );
}
