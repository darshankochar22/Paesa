"use client";

import { useEffect, useState } from "react";
import { GROUP_ORDER, type DocSection } from "@/app/documentation/content";

export function DocsNav({ sections }: { sections: DocSection[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    const roadmapEl = document.getElementById("roadmap");
    if (roadmapEl) observer.observe(roadmapEl);
    return () => observer.disconnect();
  }, [sections]);

  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: sections.filter((s) => s.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {/* Mobile: jump-to dropdown */}
      <div className="lg:hidden mb-10">
        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
          Jump to section
        </label>
        <select
          value={active}
          onChange={(e) => {
            window.location.hash = e.target.value;
          }}
          className="w-full h-11 px-4 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900"
        >
          {groups.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </optgroup>
          ))}
          <option value="roadmap">Roadmap — What&apos;s Next</option>
        </select>
      </div>

      {/* Desktop: sticky sidebar */}
      <nav className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-24 flex flex-col gap-6 text-sm max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
          {groups.map((g) => (
            <div key={g.group}>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                {g.group}
              </p>
              <ul className="flex flex-col gap-1">
                {g.items.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className={`block px-3 py-1.5 rounded-lg transition-colors ${
                        active === s.id
                          ? "bg-zinc-100 text-zinc-950 font-medium"
                          : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                      }`}
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <a
              href="#roadmap"
              className={`block px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-widest transition-colors ${
                active === "roadmap"
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              What&apos;s Next
            </a>
          </div>
        </div>
      </nav>
    </>
  );
}
