import Link from "next/link";

const VERSION = "1.0.4";
const SERIF = { fontFamily: "var(--font-lora), Georgia, serif", fontStyle: "italic" as const, fontWeight: 400 };

function AppleLogo() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11" />
    </svg>
  );
}

function WindowsLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 88 88" fill="currentColor">
      <path d="M0 12.402l35.687-4.86.016 34.423-35.67.204zm35.67 33.529l.028 34.453L.028 75.48.026 45.7zm4.326-39.025L87.314 0v41.527l-47.318.376zm47.329 39.349-.011 41.34-47.318-6.678-.066-34.78z" />
    </svg>
  );
}

function LinuxLogo() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.62 8.35c-.36-.28-.48-.96-.28-1.5.18-.49.57-.77.86-.62.3.15.38.67.2 1.17-.19.5-.57.8-.87.65l.09.3zm-5.42-.62c.3-.15.68.13.87.62.19.5.1 1.02-.2 1.17-.29.15-.68-.13-.87-.62-.19-.5-.1-1.02.2-1.17zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5.5 13.5c-.28.63-.95 1.5-2 1.5H8.5c-1.05 0-1.72-.87-2-1.5-.55-1.24-.5-3.5 1-5 .5-.5 1-1 1.5-2 .14-.28.3-.72.46-1.2.36-1.08.76-2.3 1.54-2.3.78 0 1.18 1.22 1.54 2.3.16.48.32.92.46 1.2.5 1 1 1.5 1.5 2 1.5 1.5 1.55 3.76 1 5z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

const PLATFORMS = [
  {
    id: "mac",
    name: "macOS",
    logo: <AppleLogo />,
    req: "Requires macOS 12 Monterey or later",
    primary: { label: "Download for Mac", sub: "Universal · Apple Silicon + Intel", href: "#" },
    secondary: [
      { label: "Apple Silicon (.dmg)", href: "#" },
      { label: "Intel Mac (.dmg)", href: "#" },
    ],
  },
  {
    id: "windows",
    name: "Windows",
    logo: <WindowsLogo />,
    req: "Requires Windows 10 version 1903 or later",
    primary: { label: "Download for Windows", sub: "64-bit · Windows 10 / 11", href: "#" },
    secondary: [
      { label: "Installer (.exe)", href: "#" },
      { label: "Portable (.zip)", href: "#" },
    ],
  },
  {
    id: "linux",
    name: "Linux",
    logo: <LinuxLogo />,
    req: "Available for 64-bit distributions",
    primary: { label: "Download for Linux", sub: "Debian / Ubuntu (.deb)", href: "#" },
    secondary: [
      { label: ".deb (Debian, Ubuntu)", href: "#" },
      { label: ".AppImage (Universal)", href: "#" },
      { label: ".rpm (Fedora, RHEL)", href: "#" },
    ],
  },
];

const FEATURES = [
  {
    heading: "Works offline",
    body: "Your books live on your machine. No internet required for daily operations — sync when you want.",
  },
  {
    heading: "Auto-updates",
    body: "Paesa checks for updates silently in the background. New versions install without interrupting your work.",
  },
  {
    heading: "Native performance",
    body: "Not a web app in a browser wrapper. Paesa is built as a native desktop app — launches in under a second.",
  },
  {
    heading: "Local data, your control",
    body: "Your financial data is stored locally by default. Choose to back up to cloud or keep it fully on-premise.",
  },
  {
    heading: "Cross-platform parity",
    body: "Every feature available on Mac is available on Windows and Linux. No platform gets a lesser experience.",
  },
  {
    heading: "Keyboard-first",
    body: "Every action has a keyboard shortcut. Navigate ledgers, enter vouchers, and run reports without touching the mouse.",
  },
];

export default function DownloadPage() {
  return (
    <div className="pt-16">

      {/* Hero */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 border border-zinc-200 rounded-full px-3 py-1 mb-8 text-xs text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            Version {VERSION} — June 2026
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-zinc-950 tracking-tight leading-tight mb-5">
            Download{" "}
            <span style={SERIF} className="text-zinc-400">Paesa.</span>
          </h1>
          <p className="text-lg text-zinc-500 leading-relaxed">
            A native desktop app for macOS, Windows, and Linux.<br />
            Your data stays on your machine. No subscriptions to run locally.
          </p>
        </div>
      </section>

      {/* Platform cards */}
      <section className="pb-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLATFORMS.map((p) => (
              <div key={p.id} className="border border-zinc-200 rounded-2xl overflow-hidden flex flex-col">

                {/* Card header */}
                <div className="px-8 pt-10 pb-6 flex flex-col items-start gap-4">
                  <div className="text-zinc-800">
                    {p.logo}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-950 tracking-tight">{p.name}</h2>
                    <p className="text-xs text-zinc-400 mt-1">{p.req}</p>
                  </div>
                </div>

                {/* Primary CTA */}
                <div className="px-8 pb-6">
                  <a
                    href={p.primary.href}
                    className="flex items-center justify-between w-full bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-950 rounded-xl px-5 py-3.5 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-semibold">{p.primary.label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{p.primary.sub}</p>
                    </div>
                    <DownloadIcon />
                  </a>
                </div>

                {/* Divider */}
                <div className="mx-8 border-t border-zinc-100" />

                {/* Secondary links */}
                <div className="px-8 py-5 flex flex-col gap-3 flex-1">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Other builds</p>
                  {p.secondary.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      className="flex items-center justify-between text-sm text-zinc-600 hover:text-zinc-950 group transition-colors"
                    >
                      <span>{s.label}</span>
                      <span className="text-zinc-300 group-hover:text-zinc-600 transition-colors">
                        <DownloadIcon />
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Version / checksum note */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm text-zinc-400">
            <span>Paesa v{VERSION} · Released June 14, 2026</span>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-zinc-700 transition-colors">Changelog</Link>
              <Link href="#" className="hover:text-zinc-700 transition-colors">SHA-256 checksums</Link>
              <Link href="#" className="hover:text-zinc-700 transition-colors">All releases</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Desktop app features */}
      <section className="py-24 border-t border-zinc-100 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">Desktop app</p>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-950 tracking-tight mb-16">
            Built for the desktop —{" "}
            <span style={SERIF} className="text-zinc-400">not ported from the web.</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
            {FEATURES.map((f) => (
              <div key={f.heading}>
                <p className="font-semibold text-zinc-950 mb-2">{f.heading}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* System requirements */}
      <section className="py-20 border-t border-zinc-100 bg-zinc-50/50">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-lg font-bold text-zinc-950 mb-8">System requirements</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "macOS",
                rows: [
                  ["OS version", "macOS 12 Monterey or later"],
                  ["Architecture", "Apple Silicon (M1+) or Intel x64"],
                  ["RAM", "4 GB minimum, 8 GB recommended"],
                  ["Disk space", "300 MB for installation"],
                ],
              },
              {
                name: "Windows",
                rows: [
                  ["OS version", "Windows 10 (v1903) or Windows 11"],
                  ["Architecture", "x64 (64-bit only)"],
                  ["RAM", "4 GB minimum, 8 GB recommended"],
                  ["Disk space", "350 MB for installation"],
                ],
              },
              {
                name: "Linux",
                rows: [
                  ["Distribution", "Ubuntu 20.04+, Debian 11+, Fedora 35+"],
                  ["Architecture", "x86_64 (64-bit only)"],
                  ["RAM", "4 GB minimum, 8 GB recommended"],
                  ["Disk space", "350 MB for installation"],
                ],
              },
            ].map((sys) => (
              <div key={sys.name}>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">{sys.name}</p>
                <table className="w-full">
                  <tbody>
                    {sys.rows.map(([k, v]) => (
                      <tr key={k} className="border-b border-zinc-100 last:border-0">
                        <td className="py-2.5 text-xs text-zinc-400 w-28 align-top">{k}</td>
                        <td className="py-2.5 text-xs text-zinc-700 leading-snug">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </section>


    </div>
  );
}
