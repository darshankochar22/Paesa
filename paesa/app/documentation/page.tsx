import Link from "next/link";
import { DocsNav } from "@/components/docs/docs-nav";
import { ScreenshotPlaceholder } from "@/components/docs/screenshot-placeholder";
import { SECTIONS, ROADMAP_NEAR_TERM, ROADMAP_AI_AGENTS } from "./content";

const SERIF = {
  fontFamily: "var(--font-lora), Georgia, serif",
  fontStyle: "italic" as const,
  fontWeight: 400,
};

export default function DocumentationPage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="py-24 bg-white border-b border-zinc-100">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-6">
            Documentation
          </p>
          <h1 className="text-5xl md:text-6xl font-bold text-zinc-950 tracking-tight leading-[1.05] mb-6">
            The Paesa{" "}
            <span style={SERIF} className="text-zinc-400 text-5xl md:text-6xl">
              user guide.
            </span>
          </h1>
          <p className="text-xl text-zinc-500 leading-relaxed max-w-2xl">
            Step-by-step instructions for every part of Paesa — the exact fields, buttons,
            and shortcuts you&apos;ll see on screen, in the order you&apos;ll use them.
            Written to be enough on its own; screenshots are being layered in alongside it.
          </p>
        </div>
      </section>

      {/* Overview grid — quick scan on any screen size */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-zinc-100 border-x border-zinc-100">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="px-6 py-6 group hover:bg-zinc-50 transition-colors"
              >
                <p className="text-xs text-zinc-400 mb-1">{s.group}</p>
                <p className="text-sm font-semibold text-zinc-950 group-hover:underline underline-offset-4">
                  {s.title}
                </p>
              </a>
            ))}
            <a
              href="#roadmap"
              className="px-6 py-6 group hover:bg-zinc-50 transition-colors"
            >
              <p className="text-xs text-zinc-400 mb-1">What&apos;s Next</p>
              <p className="text-sm font-semibold text-zinc-950 group-hover:underline underline-offset-4">
                Roadmap
              </p>
            </a>
          </div>
        </div>
      </section>

      {/* Body: sidebar + sections */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="lg:flex lg:gap-16 lg:items-start">
          <DocsNav sections={SECTIONS} />

          <div className="flex-1 min-w-0">
            {SECTIONS.map((s) => (
              <section
                key={s.id}
                id={s.id}
                className="scroll-mt-28 py-12 border-b border-zinc-100 first:pt-0"
              >
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                  {s.group}
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-zinc-950 tracking-tight mb-3">
                  {s.title}
                </h2>
                <p className="text-zinc-500 leading-relaxed max-w-2xl mb-2">
                  {s.summary}
                </p>
                {s.path && (
                  <p className="text-xs text-zinc-400 mb-8 font-mono">{s.path}</p>
                )}

                {s.flows.map((flow, fi) => (
                  <div key={fi} className="mb-8 max-w-2xl">
                    {flow.label && (
                      <p className="text-sm font-semibold text-zinc-950 mb-3">{flow.label}</p>
                    )}
                    <ol className="space-y-3.5">
                      {flow.steps.map((step, si) => (
                        <li key={si} className="flex gap-3.5 text-sm text-zinc-700 leading-relaxed">
                          <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-zinc-950 text-white text-[11px] font-semibold flex items-center justify-center">
                            {si + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}

                {s.shortcuts && s.shortcuts.length > 0 && (
                  <div className="mb-8">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                      Keyboard shortcuts
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {s.shortcuts.map((sc) => (
                        <div
                          key={sc.key}
                          className="flex items-center gap-2 border border-zinc-200 rounded-lg pl-2 pr-3 py-1.5"
                        >
                          <kbd className="text-[11px] font-mono font-semibold bg-zinc-100 text-zinc-700 rounded px-1.5 py-0.5">
                            {sc.key}
                          </kbd>
                          <span className="text-xs text-zinc-500">{sc.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {s.notes && s.notes.length > 0 && (
                  <ul className="mb-8 max-w-2xl space-y-2.5">
                    {s.notes.map((n) => (
                      <li
                        key={n}
                        className="text-sm text-zinc-500 leading-relaxed border-l-2 border-zinc-200 pl-4"
                      >
                        {n}
                      </li>
                    ))}
                  </ul>
                )}

                <ScreenshotPlaceholder caption={s.screenshot} aspect="aspect-[21/9]" />
              </section>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap — What's Next */}
      <section id="roadmap" className="scroll-mt-28 py-28 bg-[#0d0d0d] border-t border-zinc-900">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
            Roadmap
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-6 max-w-3xl">
            What&apos;s next —{" "}
            <span style={{ ...SERIF, color: "#71717a" }}>including AI agents.</span>
          </h2>
          <p className="text-zinc-400 leading-relaxed max-w-2xl mb-16">
            Paesa already ships an AI Copilot, an Assisted Entry endpoint, and an MCP
            server that exposes company data to external agents. The two tracks below
            are where that goes next: closing the remaining Tally-parity gaps, and
            turning the AI layer from something you ask questions to into something
            that can act — under permissions you control.
          </p>

          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-widest mb-6">
                Coming soon
              </h3>
              <ul className="space-y-6">
                {ROADMAP_NEAR_TERM.map((item) => (
                  <li key={item.title}>
                    <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
                    <p className="text-sm text-zinc-400 leading-relaxed">{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                AI agents — the next phase
                <span className="text-[10px] normal-case tracking-normal font-medium text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                  Planned
                </span>
              </h3>
              <ul className="space-y-6">
                {ROADMAP_AI_AGENTS.map((item) => (
                  <li key={item.title}>
                    <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
                    <p className="text-sm text-zinc-400 leading-relaxed">{item.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-16 pt-10 border-t border-zinc-800">
            <p className="text-sm text-zinc-500 max-w-2xl">
              Have a workflow you wish an agent could just handle for you? {" "}
              <Link href="/about" className="text-white underline underline-offset-4">
                Tell us
              </Link>{" "}
              — the roadmap above is ordered by what businesses actually ask for.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
