import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  style: ["normal", "italic"],
  display: "swap",
});

// Set NEXT_PUBLIC_SITE_URL to the production origin (e.g. https://paesa.app) so
// Open Graph, Twitter, and canonical URLs resolve to absolute links. Falls back
// to localhost in development.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const title = "Paesa — Modern Accounting for Indian Business";
const description =
  "The modern accounting platform for Indian businesses. Track every rupee, simplify GST, manage inventory and payroll — all in one place.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    // Child pages set their own title; it renders as e.g. "Pricing — Paesa".
    template: "%s — Paesa",
  },
  description,
  applicationName: "Paesa",
  keywords: [
    "accounting software",
    "GST billing",
    "inventory management",
    "payroll software",
    "invoicing",
    "bookkeeping",
    "Indian business",
  ],
  authors: [{ name: "Paesa" }],
  creator: "Paesa",
  publisher: "Paesa",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Paesa",
    title,
    description,
    url: "/",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable} h-full scroll-smooth`}>
      <body className="min-h-full flex flex-col bg-white text-zinc-900 antialiased" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
