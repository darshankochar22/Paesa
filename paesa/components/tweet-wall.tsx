import Link from "next/link";

const TWEETS = [
  {
    name: "Rahul Sharma",
    handle: "carahulsharma",
    verified: true,
    initials: "RS",
    text: "Switched our CA practice to @PaesaApp 3 months ago. GST filing that used to take 3 days now takes 20 minutes. The GSTN reconciliation feature alone is worth every rupee. Recommend to every CA managing multiple clients.",
    likes: 312,
    retweets: 84,
    replies: 19,
    date: "Apr 12",
  },
  {
    name: "Priya Mehta",
    handle: "priya_mehta_cfo",
    verified: false,
    initials: "PM",
    text: "Set up 3 companies on @PaesaApp in under 4 hours and our books have never been this clean. The multi-company switcher is silky smooth. No more logging in and out of different portals.",
    likes: 198,
    retweets: 41,
    replies: 7,
    date: "May 3",
  },
  {
    name: "Amar Kapoor",
    handle: "amar_kapoor_mfg",
    verified: false,
    initials: "AK",
    text: "Real talk: Paesa's inventory module is what sold me. Every purchase entry immediately updates stock value in the accounts. Zero manual reconciliation. This is how software should work.",
    likes: 276,
    retweets: 59,
    replies: 14,
    date: "Mar 28",
  },
  {
    name: "Ananya Reddy",
    handle: "ananyareddy_fin",
    verified: true,
    initials: "AR",
    text: "My team used to ping me every week for updated P&L numbers. Since we moved to @PaesaApp they just open the dashboard themselves. Real-time P&L that you can actually trust is a game changer.",
    likes: 421,
    retweets: 103,
    replies: 31,
    date: "Jun 2",
  },
  {
    name: "Vikram Joshi",
    handle: "vikram_joshi_ca",
    verified: true,
    initials: "VJ",
    text: "Managing 11 client companies on @PaesaApp from a single login. Data isolation is perfect — I've never once seen client A's data appear in client B's reports. This is what proper multi-tenancy looks like.",
    likes: 189,
    retweets: 52,
    replies: 11,
    date: "May 19",
  },
  {
    name: "Sunita Patel",
    handle: "sunita_patel_accts",
    verified: false,
    initials: "SP",
    text: "Ran the outstanding receivables report and found ₹18 lakh sitting uncollected across 3 parties. None of us had noticed. @PaesaApp paid for itself on day one. No exaggeration.",
    likes: 534,
    retweets: 147,
    replies: 43,
    date: "Jun 14",
  },
];

function XLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0f1419">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
    </svg>
  );
}

function VerifiedBadge() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1d9bf0">
      <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function RetweetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function ReplyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function formatCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

const BG_SHADES = [
  "bg-zinc-800",
  "bg-zinc-700",
  "bg-zinc-600",
  "bg-zinc-500",
  "bg-zinc-800",
  "bg-zinc-700",
];

export function TweetWall() {
  return (
    <section className="py-28 bg-white border-t border-zinc-100">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">What people are saying</p>
          <h2 className="text-4xl md:text-5xl font-bold text-zinc-950 tracking-tight">
            Loved by India&apos;s{" "}
            <span style={{ fontFamily: "var(--font-lora), serif", fontStyle: "italic", fontWeight: 400, color: "#a1a1aa" }}>
              finance teams.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {TWEETS.map((t, i) => (
            <div
              key={t.handle}
              className="bg-white rounded-2xl border border-zinc-100 p-5 flex flex-col gap-3 hover:border-zinc-200 hover:shadow-sm transition-all duration-200"
              style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${BG_SHADES[i]} flex items-center justify-center shrink-0`}>
                    <span className="text-white text-xs font-bold">{t.initials}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-[#0f1419] leading-tight">{t.name}</span>
                      {t.verified && <VerifiedBadge />}
                    </div>
                    <span className="text-xs text-[#536471]">@{t.handle}</span>
                  </div>
                </div>
                <XLogo />
              </div>

              {/* Tweet text */}
              <p className="text-sm text-[#0f1419] leading-relaxed flex-1"
                dangerouslySetInnerHTML={{
                  __html: t.text.replace(/@PaesaApp/g, '<span class="text-[#1d9bf0]">@PaesaApp</span>')
                }}
              />

              {/* Date */}
              <p className="text-xs text-[#536471]">{t.date}, 2026 · Twitter for iPhone</p>

              {/* Divider */}
              <div className="border-t border-[#eff3f4]" />

              {/* Engagement */}
              <div className="flex items-center gap-5">
                <button className="flex items-center gap-1.5 text-[#536471] hover:text-[#1d9bf0] transition-colors">
                  <ReplyIcon />
                  <span className="text-xs">{formatCount(t.replies)}</span>
                </button>
                <button className="flex items-center gap-1.5 text-[#536471] hover:text-[#00ba7c] transition-colors">
                  <RetweetIcon />
                  <span className="text-xs">{formatCount(t.retweets)}</span>
                </button>
                <button className="flex items-center gap-1.5 text-[#536471] hover:text-[#f91880] transition-colors">
                  <HeartIcon />
                  <span className="text-xs">{formatCount(t.likes)}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
