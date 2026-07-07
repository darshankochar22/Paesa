import Link from "next/link";

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

const COLS = [
  {
    sections: [
      {
        heading: "Products",
        links: [
          { label: "Accounting", href: "/features" },
          { label: "GST & Compliance", href: "/features" },
          { label: "Inventory", href: "/features" },
          { label: "Payroll", href: "/features" },
          { label: "Reports", href: "/features" },
          { label: "Multi-Company", href: "/features" },
          { label: "Pricing", href: "/pricing" },
        ],
      },
      {
        heading: "Integrations",
        links: [
          { label: "Tally Import", href: "#" },
          { label: "Excel Import", href: "#" },
          { label: "GSTN Portal", href: "#" },
          { label: "Razorpay", href: "#" },
        ],
      },
    ],
  },
  {
    sections: [
      {
        heading: "Solutions",
        links: [
          { label: "For Freelancers", href: "#" },
          { label: "For SMBs", href: "#" },
          { label: "For CA Firms", href: "#" },
          { label: "For Enterprises", href: "#" },
          { label: "For Manufacturers", href: "#" },
          { label: "For Traders", href: "#" },
        ],
      },
      {
        heading: "Compare",
        links: [
          { label: "Paesa vs Tally Prime", href: "#" },
          { label: "Paesa vs Zoho Books", href: "#" },
          { label: "Paesa vs Busy", href: "#" },
          { label: "Paesa vs QuickBooks", href: "#" },
          { label: "Migration Guide", href: "#" },
        ],
      },
    ],
  },
  {
    sections: [
      {
        heading: "Resources",
        links: [
          { label: "Documentation", href: "/documentation" },
          { label: "GST Guide 2026", href: "#" },
          { label: "Blog", href: "#" },
          { label: "Webinars", href: "#" },
          { label: "Case Studies", href: "#" },
          { label: "GST Calculator", href: "#" },
          { label: "Training Videos", href: "#" },
        ],
      },
      {
        heading: "Help & Support",
        links: [
          { label: "Help Center", href: "#" },
          { label: "Contact Us", href: "#" },
          { label: "System Status", href: "#" },
          { label: "Community Forum", href: "#" },
        ],
      },
    ],
  },
  {
    sections: [
      {
        heading: "Company",
        links: [
          { label: "About Paesa", href: "/about" },
          { label: "Careers", href: "#" },
          { label: "Press & Media", href: "#" },
          { label: "Investors", href: "#" },
          { label: "Partners", href: "#" },
          { label: "Affiliate Program", href: "#" },
        ],
      },
      {
        heading: "Legal",
        links: [
          { label: "Privacy Policy", href: "#" },
          { label: "Terms of Service", href: "#" },
          { label: "Security", href: "#" },
          { label: "Refund Policy", href: "#" },
          { label: "Data Residency", href: "#" },
        ],
      },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-[#0d0d0d]">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12">

          {/* Brand column */}
          <div className="flex flex-col justify-between md:col-span-1">
            <Link href="/" className="text-xl font-bold text-white tracking-tight">
              Paesa
            </Link>
            <div className="mt-auto pt-12">
              <div className="flex items-center gap-4">
                <Link href="#" className="text-white/30 hover:text-white transition-colors" aria-label="LinkedIn">
                  <LinkedInIcon />
                </Link>
                <Link href="https://x.com/paesaInc" className="text-white/30 hover:text-white transition-colors" aria-label="X">
                  <XIcon />
                </Link>
                <Link href="#" className="text-white/30 hover:text-white transition-colors" aria-label="YouTube">
                  <YouTubeIcon />
                </Link>
                <Link href="https://www.instagram.com/paesa.ai/?hl=en" className="text-white/30 hover:text-white transition-colors" aria-label="Instagram">
                  <InstagramIcon />
                </Link>
              </div>
            </div>
          </div>

          {/* Link columns */}
          {COLS.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-10">
              {col.sections.map((sec) => (
                <div key={sec.heading}>
                  <p className="text-xs font-semibold text-white mb-4">{sec.heading}</p>
                  <ul className="flex flex-col gap-2.5">
                    {sec.links.map((l) => (
                      <li key={l.label}>
                        <Link
                          href={l.href}
                          className="text-sm text-white/45 hover:text-white transition-colors duration-150"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}

        </div>
      </div>
    </footer>
  );
}
