"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Logo } from "@/components/logo";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/features", label: "Features" },
  { href: "/documentation", label: "Documentation" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/download", label: "Download" },
];

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl"
          : "bg-white"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Logo />

        {/* Desktop nav — centered */}
        <nav className="hidden md:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                pathname === l.href
                  ? "text-zinc-950 bg-zinc-100 font-medium"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/pricing"
            className="inline-flex items-center h-9 px-4 rounded-lg bg-[#0d0d0d] text-white text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
          >
            Get Paesa free
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-zinc-500 hover:text-zinc-900 transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-white border-t border-zinc-100 px-6 py-4 flex flex-col gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === l.href ? "text-zinc-950 bg-zinc-100" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-3 pt-3 border-t border-zinc-100 flex flex-col gap-2">
            <Link href="#" className="px-3 py-2.5 text-sm text-zinc-600">Log in</Link>
            <Link
              href="/pricing"
              className="w-full h-10 rounded-xl bg-[#0d0d0d] text-white text-sm font-medium flex items-center justify-center"
            >
              Get Paesa free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
